import subprocess
import os
import sys
import tempfile
import shutil
import psycopg2
import json

# PostgreSQL database configuration
db_config = {
    "dbname": "golab",
    "user": "postgres",
    "password": "Corp@123",
    "host": "localhost",
    "port": 5432,
}

# Terraform configuration for creating an AMI
TERRAFORM_CONFIG = """
provider "aws" {
  region = "us-east-1"
}

resource "aws_ami_from_instance" "golden_ami" {
  name               = var.ami_name
  source_instance_id = var.source_instance_id
  description        = "Golden AMI created by Terraform for Lab ID"

  tags = {
    Name = var.ami_name
  }
}
"""

# Temporary directory for Terraform files
terraform_dir = tempfile.mkdtemp()
main_tf_path = os.path.join(terraform_dir, "main.tf")
variables_tf_path = os.path.join(terraform_dir, "variables.tf")


def save_terraform_config(instance_id, ami_name):
    """Save the Terraform configuration to temporary files."""
    # Save the main Terraform configuration
    with open(main_tf_path, "w") as file:
        file.write(TERRAFORM_CONFIG)

    # Save the Terraform variables for the instance ID and AMI name
    with open(variables_tf_path, "w") as file:
        file.write(f"""
variable "source_instance_id" {{
  default = "{instance_id}"
}}

variable "ami_name" {{
  default = "{ami_name}"
}}
""")

    print(f"Terraform configuration saved to '{main_tf_path}'.")


def run_terraform_command(command):
    """Run a Terraform command."""
    try:
        result = subprocess.run(
            ["terraform"] + command,
            cwd=terraform_dir,
            text=True,
            capture_output=True,
            check=True
        )
        print(result.stdout)
    except subprocess.CalledProcessError as e:
        print(f"Error during command '{' '.join(e.cmd)}': {e.stderr}")
        sys.exit(1)


def terraform_init():
    """Initialize Terraform."""
    print("Initializing Terraform...")
    run_terraform_command(["init"])


def terraform_apply():
    """Apply Terraform configuration."""
    print("Applying Terraform configuration...")
    run_terraform_command(["apply", "-auto-approve"])


def get_ami_id():
    """Retrieve the AMI ID from Terraform state."""
    try:
        result = subprocess.run(
            ["terraform", "show", "-json"],
            cwd=terraform_dir,
            text=True,
            capture_output=True,
            check=True
        )
        terraform_output = result.stdout
        resources = json.loads(terraform_output).get("values", {}).get("root_module", {}).get("resources", [])
        for resource in resources:
            if resource["type"] == "aws_ami_from_instance":
                ami_id = resource["values"]["id"]
                print(f"Retrieved AMI ID: {ami_id}")
                return ami_id
    except Exception as e:
        print(f"Error retrieving AMI ID: {e}")
        sys.exit(1)


def store_ami_in_db(lab_id, ami_id):
    """Store the AMI ID and Lab ID into the database."""
    try:
        conn = psycopg2.connect(**db_config)
        cursor = conn.cursor()

        cursor.execute(
            "INSERT INTO amiinformation (lab_id, ami_id, created_at) VALUES (%s, %s, NOW())",
            (lab_id, ami_id)
        )
        conn.commit()

        print(f"Stored AMI ID {ami_id} and Lab ID {lab_id} into the database.")
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Error storing AMI in the database: {e}")


def check_terraform_installed():
    """Check if Terraform is installed."""
    try:
        subprocess.run(["terraform", "--version"], capture_output=True, check=True)
        print("Terraform is installed.")
    except FileNotFoundError:
        print("Terraform is not installed or not in PATH.")
        sys.exit(1)


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python script_name.py <instance_id> <lab_id>")
        sys.exit(1)

    instance_id = sys.argv[1]
    lab_id = sys.argv[2]

    try:
        check_terraform_installed()

        # Use the lab ID as the AMI name
        ami_name = lab_id

        # Save Terraform configuration
        save_terraform_config(instance_id, ami_name)

        # Initialize and apply Terraform
        terraform_init()
        terraform_apply()

        # Retrieve the AMI ID
        ami_id = get_ami_id()

        # Store the AMI ID and Lab ID into the database
        store_ami_in_db(lab_id, ami_id)
    finally:
        # Clean up the temporary directory
        shutil.rmtree(terraform_dir)
        print(f"Temporary directory '{terraform_dir}' cleaned up.")
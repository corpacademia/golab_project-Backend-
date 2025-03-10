import subprocess
import os
import sys
import tempfile
import shutil
import psycopg2

# PostgreSQL Connection Config
DB_CONFIG = {
    "dbname": "golab",
    "user": "postgres",
    "password": "Corp@123",
    "host": "localhost",
    "port": 5432
}

# Terraform configuration with EBS storage
TERRAFORM_CONFIG = """
provider "aws" {
  region = "us-east-1"
}

resource "aws_instance" "created_instance" {
  ami           = var.ami_id
  instance_type = var.instance_type

  root_block_device {
    volume_size = var.storage_size
  }

  tags = {
    Name = var.lab_id
  }
}

output "instance_id" {
  value = aws_instance.created_instance.id
}

output "public_ip" {
  value = aws_instance.created_instance.public_ip
}
"""

# Temporary directory for Terraform files
terraform_dir = tempfile.mkdtemp()
main_tf_path = os.path.join(terraform_dir, "main.tf")
variables_tf_path = os.path.join(terraform_dir, "variables.tf")


def save_terraform_config(ami_id, instance_type, storage_size):
    """Save Terraform configuration to temporary files."""
    with open(main_tf_path, "w") as file:
        file.write(TERRAFORM_CONFIG)

    with open(variables_tf_path, "w") as file:
        file.write(f"""
variable "ami_id" {{
  description = "The AMI ID to use for launching instances"
  default     = "{ami_id}"
}}

variable "instance_type" {{
  description = "The type of instance to launch"
  default     = "{instance_type}"
}}

variable "storage_size" {{
  description = "The size of the storage volume in GB"
  default     = {storage_size}
}}
""")

    print("Terraform configuration saved.")


def run_terraform_command(command):
    """Run a Terraform command and handle errors."""
    try:
        result = subprocess.run(
            ["terraform"] + command,
            cwd=terraform_dir,
            text=True,
            capture_output=True,
            check=True
        )
        return result.stdout
    except subprocess.CalledProcessError as e:
        print(f"Error running command: {' '.join(e.cmd)}")
        print(f"Error message: {e.stderr.strip()}")
        return None


def terraform_init():
    """Initialize Terraform."""
    print("Initializing Terraform...")
    if run_terraform_command(["init"]) is None:
        print("Terraform initialization failed.")
        sys.exit(1)


def terraform_apply():
    """Apply Terraform configuration and return instance details."""
    print("Applying Terraform configuration...")
    if run_terraform_command(["apply", "-auto-approve"]) is None:
        print("Terraform apply failed.")
        sys.exit(1)
    
    return get_instance_details()


def get_instance_details():
    """Fetch instance ID and public IP from Terraform output."""
    print("Fetching instance details...")

    instance_id = run_terraform_command(["output", "-raw", "instance_id"])
    public_ip = run_terraform_command(["output", "-raw", "public_ip"])

    if not instance_id or not public_ip:
        print("Error: Could not fetch instance details from Terraform.")
        sys.exit(1)

    instance_id = instance_id.strip()
    public_ip = public_ip.strip()

    print(f"Instance ID: {instance_id}, Public IP: {public_ip}")
    return instance_id, public_ip


def get_password_from_db(prev_labId):
    """Fetch password using prev_labId from the instances table."""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        
        cur.execute("""
            SELECT password FROM instances WHERE lab_id = %s ORDER BY created_at DESC LIMIT 1
        """, (prev_labId,))
        
        result = cur.fetchone()
        cur.close()
        conn.close()

        if result:
            print(f"Password retrieved from database: {result[0]}")
            return result[0]
        else:
            print(f"No password found for prev_labId {prev_labId}. Using NULL.")
            return None
    except Exception as e:
        print(f"Database Error (Fetching Password): {e}")
        return None


def insert_into_db(lab_id, instance_id, public_ip, prev_labId):
    """Insert instance details into PostgreSQL with password from previous lab."""
    password = get_password_from_db(prev_labId)  # Fetch password from previous lab

    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        
        cur.execute("""
            INSERT INTO instances (lab_id, instance_id, public_ip, password, created_at)
            VALUES (%s, %s, %s, %s, NOW())
        """, (lab_id, instance_id, public_ip, password))
        
        conn.commit()
        cur.close()
        conn.close()
        
        print("Instance details saved to database.")
    except Exception as e:
        print(f"Database Error (Insertion): {e}")
        sys.exit(1)


def terraform_destroy():
    """Destroy Terraform resources."""
    print("Destroying Terraform resources...")
    if run_terraform_command(["destroy", "-auto-approve"]) is None:
        print("Terraform destroy failed.")
        sys.exit(1)


def check_terraform_installed():
    """Check if Terraform is installed."""
    try:
        subprocess.run(["terraform", "--version"], capture_output=True, check=True)
        print("Terraform is installed.")
    except FileNotFoundError:
        print("Terraform is not installed or not in PATH.")
        sys.exit(1)


if __name__ == "__main__":
    if len(sys.argv) < 6:
        print("Usage: python script_name.py <instance_type> <ami_id> <storage_size> <lab_id> <prev_labId> [destroy]")
        sys.exit(1)

    try:
        instance_type = sys.argv[1]
        ami_id = sys.argv[2]
        storage_size = int(sys.argv[3])
        lab_id = sys.argv[4]
        prev_labId = sys.argv[5]
    except ValueError:
        print("Error: <storage_size> must be a valid integer.")
        sys.exit(1)

    destroy_flag = len(sys.argv) == 7 and sys.argv[6].lower() == "destroy"

    try:
        check_terraform_installed()

        if destroy_flag:
            terraform_destroy()
        else:
            save_terraform_config(ami_id, instance_type, storage_size)
            terraform_init()
            instance_id, public_ip = terraform_apply()

            # Save instance details to the database, including password
            insert_into_db(lab_id, instance_id, public_ip, prev_labId)
    finally:
        # Ensure cleanup always happens, even on failure
        if not destroy_flag and os.path.exists(terraform_dir):
            shutil.rmtree(terraform_dir)
            print(f"Temporary directory '{terraform_dir}' cleaned up.")

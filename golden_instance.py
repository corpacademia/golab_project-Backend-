import subprocess
import os
import sys
import tempfile
import shutil


# Terraform configuration for creating instances
TERRAFORM_CONFIG = """
provider "aws" {
  region = "us-east-1"
}

resource "aws_instance" "created_instance" {
  ami           = var.ami_id
  instance_type = var.instance_type
  count         = var.instance_count

  tags = {
    Name = "InstanceFromAMI-${count.index + 1}"
  }
}
"""

# Temporary directory for Terraform files
terraform_dir = tempfile.mkdtemp()
main_tf_path = os.path.join(terraform_dir, "main.tf")
variables_tf_path = os.path.join(terraform_dir, "variables.tf")


def save_terraform_config(ami_id, instance_type, instance_count):
    """Save the Terraform configuration to temporary files."""
    # Save the main Terraform configuration
    with open(main_tf_path, "w") as file:
        file.write(TERRAFORM_CONFIG)

    # Save the Terraform variables
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

variable "instance_count" {{
  description = "The number of instances to launch"
  default     = {instance_count}
}}
""")

    print(f"Terraform configuration saved to '{main_tf_path}' and '{variables_tf_path}'.")


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


def terraform_destroy():
    """Destroy Terraform resources."""
    print("Destroying Terraform resources...")
    run_terraform_command(["destroy", "-auto-approve"])


def check_terraform_installed():
    """Check if Terraform is installed."""
    try:
        subprocess.run(["terraform", "--version"], capture_output=True, check=True)
        print("Terraform is installed.")
    except FileNotFoundError:
        print("Terraform is not installed or not in PATH.")
        sys.exit(1)


if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python script_name.py <ami_id> <instance_type> <instance_count> [destroy]")
        sys.exit(1)

    ami_id = sys.argv[2]
    instance_type = sys.argv[1]
    instance_count = int(sys.argv[3])
    destroy_flag = len(sys.argv) == 5 and sys.argv[4].lower() == "destroy"
    # print(ami_id,instance_type,instance_count,destroy_flag)
    try:
        check_terraform_installed()

        if destroy_flag:
            # Destroy resources if the "destroy" argument is provided
            terraform_destroy()
        else:
            # Save Terraform configuration
            save_terraform_config(ami_id, instance_type, instance_count)

            # Initialize and apply Terraform
            terraform_init()
            terraform_apply()
    finally:
        # Clean up the temporary directory
        shutil.rmtree(terraform_dir)
        print(f"Temporary directory '{terraform_dir}' cleaned up.")
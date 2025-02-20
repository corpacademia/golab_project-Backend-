import psycopg2
import os
from pathlib import Path

# PostgreSQL database configuration
db_config = {
    "dbname": "golab",
    "user": "postgres",
    "password": "Corp@123",
    "host": "localhost",
    "port": 5432
}

# Step 1: Fetch instance data from the PostgreSQL database
def fetch_instance_data():
    query = "SELECT lab_id, instance, storage, os, os_version, title FROM createlab ORDER BY created_at DESC LIMIT 1;"
    try:
        conn = psycopg2.connect(**db_config)
        cursor = conn.cursor()
        cursor.execute(query)
        result = cursor.fetchone()
        conn.close()
    except Exception as e:
        raise RuntimeError(f"Error fetching data from the database: {e}")
    
    if not result:
        raise ValueError("No data found in the database.")
    
    lab_id, instance_type, storage_size, os_name, os_version, instance_name = result
    return lab_id, instance_type, storage_size, os_name, os_version, instance_name

# Step 2: Get the AMI for the specified OS and version
def get_ami_for_os(os_name, os_version):
    ami_mapping = {
        "windows": {
            "Microsoft Windows Server 2025 Base": "ami-04f77c9cd94746b09",
            "Microsoft Windows Server 2025 Core Base": "ami-01e4c18598be12113",
            "Microsoft Windows Server 2022 Base": "ami-0a0ebee827a585d06",
            "Microsoft Windows Server 2022 Core Base": "ami-0cd3e1f701e796369",
            "Microsoft Windows Server 2019 Base": "ami-049dd04cca2dc5594",
            "Microsoft Windows Server 2019 Core Base": "ami-0194c744284ae7c15",
            "Microsoft Windows Server 2016 Base": "ami-032ec7a32b7fb247c",
            "Microsoft Windows Server 2016 Core Base": "ami-090a624d5b9b3792c",
            "Microsoft Windows Server 2022 with SQL Server 2022 Standard": "ami-0fab25cbd44603919",
            "Microsoft Windows Server 2022 with SQL Server 2022 Enterprise": "ami-014b736063bba99c3",
            "Microsoft Windows Server 2022 with SQL Server 2022 Web": "ami-0c31c2007d48fa97f",
            "Microsoft Windows Server 2019 with SQL Server 2022 Standard": "ami-06ab74a6eb9ec9759",
            "Microsoft Windows Server 2019 with SQL Server 2022 Enterprise": "ami-0b2cfe305c3b7c306",
            "Microsoft Windows Server 2022 with SQL Server 2019 Standard": "ami-0e331677876810f95",
            "Microsoft Windows Server 2022 with SQL Server 2019 Enterprise": "ami-0c12f8589524b69b4",
            "Microsoft Windows Server 2019 with SQL Server 2019 Standard": "ami-042df70b58daef4cd",
            "Microsoft Windows Server 2019 with SQL Server 2019 Enterprise": "ami-0adf38b5dff79f1a7",
            "Microsoft Windows Server 2019 with SQL Server 2019 Web": "ami-0ec35a4156c5e85b8",
            "Microsoft Windows Server 2019 with SQL Server 2017 Standard": "ami-006587af2d6633510"
        },
        "ubuntu": {
            "Ubuntu Server 24.04 LTS (HVM), SSD Volume Type": "ami-04b4f1a9cf54c11d0",
            "Ubuntu Server 22.04 LTS (HVM), SSD Volume Type": "ami-0e1bed4f06a3b463d",
            "Ubuntu Server 22.04 LTS (HVM) with SQL Server 2022 Standard": "ami-051027b61544b3d11",
            "Ubuntu Pro - Ubuntu Server Pro 24.04 LTS (HVM), SSD Volume Type": "ami-0ff20c640f06d85cf",
            "Deep Learning Base OSS Nvidia Driver GPU AMI (Ubuntu 22.04)": "ami-0fb38d50689a99602",
            "Deep Learning OSS Nvidia Driver AMI GPU PyTorch 2.5 (Ubuntu 22.04)": "ami-0bbe82e88da64960f",
            "Deep Learning AMI Neuron (Ubuntu 22.04)": "ami-0349dc82277d50797",
            "Deep Learning OSS Nvidia Driver AMI GPU TensorFlow 2.18 (Ubuntu 22.04)": "ami-0ea173b69d0db1f62"
        },
        "linux": {
            "Amazon Linux 2023 AMI": "ami-0c614dee691cbbf37",
            "Amazon Linux 2 AMI (HVM) - Kernel 5.10, SSD Volume Type": "ami-0f214d1b3d031dc53",
            "Deep Learning OSS Nvidia Driver AMI GPU PyTorch 2.5 (Amazon Linux 2023)": "ami-03ee2c35188fd39a8",
            "Deep Learning OSS Nvidia Driver AMI GPU TensorFlow 2.16 (Amazon Linux 2)": "ami-0c570f66870de2bb4",
            "Deep Learning Base OSS Nvidia Driver GPU AMI (Amazon Linux 2023)": "ami-0876ea460d625ed47",
            "Deep Learning AMI Neuron (Amazon Linux 2023)": "ami-024304aba53df2a8c",
            "Amazon Linux 2 LTS with SOL Server 2019 Standard": "ami-0c2f94cd481d358b2",
            "Amazon Linux 2 LTS with SQL Server 2017 Standard": "ami-083c1150bbfd9c5bf",
            "Amazon Linux 2 with .NET 6, PowerShell, Mono, and MATE Desktop Environment": "ami-0b8aeb1889f1a812a"
        },
        "rhel": {
            "Red Hat Enterprise Linux 9 (HVM), SSD Volume Type": "ami-0c7af5fe939f2677f",
            "Red Hat Enterprise Linux 9 with High Availability": "ami-0c695cc059ad095e9",
            "RHEL 8 with SQL Server 2022 Standard Edition AMI": "ami-0468ac5f57c53fbad"
        }
    }
    
    os_name = os_name.lower()
    if os_name not in ami_mapping or os_version not in ami_mapping[os_name]:
        raise ValueError(f"Unsupported OS or version: {os_name} {os_version}")
    
    return ami_mapping[os_name][os_version] 

# Step 3: Generate Terraform configuration file with SSM IAM Role attached
def generate_terraform_file(instance_type, storage_size, ami_id, instance_name, lab_id):
    terraform_config = f"""
provider "aws" {{
  region = "us-east-1"
}}

# IAM Role for SSM with AmazonSSMManagedInstanceCore policy attached
resource "aws_iam_role" "ssm_role_{lab_id}" {{
  name = "ssm_role_{lab_id}"
  assume_role_policy = <<EOF
{{
  "Version": "2012-10-17",
  "Statement": [
    {{
      "Effect": "Allow",
      "Principal": {{
        "Service": "ec2.amazonaws.com"
      }},
      "Action": "sts:AssumeRole"
    }}
  ]
}}
EOF
}}

resource "aws_iam_role_policy_attachment" "ssm_role_attach_{lab_id}" {{
  role       = aws_iam_role.ssm_role_{lab_id}.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}}

resource "aws_iam_instance_profile" "ssm_instance_profile_{lab_id}" {{
  name = "ssm_instance_profile_{lab_id}"
  role = aws_iam_role.ssm_role_{lab_id}.name
}}

# EC2 instance resource with the IAM instance profile attached
resource "aws_instance" "aws_{lab_id}" {{
  ami           = "{ami_id}"
  instance_type = "{instance_type}"
  key_name      = "Aws2"
  vpc_security_group_ids = ["sg-038ccec9310169fce"]

  root_block_device {{
    volume_size = {storage_size}
    volume_type = "gp2"
    encrypted = true
  }}

  iam_instance_profile = aws_iam_instance_profile.ssm_instance_profile_{lab_id}.name
  hibernation = true
  tags = {{
    Name = "{instance_name}-{lab_id}"
  }}
}}

output "instance_id" {{
  value = aws_instance.aws_{lab_id}.id
}}
"""
    try:
        tf_dir = Path(f"./terraform_{lab_id}")
        tf_dir.mkdir(parents=True, exist_ok=True)
        tf_filename = tf_dir / "main.tf"
        tf_filename.write_text(terraform_config)
        print(f"Terraform directory and configuration file created successfully for lab_id {lab_id}.")
        return str(tf_dir)
    except Exception as e:
        raise RuntimeError(f"Error generating Terraform file: {e}")

# Main function
if __name__ == "__main__":
    try:
        # Fetch instance details from the database
        lab_id, instance_type, storage_size, os_name, os_version, instance_name = fetch_instance_data()

        # Get the AMI ID for the OS and version
        ami_id = get_ami_for_os(os_name, os_version)

        # Generate Terraform configuration with SSM IAM Role attached
        tf_dir = generate_terraform_file(instance_type, storage_size, ami_id, instance_name, lab_id)

        print("Terraform setup successful. You can now proceed with Terraform execution manually.")
    except Exception as e:
        print(f"Error: {e}")
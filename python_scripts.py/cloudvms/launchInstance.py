import sys
import subprocess
import json
import psycopg2
import boto3
from datetime import datetime

# Ensure correct usage:
# Expected parameters: <USERNAME> <GOLDEN_AMI_ID> <USER_ID> <LAB_ID> <INSTANCE_TYPE> <START_DATE> <END_DATE>
if len(sys.argv) != 8:
    print("Usage: python main.py <USERNAME> <GOLDEN_AMI_ID> <USER_ID> <LAB_ID> <INSTANCE_TYPE> <START_DATE> <END_DATE>")
    print("Date format: YYYY-MM-DD HH:MM:SS (UTC)")
    sys.exit(1)

username      = sys.argv[1]
ami_id        = sys.argv[2]  # AMI ID of the golden image
user_id       = sys.argv[3]
lab_id        = sys.argv[4]
instance_type = sys.argv[5]
start_date    = sys.argv[6]
end_date      = sys.argv[7]

# Generate Instance Name
instance_name = f"{username}_{user_id}"

# Validate date format
try:
    start_datetime = datetime.strptime(start_date, "%Y-%m-%d %H:%M:%S")
    end_datetime   = datetime.strptime(end_date, "%Y-%m-%d %H:%M:%S")
    if start_datetime >= end_datetime:
        print("Error: Start date must be before end date.")
        sys.exit(1)
except ValueError:
    print("Invalid date format. Use: YYYY-MM-DD HH:MM:SS")
    sys.exit(1)

# PostgreSQL Configuration
db_config = {
    "dbname": "golab",
    "user": "postgres",
    "password": "Corp@123",
    "host": "localhost",
    "port": 5432
}

# Ensure the cloudAssignedInstance table exists before inserting data
conn = None
cursor = None
try:
    conn = psycopg2.connect(**db_config)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS cloudAssignedInstance (
            id SERIAL PRIMARY KEY,
            username VARCHAR(255),
            user_id VARCHAR(255),
            lab_id VARCHAR(255),
            instance_id VARCHAR(255),
            public_ip VARCHAR(255),
            instance_name VARCHAR(255),
            instance_type VARCHAR(255),
            start_date TIMESTAMP,
            end_date TIMESTAMP,
            password VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
except psycopg2.Error as err:
    print(f"Database error while creating table: {err}")
    sys.exit(1)
finally:
    if cursor:
        cursor.close()
    if conn:
        conn.close()

# Generate Terraform script to create an instance from the AMI
terraform_script = f"""
terraform {{
  required_providers {{
    aws = {{
      source  = "hashicorp/aws"
      version = "~> 5.82.2"
    }}
  }}
}}

provider "aws" {{
  region = "us-east-1"
}}

resource "aws_instance" "app" {{
  ami           = "{ami_id}"
  instance_type = "{instance_type}"

  user_data = <<-EOF
              #!/bin/bash
              sudo yum update -y
              sudo amazon-linux-extras enable epel
              sudo yum install -y httpd
              EOF

  tags = {{
    Name = "{instance_name}"
  }}
}}

output "instance_id" {{
  value = aws_instance.app.id
}}

output "public_ip" {{
  value = aws_instance.app.public_ip
}}
"""

# Write Terraform script to main.tf
with open("main.tf", "w") as f:
    f.write(terraform_script)

# Initialize and apply Terraform
try:
    subprocess.run(["terraform", "init", "-upgrade"], check=True)
    subprocess.run(["terraform", "apply", "-auto-approve"], check=True)
except subprocess.CalledProcessError as e:
    print(f"Terraform execution failed: {e}")
    sys.exit(1)

# Capture Terraform output
try:
    result = subprocess.run(["terraform", "output", "-json"], capture_output=True, text=True, check=True)
    output_data = json.loads(result.stdout)
except Exception as e:
    print(f"Error capturing Terraform output: {e}")
    sys.exit(1)

instance_id = output_data.get("instance_id", {}).get("value")
public_ip   = output_data.get("public_ip", {}).get("value")

if not instance_id or not public_ip:
    print("Failed to retrieve instance details from Terraform output.")
    sys.exit(1)

# Fetch password from the Instance table using lab_id
instance_password = ""
try:
    conn = psycopg2.connect(**db_config)
    cursor = conn.cursor()
    cursor.execute("SELECT password FROM Instances WHERE lab_id = %s", (lab_id,))
    result = cursor.fetchone()
    if result:
        instance_password = result[0]
    else:
        print("Warning: No password found in Instance table for the provided lab_id.")
    conn.commit()
except psycopg2.Error as err:
    print(f"Database error while fetching password from Instance table: {err}")
finally:
    if cursor:
        cursor.close()
    if conn:
        conn.close()

# Store instance details in cloudAssignedInstance along with the fetched password
conn = None
cursor = None
try:
    conn = psycopg2.connect(**db_config)
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO cloudAssignedInstance 
        (username, user_id, lab_id, instance_id, public_ip, instance_name, instance_type, start_date, end_date, password) 
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, (username, user_id, lab_id, instance_id, public_ip, instance_name, instance_type, start_date, end_date, instance_password))
    conn.commit()
    print("Instance details stored in database.")
except psycopg2.Error as err:
    print(f"Database error while inserting data: {err}")
finally:
    if cursor:
        cursor.close()
    if conn:
        conn.close()

# Create a Lambda termination script to schedule instance termination
lambda_script = f"""
import boto3

def lambda_handler(event, context):
    ec2 = boto3.client('ec2', region_name='us-east-1')
    ec2.terminate_instances(InstanceIds=['{instance_id}'])
    print("Instance {instance_id} terminated.")
"""

with open("terminate_instance.py", "w") as f:
    f.write(lambda_script)

print(f"Instance {instance_id} ({instance_type}) is scheduled from {start_date} to {end_date}.")
sys.stdout.write(instance_id)
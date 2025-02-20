import subprocess
import psycopg2
import os
import json
import sys
import boto3
from pathlib import Path

# PostgreSQL database configuration
db_config = {
    "dbname": "golab",
    "user": "postgres",
    "password": "Corp@123",
    "host": "localhost",
    "port": 5432
}

# Base path for Terraform folders
base_path = Path.cwd()  # Assuming terraform folders are in the current working directory

# AWS client setup
ec2_client = boto3.client("ec2", region_name="us-east-1")

# Function to find the Terraform folder for the given lab_id
def get_terraform_folder(lab_id):
    target_folder = base_path / f"terraform_{lab_id}"
    
    if target_folder.exists():
        main_tf_path = target_folder / "main.tf"
        if main_tf_path.exists():
            print(f"Terraform folder for LAB_ID {lab_id} found: {target_folder}")
            return str(target_folder)
        else:
            print(f"Terraform folder exists but 'main.tf' is missing for LAB_ID {lab_id}.")
    else:
        print(f"No Terraform folder found for LAB_ID: {lab_id}.")
    
    return None

# Initialize Terraform
def terraform_init(folder_path):
    print(f"Initializing Terraform in {folder_path}...")
    result = subprocess.run(["terraform", "init"], cwd=folder_path, capture_output=True, text=True)
    if result.returncode == 0:
        print("Terraform initialized successfully.")
    else:
        print("Error during Terraform initialization:")
        print(result.stderr)
        sys.exit(1)

# Apply Terraform and retrieve instance ID properly
def terraform_apply_and_get_instance_id(folder_path):
    print(f"Applying Terraform configuration in {folder_path}...")
    apply_result = subprocess.run(["terraform", "apply", "-auto-approve"], cwd=folder_path, capture_output=True, text=True)

    if apply_result.returncode == 0:
        print("Terraform applied successfully.")

        # Fetch Terraform output in JSON format
        output_result = subprocess.run(["terraform", "output", "-json"], cwd=folder_path, capture_output=True, text=True)

        if output_result.returncode == 0:
            try:
                terraform_outputs = json.loads(output_result.stdout)
                instance_id = terraform_outputs.get("instance_id", {}).get("value")

                if instance_id:
                    print(f"Extracted Instance ID: {instance_id}")
                    return instance_id
                else:
                    print("Instance ID not found in Terraform outputs.")
            except json.JSONDecodeError:
                print("Error decoding Terraform output JSON.")
        else:
            print("Error retrieving Terraform outputs:")
            print(output_result.stderr)
    else:
        print("Error during Terraform apply:")
        print(apply_result.stderr)

    return None

# Wait until instance is in 'running' state
def wait_for_instance_running(instance_id):
    print(f"Waiting for instance {instance_id} to be in 'running' state...")
    waiter = ec2_client.get_waiter("instance_running")
    try:
        waiter.wait(InstanceIds=[instance_id])
        print(f"Instance {instance_id} is now running.")
    except Exception as e:
        raise RuntimeError(f"Error waiting for instance {instance_id} to be in running state: {e}")

# Get the public IP of the instance
def get_instance_public_ip(instance_id):
    print(f"Fetching public IP for instance {instance_id}...")
    try:
        response = ec2_client.describe_instances(InstanceIds=[instance_id])
        reservations = response.get("Reservations", [])
        for reservation in reservations:
            instances = reservation.get("Instances", [])
            for instance in instances:
                if instance.get("State", {}).get("Name") == "running":
                    return instance.get("PublicIpAddress")
    except Exception as e:
        print(f"Error fetching public IP: {e}")
    return None

# Store instance details in the PostgreSQL database
def store_instance_details_in_db(lab_id, instance_id, public_ip):
    try:
        conn = psycopg2.connect(**db_config)
        cursor = conn.cursor()

        cursor.execute(
            "INSERT INTO instances (lab_id, instance_id, public_ip, created_at) VALUES (%s, %s, %s, NOW())",
            (lab_id, instance_id, public_ip)
        )
        conn.commit()

        print(f"Instance ID {instance_id} with Public IP {public_ip} stored in the database.")
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Error storing instance details in the database: {e}")

# Main execution
if __name__ == "__main__":
    try:
        # Ensure lab_id is provided as a command-line argument
        if len(sys.argv) < 2:
            print("Usage: python script.py <lab_id>")
            sys.exit(1)

        lab_id = sys.argv[1]  # Get lab_id from command-line argument
        print(f"Using LAB_ID: {lab_id}")

        # Get the Terraform folder for the given lab_id
        tf_folder = get_terraform_folder(lab_id)
        if not tf_folder:
            print(f"No Terraform configuration found for LAB_ID: {lab_id}. Exiting.")
            sys.exit(1)

        # Initialize Terraform
        terraform_init(tf_folder)

        # Apply Terraform and retrieve instance ID
        instance_id = terraform_apply_and_get_instance_id(tf_folder)

        if instance_id:
            # Wait until the instance is running
            wait_for_instance_running(instance_id)

            # Fetch public IP
            public_ip = get_instance_public_ip(instance_id)
            if public_ip:
                print(f"Public IP of the instance: {public_ip}")

                # Store instance details in the database
                store_instance_details_in_db(lab_id, instance_id, public_ip)
            else:
                print("Failed to retrieve public IP for the instance.")
        else:
            print("Terraform apply did not return a valid instance ID.")
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
import subprocess
import psycopg2
import json
from datetime import datetime
import sys

lab_id = sys.argv[1]
# PostgreSQL database configuration
db_config = {
    "dbname": "golab",
    "user": "postgres",
    "password": "Corp@123",
    "host": "localhost",
    "port": 5432
}

# Function to get the most recent instance details
def get_recent_instance_details():
    # Step 1: Get the most recent instance ID
    result = subprocess.run(
        ["aws", "ec2", "describe-instances", "--query", "Reservations[0].Instances[0].InstanceId", "--output", "text"],
        capture_output=True, text=True
    )
    
    if result.returncode != 0:
        print("Error retrieving instance ID from AWS CLI.")
        print(result.stderr)
        return None

    instance_id = result.stdout.strip()
    print(f"Retrieved Instance ID: {instance_id}")

    # Step 2: Get the instance tags and extract the name
    result_tags = subprocess.run(
        ["aws", "ec2", "describe-instances", "--instance-ids", instance_id, "--query", "Reservations[0].Instances[0].Tags", "--output", "json"],
        capture_output=True, text=True
    )
    
    if result_tags.returncode != 0:
        print("Error retrieving tags from AWS CLI.")
        print(result_tags.stderr)
        return None

    try:
        tags = json.loads(result_tags.stdout)
        instance_name = next(tag["Value"] for tag in tags if tag["Key"] == "Name")
        print(f"Retrieved Instance Name: {instance_name}")
        return instance_id, instance_name
    except StopIteration:
        print(f"Instance {instance_id} does not have a 'Name' tag.")
        return instance_id, None

# Function to store instance details in the PostgreSQL database
def store_instance_details_in_db(instance_id, instance_name):
    try:
        conn = psycopg2.connect(**db_config)
        cursor = conn.cursor()

        # Insert the instance details into the database
        cursor.execute(
            "INSERT INTO instances (lab_id,instance_id, instance_name, created_at) VALUES (%s,%s, %s, NOW())",
            (instance_id, instance_name)
        )
        conn.commit()

        print(f"Instance ID {instance_id} and Name {instance_name} stored in the database.")

        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Error storing instance details in the database: {e}")

# Main function to retrieve and store the instance details
if __name__ == "__main__":
    instance_details = get_recent_instance_details()
    
    if instance_details:
        instance_id, instance_name = instance_details
        if instance_name is None:
            instance_name = "No Name Tag"
        store_instance_details_in_db(instance_id, instance_name)
    else:
        print("Failed to retrieve instance details.")
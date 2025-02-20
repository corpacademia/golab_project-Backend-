import boto3
import psycopg2
import sys

# PostgreSQL connection details
DB_CONFIG = {
    "dbname": "golab",
    "user": "postgres",
    "password": "Corp@123",
    "host": "localhost",
    "port": "5432"
}

def start_instance(instance_id):
    """Starts an AWS EC2 instance."""
    ec2 = boto3.resource('ec2')
    instance = ec2.Instance(instance_id)
    instance.start()
    print(f"Starting instance {instance_id}...")
    return instance_id

def get_public_ip(instance_id):
    """Retrieves the public IP of an EC2 instance after it starts."""
    ec2 = boto3.resource('ec2')
    instance = ec2.Instance(instance_id)
    
    print("Waiting for the instance to get a public IP...")
    instance.wait_until_running()  # Ensures the instance is running

    instance.reload()  # Refresh instance details
    return instance.public_ip_address

def update_public_ip(instance_id, public_ip, user_type):
    """Updates the public IP in the appropriate table based on user_type."""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()

        if user_type.lower() == "user":
            update_query = """
            UPDATE CloudAssignedInstance
            SET public_ip = %s
            WHERE instance_id = %s
            """
            table_name = "CloudAssignedInstance"
        else:
            update_query = """
            UPDATE Instances
            SET public_ip = %s
            WHERE instance_id = %s
            """
            table_name = "Instances"

        cursor.execute(update_query, (public_ip, instance_id))
        conn.commit()
        print(f"Updated public IP in '{table_name}' table for Instance ID {instance_id}: {public_ip}")

        cursor.close()
        conn.close()

    except psycopg2.Error as e:
        print(f"Error updating public IP: {e}")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python script.py <instance_id> <user_type>")
        sys.exit(1)

    # Get instance_id and user_type from command-line arguments
    instance_id = sys.argv[1]
    user_type = sys.argv[2]

    # Start the instance and get its public IP
    start_instance(instance_id)

    # Wait for the instance to be assigned a public IP
    public_ip = None
    while not public_ip:
        public_ip = get_public_ip(instance_id)

    print(f"Instance {instance_id} is running with Public IP: {public_ip}")

    # Update public IP in the database
    update_public_ip(instance_id, public_ip, user_type)
import boto3
import psycopg2
import sys

# AWS and Database Configuration
AWS_REGION = "us-east-1"  # e.g., "us-east-1"
DB_HOST = "localhost"
DB_NAME = "golab"
DB_USER = "postgres"
DB_PASSWORD = "Corp@123"
DB_TABLE = "instances"

def get_public_ip(instance_id):
    try:
        ec2_client = boto3.client("ec2", region_name=AWS_REGION)
        response = ec2_client.describe_instances(InstanceIds=[instance_id])
        
        public_ip = response["Reservations"][0]["Instances"][0].get("PublicIpAddress")
        if public_ip:
            return public_ip
        else:
            print(f"No public IP found for instance {instance_id}.")
            return None
    except Exception as e:
        print(f"Error retrieving public IP: {e}")
        return None

def update_database(instance_id, new_public_ip):
    try:
        conn = psycopg2.connect(
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            port="5432"
        )
        cursor = conn.cursor()

        update_query = f"""
            UPDATE {DB_TABLE}
            SET public_ip = %s
            WHERE instance_id = %s
        """
        cursor.execute(update_query, (new_public_ip, instance_id))
        conn.commit()

        print(f"Updated instance {instance_id} with new public IP: {new_public_ip}")

    except Exception as e:
        print(f"Database update failed: {e}")

    finally:
        if conn:
            cursor.close()
            conn.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python update_ip.py <instance_id>")
        sys.exit(1)

    instance_id = sys.argv[1]
    new_public_ip = get_public_ip(instance_id)

    if new_public_ip:
        update_database(instance_id, new_public_ip)
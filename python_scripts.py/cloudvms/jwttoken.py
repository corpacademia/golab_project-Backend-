import jwt
import sys
import boto3
from datetime import datetime, timedelta

# Define Guacamole secret key
SECRET_KEY = "4F9p2cINEx9vGnRkJVITMhJcZotzL0znSmiGEr4VXBQ="

# AWS Configuration
AWS_REGION = "us-east-1"
PRIVATE_KEY_PATH = "/home/user/app/py-jwt-generator/Aws2.pem"

# Initialize AWS EC2 client
ec2_client = boto3.client("ec2", region_name=AWS_REGION)

# Get default username based on OS type
def get_default_username(instance_id):
    try:
        response = ec2_client.describe_instances(InstanceIds=[instance_id])
        os_name = response["Reservations"][0]["Instances"][0]["PlatformDetails"]

        if "Windows" in os_name:
            return "Administrator"
        elif "Ubuntu" in os_name:
            return "ubuntu"
        elif "Amazon Linux" in os_name or "RHEL" in os_name or "SUSE" in os_name:
            return "ec2-user"
        elif "Debian" in os_name:
            return "admin"
        else:
            return "ec2-user"  # Default
    except Exception as e:
        return "ec2-user"  # Fallback

# Read arguments from Node.js
if len(sys.argv) < 4:
    print("Error: Missing required arguments")
    sys.exit(1)

os_name1 = sys.argv[1].strip().lower()  # 'ssh' or 'rdp'
instance_id = sys.argv[2]
hostname = sys.argv[3]
password = sys.argv[4] 
if len(sys.argv) > 4 else ""

# Generate JWT payload based on authentication type
if os_name1 == "windows":
    aws_username = get_default_username(instance_id)

    with open(PRIVATE_KEY_PATH, "r") as key_file:
        private_key_content = key_file.read()

    payload = {
        "GUAC_ID": f"linux_connection_{instance_id}",
        "guac.hostname": hostname,
        "guac.protocol": "ssh",
        "guac.port": "22",
        "guac.username": aws_username,
        "guac.private-key": private_key_content,
        "guac.passphrase": "",
        "exp": datetime.utcnow() + timedelta(seconds=36000)
    }

else:
    payload = {
        "GUAC_ID": f"windows_connection_{instance_id}",
        "guac.hostname": hostname,
        "guac.protocol": "rdp",
        "guac.port": "3389",
        "guac.username": "Administrator",
        "guac.password": password,  # From Node.js
        "guac.ignore-cert": "true",
        "guac.security": "nla",
        "exp": datetime.utcnow() + timedelta(seconds=36000)
    }

# Generate and return JWT token
jwtToken = jwt.encode(payload, SECRET_KEY, algorithm="HS256")

# Return token instead of printing it
sys.stdout.write(jwtToken)
import sys
import paramiko
import json
import time
import boto3

# AWS Configuration
AWS_REGION = "us-east-1"
PEM_PATH = r"C:\Users\Shilpa\Desktop\app.golabing - Copy\project\Backend\Aws2.pem"

# Initialize AWS SSM Client
ssm_client = boto3.client("ssm", region_name=AWS_REGION)

def get_instance_details(instance_id, public_ip):
    """Fetch instance details from AWS using instance ID"""
    try:
        ec2_client = boto3.client("ec2", region_name=AWS_REGION)

        response = ec2_client.describe_instances(InstanceIds=[instance_id])

        if not response["Reservations"]:
            return {"error": "Instance not found!"}

        instance = response["Reservations"][0]["Instances"][0]

        platform = instance.get("Platform", "Linux")  # Defaults to Linux

        return {
            "instance_id": instance_id,
            "public_ip": public_ip,
            "platform": platform
        }

    except Exception as e:
        return {"error": str(e)}

def get_default_username(os_name):
    """Return default username based on OS type"""
    return {
        "windows": "Administrator",
        "ubuntu": "ubuntu",
        "amazon linux": "ec2-user",
        "rhel": "ec2-user",
        "suse": "ec2-user",
        "debian": "admin"
    }.get(os_name.lower(), "ec2-user")  # Default to ec2-user

def get_linux_storage(instance):
    """Fetch storage used in Linux instance via SSH"""
    try:
        if instance["public_ip"] == "N/A":
            return -1  # No public IP, cannot connect via SSH

        username = get_default_username(instance["platform"])
        private_key = paramiko.RSAKey.from_private_key_file(PEM_PATH)

        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        client.connect(instance["public_ip"], username=username, pkey=private_key)

        stdin, stdout, stderr = client.exec_command("df -h --output=used / | tail -1")
        output = stdout.read().decode().strip()
        client.close()

        return int(float(output.replace("G", "").strip()))
    except Exception as e:
        print(f"Error: {e}")
        return -1

def get_windows_storage_ssm(instance):
    """Fetch storage used in Windows instance via AWS SSM"""
    try:
        command = '''
        $disk = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'"
        $usedGB = ($disk.Size - $disk.FreeSpace) / 1GB
        $usedGB = [math]::Round($usedGB, 0)
        Write-Output $usedGB
        '''

        response = ssm_client.send_command(
            InstanceIds=[instance["instance_id"]],
            DocumentName="AWS-RunPowerShellScript",
            Parameters={"commands": [command]},
        )

        command_id = response["Command"]["CommandId"]

        for _ in range(5):  # Retry 5 times
            time.sleep(3)  # Wait 3 seconds before checking output
            output = ssm_client.get_command_invocation(CommandId=command_id, InstanceId=instance["instance_id"])

            if output["Status"] in ["Pending", "InProgress"]:
                continue

            return int(float(output["StandardOutputContent"].strip()))

        return -1  # Failed to fetch storage
    except Exception as e:
        print(f"Error: {e}")
        return -1

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Usage: python script.py <instance_id> <public_ip>"}))
        sys.exit(1)

    # Read command-line arguments
    instance_id = sys.argv[1]
    public_ip = sys.argv[2]

    # Fetch instance details from AWS using the instance ID
    instance = get_instance_details(instance_id, public_ip)

    if "error" in instance:
        print(json.dumps(instance, indent=4))
        sys.exit(1)

    # Determine storage retrieval method based on OS
    os_type = instance["platform"].lower()
    if os_type == "windows":
        storage_used = get_windows_storage_ssm(instance)
    else:
        storage_used = get_linux_storage(instance)

    # Print output in JSON format
    print(json.dumps({
        "instance_id": instance["instance_id"],
        "public_ip": instance["public_ip"],
        "platform": instance["platform"],
        "storage_used_gb": storage_used
    }, indent=4))
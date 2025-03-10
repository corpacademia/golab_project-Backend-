import sys
import paramiko
import json
import time
import boto3

# AWS Configuration
AWS_REGION = "us-east-1"
PEM_PATH = r"C:\Users\Shilpa\Desktop\app.golabing - Copy\project\Backend\Aws2.pem"

# Initialize AWS Clients
ec2_client = boto3.client("ec2", region_name=AWS_REGION)
ssm_client = boto3.client("ssm", region_name=AWS_REGION)

def get_instance_details(instance_id):
    """Fetch instance details from AWS using instance ID"""
    try:
        response = ec2_client.describe_instances(InstanceIds=[instance_id])

        if not response["Reservations"]:
            return {"error": "Instance not found!"}

        instance = response["Reservations"][0]["Instances"][0]
        platform = instance.get("Platform", "Linux")  # Defaults to Linux
        public_ip = instance.get("PublicIpAddress", "N/A")

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
    }.get(os_name.lower(), "ec2-user")

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

        while True:  # Keep checking until we get a valid response
            time.sleep(3)
            output = ssm_client.get_command_invocation(CommandId=command_id, InstanceId=instance["instance_id"])

            if output["Status"] in ["Pending", "InProgress"]:
                continue

            return int(float(output["StandardOutputContent"].strip()))

    except Exception as e:
        print(f"Error: {e}")
        return -1

def edit_ec2_volume(instance_id, new_volume_size):
    """Resize EC2 root volume"""
    try:
        response = ec2_client.describe_instances(InstanceIds=[instance_id])
        instance = response["Reservations"][0]["Instances"][0]
        availability_zone = instance["Placement"]["AvailabilityZone"]
        root_device_name = instance["RootDeviceName"]

        # Identify Root Volume
        root_volume_id = next(
            (vol["Ebs"]["VolumeId"] for vol in instance["BlockDeviceMappings"] if vol["DeviceName"] == root_device_name),
            None,
        )
        if not root_volume_id:
            print("No root volume found!")
            return

        print(f"Root volume: {root_volume_id}")

        # Stop Instance
        print(f"Stopping instance {instance_id}...")
        ec2_client.stop_instances(InstanceIds=[instance_id])
        ec2_client.get_waiter("instance_stopped").wait(InstanceIds=[instance_id])
        print(f"Instance {instance_id} is stopped.")

        # Create Snapshot
        print(f"Creating snapshot of root volume {root_volume_id}...")
        snapshot_response = ec2_client.create_snapshot(
            VolumeId=root_volume_id,
            Description=f"Backup of root volume {root_volume_id}"
        )
        snapshot_id = snapshot_response["SnapshotId"]

        # Wait for snapshot to complete (indefinite wait)
        print(f"Waiting for snapshot {snapshot_id} to complete...")
        while True:
            time.sleep(30)
            snapshot_status = ec2_client.describe_snapshots(SnapshotIds=[snapshot_id])["Snapshots"][0]["State"]
            if snapshot_status == "completed":
                print(f"Snapshot {snapshot_id} created successfully!")
                break
            print(f"Snapshot {snapshot_id} is still {snapshot_status}... waiting")

        # Detach & Delete Old Root Volume
        print("Detaching the root volume...")
        ec2_client.detach_volume(VolumeId=root_volume_id)
        time.sleep(10)
        print(f"Root volume {root_volume_id} detached successfully.")

        print(f"Deleting the root volume {root_volume_id}...")
        ec2_client.delete_volume(VolumeId=root_volume_id)

        # Create New Volume
        # new_volume_size += 10  # Increase size by 10GB
        print(f"Creating new bootable volume of size {new_volume_size}GB...")
        new_volume_response = ec2_client.create_volume(
            SnapshotId=snapshot_id,
            Size=new_volume_size,
            VolumeType="gp3",
            AvailabilityZone=availability_zone,
            TagSpecifications=[{"ResourceType": "volume", "Tags": [{"Key": "Name", "Value": f"{instance_id}-new-root"}]}]
        )
        new_volume_id = new_volume_response["VolumeId"]

        # Wait until new volume is available
        ec2_client.get_waiter("volume_available").wait(VolumeIds=[new_volume_id])
        print(f"New volume {new_volume_id} available.")

        # Attach New Volume
        print("Attaching the new volume as root...")
        ec2_client.attach_volume(InstanceId=instance_id, VolumeId=new_volume_id, Device=root_device_name)
        print("New volume attached successfully.")

        # Start Instance
        print(f"Starting instance {instance_id}...")
        ec2_client.start_instances(InstanceIds=[instance_id])
        print(f"Instance {instance_id} started successfully with new root volume.")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    instance_id = "i-06856b2a8140be2af"

    # Fetch instance details
    instance = get_instance_details(instance_id)

    if "error" in instance:
        print(json.dumps(instance, indent=4))
        sys.exit(1)

    # Determine storage retrieval method based on OS
    os_type = instance["platform"].lower()
    if os_type == "windows":
        storage_used = get_windows_storage_ssm(instance)
    else:
        storage_used = get_linux_storage(instance)

    if storage_used == -1:
        print("Failed to retrieve storage usage.")
        sys.exit(1)

    # Increase volume by 10GB
    new_volume_size = storage_used + 10
    print(f"Current storage used: {storage_used}GB. Resizing to {new_volume_size}GB.")

    # Resize the EC2 instance volume
    edit_ec2_volume(instance_id, new_volume_size)

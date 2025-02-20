import boto3
import sys
from botocore.exceptions import NoCredentialsError, PartialCredentialsError
 
# AWS Configuration
region_name = "us-east-1"
 
# Initialize EC2 Client and Resource
ec2_client = boto3.client("ec2", region_name=region_name)
ec2_resource = boto3.resource("ec2", region_name=region_name)
 
def terminate_instance(instance_id):
    """Terminate an EC2 instance."""
    try:
        instance = ec2_resource.Instance(instance_id)
        if instance.state["Name"] == "terminated":
            print(f"Instance {instance_id} is already terminated.")
            return
        print(f"Terminating instance {instance_id}...")
        response = instance.terminate()
        state = response["TerminatingInstances"][0]["CurrentState"]["Name"]
        print(f"Instance {instance_id} is now in {state} state.")
 
        instance.wait_until_terminated()
        print(f"Instance {instance_id} is fully terminated.")
 
    except NoCredentialsError:
        print("AWS credentials not found. Please configure them.")
    except PartialCredentialsError:
        print("AWS credentials are incomplete. Please check your configuration.")
    except Exception as e:
        print(f"Error terminating instance {instance_id}: {e}")
 
def deregister_ami(ami_id):
    """Deregister an AMI and delete associated snapshots."""
    try:
        print(f"Deregistering AMI {ami_id}...")
        # Get AMI details
        response = ec2_client.describe_images(ImageIds=[ami_id])
        if not response["Images"]:
            print(f"AMI {ami_id} not found.")
            return
        # Get snapshot ID associated with the AMI
        snapshot_ids = [bdm["Ebs"]["SnapshotId"] for bdm in response["Images"][0]["BlockDeviceMappings"] if "Ebs" in bdm]
 
        # Deregister the AMI
        ec2_client.deregister_image(ImageId=ami_id)
        print(f"AMI {ami_id} deregistered successfully.")
 
        # Delete associated snapshots
        for snapshot_id in snapshot_ids:
            print(f"Deleting snapshot {snapshot_id}...")
            ec2_client.delete_snapshot(SnapshotId=snapshot_id)
            print(f"Snapshot {snapshot_id} deleted.")
 
    except NoCredentialsError:
        print("AWS credentials not found. Please configure them.")
    except PartialCredentialsError:
        print("AWS credentials are incomplete. Please check your configuration.")
    except Exception as e:
        print(f"Error deregistering AMI {ami_id}: {e}")
 
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python terminate_or_deregister.py <instance_id | ami_id>")
        sys.exit(1)
 
    aws_id = sys.argv[1]
 
    if aws_id.startswith("i-"):
        terminate_instance(aws_id)  # Handle instance termination
    elif aws_id.startswith("ami-"):
        deregister_ami(aws_id)  # Handle AMI deregistration
    else:
        print(f"Invalid AWS resource ID: {aws_id}. Expected an Instance ID (i-xxxx) or AMI ID (ami-xxxx).")


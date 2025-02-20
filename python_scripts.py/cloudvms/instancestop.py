import boto3
import sys

def stop_instance(instance_id):
    ec2_client = boto3.client('ec2', region_name="us-east-1")

    try:
        # Stop the instance
        response = ec2_client.stop_instances(InstanceIds=[instance_id])
        print(f"Stopping instance: {instance_id}")

        # Wait until the instance is stopped
        waiter = ec2_client.get_waiter('instance_stopped')
        waiter.wait(InstanceIds=[instance_id])
        
        print(f"Instance {instance_id} is now stopped.")
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    
    instance_id = sys.argv[1]
    

    stop_instance(instance_id)
    print(f"The Instance-{instance_id} is stopped successfully !")
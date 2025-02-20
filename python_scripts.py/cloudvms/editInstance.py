import boto3
import sys
import time

def Edit_ec2_volume(instance_id , new_volume_size):
    region = "us-east-1"
    ec2_client = boto3.client("ec2",region_name=region)
    
    #step 1 Get Instance Information
    response = ec2_client.describe_instances(InstanceIds=[instance_id])
    instance = response["Reservations"][0]["Instances"][0]
    availability_zone = instance["Placement"]["AvailabilityZone"]
    root_device_name = instance["RootDeviceName"]
    print(f"Instance {instance_id} is in {availability_zone}")
    print(f"Root device : {root_device_name}")
        
    #step 2 -> Identify Attached volume 
    root_volume_id = None
    for vol in instance["BlockDeviceMappings"]:
        if vol["DeviceName"]== root_device_name:
            root_volume_id = vol["Ebs"]["VolumeId"]
            break
    if not root_volume_id:
        print("No root volume id found")
        return
    print(f"Root volume: {root_volume_id}")
    
    # Step 3: stop the Instance 
    print("stopping instance {instance_id}....")
    ec2_client.stop_instances(InstanceIds=[instance_id])
    
    #wait to instance to stop
    ec2_client.get_waiter("instance_stopped").wait(InstanceIds=[instance_id])
    print(f"Instance - {instance_id} is stopped")
    
    #step 4 creating snapshot from root volume
    print(f"Creating snapshot of root volume {root_volume_id}...")
    snapshot_response = ec2_client.create_snapshot(
        VolumeId = root_volume_id,
        Description = f"Backup of root volume {root_volume_id}"
        
    )
    snapshot_id = snapshot_response["SnapshotId"]
    
    ec2_client.get_waiter("snapshot_completed").wait(SnapshotIds=[snapshot_id])
    print("Snapshot created successfully !")
    
    #Step 5: Detach the Root volume
    print("Detaching the root volume")
    ec2_client.detach_volume(VolumeId=root_volume_id)
    
    #wait for detachment
    time.sleep(10)
    print(f"Root volume {root_volume_id} detached successfully")
    
    #step 6 Delete the root volume
    print(f"Deleting the root volume {root_volume_id}")
    ec2_client.delete_volume(VolumeId=root_volume_id)
    
    #step 7 Create a New bootable volume
    print(f"Creating new bootable volume of size {new_volume_size}")
    new_volume_respose = ec2_client.create_volume(
        SnapshotId=snapshot_id,
        Size=new_volume_size,
        VolumeType="gp3",
        AvailabilityZone=availability_zone,
        TagSpecifications=[{"ResourceType": "volume", "Tags": [{"Key": "Name", "Value": f"{instance_id}-new-root"}]}]

    )
    new_volume_id = new_volume_respose["VolumeId"]
    print(f"new volume created {new_volume_id}")
    
    #Wait until new volume is available
    ec2_client.get_waiter("volume_available").wait(VolumeIds=[new_volume_id])
    print("new volume available")
    
    #step 8 Attach the new volume as Root
    print("Attaching the new volume as root")
    ec2_client.attach_volume(InstanceId=instance_id, VolumeId=new_volume_id,Device=root_device_name)
    print("New volume attached successfully")
    
    #step 9 start the instance
    print(f"starting instance ....{instance_id}")
    ec2_client.start_instances(InstanceIds=[instance_id])
    
    print(f"Instance - {instance_id} started successfully with new root volume")
    
    
if __name__ == "__main__":
    if len(sys.argv)!=3:
       sys.exit(1)
        
    instance_id = sys.argv[1]
    new_volume_size = int(sys.argv[2])
    
    Edit_ec2_volume(instance_id,new_volume_size)
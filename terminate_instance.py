
import boto3

def lambda_handler(event, context):
    ec2 = boto3.client('ec2', region_name='us-east-1')
    ec2.terminate_instances(InstanceIds=['i-09c7f5259ce87ea3d'])
    print("Instance i-09c7f5259ce87ea3d terminated.")

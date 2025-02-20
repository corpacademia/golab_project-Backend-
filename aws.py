import random
import string
import time
from datetime import datetime, timedelta
import sys

# AWS Clients
iam_client = boto3.client('iam')
sts_client = boto3.client('sts')

# List of Supported Services
SUPPORTED_SERVICES = [
    "Amazon EC2", "Amazon S3", "Amazon RDS", "Amazon DynamoDB",
    "AWS Lambda", "Amazon CloudWatch", "Amazon VPC", "AWS IAM",
    "Amazon API Gateway", "Amazon Route 53", "AWS Elastic Beanstalk",
    "Amazon SNS", "Amazon SQS", "AWS CloudFormation", "AWS Glue",
    "AWS Step Functions", "Amazon Redshift"
]

def get_account_id():
    """Retrieve AWS account ID."""
    try:
        return sts_client.get_caller_identity()["Account"]
    except Exception as e:
        print(f"Error retrieving account ID: {e}")
        return None

def generate_password():
    """Generate a random password for IAM users."""
    characters = string.ascii_letters + string.digits + "!@#$%^&*"
    return ''.join(random.choice(characters) for _ in range(12))

def generate_unique_username(prefix):
    """Generate a unique username by appending a random string."""
    random_string = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
    return f"{prefix}-{random_string}"

def create_iam_user(user_name_prefix, account_id):
    """Create an IAM user with a unique name and return credentials."""
    try:
        # Generate unique username
        user_name = generate_unique_username(user_name_prefix)
        
        # Create IAM user
        iam_client.create_user(UserName=user_name)

        # Create login profile for console access
        password = generate_password()
        iam_client.create_login_profile(
            UserName=user_name,
            Password=password,
            PasswordResetRequired=False
        )

        # Attach policies
        iam_client.attach_user_policy(
            UserName=user_name,
            PolicyArn="arn:aws:iam::aws:policy/AdministratorAccess"
        )

        # Generate access keys
        keys = iam_client.create_access_key(UserName=user_name)

        login_url = f"https://{account_id}.signin.aws.amazon.com/console"

        return {
            "UserName": user_name,
            "Password": password,
            "AccessKeyId": keys["AccessKey"]["AccessKeyId"],
            "SecretAccessKey": keys["AccessKey"]["SecretAccessKey"],
            "AccountId": account_id,
            "LoginURL": login_url
        }
    except Exception as e:
        print(f"Error creating IAM user: {e}")
        return None

def cleanup_user(user_name):
    """Clean up a specific IAM user."""
    try:
        # Delete login profile
        iam_client.delete_login_profile(UserName=user_name)
    except Exception:
        pass  # Login profile might not exist

    # Delete access keys
    keys = iam_client.list_access_keys(UserName=user_name)
    for key in keys['AccessKeyMetadata']:
        iam_client.delete_access_key(UserName=user_name, AccessKeyId=key['AccessKeyId'])

    # Detach policies
    iam_client.detach_user_policy(UserName=user_name, PolicyArn="arn:aws:iam::aws:policy/AdministratorAccess")
    
    # Delete the user
    iam_client.delete_user(UserName=user_name)
    print(f"Deleted IAM user: {user_name}")

def deploy_service(service_name, iam_user):
    """Simulate the deployment of AWS services for a given IAM user."""
    print(f"Deploying {service_name} for user {iam_user['UserName']}...")
    if service_name == "Amazon EC2":
        print(f"Simulated EC2 instance deployment for user {iam_user['UserName']}.")
    elif service_name == "Amazon S3":
        bucket_name = f"user-{iam_user['UserName']}-bucket-{random.randint(1000, 9999)}"
        print(f"Simulated S3 bucket creation: {bucket_name}.")
    else:
        print(f"{service_name} deployment simulation completed.")

def display_iam_details(users):
    """Display IAM user credentials in the Bash console."""
    print("\nIAM User Details:")
    print("=" * 50)
    for user in users:
        print(f"User Name: {user['UserName']}")
        print(f"Password: {user['Password']}")
        print(f"Access Key ID: {user['AccessKeyId']}")
        print(f"Secret Access Key: {user['SecretAccessKey']}")
        print(f"Account ID: {user['AccountId']}")
        print(f"Login URL: {user['LoginURL']}")
        print("=" * 50)

def main():
    print("Supported AWS Services:")
    for idx, service in enumerate(SUPPORTED_SERVICES, start=1):
        print(f"{idx}. {service}")
    
    # Parse inputs
    services_input = sys.argv[1]
    iam_user_count = int(sys.argv[2])
    duration_days = int(sys.argv[3])
    duration_hours = int(sys.argv[4])

    # services_input = '1,2'
    # iam_user_count = 1
    # duration_days = 1
    # duration_hours = 1

    # Parse selected services
    selected_indices = [int(i.strip()) - 1 for i in services_input.split(",")]
    selected_services = [SUPPORTED_SERVICES[i] for i in selected_indices if 0 <= i < len(SUPPORTED_SERVICES)]

    if not selected_services:
        print("No services selected. Exiting.")
        return

    account_id = get_account_id()
    if not account_id:
        print("Unable to retrieve AWS account ID. Exiting.")
        return

    # Create IAM users
    users = []
    for _ in range(iam_user_count):
        credentials = create_iam_user("user", account_id)
        if credentials:
            users.append(credentials)

    # Display IAM user details
    display_iam_details(users)

    # Deploy services for each IAM user
    for user in users:
        for service in selected_services:
            deploy_service(service, user)

    # Simulate resource lifecycle
    end_time = datetime.now() + timedelta(days=duration_days, hours=duration_hours)
    print(f"\nResources will run until: {end_time.strftime('%Y-%m-%d %H:%M:%S')}")

    print("\nCleaning up IAM users...")
    for user in users:
        cleanup_user(user["UserName"])

    print("\nCleanup completed.")

if __name__ == "_main_":
    main()
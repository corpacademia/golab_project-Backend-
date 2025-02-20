from flask import Flask, jsonify
import psycopg2
import subprocess
import json
from azure.identity import DefaultAzureCredential
from azure.mgmt.compute import ComputeManagementClient
from azure.mgmt.resource import ResourceManagementClient
import boto3
 
# Flask app initialization
app = Flask(__name__)
 
# AWS client setup
ec2 = boto3.client("ec2", region_name="us-east-1")
 
# Azure client setup
credential = DefaultAzureCredential()
subscription_id = "906f7810-bdc2-4080-a28e-408e2e9665a4"  # Replace with your Azure subscription ID
compute_client = ComputeManagementClient(credential, subscription_id)
resource_group_name = "GoldenImageGroup"  # Replace with your resource group name
 
# Step 1: Fetch instance data from the PostgreSQL database
def fetch_instance_data():
    database_config = {
        'user': 'postgres',
        'host': 'localhost',
        'database': 'golab',
        'password': 'Corp@123',
        'port': 5432,
    }
    query = "SELECT instance, storage, provider, os FROM createlab ORDER BY created_at DESC LIMIT 1;"
 
    conn = psycopg2.connect(**database_config)
    cursor = conn.cursor()
    cursor.execute(query)
    result = cursor.fetchone()
    conn.close()
 
    if not result:
        raise ValueError("No data found in the database.")
    instance_type, storage_size, provider, os = result
    return instance_type, storage_size, provider, os
 
# AWS Functions
def create_aws_instance(instance_type, storage_size, os):
    # AWS AMI mapping
    os_to_ami = {
        "windows": "ami-05b4ded3ceb71e470",  # Example Windows AMI
        "linux": "ami-12345678abcd12345",    # Example generic Linux AMI
        "ubuntu": "ami-0dba2cb6798deb6d8",   # Example Ubuntu AMI
        "redhat": "ami-08f3d892de259504d",   # Example Red Hat AMI
    }
    if os not in os_to_ami:
        raise ValueError(f"Unsupported OS for AWS: {os}")
 
    ami_id = os_to_ami[os]
 
    # Generate Terraform configuration
    terraform_config = f"""
    provider "aws" {{
      region = "us-east-1"
    }}
 
    resource "aws_instance" "example" {{
      ami           = "{ami_id}"
      instance_type = "{instance_type}"
 
      root_block_device {{
        volume_size = {storage_size}
        volume_type = "gp2"
      }}
 
      tags = {{
        Name = "GoldenImageInstance"
      }}
    }}
    """
 
    with open("main.tf", "w") as file:
        file.write(terraform_config)
    print("AWS Terraform configuration file generated.")
 
    # Execute Terraform commands
    subprocess.run(["terraform", "init"], check=True)
    subprocess.run(["terraform", "apply", "-auto-approve"], check=True)
    print("AWS Instance created successfully.")
 
# Azure Functions
def create_azure_vm(instance_type, storage_size, os):
    # Azure image reference mapping
    os_to_image = {
        "windows": "MicrosoftWindowsServer:WindowsServer:2019-Datacenter:latest",
        "linux": "Canonical:UbuntuServer:18.04-LTS:latest",
        "ubuntu": "Canonical:UbuntuServer:20.04-LTS:latest",
        "redhat": "RedHat:RHEL:8_5:latest",
    }
    if os not in os_to_image:
        raise ValueError(f"Unsupported OS for Azure: {os}")
 
    azure_image = os_to_image[os]
 
    # Generate Terraform configuration
    terraform_config = f"""
    provider "azurerm" {{
      features {{}}
    }}
 
    resource "azurerm_resource_group" "example" {{
      name     = "{resource_group_name}"
      location = "East US"
    }}
 
    resource "azurerm_virtual_machine" "example" {{
      name                  = "GoldenImageVM"
      location              = azurerm_resource_group.example.location
      resource_group_name   = azurerm_resource_group.example.name
      vm_size               = "{instance_type}"
 
      storage_os_disk {{
        name              = "osdisk"
        caching           = "ReadWrite"
        create_option     = "FromImage"
        managed_disk_type = "Standard_LRS"
        disk_size_gb      = {storage_size}
      }}
 
      os_profile {{
        computer_name  = "vmexample"
        admin_username = "azureuser"
        admin_password = "YourP@ssw0rd!"
      }}
 
      network_interface_ids = []
 
      source_image_reference {{
        publisher = "{azure_image.split(':')[0]}"
        offer     = "{azure_image.split(':')[1]}"
        sku       = "{azure_image.split(':')[2]}"
        version   = "{azure_image.split(':')[3]}"
      }}
    }}
    """
 
    with open("main.tf", "w") as file:
        file.write(terraform_config)
    print("Azure Terraform configuration file generated.")
 
    # Execute Terraform commands
    subprocess.run(["terraform", "init"], check=True)
    subprocess.run(["terraform", "apply", "-auto-approve"], check=True)
    print("Azure VM created successfully.")
 
# Main Application Logic
@app.route("/")
def home():
    try:
        instance_type, storage_size, provider, os = fetch_instance_data()
 
        if provider == "aws":
            create_aws_instance(instance_type, storage_size, os)
        elif provider == "azure":
            create_azure_vm(instance_type, storage_size, os)
        else:
            raise ValueError("Unsupported provider.")
 
        return jsonify({"message": "Instance/VM created successfully."})
 
    except Exception as e:
        return jsonify({"error": str(e)}), 500
 
if __name__ == "__main__":
    app.run(port=5000)
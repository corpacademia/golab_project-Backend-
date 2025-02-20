from flask import Flask, jsonify, request
import psycopg2
import subprocess
from azure.identity import DefaultAzureCredential
from azure.mgmt.compute import ComputeManagementClient
from azure.mgmt.resource import ResourceManagementClient
import time
import json
 
# Flask app initialization
app = Flask(__name__)
 
# Azure client setup
credential = DefaultAzureCredential()
subscription_id = "906f7810-bdc2-4080-a28e-408e2e9665a4"  # Replace with your Azure subscription ID
compute_client = ComputeManagementClient(credential, subscription_id)
resource_client = ResourceManagementClient(credential, subscription_id)
 
# Resource group name
resource_group_name = "resource_group_1"  # Replace with your resource group name
 
# Step 1: Fetch instance data from the PostgreSQL database
def fetch_instance_data():
    database_config = {
        'user': 'postgres',
        'host': 'localhost',
        'database': 'golab',
        'password': 'Corp@123',
        'port': 5432,
    }
    query = "SELECT instance, storage FROM createlab ORDER BY created_at DESC LIMIT 1;"  # Modify query as needed
 
    conn = psycopg2.connect(**database_config)
    cursor = conn.cursor()
    cursor.execute(query)
    result = cursor.fetchone()
    conn.close()
 
    if not result:
        raise ValueError("No data found in the database.")
    vm_size, disk_size_gb = result
    return vm_size, disk_size_gb
 
# Step 2: Generate Terraform configuration file
def generate_terraform_file(vm_size, disk_size_gb):
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
      vm_size               = "{vm_size}"
 
      storage_os_disk {{
        name              = "osdisk"
        caching           = "ReadWrite"
        create_option     = "FromImage"
        managed_disk_type = "Standard_LRS"
        disk_size_gb      = {disk_size_gb}
      }}
 
      os_profile {{
        computer_name  = "vmexample"
        admin_username = "azureuser"
        admin_password = "YourP@ssw0rd!"  # Replace with a secure password
      }}
 
      os_profile_windows_config {{}}
 
      network_interface_ids = [
        azurerm_network_interface.example.id,
      ]
    }}
 
    resource "azurerm_network_interface" "example" {{
      name                = "example-nic"
      location            = azurerm_resource_group.example.location
      resource_group_name = azurerm_resource_group.example.name
 
      ip_configuration {{
        name                          = "internal"
        subnet_id                     = azurerm_subnet.example.id
        private_ip_address_allocation = "Dynamic"
      }}
    }}
 
    resource "azurerm_subnet" "example" {{
      name                 = "example-subnet"
      resource_group_name  = azurerm_resource_group.example.name
      virtual_network_name = azurerm_virtual_network.example.name
      address_prefixes     = ["10.0.2.0/24"]
    }}
 
    resource "azurerm_virtual_network" "example" {{
      name                = "example-vnet"
      location            = azurerm_resource_group.example.location
      resource_group_name = azurerm_resource_group.example.name
      address_space       = ["10.0.0.0/16"]
    }}
    """
 
    with open("main.tf", "w") as file:
        file.write(terraform_config)
    print("Terraform configuration file generated.")
 
# Step 3: Run Terraform commands
def run_terraform():
    try:
        subprocess.run(["terraform", "init"], check=True)
        subprocess.run(["terraform", "apply", "-auto-approve"], check=True)
    except subprocess.CalledProcessError as e:
        raise RuntimeError(f"Terraform execution failed: {e}")
 
# Step 4: Create a managed image
def create_managed_image():
    # Retrieve VM details from Terraform state
    result = subprocess.run(["terraform", "show", "-json"], capture_output=True, text=True, check=True)
    terraform_output = json.loads(result.stdout)
 
    vm_id = terraform_output["values"]["root_module"]["resources"][0]["values"]["id"]
    image_name = f"GoldenImage-{int(time.time())}"
    async_image_creation = compute_client.images.begin_create_or_update(
        resource_group_name,
        image_name,
        {
            "location": "East US",
            "source_virtual_machine": {"id": vm_id}
        }
    )
    image_result = async_image_creation.result()
    return image_result.id, image_name
 
# Step 5: Store Image ID in the PostgreSQL database
def store_image_in_database(image_id, image_name):
    database_config = {
        'user': 'postgres',
        'host': 'localhost',
        'database': 'golab',
        'password': 'Corp@123',
        'port': 5432,
    }
    query = """
    CREATE TABLE IF NOT EXISTS golden_images (
        id SERIAL PRIMARY KEY,
        image_id TEXT NOT NULL,
        image_name TEXT NOT NULL
    );
 
    INSERT INTO golden_images (image_id, image_name) VALUES (%s, %s);
    """
 
    conn = psycopg2.connect(**database_config)
    cursor = conn.cursor()
    cursor.execute(query.split(";")[0])  # Create table if not exists
    cursor.execute(query.split(";")[1], (image_id, image_name))  # Insert data
    conn.commit()
    conn.close()
 
# API to trigger the golden image creation
@app.route("/create-golden-image", methods=["GET"])
def create_golden_image_api():
    try:
        # Fetch instance details
        vm_size, disk_size_gb = fetch_instance_data()
        generate_terraform_file(vm_size, disk_size_gb)
        run_terraform()
        image_id, image_name = create_managed_image()
        store_image_in_database(image_id, image_name)
 
        return jsonify({
            "message": "Golden image created successfully",
            "Image_ID": image_id,
            "Image_Name": image_name
        })
 
    except Exception as e:
        return jsonify({"error": str(e)}), 500
 
if __name__ == "__main__":
    try:
        # Fetch instance details, generate Terraform configuration, run Terraform and create a golden image
        vm_size, disk_size_gb = fetch_instance_data()
        generate_terraform_file(vm_size, disk_size_gb)
        run_terraform()
        image_id, image_name = create_managed_image()
        store_image_in_database(image_id, image_name)
 
        print(f"Image ID: {image_id}")
        print(f"Golden Image created with ID: {image_id}")
        app.run(port=5000)
    except Exception as e:
        print(f"Error: {e}")
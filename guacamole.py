import jwt
import requests
import json
from datetime import datetime, timedelta, timezone

# Guacamole server details
GUACAMOLE_URL = "http://192.168.1.210:8080/guacamole/#/?"

# Secret Key for JWT authentication (must match guacamole.properties)
SECRET_KEY = "4F9p2cINEx9vGnRkJVITMhJcZotzL0znSmiGEr4VXBQ="

# Instance details (Update these)
INSTANCE_IP = "44.204.77.221"  # Replace with your instance IP
USERNAME = "Administrator"      # Instance username
PASSWORD = "5OJFUoT2w(-k.op6XHDBOPYzUfyfY2nt"  # Instance password
PROTOCOL = "rdp"  # Change to "ssh" or "vnc" if needed
PORT = "33207" if PROTOCOL == "rdp" else "22"

# Function to generate JWT token
def generate_jwt_token():
    """Generate JWT token for Guacamole authentication."""
    payload = {
        'GUAC_ID': 'test-session',  # Unique session ID
        'guac.hostname': INSTANCE_IP,
        'guac.protocol': PROTOCOL,
        'guac.port': PORT,
        'guac.username': USERNAME,
        'guac.password': PASSWORD,
        'guac.ignore-cert': 'true',
        'exp': datetime.now(timezone.utc) + timedelta(seconds=36000)  # Token expiry (10 hours)
    }

    token = jwt.encode(payload, SECRET_KEY, algorithm='HS256')
    return token

# Function to get connection ID
def get_connection_id(token):
    """Fetch the connection ID from Guacamole based on the instance IP."""
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        connections_response = requests.get(
            f"{GUACAMOLE_URL}/api/session/data/postgresql/connections/",
            headers=headers,
        )

        # Debugging: Print the raw response
        print("🔹 Get Connections Response:", connections_response.status_code, connections_response.text)

        if connections_response.status_code != 200:
            raise Exception(f"Failed to fetch connections: {connections_response.text}")

        connections = connections_response.json()
        
        # Find the correct connection ID by IP address
        for conn_id, details in connections.items():
            if details.get("parameters", {}).get("hostname") == INSTANCE_IP:
                return conn_id  # Return the found connection ID

    except json.JSONDecodeError:
        raise Exception("Error: Failed to parse response JSON. Possible empty response.")

    return None  # Connection not found

# Function to create a new connection
def create_connection(token):
    """Create a new connection in Guacamole."""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

    connection_data = {
        "parentIdentifier": "ROOT",
        "name": f"Instance-{INSTANCE_IP}",
        "protocol": PROTOCOL,
        "parameters": {
            "hostname": INSTANCE_IP,
            "port": PORT,
            "username": USERNAME,
            "password": PASSWORD,
            "ignore-cert": "true",
        }
    }

    try:
        create_response = requests.post(
            f"{GUACAMOLE_URL}/api/session/data/postgresql/connections",
            headers=headers,
            data=json.dumps(connection_data),
        )

        # Debugging: Print the raw response
        print("🔹 Create Connection Response:", create_response.status_code, create_response.text)

        if create_response.status_code != 200:
            raise Exception(f"Failed to create connection: {create_response.text}")

        return create_response.json().get("identifier")

    except json.JSONDecodeError:
        raise Exception("Error: Failed to parse response JSON. Possible empty response.")

# Function to generate direct connection URL
def generate_connection_url():
    """Ensure the connection exists, then generate the direct launch URL."""
    try:
        token = generate_jwt_token()
        connection_id = get_connection_id(token)

        if not connection_id:
            print("🔹 Connection not found. Creating a new one...")
            connection_id = create_connection(token)

        if not connection_id:
            return "❌ Error: Connection ID not found or created."

        # Construct the direct URL
        connection_url = f"{GUACAMOLE_URL}token={token}"
        return connection_url

    except Exception as e:
        return f"❌ Error: {str(e)}"

# Generate and print the direct connection URL
direct_link = generate_connection_url()
print("✅ Direct Launch URL:", direct_link)

import jwt
import requests
from datetime import datetime, timedelta, timezone

def generate_token():
    # Define the secret key (must match guacamole.properties)
    SECRET_KEY = "4F9p2cINEx9vGnRkJVITMhJcZotzL0znSmiGEr4VXBQ="

    # Define JWT payload (following Guacamole syntax)
    payload = {
        'GUAC_ID': 'test',  # Unique session ID (can be any string)
        'guac.hostname': '106.51.92.103',  # IP of the RDP server
        'guac.protocol': 'rdp',  # Protocol type
        'guac.port': '33207',  # RDP port
        'guac.username': 'administrator',  # RDP username
        'guac.password': 'SdW@n@123',  # RDP password
        'guac.ignore-cert': 'true',  # Ignore RDP certificate errors
        'exp': datetime.now(timezone.utc) + timedelta(seconds=36000)  # Expiration time (10 hours)
    }

    # Generate JWT token with HS256 algorithm
    jwt_token = jwt.encode(payload, SECRET_KEY, algorithm='HS256')

    # Print the generated token
    print("Generated JWT Token:")
    print(jwt_token)  # No need to decode

    return jwt_token  # Return as a string

if __name__ == '__main__':
    generate_token()

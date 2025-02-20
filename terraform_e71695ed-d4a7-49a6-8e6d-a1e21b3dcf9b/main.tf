
    provider "aws" {
      region = "us-east-1"
    }
 
    resource "aws_instance" "e71695ed-d4a7-49a6-8e6d-a1e21b3dcf9b" {
      ami           = "ami-032ec7a32b7fb247c"
      instance_type = "t3.small"
      key_name      = "Aws2"
 
      vpc_security_group_ids = ["sg-038ccec9310169fce"]
 
      root_block_device {
        volume_size = 50
        volume_type = "gp2"
      }
 
      tags = {
        Name = "aa-e71695ed-d4a7-49a6-8e6d-a1e21b3dcf9b"
      }
    }
    
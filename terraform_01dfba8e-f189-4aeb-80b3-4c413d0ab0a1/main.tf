
    provider "aws" {
      region = "us-east-1"
    }
 
    resource "aws_instance" "01dfba8e-f189-4aeb-80b3-4c413d0ab0a1" {
      ami           = "ami-032ec7a32b7fb247c"
      instance_type = "t3.small"
      key_name      = "Aws2"
 
      vpc_security_group_ids = ["sg-038ccec9310169fce"]
 
      root_block_device {
        volume_size = 50
        volume_type = "gp2"
      }
 
      tags = {
        Name = "aa-01dfba8e-f189-4aeb-80b3-4c413d0ab0a1"
      }
    }
    
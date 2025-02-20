
    provider "aws" {
      region = "us-east-1"
    }
 
    resource "aws_instance" "415ef041-0460-4d0e-8382-8cbc7b353f4d" {
      ami           = "ami-090a624d5b9b3792c"
      instance_type = "t3.small"
      key_name      = "Aws2"
 
      vpc_security_group_ids = ["sg-038ccec9310169fce"]
 
      root_block_device {
        volume_size = 50
        volume_type = "gp2"
      }
 
      tags = {
        Name = "qa-415ef041-0460-4d0e-8382-8cbc7b353f4d"
      }
    }
    
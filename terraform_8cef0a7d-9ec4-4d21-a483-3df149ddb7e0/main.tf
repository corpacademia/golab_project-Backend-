
    provider "aws" {
      region = "us-east-1"
    }
 
    resource "aws_instance" "aws_8cef0a7d-9ec4-4d21-a483-3df149ddb7e0" {
      ami           = "ami-090a624d5b9b3792c"
      instance_type = "t3.small"
      key_name      = "Aws2"
 
      vpc_security_group_ids = ["sg-038ccec9310169fce"]
 
      root_block_device {
        volume_size = 50
        volume_type = "gp2"
      }
 
      tags = {
        Name = "ec2-8cef0a7d-9ec4-4d21-a483-3df149ddb7e0"
      }
    }
    
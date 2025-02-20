
    provider "aws" {
      region = "us-east-1"
    }
 
    resource "aws_instance" "aws_6a458979-aa6f-4931-b7a9-203e7a619828" {
      ami           = "ami-090a624d5b9b3792c"
      instance_type = "t3.small"
      key_name      = "Aws2"
 
      vpc_security_group_ids = ["sg-038ccec9310169fce"]
 
      root_block_device {
        volume_size = 50
        volume_type = "gp2"
      }
 
      tags = {
        Name = "q-6a458979-aa6f-4931-b7a9-203e7a619828"
      }
    }
    

    provider "aws" {
      region = "us-east-1"
    }
 
    resource "aws_instance" "4f58bf71-0c9f-4ee4-9423-a268dd6e8701" {
      ami           = "ami-090a624d5b9b3792c"
      instance_type = "t3.small"
      key_name      = "Aws2"
 
      vpc_security_group_ids = ["sg-038ccec9310169fce"]
 
      root_block_device {
        volume_size = 50
        volume_type = "gp2"
      }
 
      tags = {
        Name = "we-4f58bf71-0c9f-4ee4-9423-a268dd6e8701"
      }
    }
    
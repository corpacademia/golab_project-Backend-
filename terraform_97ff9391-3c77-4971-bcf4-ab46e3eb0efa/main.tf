
    provider "aws" {
      region = "us-east-1"
    }
 
    resource "aws_instance" "resource_97ff9391_3c77_4971_bcf4_ab46e3eb0efa" {
      ami           = "ami-090a624d5b9b3792c"
      instance_type = "t3.small"
      key_name      = "Aws2"
 
      vpc_security_group_ids = ["sg-038ccec9310169fce"]
 
      root_block_device {
        volume_size = 50
        volume_type = "gp2"
      }
 
      tags = {
        Name = "ee-97ff9391-3c77-4971-bcf4-ab46e3eb0efa"
      }
    }
    
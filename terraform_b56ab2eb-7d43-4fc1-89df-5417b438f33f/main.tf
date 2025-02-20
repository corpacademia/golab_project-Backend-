
    provider "aws" {
      region = "us-east-1"
    }
 
    resource "aws_instance" "aws_b56ab2eb-7d43-4fc1-89df-5417b438f33f" {
      ami           = "ami-090a624d5b9b3792c"
      instance_type = "t3.small"
      key_name      = "Aws2"
 
      vpc_security_group_ids = ["sg-038ccec9310169fce"]
 
      root_block_device {
        volume_size = 50
        volume_type = "gp2"
      }
 
      tags = {
        Name = "ec-b56ab2eb-7d43-4fc1-89df-5417b438f33f"
      }
    }

    output "instance_id" {
      value = aws_instance.aws_b56ab2eb-7d43-4fc1-89df-5417b438f33f.id
    }
    
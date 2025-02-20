
    provider "aws" {
      region = "us-east-1"
    }
 
    resource "aws_instance" "aws_2b10ebd0-6d91-4b27-a672-4189b2a6afa7" {
      ami           = "ami-0fab25cbd44603919"
      instance_type = "t3.small"
      key_name      = "Aws2"
 
      vpc_security_group_ids = ["sg-038ccec9310169fce"]
 
      root_block_device {
        volume_size = 50
        volume_type = "gp2"
      }
 
      tags = {
        Name = "newInstance-2b10ebd0-6d91-4b27-a672-4189b2a6afa7"
      }
    }

    output "instance_id" {
      value = aws_instance.aws_2b10ebd0-6d91-4b27-a672-4189b2a6afa7.id
    }
    

    provider "aws" {
      region = "us-east-1"
    }

    resource "aws_instance" "aws_ae11e51f-17de-40c8-91d9-8c311cc1ab67" {
      ami           = "ami-0fab25cbd44603919"
      instance_type = "t3.small"
      key_name      = "Aws2"

      vpc_security_group_ids = ["sg-038ccec9310169fce"]

      root_block_device {
        volume_size = 50
        volume_type = "gp2"
      }

      tags = {
        Name = "corp lab-ae11e51f-17de-40c8-91d9-8c311cc1ab67"
      }
    }

    output "instance_id" {
      value = aws_instance.aws_ae11e51f-17de-40c8-91d9-8c311cc1ab67.id
    }
    

    provider "aws" {
      region = "us-east-1"
    }

    resource "aws_instance" "aws_1373b2d3-77e8-4bbf-a6d7-fc4f6208781a" {
      ami           = "ami-090a624d5b9b3792c"
      instance_type = "t3.small"
      key_name      = "Aws2"

      vpc_security_group_ids = ["sg-038ccec9310169fce"]

      root_block_device {
        volume_size = 50
        volume_type = "gp2"
      }

      tags = {
        Name = "aa-1373b2d3-77e8-4bbf-a6d7-fc4f6208781a"
      }
    }

    output "instance_id" {
      value = aws_instance.aws_1373b2d3-77e8-4bbf-a6d7-fc4f6208781a.id
    }
    
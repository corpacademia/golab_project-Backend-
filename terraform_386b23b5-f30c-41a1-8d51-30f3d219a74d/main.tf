
    provider "aws" {
      region = "us-east-1"
    }

    resource "aws_instance" "aws_386b23b5-f30c-41a1-8d51-30f3d219a74d" {
      ami           = "ami-xxxxxxx"
      instance_type = "t3.small"
      key_name      = "Aws2"

      vpc_security_group_ids = ["sg-038ccec9310169fce"]

      root_block_device {
        volume_size = 50
        volume_type = "gp2"
      }

      tags = {
        Name = "newLab-386b23b5-f30c-41a1-8d51-30f3d219a74d"
      }
    }

    output "instance_id" {
      value = aws_instance.aws_386b23b5-f30c-41a1-8d51-30f3d219a74d.id
    }
    

    provider "aws" {
      region = "us-east-1"
    }

    resource "aws_instance" "aws_3470215d-52c4-4bb8-9a0e-5119a92d5c98" {
      ami           = "ami-090a624d5b9b3792c"
      instance_type = "t3.small"
      key_name      = "Aws2"

      vpc_security_group_ids = ["sg-038ccec9310169fce"]

      root_block_device {
        volume_size = 50
        volume_type = "gp2"
      }

      tags = {
        Name = "newOne-3470215d-52c4-4bb8-9a0e-5119a92d5c98"
      }
    }

    output "instance_id" {
      value = aws_instance.aws_3470215d-52c4-4bb8-9a0e-5119a92d5c98.id
    }
    
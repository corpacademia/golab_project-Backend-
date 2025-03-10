
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.82.2"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

resource "aws_instance" "app" {
  ami           = "ami-0ae48c6202b11e31d"
  instance_type = "t3.small"

  user_data = <<-EOF
              #!/bin/bash
              sudo yum update -y
              sudo amazon-linux-extras enable epel
              sudo yum install -y httpd
              EOF

  tags = {
    Name = "A1_34c17183-06ed-46d0-b1f8-49caef71ed1e"
  }
}

output "instance_id" {
  value = aws_instance.app.id
}

output "public_ip" {
  value = aws_instance.app.public_ip
}


provider "aws" {
  region = "us-east-1"
}

# IAM Role for SSM with AmazonSSMManagedInstanceCore policy attached
resource "aws_iam_role" "ssm_role_515a48c2-84d6-445e-a66b-8cf6578f1d64" {
  name = "ssm_role_515a48c2-84d6-445e-a66b-8cf6578f1d64"
  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ec2.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF
}

resource "aws_iam_role_policy_attachment" "ssm_role_attach_515a48c2-84d6-445e-a66b-8cf6578f1d64" {
  role       = aws_iam_role.ssm_role_515a48c2-84d6-445e-a66b-8cf6578f1d64.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "ssm_instance_profile_515a48c2-84d6-445e-a66b-8cf6578f1d64" {
  name = "ssm_instance_profile_515a48c2-84d6-445e-a66b-8cf6578f1d64"
  role = aws_iam_role.ssm_role_515a48c2-84d6-445e-a66b-8cf6578f1d64.name
}

# EC2 instance resource with the IAM instance profile attached
resource "aws_instance" "aws_515a48c2-84d6-445e-a66b-8cf6578f1d64" {
  ami           = "ami-04b4f1a9cf54c11d0"
  instance_type = "t3.small"
  key_name      = "Aws2"
  vpc_security_group_ids = ["sg-038ccec9310169fce"]

  root_block_device {
    volume_size = 50
    volume_type = "gp2"
    encrypted = true
  }

  iam_instance_profile = aws_iam_instance_profile.ssm_instance_profile_515a48c2-84d6-445e-a66b-8cf6578f1d64.name

  tags = {
    Name = "aa-515a48c2-84d6-445e-a66b-8cf6578f1d64"
  }
}

output "instance_id" {
  value = aws_instance.aws_515a48c2-84d6-445e-a66b-8cf6578f1d64.id
}

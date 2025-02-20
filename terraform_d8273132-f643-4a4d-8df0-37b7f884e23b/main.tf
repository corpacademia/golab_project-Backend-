
provider "aws" {
  region = "us-east-1"
}

# IAM Role for SSM with AmazonSSMManagedInstanceCore policy attached
resource "aws_iam_role" "ssm_role_d8273132-f643-4a4d-8df0-37b7f884e23b" {
  name = "ssm_role_d8273132-f643-4a4d-8df0-37b7f884e23b"
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

resource "aws_iam_role_policy_attachment" "ssm_role_attach_d8273132-f643-4a4d-8df0-37b7f884e23b" {
  role       = aws_iam_role.ssm_role_d8273132-f643-4a4d-8df0-37b7f884e23b.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "ssm_instance_profile_d8273132-f643-4a4d-8df0-37b7f884e23b" {
  name = "ssm_instance_profile_d8273132-f643-4a4d-8df0-37b7f884e23b"
  role = aws_iam_role.ssm_role_d8273132-f643-4a4d-8df0-37b7f884e23b.name
}

# EC2 instance resource with the IAM instance profile attached
resource "aws_instance" "aws_d8273132-f643-4a4d-8df0-37b7f884e23b" {
  ami           = "ami-04f77c9cd94746b09"
  instance_type = "t3.small"
  key_name      = "Aws2"
  vpc_security_group_ids = ["sg-038ccec9310169fce"]

  root_block_device {
    volume_size = 50
    volume_type = "gp2"
  }

  iam_instance_profile = aws_iam_instance_profile.ssm_instance_profile_d8273132-f643-4a4d-8df0-37b7f884e23b.name

  tags = {
    Name = "test-d8273132-f643-4a4d-8df0-37b7f884e23b"
  }
}

output "instance_id" {
  value = aws_instance.aws_d8273132-f643-4a4d-8df0-37b7f884e23b.id
}

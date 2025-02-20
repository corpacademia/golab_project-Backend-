
provider "aws" {
  region = "us-east-1"
}

# IAM Role for SSM with AmazonSSMManagedInstanceCore policy attached
resource "aws_iam_role" "ssm_role_a7f25bce-a0d4-4e15-bdfb-45f082b9551c" {
  name = "ssm_role_a7f25bce-a0d4-4e15-bdfb-45f082b9551c"
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

resource "aws_iam_role_policy_attachment" "ssm_role_attach_a7f25bce-a0d4-4e15-bdfb-45f082b9551c" {
  role       = aws_iam_role.ssm_role_a7f25bce-a0d4-4e15-bdfb-45f082b9551c.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "ssm_instance_profile_a7f25bce-a0d4-4e15-bdfb-45f082b9551c" {
  name = "ssm_instance_profile_a7f25bce-a0d4-4e15-bdfb-45f082b9551c"
  role = aws_iam_role.ssm_role_a7f25bce-a0d4-4e15-bdfb-45f082b9551c.name
}

# EC2 instance resource with the IAM instance profile attached
resource "aws_instance" "aws_a7f25bce-a0d4-4e15-bdfb-45f082b9551c" {
  ami           = "ami-090a624d5b9b3792c"
  instance_type = "t3.small"
  key_name      = "Aws2"
  vpc_security_group_ids = ["sg-038ccec9310169fce"]

  root_block_device {
    volume_size = 50
    volume_type = "gp2"
    encrypted = true
  }

  iam_instance_profile = aws_iam_instance_profile.ssm_instance_profile_a7f25bce-a0d4-4e15-bdfb-45f082b9551c.name

  tags = {
    Name = "newInstance-a7f25bce-a0d4-4e15-bdfb-45f082b9551c"
  }
}

output "instance_id" {
  value = aws_instance.aws_a7f25bce-a0d4-4e15-bdfb-45f082b9551c.id
}

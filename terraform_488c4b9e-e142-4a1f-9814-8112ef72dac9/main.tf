
provider "aws" {
  region = "us-east-1"
}

# IAM Role for SSM with AmazonSSMManagedInstanceCore policy attached
resource "aws_iam_role" "ssm_role_488c4b9e-e142-4a1f-9814-8112ef72dac9" {
  name = "ssm_role_488c4b9e-e142-4a1f-9814-8112ef72dac9"
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

resource "aws_iam_role_policy_attachment" "ssm_role_attach_488c4b9e-e142-4a1f-9814-8112ef72dac9" {
  role       = aws_iam_role.ssm_role_488c4b9e-e142-4a1f-9814-8112ef72dac9.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "ssm_instance_profile_488c4b9e-e142-4a1f-9814-8112ef72dac9" {
  name = "ssm_instance_profile_488c4b9e-e142-4a1f-9814-8112ef72dac9"
  role = aws_iam_role.ssm_role_488c4b9e-e142-4a1f-9814-8112ef72dac9.name
}

# EC2 instance resource with the IAM instance profile attached
resource "aws_instance" "aws_488c4b9e-e142-4a1f-9814-8112ef72dac9" {
  ami           = "ami-0a0ebee827a585d06"
  instance_type = "t3.small"
  key_name      = "Aws2"
  vpc_security_group_ids = ["sg-038ccec9310169fce"]

  root_block_device {
    volume_size = 50
    volume_type = "gp2"
  }

  iam_instance_profile = aws_iam_instance_profile.ssm_instance_profile_488c4b9e-e142-4a1f-9814-8112ef72dac9.name

  tags = {
    Name = "GIOOOO-488c4b9e-e142-4a1f-9814-8112ef72dac9"
  }
}

output "instance_id" {
  value = aws_instance.aws_488c4b9e-e142-4a1f-9814-8112ef72dac9.id
}

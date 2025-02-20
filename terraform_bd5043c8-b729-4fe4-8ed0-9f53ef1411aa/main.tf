
provider "aws" {
  region = "us-east-1"
}

# IAM Role for SSM with AmazonSSMManagedInstanceCore policy attached
resource "aws_iam_role" "ssm_role_bd5043c8-b729-4fe4-8ed0-9f53ef1411aa" {
  name = "ssm_role_bd5043c8-b729-4fe4-8ed0-9f53ef1411aa"
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

resource "aws_iam_role_policy_attachment" "ssm_role_attach_bd5043c8-b729-4fe4-8ed0-9f53ef1411aa" {
  role       = aws_iam_role.ssm_role_bd5043c8-b729-4fe4-8ed0-9f53ef1411aa.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "ssm_instance_profile_bd5043c8-b729-4fe4-8ed0-9f53ef1411aa" {
  name = "ssm_instance_profile_bd5043c8-b729-4fe4-8ed0-9f53ef1411aa"
  role = aws_iam_role.ssm_role_bd5043c8-b729-4fe4-8ed0-9f53ef1411aa.name
}

# EC2 instance resource with the IAM instance profile attached
resource "aws_instance" "aws_bd5043c8-b729-4fe4-8ed0-9f53ef1411aa" {
  ami           = "ami-032ec7a32b7fb247c"
  instance_type = "t3.small"
  key_name      = "Aws2"
  vpc_security_group_ids = ["sg-038ccec9310169fce"]

  root_block_device {
    volume_size = 50
    volume_type = "gp2"
  }

  iam_instance_profile = aws_iam_instance_profile.ssm_instance_profile_bd5043c8-b729-4fe4-8ed0-9f53ef1411aa.name

  tags = {
    Name = "AESS-bd5043c8-b729-4fe4-8ed0-9f53ef1411aa"
  }
}

output "instance_id" {
  value = aws_instance.aws_bd5043c8-b729-4fe4-8ed0-9f53ef1411aa.id
}


provider "aws" {
  region = "us-east-1"
}

# IAM Role for SSM with AmazonSSMManagedInstanceCore policy attached
resource "aws_iam_role" "ssm_role_63824bed-8aa0-409d-bf1b-54919623a4fc" {
  name = "ssm_role_63824bed-8aa0-409d-bf1b-54919623a4fc"
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

resource "aws_iam_role_policy_attachment" "ssm_role_attach_63824bed-8aa0-409d-bf1b-54919623a4fc" {
  role       = aws_iam_role.ssm_role_63824bed-8aa0-409d-bf1b-54919623a4fc.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "ssm_instance_profile_63824bed-8aa0-409d-bf1b-54919623a4fc" {
  name = "ssm_instance_profile_63824bed-8aa0-409d-bf1b-54919623a4fc"
  role = aws_iam_role.ssm_role_63824bed-8aa0-409d-bf1b-54919623a4fc.name
}

# EC2 instance resource with the IAM instance profile attached
resource "aws_instance" "aws_63824bed-8aa0-409d-bf1b-54919623a4fc" {
  ami           = "ami-04f77c9cd94746b09"
  instance_type = "t3.small"
  key_name      = "Aws2"
  vpc_security_group_ids = ["sg-038ccec9310169fce"]

  root_block_device {
    volume_size = 50
    volume_type = "gp2"
  }

  iam_instance_profile = aws_iam_instance_profile.ssm_instance_profile_63824bed-8aa0-409d-bf1b-54919623a4fc.name

  tags = {
    Name = "dddd-63824bed-8aa0-409d-bf1b-54919623a4fc"
  }
}

output "instance_id" {
  value = aws_instance.aws_63824bed-8aa0-409d-bf1b-54919623a4fc.id
}

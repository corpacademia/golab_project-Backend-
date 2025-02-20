
provider "aws" {
  region = "us-east-1"
}

# IAM Role for SSM with AmazonSSMManagedInstanceCore policy attached
resource "aws_iam_role" "ssm_role_da28eaed-f49c-4edc-881a-44bccc93445d" {
  name = "ssm_role_da28eaed-f49c-4edc-881a-44bccc93445d"
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

resource "aws_iam_role_policy_attachment" "ssm_role_attach_da28eaed-f49c-4edc-881a-44bccc93445d" {
  role       = aws_iam_role.ssm_role_da28eaed-f49c-4edc-881a-44bccc93445d.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "ssm_instance_profile_da28eaed-f49c-4edc-881a-44bccc93445d" {
  name = "ssm_instance_profile_da28eaed-f49c-4edc-881a-44bccc93445d"
  role = aws_iam_role.ssm_role_da28eaed-f49c-4edc-881a-44bccc93445d.name
}

# EC2 instance resource with the IAM instance profile attached
resource "aws_instance" "aws_da28eaed-f49c-4edc-881a-44bccc93445d" {
  ami           = "ami-049dd04cca2dc5594"
  instance_type = "t3.small"
  key_name      = "Aws2"
  vpc_security_group_ids = ["sg-038ccec9310169fce"]

  root_block_device {
    volume_size = 50
    volume_type = "gp2"
    encrypted = true
  }

  iam_instance_profile = aws_iam_instance_profile.ssm_instance_profile_da28eaed-f49c-4edc-881a-44bccc93445d.name
  hibernation = true
  tags = {
    Name = "testt-da28eaed-f49c-4edc-881a-44bccc93445d"
  }
}

output "instance_id" {
  value = aws_instance.aws_da28eaed-f49c-4edc-881a-44bccc93445d.id
}

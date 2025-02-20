
provider "aws" {
  region = "us-east-1"
}

# IAM Role for SSM with AmazonSSMManagedInstanceCore policy attached
resource "aws_iam_role" "ssm_role_f0214894-fd10-4f21-a79c-049e5f5eaefe" {
  name = "ssm_role_f0214894-fd10-4f21-a79c-049e5f5eaefe"
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

resource "aws_iam_role_policy_attachment" "ssm_role_attach_f0214894-fd10-4f21-a79c-049e5f5eaefe" {
  role       = aws_iam_role.ssm_role_f0214894-fd10-4f21-a79c-049e5f5eaefe.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "ssm_instance_profile_f0214894-fd10-4f21-a79c-049e5f5eaefe" {
  name = "ssm_instance_profile_f0214894-fd10-4f21-a79c-049e5f5eaefe"
  role = aws_iam_role.ssm_role_f0214894-fd10-4f21-a79c-049e5f5eaefe.name
}

# EC2 instance resource with the IAM instance profile attached
resource "aws_instance" "aws_f0214894-fd10-4f21-a79c-049e5f5eaefe" {
  ami           = "ami-0fab25cbd44603919"
  instance_type = "t3.small"
  key_name      = "Aws2"
  vpc_security_group_ids = ["sg-038ccec9310169fce"]

  root_block_device {
    volume_size = 50
    volume_type = "gp2"
  }

  iam_instance_profile = aws_iam_instance_profile.ssm_instance_profile_f0214894-fd10-4f21-a79c-049e5f5eaefe.name

  tags = {
    Name = "nagtest-f0214894-fd10-4f21-a79c-049e5f5eaefe"
  }
}

output "instance_id" {
  value = aws_instance.aws_f0214894-fd10-4f21-a79c-049e5f5eaefe.id
}

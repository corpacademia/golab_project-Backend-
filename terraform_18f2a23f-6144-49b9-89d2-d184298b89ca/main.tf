
provider "aws" {
  region = "us-east-1"
}

# IAM Role for SSM with AmazonSSMManagedInstanceCore policy attached
resource "aws_iam_role" "ssm_role_18f2a23f-6144-49b9-89d2-d184298b89ca" {
  name = "ssm_role_18f2a23f-6144-49b9-89d2-d184298b89ca"
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

resource "aws_iam_role_policy_attachment" "ssm_role_attach_18f2a23f-6144-49b9-89d2-d184298b89ca" {
  role       = aws_iam_role.ssm_role_18f2a23f-6144-49b9-89d2-d184298b89ca.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "ssm_instance_profile_18f2a23f-6144-49b9-89d2-d184298b89ca" {
  name = "ssm_instance_profile_18f2a23f-6144-49b9-89d2-d184298b89ca"
  role = aws_iam_role.ssm_role_18f2a23f-6144-49b9-89d2-d184298b89ca.name
}

# EC2 instance resource with the IAM instance profile attached
resource "aws_instance" "aws_18f2a23f-6144-49b9-89d2-d184298b89ca" {
  ami           = "ami-04b4f1a9cf54c11d0"
  instance_type = "t3.small"
  key_name      = "Aws2"
  vpc_security_group_ids = ["sg-038ccec9310169fce"]

  root_block_device {
    volume_size = 50
    volume_type = "gp2"
    encrypted = true
  }

  iam_instance_profile = aws_iam_instance_profile.ssm_instance_profile_18f2a23f-6144-49b9-89d2-d184298b89ca.name

  tags = {
    Name = "hello-18f2a23f-6144-49b9-89d2-d184298b89ca"
  }
}

output "instance_id" {
  value = aws_instance.aws_18f2a23f-6144-49b9-89d2-d184298b89ca.id
}

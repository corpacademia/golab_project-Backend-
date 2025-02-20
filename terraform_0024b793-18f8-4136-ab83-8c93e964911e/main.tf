
provider "aws" {
  region = "us-east-1"
}

# IAM Role for SSM with AmazonSSMManagedInstanceCore policy attached
resource "aws_iam_role" "ssm_role_0024b793-18f8-4136-ab83-8c93e964911e" {
  name = "ssm_role_0024b793-18f8-4136-ab83-8c93e964911e"
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

resource "aws_iam_role_policy_attachment" "ssm_role_attach_0024b793-18f8-4136-ab83-8c93e964911e" {
  role       = aws_iam_role.ssm_role_0024b793-18f8-4136-ab83-8c93e964911e.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "ssm_instance_profile_0024b793-18f8-4136-ab83-8c93e964911e" {
  name = "ssm_instance_profile_0024b793-18f8-4136-ab83-8c93e964911e"
  role = aws_iam_role.ssm_role_0024b793-18f8-4136-ab83-8c93e964911e.name
}

# EC2 instance resource with the IAM instance profile attached
resource "aws_instance" "aws_0024b793-18f8-4136-ab83-8c93e964911e" {
  ami           = "ami-032ec7a32b7fb247c"
  instance_type = "t2.large"
  key_name      = "Aws2"
  vpc_security_group_ids = ["sg-038ccec9310169fce"]

  root_block_device {
    volume_size = 50
    volume_type = "gp2"
  }

  iam_instance_profile = aws_iam_instance_profile.ssm_instance_profile_0024b793-18f8-4136-ab83-8c93e964911e.name

  tags = {
    Name = "dd-0024b793-18f8-4136-ab83-8c93e964911e"
  }
}

output "instance_id" {
  value = aws_instance.aws_0024b793-18f8-4136-ab83-8c93e964911e.id
}

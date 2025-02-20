
provider "aws" {
  region = "us-east-1"
}

# IAM Role for SSM with AmazonSSMManagedInstanceCore policy attached
resource "aws_iam_role" "ssm_role_02bfd599-d58a-4a71-bc7c-76c5ca03f042" {
  name = "ssm_role_02bfd599-d58a-4a71-bc7c-76c5ca03f042"
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

resource "aws_iam_role_policy_attachment" "ssm_role_attach_02bfd599-d58a-4a71-bc7c-76c5ca03f042" {
  role       = aws_iam_role.ssm_role_02bfd599-d58a-4a71-bc7c-76c5ca03f042.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "ssm_instance_profile_02bfd599-d58a-4a71-bc7c-76c5ca03f042" {
  name = "ssm_instance_profile_02bfd599-d58a-4a71-bc7c-76c5ca03f042"
  role = aws_iam_role.ssm_role_02bfd599-d58a-4a71-bc7c-76c5ca03f042.name
}

# EC2 instance resource with the IAM instance profile attached
resource "aws_instance" "aws_02bfd599-d58a-4a71-bc7c-76c5ca03f042" {
  ami           = "ami-0e1bed4f06a3b463d"
  instance_type = "t3.small"
  key_name      = "Aws2"
  vpc_security_group_ids = ["sg-038ccec9310169fce"]

  root_block_device {
    volume_size = 50
    volume_type = "gp2"
  }

  iam_instance_profile = aws_iam_instance_profile.ssm_instance_profile_02bfd599-d58a-4a71-bc7c-76c5ca03f042.name

  tags = {
    Name = "aa-02bfd599-d58a-4a71-bc7c-76c5ca03f042"
  }
}

output "instance_id" {
  value = aws_instance.aws_02bfd599-d58a-4a71-bc7c-76c5ca03f042.id
}

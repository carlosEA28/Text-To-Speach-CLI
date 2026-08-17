# Bucket de áudio (nome único gerado automaticamente)
resource "random_id" "suffix" {
  byte_length = 4
}

resource "aws_s3_bucket" "audio" {
  bucket        = "${var.project_name}-audio-${random_id.suffix.hex}"
  force_destroy = true
}

resource "aws_s3_bucket_public_access_block" "audio" {
  bucket = aws_s3_bucket.audio.id

  block_public_acls       = true
  block_public_policy     = false # a bucket policy abaixo libera leitura só do prefixo audio/
  ignore_public_acls      = true
  restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "audio" {
  bucket = aws_s3_bucket.audio.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadAudio"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.audio.arn}/audio/*"
      }
    ]
  })
}
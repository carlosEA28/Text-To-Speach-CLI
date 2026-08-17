data "archive_file" "lambda" {
  type        = "zip"
  source_file = "${path.module}/../lambda_function.mjs"
  output_path = "${path.module}/lambda_function.zip"
}

resource "aws_lambda_function" "tts" {
  function_name = var.project_name
  role          = aws_iam_role.lambda.arn
  handler       = "lambda_function.handler"
  runtime       = "nodejs22.x"
  filename      = data.archive_file.lambda.output_path
  timeout       = 30
  memory_size   = 128

  environment {
    variables = {
      AUDIO_BUCKET = aws_s3_bucket.audio.id
    }
  }
}
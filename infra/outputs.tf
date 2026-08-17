output "api_url" {
  description = "URL do endpoint (POST /tts)"
  value       = "${aws_api_gateway_stage.tts.invoke_url}/tts"
}

output "bucket_name" {
  description = "Bucket onde os áudios são salvos"
  value       = aws_s3_bucket.audio.id
}

output "lambda_function" {
  description = "Nome da função Lambda"
  value       = aws_lambda_function.tts.function_name
}
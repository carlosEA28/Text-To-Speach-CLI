resource "aws_api_gateway_rest_api" "tts" {
  name        = "${var.project_name}-api"
  description = "Text-to-Speech API (AWS Polly + S3)"
}

resource "aws_api_gateway_resource" "tts" {
  rest_api_id = aws_api_gateway_rest_api.tts.id
  parent_id   = aws_api_gateway_rest_api.tts.root_resource_id
  path_part   = "tts"
}

# POST /tts -> Lambda
resource "aws_api_gateway_method" "tts_post" {
  rest_api_id   = aws_api_gateway_rest_api.tts.id
  resource_id   = aws_api_gateway_resource.tts.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "tts_post" {
  rest_api_id             = aws_api_gateway_rest_api.tts.id
  resource_id             = aws_api_gateway_resource.tts.id
  http_method             = aws_api_gateway_method.tts_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.tts.invoke_arn
}

# OPTIONS /tts -> CORS (para uso em página web)
resource "aws_api_gateway_method" "tts_options" {
  rest_api_id   = aws_api_gateway_rest_api.tts.id
  resource_id   = aws_api_gateway_resource.tts.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "tts_options" {
  rest_api_id       = aws_api_gateway_rest_api.tts.id
  resource_id       = aws_api_gateway_resource.tts.id
  http_method       = aws_api_gateway_method.tts_options.http_method
  type              = "MOCK"
  request_templates = { "application/json" = "{ \"statusCode\": 200 }" }
}

resource "aws_api_gateway_method_response" "tts_options_200" {
  rest_api_id = aws_api_gateway_rest_api.tts.id
  resource_id = aws_api_gateway_resource.tts.id
  http_method = "OPTIONS"
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "tts_options_200" {
  rest_api_id = aws_api_gateway_rest_api.tts.id
  resource_id = aws_api_gateway_resource.tts.id
  http_method = "OPTIONS"
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'POST,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# Permite o API Gateway invocar a Lambda
resource "aws_lambda_permission" "apigw" {
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.tts.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.tts.execution_arn}/*/*"
}

resource "aws_api_gateway_deployment" "tts" {
  depends_on  = [aws_api_gateway_integration.tts_post]
  rest_api_id = aws_api_gateway_rest_api.tts.id
}

resource "aws_api_gateway_stage" "tts" {
  deployment_id = aws_api_gateway_deployment.tts.id
  rest_api_id   = aws_api_gateway_rest_api.tts.id
  stage_name    = "prod"
}
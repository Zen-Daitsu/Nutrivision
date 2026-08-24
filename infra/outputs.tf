output "frontend_bucket"           { value = aws_s3_bucket.frontend.id }
output "cloudfront_distribution_id"{ value = aws_cloudfront_distribution.frontend.id }
output "frontend_domain"           { value = aws_cloudfront_distribution.frontend.domain_name }
output "api_base_url"              { value = aws_apigatewayv2_api.api.api_endpoint }
output "ecr_repository_url"        { value = aws_ecr_repository.api.repository_url }
output "ec2_instance_id"           { value = aws_instance.api.id }
output "gha_deploy_role_arn"       { value = aws_iam_role.gha_deploy.arn }

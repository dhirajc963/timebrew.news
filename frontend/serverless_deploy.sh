# 1. Build your frontend
npm run build

# 2. Sync to S3
aws s3 sync ./dist s3://timebrew-frontend-prod --delete

# 3. Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id E3QV3CIPOG44MF --paths "/*"
# Environment Setup

## Backend Environment Variables

1. Copy the example environment file:
   ```bash
   cp backend/.env.example backend/.env
   ```

2. Update the following variables in `backend/.env`:

### Required Variables:
- `JWT_SECRET`: Your JWT secret key for token signing
- `GOOGLE_CLIENT_ID`: Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret
- `AWS_ACCESS_KEY_ID`: AWS access key for S3 uploads
- `AWS_SECRET_ACCESS_KEY`: AWS secret access key
- `S3_BUCKET_NAME`: S3 bucket name for file storage

### Optional Variables:
- `PORT`: Backend server port (default: 5003)
- `DB_NAME`: SQLite database filename (default: absolute.db)
- `AWS_REGION`: AWS region for S3 (default: ap-south-1)

## Frontend Environment Variables

The frontend uses these variables in `frontend/.env`:
- `PORT`: Frontend port (default: 3002)
- `REACT_APP_API_URL`: Backend API URL
- `REACT_APP_GOOGLE_CLIENT_ID`: Google OAuth client ID (same as backend)

## Security Notes

- Never commit `.env` files to git
- Use different credentials for production
- Rotate AWS keys regularly
- Use IAM roles with minimal permissions for AWS access
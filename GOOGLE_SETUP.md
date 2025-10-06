# Google OAuth Setup Guide for Absolute Platform

## Quick Fix for Current Error

The error `The given client ID is not found` occurs because the Google Client ID is not configured. Follow these steps:

## Step 1: Get Google OAuth Credentials

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Sign in with your Google account

2. **Create or Select a Project**
   - Click the project dropdown in the top bar
   - Click "New Project" or select existing
   - Name it (e.g., "Absolute Platform")

3. **Enable Google Identity API**
   - Navigate to "APIs & Services" → "Library"
   - Search for "Google Identity Toolkit API"
   - Click and enable it

4. **Create OAuth 2.0 Credentials**
   - Go to "APIs & Services" → "Credentials"
   - Click "+ CREATE CREDENTIALS" → "OAuth client ID"
   - If prompted, configure OAuth consent screen first:
     - Choose "External" (for testing)
     - Fill required fields (app name, email)
     - Add test users if needed
   - Application type: "Web application"
   - Name: "Absolute Platform"
   - Add Authorized JavaScript origins:
     ```
     http://localhost:3002
     http://localhost:3000
     http://localhost
     ```
   - No redirect URIs needed for Google Identity Services
   - Click "CREATE"

5. **Copy Your Client ID**
   - You'll get a Client ID like: `123456789012-abcdefghijklmnopqrstuvwxyz123456.apps.googleusercontent.com`
   - Copy this ID

## Step 2: Update Your Environment Files

### Frontend (.env)
Edit `/frontend/.env`:
```env
PORT=3002
REACT_APP_API_URL=http://localhost:5003/api
REACT_APP_GOOGLE_CLIENT_ID=YOUR_ACTUAL_CLIENT_ID_HERE
```

### Backend (.env)
Edit `/backend/.env`:
```env
PORT=5003
NODE_ENV=development
JWT_SECRET=your_jwt_secret_key_here_change_in_production
DB_NAME=absolute.db
GOOGLE_CLIENT_ID=YOUR_ACTUAL_CLIENT_ID_HERE
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
```

## Step 3: Restart Your Application

1. **Stop the frontend** (Ctrl+C in terminal)
2. **Start it again**:
   ```bash
   cd frontend
   npm start
   ```

## Step 4: Test Google Sign-In

1. Open http://localhost:3002
2. Click on "Continue with Google" or "Register with Google"
3. You should see Google's sign-in popup

## Troubleshooting

### If you still see errors:

1. **Clear browser cache**
   - Chrome: Cmd+Shift+R (Mac) or Ctrl+Shift+F5 (Windows)

2. **Check Console for errors**
   - Open Developer Tools (F12)
   - Check Console tab for specific errors

3. **Verify Client ID format**
   - Must end with `.apps.googleusercontent.com`
   - No spaces or quotes in the .env file

4. **Check OAuth consent screen**
   - Must be configured in Google Cloud Console
   - Add your email as a test user if in testing mode

### Common Issues:

- **"The given client ID is not found"**: Client ID is invalid or not created
- **"Not a valid origin"**: Add your domain to authorized origins
- **"Popup blocked"**: Allow popups for localhost
- **Button not showing**: Check if Google script loaded properly

## For Production

When deploying to production:

1. Add your production domain to Authorized JavaScript origins
2. Update the frontend .env with production values
3. Use environment variables on your hosting platform
4. Never commit actual Client IDs to git

## Example Working Client ID Format
```
REACT_APP_GOOGLE_CLIENT_ID=123456789012-abcdefghijklmnopqrstuvwxyz123456.apps.googleusercontent.com
```

## Need Help?

If you're still having issues:
1. Double-check the Client ID is copied correctly
2. Ensure no extra spaces or characters
3. Verify the OAuth consent screen is configured
4. Check that APIs are enabled in Google Cloud Console
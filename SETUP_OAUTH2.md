# Google OAuth2.0 Setup Guide

## Step 1: Create Google OAuth2.0 Credentials

### 1.1 Go to Google Cloud Console
- Visit: https://console.cloud.google.com/
- Sign in with your Google account
- Create a new project or select existing one

### 1.2 Enable Google OAuth API
- Go to "APIs & Services" → "Library"
- Search for "Google+ API"
- Click on it and press "ENABLE"
- Also enable "OAuth 2.0 for Web Applications"

### 1.3 Create OAuth2.0 Credentials
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Choose "Web application"
4. Add JavaScript Origins:
   ```
   http://localhost:3000
   http://localhost:3000/
   https://yourdomain.com (production)
   ```
5. Add Authorized Redirect URIs:
   ```
   http://localhost:3000/auth/callback
   http://localhost:3000
   https://yourdomain.com/auth/callback (production)
   ```
6. Click "Create"
7. Copy your credentials (you'll see Client ID and Client Secret)

## Step 2: Configure Environment Variables

### Backend (.env)
```
# Google OAuth
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID_HERE
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET_HERE
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback

# JWT Secret for tokens
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
```

### Frontend (.env.local in frontend folder)
```
REACT_APP_GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID_HERE
REACT_APP_API_URL=http://localhost:8000
```

## Step 3: Installation

### Backend (Python packages)
```bash
cd backend
pipenv install google-auth-oauthlib google-auth-httplib2 google-auth pyjwt
```

### Frontend (Node packages)
```bash
cd frontend
npm install @react-oauth/google axios jwt-decode
```

## Step 4: Test the Setup

### Start Backend
```bash
cd backend
pipenv run python main.py
```

### Start Frontend
```bash
cd frontend
npm start
```

### Test OAuth Flow
1. Click "Sign in with Google" button
2. You should be redirected to Google login
3. After login, you'll be redirected back to the app
4. You should be logged in

## Troubleshooting

**Issues with Redirect URI**
- Make sure the redirect URI in Google Console matches exactly in code
- No trailing slashes unless specified

**CORS Issues**
- Backend should have CORS enabled for frontend URL
- Check main.py for CORS configuration

**Token Expiration**
- Tokens are set to expire in 30 days
- Implement token refresh logic in frontend

## Security Notes

1. **Never commit .env file** to git
2. **Rotate JWT_SECRET** regularly in production
3. **Use HTTPS** in production (not HTTP)
4. **Store tokens in httpOnly cookies** for security
5. **Validate tokens** on backend for all requests

## Production Deployment

For production, update:
1. Google Console redirect URIs to your production domain
2. `.env` file with production values
3. Frontend `.env.local` with production API URL
4. Enable HTTPS on both backend and frontend
5. Update CORS settings to only allow production domain

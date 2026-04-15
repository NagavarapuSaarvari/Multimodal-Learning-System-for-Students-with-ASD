# Environment Variables & Tokens Guide

## Quick Reference

This file lists all environment variables needed for the Learning Pro Platform.

---

## Backend Environment Variables (.env)

Create a file `backend/.env` with the following:

```env
# ============================================
# DATABASE CONFIGURATION
# ============================================
DB_USER=your_postgresql_username
DB_PASSWORD=your_postgresql_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=asd_learning

# ============================================
# LLM CONFIGURATION (Groq)
# ============================================
# Get this from: https://console.groq.com/keys
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ============================================
# GOOGLE OAUTH 2.0 CONFIGURATION
# ============================================
# Get these from: https://console.cloud.google.com/
# Project → APIs & Services → Credentials → Create OAuth 2.0 Credential

GOOGLE_CLIENT_ID=your_project_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxxxxxxx
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback

# ============================================
# JWT SECRET (For Token Signing)
# ============================================
# Generate using: openssl rand -base64 32
# Or use any random string of 32+ characters
JWT_SECRET=your_super_secret_jwt_key_minimum_32_characters_long

# ============================================
# OPTIONAL: CORS Configuration
# ============================================
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3000/
```

---

## Frontend Environment Variables (.env.local)

Create a file `frontend/.env.local` with the following:

```env
# ============================================
# GOOGLE OAUTH 2.0 CONFIGURATION
# ============================================
# Must match backend GOOGLE_CLIENT_ID
REACT_APP_GOOGLE_CLIENT_ID=your_project_id.apps.googleusercontent.com

# ============================================
# API CONFIGURATION
# ============================================
# Backend API URL
REACT_APP_API_URL=http://localhost:8000
```

---

## How to Get Each Token

### 1. Google Client ID & Secret

**Steps:**
1. Go to https://console.cloud.google.com/
2. Create new project (or select existing)
3. Search for "Google+ API" → Enable it
4. Go to "APIs & Services" → "Credentials"
5. Click "Create Credentials" → "OAuth 2.0 Client ID"
6. Select "Web Application"
7. Add Authorized JavaScript Origins:
   - `http://localhost:3000`
   - `http://localhost:3000/`
8. Add Authorized Redirect URIs:
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3000`
9. Copy and paste credentials into both .env files

**Result:**
```
GOOGLE_CLIENT_ID = xxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET = GOCSPX-xxxxxxxxxxxx
```

### 2. Groq API Key

**Steps:**
1. Go to https://console.groq.com/
2. Sign up or log in
3. Go to "API Keys" section
4. Click "Create New Secret Key"
5. Copy the key

**Result:**
```
GROQ_API_KEY = gsk_xxxxxxxxxxxxxxxxxxxxxxx
```

### 3. JWT Secret

**Option A - Generate Secure Random String (Recommended):**
```bash
# On Mac/Linux:
openssl rand -base64 32

# On Windows (PowerShell):
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

**Option B - Use Any 32+ Character String:**
```
your_super_secret_jwt_key_minimum_32_characters_long
my_app_secret_key_v1_2024_learning_platform
```

### 4. Database Credentials

Use your PostgreSQL installation:
- Default username: `postgres`
- Default password: `postgres` (or what you set during installation)
- Database name: `asd_learning` (or any name you prefer)

---

## PostgreSQL Setup (If Not Installed)

### Windows
1. Download: https://www.postgresql.org/download/windows/
2. Install and remember the password
3. Open pgAdmin and create database `asd_learning`
4. Enable pgvector extension:
   ```sql
   CREATE EXTENSION vector;
   ```

### Mac
```bash
# Using Homebrew
brew install postgresql
brew services start postgresql

# Create database
createdb asd_learning

# Connect and enable pgvector
psql asd_learning
# Then run: CREATE EXTENSION vector;
```

### Linux
```bash
# Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql

# Create database
sudo -u postgres createdb asd_learning

# Enable pgvector
sudo -u postgres psql asd_learning -c "CREATE EXTENSION vector;"
```

---

## Verification Checklist

After setting up environment variables:

- [ ] Backend .env created in `backend/` directory
- [ ] Frontend .env.local created in `frontend/` directory
- [ ] GOOGLE_CLIENT_ID appears in BOTH files
- [ ] GOOGLE_CLIENT_SECRET appears in backend .env
- [ ] GROQ_API_KEY obtained and added to backend .env
- [ ] JWT_SECRET is 32+ characters
- [ ] Database credentials verified (test connection)
- [ ] All values have NO quotes unless needed for special characters

**Quick Test:**
```bash
# Backend - Verify .env is readable
cd backend
python -c "import os; print('DB_USER:', os.getenv('DB_USER'))"

# Frontend - Verify .env.local is readable
cd frontend
echo "REACT_APP_API_URL=$REACT_APP_API_URL"
```

---

## Common Mistakes to Avoid

❌ **Don't:**
- Put quotes around values: `DB_USER="postgres"` (should be `DB_USER=postgres`)
- Share .env files in Git (add to .gitignore)
- Use localhost outside development (use full URLs for production)
- Commit GOOGLE_CLIENT_SECRET or GROQ_API_KEY
- Use same JWT_SECRET for multiple deployments

✅ **Do:**
- Keep .env files in your local machine only
- Rotate credentials periodically
- Use strong, unique JWT_SECRET
- Keep credentials secure and private
- Update URLs for production deployment

---

## Production Considerations

For production deployment:

1. **Use environment management platform:**
   - Heroku Config Vars
   - AWS Secrets Manager
   - Azure Key Vault
   - Vercel Environment Variables

2. **Update URLs:**
   ```env
   # Development
   REACT_APP_API_URL=http://localhost:8000
   GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback

   # Production
   REACT_APP_API_URL=https://api.yourapp.com
   GOOGLE_REDIRECT_URI=https://api.yourapp.com/auth/google/callback
   ```

3. **Update Google OAuth:**
   - Add production domain to Authorized Origins
   - Add production redirect URI to Authorized Redirect URIs

4. **Security Hardening:**
   - Use HTTPS everywhere
   - Generate new strong JWT_SECRET
   - Rotate API keys regularly
   - Enable CORS for production domain only

---

## Where to Put These Files

```
project-root/
├── backend/
│   ├── .env              ← Create here (Django/FastAPI settings)
│   ├── main.py
│   ├── services.py
│   └── ...
└── frontend/
    ├── .env.local        ← Create here (React settings)
    ├── src/
    ├── package.json
    └── ...
```

> **IMPORTANT:** Add both `.env` and `.env.local` to your `.gitignore` so credentials are never committed!

---

## Testing Your Configuration

### Backend Test
```bash
cd backend

# Install packages
pipenv install

# Test database connection
pipenv run python -c "
from database import engine
with engine.connect() as conn:
    print('✅ Database connection successful')
"

# Test Groq API
pipenv run python -c "
import os
from langchain_groq import ChatGroq
llm = ChatGroq(api_key=os.getenv('GROQ_API_KEY'))
print('✅ Groq API connection successful')
"

# Start server
pipenv run python main.py
```

### Frontend Test
```bash
cd frontend

# Install packages
npm install

# Check environment variables loaded
npm start

# In browser console, you should see:
# console.log(process.env.REACT_APP_GOOGLE_CLIENT_ID)
# Should output your Google Client ID
```

---

**Version:** 1.0
**Last Updated:** April 2026

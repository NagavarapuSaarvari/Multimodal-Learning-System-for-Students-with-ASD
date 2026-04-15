# QUICK START - Next Steps (Do This First!)

## You're Almost Done! Follow These Steps

This document tells you **exactly what to do next** to get the system running.

---

## Step 1: Get Your Credentials (5 minutes)

### Get Google OAuth Credentials
1. Go to: https://console.cloud.google.com/
2. Create a new project (name it "Learning Pro")
3. Search for "Google+ API" and enable it
4. Go to "APIs & Services" → "Credentials"
5. Click "Create Credentials" → "OAuth 2.0 Client ID" → "Web Application"
6. Add these **Authorized JavaScript Origins:**
   - http://localhost:3000
   - http://localhost:3000/
7. Add these **Authorized Redirect URIs:**
   - http://localhost:3000/auth/callback
   - http://localhost:3000
8. Copy your **Client ID** (you'll need this twice)

### Get Groq API Key
1. Go to: https://console.groq.com/
2. Sign up if needed
3. Go to "API Keys" → "Create New Secret Key"
4. Copy the key

### Generate JWT Secret
Open PowerShell and run:
```powershell
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```
Copy the output - that's your JWT_SECRET

---

## Step 2: Create Environment Files (3 minutes)

### Backend .env File

Open a text editor and create file: `backend/.env`

```env
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=asd_learning

GROQ_API_KEY=your_groq_key_here

GOOGLE_CLIENT_ID=your_google_client_id_from_console.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret_from_console
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback

JWT_SECRET=your_jwt_secret_from_powershell_output_here
```

### Frontend .env.local File

Create file: `frontend/.env.local`

```env
REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id_from_console.apps.googleusercontent.com
REACT_APP_API_URL=http://localhost:8000
```

> **IMPORTANT:** Both files use the SAME Google Client ID (different secrets)

---

## Step 3: Install Dependencies (5 minutes)

### Backend Packages

```bash
cd backend
pipenv install google-auth google-auth-oauthlib pyjwt
pipenv lock
```

### Frontend Packages

```bash
cd frontend
npm install react-router-dom @react-oauth/google axios jwt-decode
```

---

## Step 4: Setup Database (2 minutes)

Make sure PostgreSQL is running, then:

```bash
cd backend
pipenv run python setup_db.py
```

This creates all tables automatically.

---

## Step 5: Start the Application (1 minute)

**Terminal 1 - Backend:**
```bash
cd backend
pipenv run python main.py
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

Browser will open at http://localhost:3000

---

## Step 6: Test the Login (2 minutes)

1. Open http://localhost:3000
2. Click "Sign in with Google"
3. Complete Google login
4. You should see the Dashboard
5. Click "Learn" or "Upload Documents"
6. Start a topic to see the learning interface

---

## You Now Have:

✅ **Google OAuth Authentication**
- User can sign in with Google
- JWT tokens generated
- Session persists

✅ **Dashboard with Analytics**
- Shows overall performance
- Test progress tracker
- Score graphs
- Areas for improvement

✅ **ASD-Optimized Learning**
- Clear, concrete language
- Step-by-step materials
- Interactive questions
- LLM-based evaluation

✅ **Professional UI**
- Color-coordinated design
- Responsive layout
- Mobile-friendly
- Accessibility features

---

## Troubleshooting Quick Fixes

### "OAuth Redirect URI Mismatch"
- Google Cloud Console must have exactly:
  - `http://localhost:3000` (in Origins)
  - `http://localhost:3000/auth/callback` (in Redirect URIs)

### "Cannot find module 'react-router-dom'"
```bash
cd frontend
npm install
```

### "Connection refused" on port 5432
- PostgreSQL not running
- Windows: Services → Start PostgreSQL
- Mac: `brew services start postgresql`
- Linux: `sudo systemctl start postgresql`

### "GROQ_API_KEY not found"
- Make sure .env file is in `backend/` folder
- Not `backend\.env` (Windows explorer view)
- Restart backend after creating .env

### "Module 'google.auth' not found"
```bash
cd backend
pipenv install google-auth google-auth-oauthlib
```

---

## What Gets Created Automatically

✅ All tables in PostgreSQL
✅ Routes in React Router
✅ API endpoints in FastAPI
✅ Authentication endpoints
✅ Dashboard data structure
✅ Emotion tracking database
✅ Test session tracking

---

## Next (Optional) - Future Enhancements

After everything works, you can add:
1. **Test Limit Enforcement** - Max 3 tests per user
2. **Performance Analytics API** - Backend endpoint for dashboard data
3. **Real User Data** - Connect dashboard to actual test scores
4. **Teacher Dashboard** - Parent/teacher monitoring
5. **Mobile App** - React Native version
6. **Offline Mode** - PWA support

---

## File Structure After Setup

```
project-root/
├── backend/
│   ├── .env                          ← CREATE THIS
│   ├── main.py                       ← OAuth endpoints added
│   ├── services.py                   ← ASD prompts added
│   ├── database.py
│   ├── setup_db.py
│   └── Pipfile
│
├── frontend/
│   ├── .env.local                    ← CREATE THIS
│   ├── src/
│   │   ├── App.js                    ← React Router added
│   │   ├── components/
│   │   │   ├── LoginPage.js          ← NEW
│   │   │   ├── Dashboard.js          ← NEW
│   │   │   ├── Navbar.js             ← UPDATED
│   │   │   ├── DocumentUpload.js
│   │   │   ├── EmotionCapture.js
│   │   │   ├── LearnPage.js
│   │   │   ├── ResultCard.js
│   │   │   ├── TestPanel.js
│   │   │   └── TopicForm.js
│   │   ├── constants/
│   │   │   └── colors.js             ← NEW
│   │   ├── services/
│   │   │   └── api.js
│   │   └── index.js
│   └── package.json
│
└── Documentation/
    ├── COMPLETE_SETUP_GUIDE.md       ← NEW
    ├── ENV_VARIABLES_GUIDE.md        ← NEW
    ├── SETUP_OAUTH2.md               ← EXISTING (Complete)
    ├── PROJECT_DOCUMENTATION.md
    ├── ARCHITECTURE.md
    └── QUICKSTART.md
```

---

## Estimated Time

| Task | Time |
|------|------|
| Get Credentials | 5 min |
| Create .env Files | 3 min |
| Install Dependencies | 5 min |
| Setup Database | 2 min |
| Start Services | 1 min |
| Test Login | 2 min |
| **TOTAL** | **18 minutes** |

---

## Success Checklist

After completion, you should be able to:

- [ ] See the Login page on http://localhost:3000
- [ ] Click "Sign in with Google" and complete authentication
- [ ] See the Dashboard after login
- [ ] Upload a PDF document
- [ ] Start a learning session
- [ ] Download learning materials
- [ ] Answer questions (text + MCQ)
- [ ] See test results with evaluation feedback
- [ ] Click "Dashboard" and see performance analytics
- [ ] Click logout and return to login page

---

## Production Deployment (Later)

When you're ready for production:

1. Read [COMPLETE_SETUP_GUIDE.md](COMPLETE_SETUP_GUIDE.md) - Part 10: "Production Deployment"
2. Update environment variables to production URLs
3. Use managed database (AWS RDS, Supabase, etc.)
4. Deploy frontend (Vercel, Netlify)
5. Deploy backend (Heroku, Railway, AWS)
6. Update Google OAuth redirect URIs

---

## Support

If stuck, check:
1. [ENV_VARIABLES_GUIDE.md](ENV_VARIABLES_GUIDE.md) - Token reference
2. [SETUP_OAUTH2.md](SETUP_OAUTH2.md) - OAuth troubleshooting
3. [COMPLETE_SETUP_GUIDE.md](COMPLETE_SETUP_GUIDE.md) - Full documentation
4. Backend logs: `pipenv run python main.py` output
5. Frontend logs: Browser console (F12)

---

**Ready? Start with Step 1! 🚀**

You've got this! The system is fully designed and implemented. This is just setup and configuration.

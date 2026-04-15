# Complete Implementation Guide - Learning Pro Platform

## Overview

Learning Pro is a personalized, AI-powered adaptive learning platform specifically designed for students with Autism Spectrum Disorder (ASD). This guide covers all features implemented, setup instructions, and usage details.

---

## Part 1: System Installation & Setup

### 1.1 Prerequisites

- Python 3.8+
- Node.js 14+
- PostgreSQL 12+ with pgvector extension
- Google Cloud account for OAuth2.0

### 1.2 Backend Setup

```bash
# Navigate to backend
cd backend

# Install Python dependencies
pipenv install

# Create .env file
cat > .env << EOF
# Database
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=asd_learning

# Groq API (LLM)
GROQ_API_KEY=your_groq_api_key

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback

# JWT Secret
JWT_SECRET=your_super_secret_jwt_key_min_32_chars
EOF

# Initialize database
pipenv run python setup_db.py

# Start backend server
pipenv run python main.py
```

### 1.3 Frontend Setup

```bash
# Navigate to frontend
cd frontend

# Install Node dependencies
npm install react-router-dom @react-oauth/google axios jwt-decode

# Create .env.local file
cat > .env.local << EOF
REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id
REACT_APP_API_URL=http://localhost:8000
EOF

# Start development server
npm start
```

---

## Part 2: Google OAuth2.0 Setup

### 2.1 Detailed Steps

See **SETUP_OAUTH2.md** for complete OAuth2.0 setup instructions.

**Quick Steps:**
1. Visit: https://console.cloud.google.com/
2. Create New Project
3. Enable "Google+ API"
4. Create OAuth 2.0 Credentials (Web Application)
5. Add Authorized Origins:
   - http://localhost:3000
   - http://localhost:3000/
6. Add Redirect URIs:
   - http://localhost:3000/auth/callback
   - http://localhost:3000

### 2.2 Required Environment Variables

**Backend (.env)**
```
GOOGLE_CLIENT_ID=xxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxx
JWT_SECRET=your_secret_key_minimum_32_characters_long
```

**Frontend (.env.local)**
```
REACT_APP_GOOGLE_CLIENT_ID=xxxxxxx.apps.googleusercontent.com
REACT_APP_API_URL=http://localhost:8000
```

---

## Part 3: Features Overview

### 3.1 ASD-Specific Learning Materials

The system generates learning materials specifically optimized for students with ASD:

**Key Features:**
- ✅ Clear, concrete language (no metaphors or idioms)
- ✅ Structured format with numbered lists and bullet points
- ✅ Step-by-step explanations for all concepts
- ✅ Explicit connections between concepts
- ✅ Literal, straightforward language
- ✅ Sensory-friendly content

**3 Difficulty Levels:**
1. **Easy**: Simple language, basic concepts, familiar examples
2. **Medium**: Common words, multiple concepts, varied examples
3. **Hard**: Precise terminology, complex concepts, advanced examples

### 3.2 ASD-Optimized Questions

**Open-Ended Text Questions (5 questions per test)**
- Specific, clear prompts (not vague)
- One question per concept
- Guided toward specific answers
- LLM-based evaluation

**Multiple Choice Questions (15 questions per test)**
- Clear, straightforward language
- Non-tricky distractors
- Obvious difference between options
- Concrete examples

**Total per Test: 20 Questions**
- Test 1: Easy difficulty
- Test 2: Adaptive (based on Test 1 performance)
- Test 3: Adaptive (based on Test 1-2 performance)

### 3.3 Professional User Interface

The UI uses a carefully selected color palette optimized for accessibility:

**Color Scheme:**
- **Primary Blue** (#1D4ED8): Focus, professionalism, trust
- **Secondary Teal** (#0D9488): Calm, stability, growth
- **Accent Green** (#16A34A): Success, positive feedback
- **Neutral Grays**: Clean, readable backgrounds and text

**Key UI Components:**
1. **Elegant Login Page** - Google OAuth integration
2. **Professional Navbar** - Navigation, user profile, quick actions
3. **Clean Document Upload** - Drag-drop PDF and YouTube support
4. **Interactive Learning** - Text input with keyboard shortcuts
5. **Responsive Dashboard** - Performance tracking and insights

### 3.4 Interactive Dashboard

**Performance Metrics Displayed:**
- 📊 Overall average score (across all tests)
- 🏆 Tests completed status (X/3)
- 📈 Improvement percentage since last test
- ⏱️ Estimated learning time
- 📊 Score progression graph
- 🎯 Topic-specific performance
- 💡 Strengths and areas for improvement
- 🔔 Personalized recommendations

**Interactive Features:**
- Hover effects on charts
- Real-time progress bar
- Color-coded performance indicators
- Responsive grid layout
- Mobile-friendly design

---

## Part 4: Authentication Flow

### 4.1 User Login Flow

```
User → "Sign in with Google" 
  ↓
Google OAuth Consent Screen
  ↓
Backend: /auth/google/callback
  ↓
Verify Google Token (JWT)
  ↓
Generate Application JWT Token
  ↓
Return User Data + Access Token
  ↓
Frontend: Store Token + User Data in LocalStorage
  ↓
Redirect to Dashboard/Learning Interface
```

### 4.2 Protected API Endpoints

All API endpoints (except /auth/*) should verify JWT token:

```python
# Backend Example
def verify_jwt(token):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload.get("sub")
    except:
        raise HTTPException(status_code=401)
```

### 4.3 Token Management

**Token Type:** JWT (JSON Web Token)
**Expiration:** 30 days
**Storage:** localStorage (frontend)
**Security:** Include in Authorization header for API calls

---

## Part 5: Test System Structure

### 5.1 Three-Test Progression

| Test | Questions | Difficulty | Features |
|------|-----------|-----------|----------|
| Test 1 | 20 (5 text + 15 MCQ) | Easy | Baseline assessment |
| Test 2 | 20 (5 text + 15 MCQ) | Adaptive | Based on Test 1 |
| Test 3 | 20 (5 text + 15 MCQ) | Adaptive | Based on Test 1-2 |

### 5.2 Question Generation (ASD-Optimized)

**Text Questions Generated With:**
- Clear, specific prompts
- Guided structure
- One concept per question
- Literal language

**MCQ Questions Generated With:**
- Non-obvious correct answers
- Clear, distinct options
- Comprehensive explanations
- Concrete examples

### 5.3 LLM-Based Answer Evaluation

Text answers evaluated using Groq LLM:

```python
def evaluate_text_answer(topic, question, user_answer):
    # LLM analyzes student response
    # Returns: {
    #   "is_correct": bool,
    #   "feedback": "explanation",
    #   "score": 0.0-1.0
    # }
```

---

## Part 6: Database Schema

### 6.1 Key Tables

**users** (for future expansion)
```sql
id: UUID PRIMARY KEY
email: VARCHAR UNIQUE
name: VARCHAR
picture: VARCHAR
created_at: TIMESTAMP
```

**test_sessions**
```sql
id: UUID PRIMARY KEY
topic: VARCHAR
test_number: INT (1-3)
initial_difficulty: VARCHAR
current_difficulty: VARCHAR
status: VARCHAR (in_progress, completed)
created_at: TIMESTAMP
completed_at: TIMESTAMP
```

**test_questions**
```sql
id: SERIAL PRIMARY KEY
session_id: UUID FK
question: TEXT
options: TEXT[] (NULL for text questions)
correct_answer: INT (NULL for text questions)
question_type: VARCHAR ('text' or 'mcq')
batch_number: INT
```

**user_test_answers**
```sql
id: SERIAL PRIMARY KEY
test_session_id: UUID FK
question_id: INT FK
user_answer: TEXT (or INT for MCQ)
is_correct: BOOLEAN
evaluation_result: JSON (LLM feedback)
```

**test_results**
```sql
id: SERIAL PRIMARY KEY
session_id: UUID FK
topic: VARCHAR
score: INT (0-100)
total_questions: INT
difficulty: VARCHAR
avg_emotion: FLOAT
avg_text_emotion: FLOAT
test_number: INT (1-3)
created_at: TIMESTAMP
```

### 6.2 Emotion Tracking

**test_emotions**
```sql
id: SERIAL PRIMARY KEY
session_id: UUID FK
emotion: VARCHAR (confused, focused, bored, happy)
emotion_type: VARCHAR ('image' or 'text')
confidence: FLOAT
captured_at: TIMESTAMP
```

---

## Part 7: API Endpoints Reference

### Authentication
- `POST /auth/google/callback` - Google OAuth callback
- `POST /auth/verify` - Verify JWT token

### Documents
- `POST /upload` - Upload PDF document
- `POST /upload-youtube` - Upload YouTube video
- `GET /documents` - Get all uploaded documents
- `DELETE /documents/{doc_id}` - Delete document

### Learning
- `GET /learn` - Generate learning material

### Tests
- `POST /test/create` - Create test session
- `POST /test/answer` - Submit MCQ answer
- `POST /test/evaluate-text-answer` - Evaluate text answer
- `GET /test/score` - Get test results
- `POST /test/batch/next` - Get next question batch

### Emotions
- `POST /test/emotion` - Store emotion data
- `POST /test/emotion/detect` - Detect emotion from image
- `POST /test/emotion/text` - Analyze text emotion
- `GET /test/emotion/stats` - Get emotion statistics

---

## Part 8: Running the Application

### 8.1 Start All Services

**Terminal 1 - Backend:**
```bash
cd backend
pipenv run python main.py
# Listens on: http://localhost:8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
# Opens: http://localhost:3000
```

### 8.2 Verify Setup

1. Open http://localhost:3000
2. You should see the Login page with "Sign in with Google" button
3. Click button and complete Google OAuth
4. You should be redirected to the learning interface
5. Click "Dashboard" to see performance metrics

---

## Part 9: Troubleshooting

### OAuth Issues
- **"Redirect URI mismatch"** - Check Google Console settings match code
- **"Invalid Client ID"** - Verify REACT_APP_GOOGLE_CLIENT_ID in .env.local
- **CORS errors** - Backend CORS is set to allow all origins

### Database Issues
- **Connection refused** - Ensure PostgreSQL is running
- **pgvector not found** - Run: `CREATE EXTENSION vector;` in psql
- **Column doesn't exist** - Run: `python setup_db.py` to migrate schema

### Frontend Issues
- **React Router not working** - Ensure BrowserRouter is in App.js
- **Components not found** - Check import paths are correct
- **Tailwind not styling** - Ensure npm packages installed: `npm install`

### LLM Issues
- **Groq API errors** - Verify GROQ_API_KEY in .env
- **Question generation fails** - Check LLM response format, review logs

---

## Part 10: Production Deployment

### 10.1 Before Deploying

1. **Security**
   - Change all default passwords
   - Use strong JWT_SECRET (32+ characters)
   - Enable HTTPS everywhere
   - Update CORS to limit origins

2. **Database**
   - Use managed PostgreSQL (AWS RDS, Supabase)
   - Enable SSL connections
   - Regular backups

3. **Environment Variables**
   - Never commit .env files
   - Use deployment platform's secrets management
   - Rotate credentials regularly

4. **Frontend Build**
   ```bash
   cd frontend
   npm run build
   # Deploy contents of /build folder
   ```

### 10.2 Deployment Checklist

- [ ] Environment variables updated for production
- [ ] Database migrated to production instance
- [ ] HTTPS enabled on both frontend and backend
- [ ] CORS configured to allow production domains only
- [ ] Google OAuth redirect URIs updated
- [ ] Database backups configured
- [ ] Error logging/monitoring enabled
- [ ] Performance testing completed
- [ ] Security audit performed

---

## Part 11: Future Enhancements

**Planned Features:**
1. Real-time WebSocket support for live feedback
2. Voice-based voice input for answers
3. Spaced repetition algorithm for optimal review
4. Teacher/parent dashboard for progress monitoring
5. Offline mode for learning materials
6. Multi-language support
7. Advanced analytics and AI-powered insights
8. Mobile app (React Native)
9. Gamification elements
10. Peer learning community features

---

## Support & Contact

For issues, questions, or feature requests, please refer to:
- **Documentation**: See markdown files in project root
- **Code Issues**: Check inline comments and docstrings
- **Setup Help**: Review SETUP_OAUTH2.md for auth issues

---

## License & Attribution

This learning platform was designed with care for students with Autism Spectrum Disorder.

**Key Technologies:**
- FastAPI (Backend)
- React (Frontend)
- PostgreSQL + pgvector (Database)
- Groq LLM (Question & Material Generation)
- Google OAuth 2.0 (Authentication)
- TensorFlow (Image Emotion Recognition)

---

**Last Updated:** April 2026
**Version:** 1.0

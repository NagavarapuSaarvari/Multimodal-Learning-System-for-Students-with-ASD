# Debugging Guide - ASD Learning System

## Issues Fixed

### 1. Missing `difficulty` Parameter in Test Creation
**Problem**: The `createTest` API function in `api.js` was not passing the `difficulty` parameter to the backend endpoint.

**Solution**: Updated the fetch URL to include both `topic` and `difficulty` parameters:
```javascript
// BEFORE (Missing difficulty)
`${API_BASE}/test/create?topic=${encodeURIComponent(topic)}`

// AFTER (Includes difficulty)
`${API_BASE}/test/create?topic=${encodeURIComponent(topic)}&difficulty=${difficulty}`
```

### 2. Insufficient Error Logging
**Problem**: The 500 error wasn't showing the actual root cause in terminal, making debugging difficult.

**Solution**: Added comprehensive error logging with traceback throughout the system:

#### Backend (main.py)
- Added `logging` and `traceback` modules
- Configured logging with timestamps and log levels
- Every endpoint now logs:
  - Request parameters
  - Operation progress
  - Full traceback on errors
  - Success messages with relevant details

#### Services (services.py)
- Added debug logging to `generate_questions()`:
  - LLM call progress
  - JSON parsing steps
  - Response validation
- Added debug logging to `create_test_session()`:
  - Session creation
  - Question generation
  - Database storage
- All exceptions include full traceback

#### Frontend (TestPanel.js)
- Enhanced `startTest()` function with console logging:
  - Request parameters (topic, difficulty)
  - API call status
  - Response data validation
  - Error details with stack trace

#### Frontend (api.js)
- Added error logging in `createTest()`:
  - Catches and logs fetch errors
  - Logs error response details
  - Includes error messages in exceptions

---

## How to Debug Issues

### 1. Check Backend Logs (Terminal)
When the backend is running with `pipenv run start`, all logs will appear in the terminal:

```
2026-03-15 14:30:45,123 - __main__ - INFO - Creating test for topic: ai, difficulty: easy
2026-03-15 14:30:45,124 - __main__ - DEBUG - Generating easy questions for topic: ai
2026-03-15 14:30:45,125 - __main__ - DEBUG - Calling LLM for question generation...
2026-03-15 14:30:47,523 - __main__ - DEBUG - LLM response received, length: 1450
2026-03-15 14:30:47,524 - __main__ - DEBUG - Raw response text (first 200 chars): [{"question": "...
2026-03-15 14:30:47,525 - __main__ - DEBUG - Parsing JSON...
2026-03-15 14:30:47,526 - __main__ - INFO - Successfully generated 10 questions
2026-03-15 14:30:47,530 - __main__ - DEBUG - Test session created successfully. Session ID: abc-123-def
```

### 2. Check Frontend Console Logs (Browser)
Open browser Developer Tools (F12 → Console) to see detailed logs:

```
[TestPanel] Starting test - Topic: "ai", Difficulty: "easy"
[TestPanel] Calling createTest API...
[TestPanel] Test created successfully!
[TestPanel] Session ID: abc-123-def
[TestPanel] Number of questions: 10
[TestPanel] Questions: [{...}, {...}, ...]
[TestPanel] Test UI initialized successfully
```

### 3. Common Error Scenarios and Solutions

#### Error: "Failed to create test"
1. Check backend terminal for error logs
2. Look for lines like: `ERROR - Error creating test: ...`
3. Common causes:
   - GROQ_API_KEY not set or invalid
   - Database connection issues
   - JSON parsing error in response

#### Error: "Internal Server Error (500)"
1. Terminal will show the full traceback:
   ```
   ERROR - Error creating test: [specific error message]
   Traceback (most recent call last):
     File "main.py", line 94, in create_test
       test_data = test_engine.create_test_session(topic, difficulty)
   ...
   [Full error details]
   ```

#### Error: "Could not parse test questions"
1. Check the LLM response format:
   - Should be valid JSON array
   - Response logged in terminal with `Raw response text:`
2. Verify LLM model is returning correct format
3. Check if markdown code blocks are being removed properly

#### Error: Database connection failed
1. Verify PostgreSQL is running
2. Check .env file has correct credentials
3. Run `python setup_db.py` to verify schema exists

---

## Log Levels Explained

### ERROR
- Critical failures that prevent operation
- Always check these first when debugging

### WARNING
- Non-critical issues (e.g., JSON parsing retry)
- Operation succeeds but with fallback logic

### INFO
- Normal operation flow (e.g., "Test created successfully")
- Useful for understanding what happened

### DEBUG
- Detailed information for development
- Shows intermediate steps and data

---

## Tips for Debugging

### 1. Enable DEBUG Logging
The system is set to DEBUG level by default. All intermediate steps are logged.

### 2. Test Endpoints with Curl
```bash
# Health check
curl http://localhost:8000/health

# Create test (replace TOPIC and DIFFICULTY)
curl -X POST "http://localhost:8000/test/create?topic=AI&difficulty=easy"
```

### 3. Monitor Terminal in Real-Time
Keep the backend terminal visible while testing. Watch log messages to understand request flow.

### 4. Use Browser Network Tab
DevTools → Network tab shows all API requests and responses:
- Request URL and parameters
- Response status code
- Response body (JSON)

### 5. Check Frontend Console
DevTools → Console shows:
- API call details
- Response data structure
- Error messages with stack traces

---

## Expected Log Flow When Creating a Test

### Frontend
```
[TestPanel] Starting test - Topic: "ai", Difficulty: "easy"
[TestPanel] Calling createTest API...
(waiting for response)
[TestPanel] Test created successfully!
[TestPanel] Session ID: 123e4567-e89b-12d3-a456-426614174000
[TestPanel] Number of questions: 10
```

### Backend (Terminal)
```
2026-03-15 14:30:45 - INFO - Creating test for topic: ai, difficulty: easy
2026-03-15 14:30:45 - DEBUG - Generating easy questions for topic: ai
2026-03-15 14:30:45 - DEBUG - Calling LLM for question generation...
(LLM processing, takes 1-3 seconds)
2026-03-15 14:30:47 - DEBUG - LLM response received, length: 1450
2026-03-15 14:30:47 - DEBUG - Parsing JSON...
2026-03-15 14:30:47 - INFO - Successfully generated 10 questions
2026-03-15 14:30:47 - DEBUG - Storing questions in database...
2026-03-15 14:30:47 - INFO - Test session created successfully. Session ID: 123e...
```

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| 500 Error on test creation | Check terminal logs for traceback, check GROQ_API_KEY |
| "Could not parse test questions" | Verify LLM response format in logs, try again (may be model variance) |
| Database errors | Run `python setup_db.py`, check DB connection in .env |
| Timeout on test creation | LLM API is slow, wait longer, check internet connection |
| Questions not loading | Frontend not receiving proper response, check Network tab in DevTools |

---

## When to Check What

- **In Terminal**: Database errors, API processing, full error tracebacks
- **In Browser Console**: Frontend errors, API call details, response parsing
- **In Browser Network Tab**: HTTP status codes, response JSON structure
- **In Browser UI**: User-facing error messages

---

## Environment Variables Checklist

Make sure `.env` in backend folder has:
```
✓ GROQ_API_KEY=gsk_xxxxx (valid API key)
✓ DB_USER=your_db_user
✓ DB_PASSWORD=your_db_password
✓ DB_HOST=localhost (or your DB host)
✓ DB_PORT=5432
✓ DB_NAME=your_db_name
```

---

This comprehensive logging system makes it easy to identify and fix issues quickly!

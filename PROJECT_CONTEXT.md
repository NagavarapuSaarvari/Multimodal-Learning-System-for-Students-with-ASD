# Multimodal Adaptive Learning System for Students with ASD

## Project Overview
A comprehensive web-based adaptive learning platform designed specifically for students with autism spectrum disorder (ASD). The system adjusts test difficulty dynamically based on student performance and emotional state, provides personalized learning materials, and monitors emotional engagement throughout the learning process.

## Architecture

### Tech Stack
- **Frontend**: React 17+, Tailwind CSS, Lucide Icons
- **Backend**: FastAPI, PostgreSQL with pgvector, TensorFlow, LangChain/Groq API
- **Emotion Detection**: Pre-trained TensorFlow model (image_model.h5) for facial emotion recognition
- **LLM Integration**: Groq API (llama-3.3-70b-versatile model)
- **Additional**: OpenCV, Sentence Transformers for embeddings, YoutubeDL for video search

### Project Structure
```
Multimodal-Learning-System-for-Students-with-ASD/
├── backend/
│   ├── main.py              # FastAPI application & routes
│   ├── services.py          # Core business logic (7 services)
│   ├── database.py          # PostgreSQL connection & pgvector
│   ├── schemas.py           # Pydantic models
│   ├── setup_db.py          # Database initialization
│   ├── image_emotion.py     # TensorFlow emotion model training
│   ├── image_model.h5       # Pre-trained emotion model
│   └── Pipfile              # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── App.js           # Main app routing (2 pages)
│   │   ├── components/
│   │   │   ├── Header.js        # Top navigation with branding
│   │   │   ├── Navbar.js        # Page switcher
│   │   │   ├── DocumentUpload.js # PDF upload interface
│   │   │   ├── LearnPage.js     # Learning material + test container
│   │   │   ├── ResultCard.js    # Learning material display
│   │   │   ├── QuestionCard.js  # Question renderer
│   │   │   ├── TestPanel.js     # Test interface
│   │   │   ├── TopicForm.js     # Topic input form
│   │   │   └── EmotionCapture.js # Webcam emotion tracking
│   │   └── services/
│   │       └── api.js           # API client
│   ├── package.json
│   ├── tailwind.config.js
│   └── public/
└── ARCHITECTURE.md
```

## Database Schema

### Core Tables

**documents**
- `id` (UUID, PK): Document identifier
- `filename` (TEXT): Original filename
- `file_type` (TEXT): File format (e.g., 'pdf')
- `uploaded_at` (TIMESTAMP): Upload time

**document_chunks**
- `id` (UUID, PK): Chunk identifier
- `document_id` (FK): References documents
- `content` (TEXT): Chunk text
- `embedding` (VECTOR[384]): pgvector embedding for similarity search

**learning_memory**
- `id` (SERIAL, PK): Record ID
- `topic` (TEXT): Topic studied
- `score` (INT): Test score achieved
- `difficulty` (TEXT): Difficulty level
- `created_at` (TIMESTAMP): Record timestamp

**test_sessions**
- `id` (UUID, PK): Session identifier
- `topic` (TEXT): Topic of test
- `test_number` (INT): 1, 2, or 3 (progression tracking)
- `initial_difficulty` (TEXT): Starting difficulty
- `current_difficulty` (TEXT): Current difficulty
- `status` (TEXT): 'in_progress', 'completed'
- `created_at` (TIMESTAMP): Session start time
- `completed_at` (TIMESTAMP): Session completion time

**test_questions**
- `id` (SERIAL, PK): Question ID
- `session_id` (FK): References test_sessions
- `topic` (TEXT): Topic
- `difficulty` (TEXT): Question difficulty
- `question` (TEXT): Question text
- `options` (TEXT[]): Multiple choice options (4 for MCQ, 1 for short answer)
- `correct_answer` (INT): Correct option index (0-3 for MCQ, 0 for short answer)
- `explanation` (TEXT): Answer explanation
- `created_at` (TIMESTAMP): Creation time

**user_test_answers**
- `id` (SERIAL, PK): Record ID
- `test_session_id` (FK): References test_sessions
- `question_id` (FK): References test_questions
- `user_answer` (INT): User's selected option index
- `is_correct` (BOOLEAN): Correctness flag
- `created_at` (TIMESTAMP): Submission time

**test_results**
- `id` (SERIAL, PK): Result ID
- `session_id` (FK): References test_sessions
- `topic` (TEXT): Topic tested
- `score` (INT): Final score (0-100)
- `total_questions` (INT): Total questions in test (12: 2 short answer + 10 MCQ)
- `difficulty` (TEXT): Test difficulty level
- `avg_emotion` (TEXT): Average emotional engagement score
- `test_number` (INT): Test progression (1, 2, or 3)
- `created_at` (TIMESTAMP): Result timestamp

**test_emotions**
- `id` (SERIAL, PK): Record ID
- `session_id` (FK): References test_sessions
- `emotion` (TEXT): Detected emotion label
- `confidence` (FLOAT): Detection confidence (0.0-1.0)
- `captured_at` (TIMESTAMP): Capture time

### Custom Functions
**match_documents(vector, count)**
- Performs similarity search using pgvector
- Returns top matching document chunks
- Used for RAG context retrieval

## API Endpoints

### Document Management
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/upload` | POST | Upload PDF document |
| `/documents` | GET | List all documents |
| `/documents/{doc_id}` | DELETE | Delete document |

### Learning Material
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/learn` | GET | Generate learning material (params: topic, difficulty) |

### Test Operations
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/test/create` | POST | Create test session (params: topic, difficulty, test_number) |
| `/test/answer` | POST | Submit answer (params: session_id, question_index, answer) |
| `/test/score` | GET | Get final test score (params: session_id) |
| `/test/emotion` | POST | Store emotion during test (params: session_id, emotion, confidence) |
| `/test/emotion/detect` | POST | Detect emotion from webcam image (body: JSON) |
| `/test/next-info` | GET | Get next test information (params: topic) |

### Health Check
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Service health check |

## Backend Services

### 1. EmbeddingService (Singleton)
Generates semantic embeddings for documents using Sentence Transformers.
- `embed(text)` → Converts text to 384-dim vector

### 2. PDFService
Extracts text from PDF files with Unicode sanitization.
- `extract_text_from_pdf(bytes)` → Plain text

### 3. DocumentService
Manages document uploads and storage.
- `upload_document(bytes, filename)` → doc_id
- `get_documents()` → List of documents
- `delete_document(doc_id)` → Void

### 4. YouTubeService
Searches for educational videos on YouTube.
- `search_videos(topic, num_results)` → List of video metadata

### 5. RAGService
Retrieves context and generates learning material using LLM.
- `retrieve_context(topic, limit)` → Relevant document chunks
- `generate_material(topic, memory, difficulty)` → Formatted learning material

### 6. TestEngine
Core testing logic including question generation and scoring.

**Methods:**
- `next_difficulty(current, accuracy, test_number, avg_emotion)` → next_difficulty
  - Adjusts difficulty based on accuracy + emotional state
  - Low emotion (<0.3) → Easier
  - High accuracy (>0.75) + high emotion (>0.6) → Harder
  - Low accuracy (<0.5) → Easier
  
- `generate_questions(topic, difficulty)` → {shortAnswerQuestions: [], mcqQuestions: []}
  - Generates 2 short answer questions (one sentence each)
  - Generates 10 multiple choice questions
  - Returns structured JSON
  
- `create_test_session(topic, difficulty, test_number)` → Test object
  - Creates session in database
  - Generates and stores 12 questions
  - Returns session metadata + questions
  
- `submit_answer(session_id, question_index, user_answer)` → Feedback
  - Stores user's answer
  - Returns correctness + correct answer
  
- `calculate_score(session_id, avg_emotion)` → Results object
  - Computes accuracy
  - Determines next difficulty
  - Stores results
  
- `get_test_count(topic)` → Integer
- `get_last_test_result(topic)` → Test result object

### 7. EmotionService
Detects and tracks emotional state during tests.

**Methods:**
- `predict(image)` → {emotion, confidence}
  - Uses TensorFlow model on webcam frame
  - Labels: "confused", "focused", "bored", "happy"
  
- `store_emotion(session_id, emotion, confidence)` → Void
  - Stores emotion record in database
  
- `get_average_emotion(session_id)` → Float
  - Returns average emotion confidence for session
  
- `extract_emotion_from_text(text)` → {emotion, confidence}
  - **PLACEHOLDER**: For future NLP-based text analysis
  - Should analyze answer length, frustration, confidence

### MemoryService
Tracks learning history and performance trends.
- `get_memory()` → Recent learning records
- `store_memory(topic, score, difficulty)` → Void

## Test Flow (3-Test Progression)

### Test 1 (Difficulty: EASY)
- Always starts at easy level
- 2 short answer + 10 MCQ questions
- User answers and receives feedback
- Emotion tracked via webcam (5-sec intervals)

### Test 1 → Test 2 Difficulty Calculation
```
if emotion_avg < 0.3:  # Confused/bored
    → MAINTAIN or DECREASE difficulty
elif accuracy > 0.75 AND emotion_avg > 0.6:  # Confident & focused
    → INCREASE difficulty
elif accuracy < 0.5:  # Low score
    → DECREASE difficulty
else:
    → MAINTAIN difficulty
```

### Test 2
- Difficulty adjusted based on Test 1 performance + emotion
- 2 short answer + 10 MCQ questions
- Same emotion tracking

### Test 2 → Test 3
- Further difficulty adjustment using same logic
- Incorporates cumulative performance data

### Test 3
- Final test at appropriate difficulty level
- All results aggregated for learning analytics

## Emotion Detection System

### Webcam-Based (Real-time)
1. **Activation**: Starts when test begins
2. **Capture**: Every 5 seconds during test
3. **Processing**:
   - Converts frame to base64
   - Sends to `/test/emotion/detect` endpoint
   - TensorFlow model predicts emotion
   - Stores in database
4. **Averaging**: On test completion, calculates average confidence
5. **Integration**: Used in difficulty adjustment and test results

### Text-Based (Placeholder)
- Method: `EmotionService.extract_emotion_from_text()`
- Currently returns default 0.5 confidence
- **TODO**: Implement sentiment analysis on student answers
  - Analyze response length (verbosity indicates engagement)
  - Detect frustration keywords
  - Assess confidence in phrasing
  
## Frontend Components

### Header
- Centered branding with Brain icon
- "Adaptive Learning Hub" title
- Subtitle about ASD personalization

### Navbar
- Toggle between 2 pages:
  1. **Upload Documents** (DocumentUpload page)
  2. **Learn & Test** (LearnPage)

### DocumentUpload Page
- File upload with drag-and-drop
- Support for PDF files up to 50MB
- Document list with delete functionality
- Progress feedback during upload

### LearnPage
- **TopicForm**: Input topic name → generates material
- **ResultCard**: Display learning material + YouTube videos
- **TestPanel**: MCQ test interface with instant feedback
- Progresses through 3 tests with adaptive difficulty

### EmotionCapture
- Fixed bottom-right corner display
- Live webcam feed (150x auto size)
- Emotion status indicator (Active/Ready/Disabled)
- Gracefully handles camera access denial

### TestPanel
- Displays current question (short answer or MCQ)
- Shows progress bar and question count
- Instant feedback for answers:
  - Green checkmark + explanation if correct
  - Red X + correct answer if incorrect
- Next/Submit buttons
- Test completion summary:
  - Score percentage
  - Correct/total count
  - Emotion tracking summary
  - Next test button (if test < 3)

## Question Structure

### Generation Response
```json
{
  "shortAnswerQuestions": [
    {
      "question": "One sentence question?",
      "sampleAnswer": "Expected answer"
    }
  ],
  "mcqQuestions": [
    {
      "question": "Multiple choice question?",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": 0,
      "explanation": "Why A is correct..."
    }
  ]
}
```

### Storage in Database
- Both types stored in `test_questions` table
- Short answer: options=[sampleAnswer], correct_answer=0
- MCQ: options=[A,B,C,D], correct_answer=0-3

## Environment Variables Required

```bash
# Database
DB_USER=
DB_PASSWORD=
DB_HOST=
DB_PORT=5432
DB_NAME=

# LLM
GROQ_API_KEY=
```

## Token Optimization

### LLM Call Reductions
1. **Context Limiting**: Retrieve only 2 most relevant document chunks (vs 5)
2. **Material Generation**: Minimal formatting requirements, concise instructions
3. **Question Generation**: JSON-only format, reduced example count
4. **Video Results**: Limited to 2 YouTube videos per query

### Token Budget Management
- Initial request size: ~14,181 tokens (was hitting Groq's 12,000 TPM limit)
- Optimized to ~8,000-9,000 tokens per request
- Fits within free tier limits comfortably

## Key Features

✅ **Adaptive Difficulty Progression**
- 3-test system with automatic adjustment
- Based on accuracy + emotional state
- No user difficulty selection (automatic)

✅ **Emotion-Aware Adaptation**
- Continuous webcam monitoring during tests
- 5-second capture intervals
- Average confidence integrated into difficulty logic

✅ **Question Format Diversity**
- 2 short-answer questions per test
- 10 multiple choice questions per test
- Rich explanations for learning

✅ **Learning Material Generation**
- RAG-based retrieval from user documents
- LLM-generated material at appropriate level
- YouTube video integration (max 2 videos)

✅ **Comprehensive Feedback**
- Instant feedback after each answer
- Detailed explanations
- Progress tracking
- Test result summary with emotion data

✅ **ASD-Specific Design**
- Simple, clear interface
- Minimal cognitive load
- Instant gratification (immediate feedback)
- Structured progression
- Emotional support through monitoring

## Known Limitations & TODOs

1. **Text Emotion Extraction**: Currently placeholder - needs NLP implementation
2. **Emotion Model Accuracy**: Depends on lighting, face visibility (fallback to neutral)
3. **PDF Processing**: Single-column PDFs work best; complex layouts may lose formatting
4. **Language Support**: English only (LLM model limitation)
5. **Concurrent Tests**: Single-user per session (no multi-user support)

## Error Handling

- Camera access denied: Shows warning, continues without emotion tracking
- LLM API errors: Returns fallback responses
- Database errors: Logs extensively, returns 500 errors
- Invalid JSON from LLM: Regex parsing fallback
- Missing documents: Returns empty context, LLM generates from topic only

## Performance Notes

- Initial app load: ~2-3 seconds (React bundle)
- Generate material call: ~5-8 seconds (LLM + YouTube search)
- Generate questions call: ~3-5 seconds (LLM only)
- Webcam initialization: Instant if permissions granted
- Emotion detection: ~100ms per frame
- Database queries: <100ms average

## Running the Project

### Backend
```bash
cd backend
pipenv install
python setup_db.py  # Initialize database
python main.py      # Start FastAPI server
```

### Frontend
```bash
cd frontend
npm install
npm start  # Start React dev server
```

App runs at: `http://localhost:3000`
API runs at: `http://localhost:8000`
API Docs: `http://localhost:8000/docs`

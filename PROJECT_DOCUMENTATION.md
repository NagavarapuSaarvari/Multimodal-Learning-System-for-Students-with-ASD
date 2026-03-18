# Multimodal Learning System for Students with ASD - Complete Project Documentation

## 📋 Project Overview

A web-based adaptive learning system designed specifically for students with Autism Spectrum Disorder (ASD). The system provides personalized learning experiences with:
- **3-test adaptive progression** - difficulty adjusts based on performance
- **Emotion tracking** - monitors student emotions during tests via webcam
- **AI-powered learning materials** - generates custom study content using LLMs
- **Document upload** - PDF-based knowledge base with RAG (Retrieval-Augmented Generation)
- **YouTube integration** - recommended video resources for each topic
- **Production-grade UI** - modern, responsive design with Tailwind CSS

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Frontend (React)                             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Header | Navbar [Upload | Learn & Test]                 │   │
│  │ ┌────────────────────────────────────────────────────┐   │   │
│  │ │ Page 1: DocumentUpload                             │   │   │
│  │ │ - File input (PDF up to 50MB)                      │   │   │
│  │ │ - Upload to backend                                │   │   │
│  │ │ - Display uploaded documents list                  │   │   │
│  │ └────────────────────────────────────────────────────┘   │   │
│  │ ┌────────────────────────────────────────────────────┐   │   │
│  │ │ Page 2: LearnPage (Main Learning Interface)        │   │   │
│  │ │ ┌──────────────────────────────────────────────┐   │   │   │
│  │ │ │ TopicForm: User enters topic                │   │   │   │
│  │ │ └──────────────────────────────────────────────┘   │   │   │
│  │ │ ┌──────────────────────────────────────────────┐   │   │   │
│  │ │ │ ResultCard: Displays learning material       │   │   │   │
│  │ │ │ - Content + YouTube videos                   │   │   │   │
│  │ │ └──────────────────────────────────────────────┘   │   │   │
│  │ │ ┌──────────────────────────────────────────────┐   │   │   │
│  │ │ │ TestPanel: 10 MCQ questions                  │   │   │   │
│  │ │ │ - Multiple choice interface                  │   │   │   │
│  │ │ │ - Submit answers one by one                  │   │   │   │
│  │ │ │ - Display results after test                 │   │   │   │
│  │ │ └──────────────────────────────────────────────┘   │   │   │
│  │ │ ┌──────────────────────────────────────────────┐   │   │   │
│  │ │ │ EmotionCapture: Webcam-based tracking       │   │   │   │
│  │ │ │ - Captures frames every 5 seconds            │   │   │   │
│  │ │ │ - Sends to backend for emotion detection     │   │   │   │
│  │ │ │ - Shows in bottom-right corner               │   │   │   │
│  │ │ └──────────────────────────────────────────────┘   │   │   │
│  │ └────────────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                             ▲
                             │ HTTP/REST
                             │ (Fetch API)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                Backend API (FastAPI)                            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Core Endpoints                                           │   │
│  │ • POST /upload - Upload PDF documents                    │   │
│  │ • GET /documents - List all documents                    │   │
│  │ • DELETE /documents/{doc_id} - Delete document           │   │
│  │ • GET /learn?topic=X&difficulty=Y - Generate material    │   │
│  │ • POST /test/create - Create test session                │   │
│  │ • POST /test/answer - Submit answer                      │   │
│  │ • GET /test/score - Calculate final score                │   │
│  │ • POST /test/emotion - Store emotion from manual input    │   │
│  │ • POST /test/emotion/detect - AI emotion detection       │   │
│  │ • GET /test/next-info - Get test progression info        │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Service Layer (services.py)                              │   │
│  │ • EmbeddingService - Semantic search with embeddings     │   │
│  │ • PDFService - Extract text from PDFs                    │   │
│  │ • DocumentService - Manage uploaded documents            │   │
│  │ • YouTubeService - Search & fetch video links            │   │
│  │ • RAGService - Generate learning material                │   │
│  │ • MemoryService - Track learning progress                │   │
│  │ • TestEngine - Generate & score tests                    │   │
│  │ • EmotionService - Detect & store emotions               │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                             ▲
                             │ Database Connection
                             │ (psycopg2)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│            PostgreSQL Database with pgvector                    │
│  • documents - Uploaded PDF metadata                            │
│  • document_chunks - Chunked text with embeddings               │
│  • learning_memory - Student progress tracking                  │
│  • test_sessions - Active/completed test records                │
│  • test_results - Test scores & performance                     │
│  • test_questions - Question data                               │
│  • user_test_answers - Student answers                          │
│  • test_emotions - Emotion tracking per test                    │
└─────────────────────────────────────────────────────────────────┘

External Services:
• Groq API (LLM) - Generate test questions & learning material
• SentenceTransformers - Create text embeddings
• TensorFlow - Emotion detection from facial images
• PyTube - Fetch YouTube video information
```

---

## 🛠️ Technology Stack

### Frontend
- **React 17+** - UI library
- **Tailwind CSS** - Styling framework
- **Lucide React** - Icon library
- **Fetch API** - HTTP communication
- **Conditional Rendering** - Page-based navigation

### Backend
- **FastAPI** - Web framework
- **Python 3.9+** - Runtime
- **PostgreSQL** - Database
- **pgvector** - Vector similarity search
- **TensorFlow/Keras** - ML emotion detection
- **Groq API** - LLM for content generation
- **SentenceTransformers** - Embeddings
- **OpenCV** - Image processing
- **PyPDF2** - PDF text extraction
- **PyTube** - YouTube data fetching
- **python-dotenv** - Environment configuration

### AI Models
- **image_model.h5** - Trained emotion detection model
- **all-MiniLM-L6-v2** - Sentence embedding model (384 dims)
- **openai/gpt-oss-120b** (via Groq) - LLM for question generation

---

## 📊 Database Schema

### documents
```sql
CREATE TABLE documents (
    id UUID PRIMARY KEY,
    filename TEXT,
    file_type TEXT DEFAULT 'pdf',
    uploaded_at TIMESTAMP DEFAULT NOW()
);
```

### document_chunks
```sql
CREATE TABLE document_chunks (
    id UUID PRIMARY KEY,
    document_id UUID REFERENCES documents(id),
    content TEXT,
    embedding VECTOR(384)
);
```

### learning_memory
```sql
CREATE TABLE learning_memory (
    id SERIAL PRIMARY KEY,
    topic TEXT,
    score INT,
    difficulty TEXT DEFAULT 'easy',
    created_at TIMESTAMP DEFAULT NOW()
);
```

### test_sessions
```sql
CREATE TABLE test_sessions (
    id UUID PRIMARY KEY,
    topic TEXT,
    test_number INT DEFAULT 1,
    initial_difficulty TEXT DEFAULT 'easy',
    current_difficulty TEXT DEFAULT 'easy',
    status TEXT DEFAULT 'in_progress',  -- 'in_progress', 'completed'
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);
```

### test_results
```sql
CREATE TABLE test_results (
    id SERIAL PRIMARY KEY,
    session_id UUID REFERENCES test_sessions(id),
    topic TEXT,
    score INT,
    total_questions INT,
    difficulty TEXT,
    avg_emotion FLOAT,
    test_number INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### test_questions
```sql
CREATE TABLE test_questions (
    id SERIAL PRIMARY KEY,
    session_id UUID REFERENCES test_sessions(id),
    topic TEXT,
    difficulty TEXT,
    question TEXT,
    options TEXT[],          -- Array of 4 options
    correct_answer INT,      -- Index 0-3
    explanation TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### user_test_answers
```sql
CREATE TABLE user_test_answers (
    id SERIAL PRIMARY KEY,
    test_session_id UUID REFERENCES test_sessions(id),
    question_id INT REFERENCES test_questions(id),
    user_answer INT,        -- Index 0-3
    is_correct BOOLEAN,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### test_emotions
```sql
CREATE TABLE test_emotions (
    id SERIAL PRIMARY KEY,
    session_id UUID REFERENCES test_sessions(id),
    emotion TEXT,           -- 'confused', 'focused', 'bored', 'happy'
    confidence FLOAT,       -- 0.0 to 1.0
    captured_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🔌 API Endpoints

### Document Management
```
POST /upload
├─ Description: Upload a PDF file
├─ Parameters: File (multipart/form-data)
└─ Response: { doc_id: UUID, filename: string }

GET /documents
├─ Description: List all uploaded documents
└─ Response: { documents: Array<{ id, filename, uploaded_at }> }

DELETE /documents/{doc_id}
├─ Description: Delete a document and its chunks
└─ Response: { deleted: true }
```

### Learning Material
```
GET /learn?topic={topic}&difficulty={difficulty}
├─ Description: Generate learning material for a topic
├─ Query Params:
│  ├─ topic: string (required)
│  └─ difficulty: 'easy' | 'medium' | 'hard' (default: 'easy')
└─ Response: {
    material: string (formatted with definitions, examples, YouTube links),
    topic: string,
    difficulty: string
}
```

### Test Management - Phase 1: Create Test
```
POST /test/create?topic={topic}&difficulty={difficulty}&test_number={num}
├─ Description: Create a new test session (3 tests total per topic)
├─ Query Params:
│  ├─ topic: string (required)
│  ├─ difficulty: 'easy' | 'medium' | 'hard' (default: 'easy')
│  └─ test_number: 1 | 2 | 3 (default: 1)
├─ Logic:
│  ├─ Test 1: Always "easy"
│  ├─ Test 2+: Difficulty auto-adjusted based on test_number score
│  └─ Generates 10 MCQ questions via LLM
└─ Response: {
    sessionId: UUID,
    topic: string,
    difficulty: string,
    testNumber: 1-3,
    questions: Array<{
      question: string,
      options: [string, string, string, string],
      correctAnswer: 0-3,
      explanation: string
    }>
}
```

### Test Management - Phase 2: Submit Answers
```
POST /test/answer?test_session_id={id}&question_index={idx}&user_answer={ans}
├─ Description: Submit answer to a question (one at a time)
├─ Query Params:
│  ├─ test_session_id: UUID (required)
│  ├─ question_index: 0-9 (required)
│  └─ user_answer: 0-3 (required)
└─ Response: {
    isCorrect: boolean,
    correctAnswer: 0-3,
    userAnswer: 0-3
}
```

### Test Management - Phase 3: Calculate Score
```
GET /test/score?test_session_id={id}
├─ Description: Calculate final test score and store results
├─ Query Params:
│  └─ test_session_id: UUID (required)
├─ Logic:
│  ├─ Counts correct answers
│  ├─ Calculates accuracy (0.0 - 1.0)
│  ├─ Calculates score (0-100)
│  ├─ Determines difficulty for next test
│  ├─ Stores results in test_results table
│  └─ Gets average emotion from test session
└─ Response: {
    sessionId: UUID,
    topic: string,
    score: 0-100,
    accuracy: 0.0-1.0,
    difficulty: string,
    nextDifficulty: string,
    totalQuestions: 10,
    correctAnswers: 0-10,
    avgEmotion: 0.0-1.0,
    testNumber: 1-3
}
```

### Emotion Tracking
```
POST /test/emotion?test_session_id={id}&emotion={emotion}&confidence={conf}
├─ Description: Store emotion manually
├─ Query Params:
│  ├─ test_session_id: UUID (required)
│  ├─ emotion: string (required)
│  └─ confidence: 0.0-1.0 (default: 0.0)
└─ Response: { status: "stored" }

POST /test/emotion/detect
├─ Description: Detect emotion from webcam image (AI-powered)
├─ Body (JSON): {
│  test_session_id: UUID,
│  image_data: "data:image/jpeg;base64,..." (base64 encoded image)
├─ Logic:
│  ├─ Decodes base64 image
│  ├─ Processes with TensorFlow model
│  ├─ Classifies emotion: 'confused', 'focused', 'bored', 'happy'
│  ├─ Stores with confidence score
│  └─ Returns emotion label
└─ Response: {
    status: "detected",
    emotion: string,
    confidence: 0.0-1.0
}
```

### Test Progression
```
GET /test/next-info?topic={topic}
├─ Description: Get next test information (number 1-3)
├─ Query Params:
│  └─ topic: string (required)
├─ Logic:
│  ├─ Counts completed tests for topic
│  ├─ Determines next test number (1-4)
│  └─ Checks if all 3 tests are complete
└─ Response: {
    testNumber: 1-4,
    testCompleted: boolean,
    message: string
}
```

---

## 🎨 Frontend Component Details

### Header.js
- Displays centered branding with Brain icon
- Shows title "Adaptive Learning Hub"
- Subtitle: "Personalized AI-Powered Learning for Students with ASD"
- Gradient background (blue to indigo)

### Navbar.js
- Two-page navigation: "Upload Documents" | "Learn & Test"
- Active state styling
- Responsive mobile-friendly design

### DocumentUpload.js
- File input for PDF selection (max 50MB)
- Shows selected file name and size
- Lists all uploaded documents
- Delete buttons for each document
- Loading states and error handling
- Only shows "PDF files up to 50MB" as supported format

### TopicForm.js
- Text input for topic selection
- Submit button to generate learning material
- NO difficulty selector (auto-determined by backend)
- Loading state during generation

### ResultCard.js
- Displays generated learning material
- Shows YouTube video recommendations as playlists
- Formatted text with:
  - Key Concepts
  - Learning Objectives
  - Definitions
  - Practical Examples
  - Important Notes

### TestPanel.js
- Displays 10 MCQ questions sequentially
- Shows current question progress (e.g., "Question 3 of 10")
- Multiple choice buttons (A, B, C, D)
- Submit button for each answer
- After test:
  - Score breakdown (correct/total)
  - Accuracy percentage
  - Average emotion during test
  - Button to prepare for next test

### EmotionCapture.js
- Fixed position (bottom-right corner)
- Shows live webcam video
- Status indicator: "Active" (green) or "Ready" (gray)
- Camera access request dialog
- Graceful fallback if camera denied
- Captures frames every 5 seconds during test
- Non-blocking: test continues even if emotion tracking unavailable

---

## 📈 Difficulty Progression Logic

### Test 1: Always "Easy"
- Students start with foundational questions
- Builds confidence and familiarity

### Difficulty Adjustment (Tests 2+)
```python
def next_difficulty(current, accuracy, test_number):
    if test_number == 1:
        return "easy"
    
    if accuracy > 0.75:  # 75% or higher
        return upgrade(current)  # easy→medium, medium→hard
    elif accuracy < 0.5:  # Below 50%
        return downgrade(current)  # hard→medium, medium→easy
    else:
        return current  # 50%-75%: maintain same difficulty
```

### Accuracy Calculation
```
accuracy = correct_answers / 10
score = accuracy * 100 (0-100)
```

---

## 🚀 How to Run

### Prerequisites
- Python 3.9+
- Node.js 14+
- PostgreSQL 13+
- Groq API key
- GROQ_API_KEY environment variable

### Backend Setup
```bash
cd backend

# Create virtual environment
pipenv install

# Setup database
python setup_db.py

# Run server
python main.py
```
Server runs on `http://localhost:8000`

### Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm start
```
Frontend runs on `http://localhost:3000`

### Environment Variables (.env in backend)
```
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=asd_learning
GROQ_API_KEY=your_groq_api_key
```

---

## 🔍 Key Features Explained

### 1. Adaptive Difficulty
- **First Test**: Always starts with easy questions (builds confidence)
- **Subsequent Tests**: Automatically adjusts based on:
  - Accuracy score from previous test
  - Test number (1, 2, or 3)
  - Progressive learning assessment

### 2. Emotion Tracking
- **Webcam Integration**: Captures student emotions every 5 seconds
- **Non-intrusive**: Semi-transparent overlay in corner
- **4 Emotion Classes**: confused, focused, bored, happy
- **AI Detection**: TensorFlow model identifies emotions from facial expressions
- **Fallback**: System works even if camera access denied
- **Averaging**: Final emotion score is average of all captures during test

### 3. Learning Material Generation
- **LLM-Powered**: Uses Groq API with GPT model
- **Context-Aware**: Includes:
  - Definitions and key concepts
  - Learning objectives
  - Practical examples
  - Important notes
  - YouTube video recommendations
- **Difficulty-Specific**: Content complexity matches difficulty level

### 4. Test Generation
- **10 Multiple Choice Questions** per test
- **LLM-Based**: Questions generated by AI
- **Explanations**: Each question includes detailed explanation
- **Sequential**: One question at a time reduces cognitive load
- **Immediate Feedback**: Shows correctness after each answer

### 5. Document Management
- **PDF Upload**: Students/educators upload learning materials
- **Text Extraction**: Automatic text extraction from PDFs
- **Vector Embeddings**: Documents stored with semantic embeddings
- **RAG Integration**: Documents used to augment LLM context

### 6. Progress Tracking
- **Learning Memory**: Tracks all test results
- **Historical Data**: Stores difficulty, scores, timestamps
- **Performance Analysis**: System learns from past tests

---

## 🐛 Troubleshooting

### Backend Errors

**Error: "AttributeError: 'TestEngine' object has no attribute 'get_test_count'"**
- **Status**: FIXED
- **Solution**: Methods added to TestEngine: get_test_count(), get_last_test_result(), submit_answer(), calculate_score()

**Error: "Import 'cv2' could not be resolved"**
- **Cause**: OpenCV not installed in environment
- **Solution**: `pip install opencv-python` or use pipenv

**Error: Database connection failed**
- **Cause**: PostgreSQL not running or credentials wrong
- **Solution**: 
  - Start PostgreSQL service
  - Verify .env file has correct credentials
  - Run setup_db.py to create tables

**Error: "GROQ_API_KEY not found"**
- **Cause**: Environment variable not set
- **Solution**: Add GROQ_API_KEY to .env file

### Frontend Errors

**Error: "fetch failed" when uploading document**
- **Cause**: Backend server not running
- **Solution**: Start backend with `python main.py`

**Error: "Cannot read property 'difficulty' of undefined"**
- **Cause**: difficulty prop removed but still being accessed
- **Solution**: Check that TestPanel only receives topic and testNumber

**Error: Webcam shows "Camera access denied"**
- **Cause**: Browser permissions or camera already in use
- **Solution**: 
  - Allow camera access in browser settings
  - Close other camera applications
  - System continues without emotion tracking

**Error: "npm start" fails with EACCES**
- **Cause**: Node modules permission issue
- **Solution**: `npm install --legacy-peer-deps` or `npm ci`

---

## 📝 File Structure

```
Multimodal-Learning-System-for-Students-with-ASD/
├── backend/
│   ├── main.py                 # FastAPI application
│   ├── services.py             # Business logic
│   ├── database.py             # DB connection
│   ├── schemas.py              # Pydantic models
│   ├── setup_db.py             # Database initialization
│   ├── image_emotion.py        # ML model training script
│   ├── image_model.h5          # Trained emotion model
│   ├── Pipfile                 # Python dependencies
│   └── .env                    # Environment variables
│
├── frontend/
│   ├── public/
│   │   ├── index.html
│   │   ├── favicon.ico
│   │   ├── manifest.json
│   │   └── robots.txt
│   ├── src/
│   │   ├── App.js              # Main app component
│   │   ├── App.css
│   │   ├── index.js            # React entry point
│   │   ├── index.css
│   │   ├── components/
│   │   │   ├── Header.js       # Top banner
│   │   │   ├── Navbar.js       # Navigation (Upload | Learn & Test)
│   │   │   ├── DocumentUpload.js
│   │   │   ├── LearnPage.js    # Main learning interface
│   │   │   ├── TopicForm.js
│   │   │   ├── ResultCard.js   # Learning material display
│   │   │   ├── TestPanel.js    # Test interface
│   │   │   ├── QuestionCard.js
│   │   │   └── EmotionCapture.js
│   │   └── services/
│   │       └── api.js          # All API calls
│   ├── package.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── README.md
│
├── ARCHITECTURE.md
├── QUICKSTART.md
└── PROJECT_DOCUMENTATION.md    # This file
```

---

## 🔄 Data Flow Examples

### Example 1: Student Takes a Test

1. Student enters topic in TopicForm
2. Frontend calls `GET /learn?topic=ai&difficulty=easy`
3. Backend:
   - Retrieves context from uploaded documents
   - Queries YouTube for videos
   - Calls Groq LLM to generate learning material
   - Returns formatted material with videos
4. Frontend displays material in ResultCard
5. Student clicks "Start Test"
6. Frontend calls `POST /test/create?topic=ai&difficulty=easy&test_number=1`
7. Backend:
   - Creates test_sessions record
   - Calls LLM to generate 10 questions
   - Stores questions in test_questions table
   - Returns questions to frontend
8. Frontend displays TestPanel with first question
9. EmotionCapture starts webcam, captures frames every 5 seconds
10. Student selects answer A
11. Frontend calls `POST /test/answer?test_session_id=xxx&question_index=0&user_answer=0`
12. Backend stores answer, returns correctness
13. Frontend shows next question
14. Repeat steps 10-13 for all 10 questions
15. After final question, frontend calls `GET /test/score?test_session_id=xxx`
16. Backend:
    - Calculates accuracy (e.g., 8/10 = 80%)
    - Determines nextDifficulty (medium)
    - Gets avgEmotion (0.72)
    - Stores results in test_results
    - Updates test_sessions status to 'completed'
17. Frontend displays results:
    - Score: 80/100
    - Accuracy: 80%
    - Average Emotion: 0.72 (focused)
    - Button: "Prepare for Next Test"
18. Student clicks "Prepare for Next Test"
19. Loop returns to Step 1 (test_number increments to 2)

### Example 2: Emotion Detection Flow

1. Test starts, EmotionCapture initializes
2. Browser requests camera permission
3. User allows → video stream starts
4. Every 5 seconds:
   - Captures frame: `canvas.toDataURL("image/jpeg")`
   - Encodes to base64
   - Sends to `POST /test/emotion/detect` with image data
5. Backend:
   - Decodes base64 image
   - Resizes to 96x96 (model input)
   - Runs through TensorFlow model
   - Gets emotion probabilities: {confused: 0.1, focused: 0.8, bored: 0.05, happy: 0.05}
   - Picks highest: focused (0.8)
   - Stores in test_emotions table
   - Returns emotion label
6. Frontend updates status indicator
7. On test completion, `GET /test/score` calculates average emotion
8. Results include avgEmotion in response

---

## 💡 Important Implementation Notes

### Auto-Determined Difficulty
- **No UserChoice**: Students cannot select difficulty
- **Backend Logic**: TestEngine.next_difficulty() decides automatically
- **Metric**: Based on accuracy from previous test
- **Progressive**: Test 1 builds confidence, Tests 2-3 adapt

### One Answer at a Time
- **UX Design**: Reduces cognitive overwhelm
- **Immediate Feedback**: Shows correct/incorrect for each question
- **Non-Blocking**: Webcam emotion tracking happens silently

### Emotion Tracking is Non-Critical
- **Fallback**: System works perfectly without camera
- **Optional**: Camera denial doesn't stop testing
- **Graceful**: Error messages don't interrupt learning

### LLM Integration
- **Groq API**: Used for both question and material generation
- **Fallback**: None currently (need error handling)
- **Rate Limits**: May need caching for repeated topics

### Vector Search (RAG)
- **Embeddings**: 384 dimensions from SentenceTransformers
- **Similarity**: Cosine similarity via pgvector
- **Context**: Top 5 most similar chunks Retrieved for material generation

---

## 🎯 Future Enhancements

1. **Caching**: Cache generated materials and questions
2. **Batch Emotion**: Send emotion images in batches instead of one-by-one
3. **Student Profiles**: Track individual learning journeys over time
4. **Parent Dashboard**: Show progress analytics and recommendations
5. **Adaptive Content**: Adjust material based on detected emotion
6. **Multilingual**: Support multiple languages for diverse student populations
7. **Accessibility**: Enhanced WCAG compliance
8. **Mobile App**: Native iOS/Android companion app
9. **Real-time Collaboration**: Peer learning features
10. **Gamification**: Points, badges, and progress visualization

---

## 📞 Support & Debugging

For issue resolution:

1. **Check logs**: 
   - Backend: Console output from `python main.py`
   - Frontend: Browser DevTools Console
   
2. **Common fixes**:
   - Restart both frontend and backend servers
   - Clear browser cache (Ctrl+Shift+Delete)
   - Check .env file for missing variables
   - Verify PostgreSQL is running

3. **API Testing**:
   - Use Postman/Insomnia for manual testing
   - Check response status codes
   - Verify request body/query parameters

---

## 📄 License & Usage

This system is designed for educational research with students with ASD. Implementation should include:
- Ethics board approval
- Parental/guardian consent
- COPPA compliance (if applicable)
- Data privacy and security measures
- Regular educator training

---

**Last Updated**: March 16, 2026  
**Project Status**: Beta (Ready for Testing)  
**Version**: 1.0.0

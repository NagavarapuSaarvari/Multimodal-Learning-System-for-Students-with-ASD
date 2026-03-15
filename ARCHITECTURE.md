# Technical Architecture - ASD Learning System

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                        │
│  - Document Upload & List                                   │
│  - Topic Input & Difficulty Selection                       │
│  - Study Material Display with Videos                       │
│  - Test UI with Real-time Feedback                          │
│  - Results & Revision Test Management                       │
└──────────────────┬──────────────────────────────────────────┘
                   │ HTTP/REST
                   ▼
┌─────────────────────────────────────────────────────────────┐
│                   Backend (FastAPI)                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ API Layer (main.py)                                 │   │
│  │  - /upload, /documents, /delete                     │   │
│  │  - /learn (with difficulty)                         │   │
│  │  - /test/create, /test/answer, /test/score          │   │
│  └──────────────────────────────────────────────────────┘   │
│                         ▲                                    │
│                         │                                    │
│  ┌──────────────────────┴──────────────────────────────┐   │
│  │ Service Layer (services.py)                        │   │
│  │                                                    │   │
│  │ DocumentService ──► PDFService                      │   │
│  │ RAGService ───────► YouTubeService                  │   │
│  │ TestEngine ───────► Test Generation & Validation    │   │
│  │ MemoryService ────► Learning Progress Tracking     │   │
│  │ EmotionService ───► Emotion Detection (optional)    │   │
│  │ EmbeddingService ──► Vector Generation (pgvector)   │   │
│  └──────────────────────┬──────────────────────────────┘   │
│                         │                                    │
│                         ▼                                    │
└─────────────────────────────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
    ┌─────────┐   ┌──────────────┐   ┌──────────┐
    │PostgreSQL   Groq LLM      pytube  PyPDF2  │
    │ + pgvector (Text Gen)     (Videos)(PDF)   │
    └─────────┘   └──────────────┘   └──────────┘
```

## Component Details

### Frontend Architecture

```
App.js (Main Orchestrator)
├── Header.js (Branding)
├── DocumentUpload.js
│   └── Document list management
│       └── API calls: uploadDocument, getDocuments, deleteDocument
├── TopicForm.js
│   └── Topic & difficulty selection
│       └── API call: generateLearningMaterial
├── ResultCard.js
│   └── Study material display with markdown rendering
│       └── YouTube video section
├── TestPanel.js
│   └── Test session management
│   ├── Question display
│   ├── Real-time answer validation
│   ├── Visual feedback (green/red)
│   ├── Explanation display
│   └── API calls: createTest, submitAnswer, getTestScore
└── QuestionCard.js (if used)
    └── Individual question rendering
```

### Backend Service Architecture

#### DocumentService
```python
upload_document(file_bytes, filename)
  ├── Validate PDF
  ├── Extract text (PDFService)
  ├── Split into chunks
  ├── Generate embeddings (EmbeddingService)
  └── Store in database

get_documents()
  └── Retrieve all documents from DB

delete_document(doc_id)
  ├── Delete chunks
  └── Delete document record
```

#### RAGService (Retrieval Augmented Generation)
```python
generate_material(topic, memory, difficulty)
  ├── retrieve_context(topic)
  │   ├── Embed topic query
  │   ├── Vector similarity search
  │   └── Return top-5 chunks
  ├── Build LLM prompt with context
  ├── Generate study material (ChatGroq)
  ├── search_videos(topic) via YouTubeService
  └── Return material + video references
```

#### TestEngine
```python
create_test_session(topic, difficulty)
  ├── generate_questions(topic, difficulty)
  │   ├── Build LLM prompt with difficulty guidelines
  │   ├── Parse JSON response
  │   └── Return 10 questions with explanations
  ├── Store questions in database
  └── Return session ID and questions

submit_answer(test_session_id, question_id, user_answer)
  ├── Retrieve correct answer
  ├── Compare user answer
  ├── Get explanation
  ├── Store answer record
  └── Return feedback

calculate_score(test_session_id)
  ├── Count correct answers
  ├── Calculate accuracy
  ├── Determine next difficulty
  ├── Store results
  └── Return score report
```

#### MemoryService
```python
get_memory()
  └── Retrieve last 10 learning sessions

store_memory(topic, score, difficulty)
  └── Store in learning_memory table
```

### Database Schema

```sql
-- Document Storage
documents
├── id (UUID)
├── filename
├── file_type (e.g., 'pdf')
└── uploaded_at

-- Chunk Storage with Embeddings
document_chunks
├── id (UUID)
├── document_id (FK)
├── content (TEXT)
└── embedding (VECTOR(384))  -- pgvector

-- Learning Progress
learning_memory
├── id (SERIAL)
├── topic
├── score
├── difficulty
└── created_at

-- Test Management
test_questions
├── id (SERIAL)
├── session_id (UUID)
├── topic
├── difficulty
├── question
├── options (TEXT[])
├── correct_answer (INT)
├── explanation
└── created_at

-- User Responses
user_test_answers
├── id (SERIAL)
├── test_session_id (UUID)
├── question_id (INT, FK)
├── user_answer (INT)
├── is_correct (BOOLEAN)
└── created_at

-- Test Results
test_results
├── id (SERIAL)
├── topic
├── score
├── total_questions
├── difficulty
└── created_at
```

## Data Flow

### 1. Document Upload Flow
```
User selects PDF
    ↓
Frontend validates (extension, size)
    ↓
POST /upload with FormData
    ↓
Backend PDFService.extract_text_from_pdf()
    ↓
Split into chunks
    ↓
EmbeddingService.embed() for each chunk
    ↓
Store document + chunks + embeddings in DB
    ↓
Return doc_id
    ↓
Frontend updates document list
```

### 2. Study Material Generation Flow
```
User enters topic + selects difficulty
    ↓
Frontend calls GET /learn?topic=X&difficulty=easy
    ↓
RAGService.retrieve_context(topic)
    ├── Embed topic query
    ├── Vector similarity search (pgvector)
    └── Get top relevant chunks
    ↓
Build LLM prompt with context + difficulty guidelines
    ↓
ChatGroq generates material
    ↓
YouTubeService.search_videos(topic)
    └── Uses pytube to find videos
    ↓
Format material + video references
    ↓
Return to frontend
    ↓
Frontend displays with ResultCard component
```

### 3. Test Flow
```
User clicks "Take Test"
    ↓
Frontend calls POST /test/create?topic=X&difficulty=easy
    ↓
TestEngine.create_test_session()
    ├── generate_questions() with LLM
    ├── Parse JSON questions
    └── Store questions in database
    ↓
Return sessionId + questions to frontend
    ↓
Frontend displays TestPanel with first question
    ↓
User selects answer
    ↓
Frontend calls POST /test/answer (not visible)
    ↓
TestEngine.submit_answer()
    ├── Get correct answer
    ├── Compare
    ├── Get explanation
    └── Store user answer
    ↓
Frontend shows feedback (green ✓ or red ✗)
    ↓
Display explanation (why correct/wrong)
    ↓
User clicks "Next Question"
    ↓
Repeat for remaining questions
    ↓
After last question: GET /test/score
    ↓
TestEngine.calculate_score()
    ├── Calculate accuracy
    ├── Determine nextDifficulty
    └── Store results
    ↓
Frontend displays ResultCard with scores
```

### 4. Revision Test Flow
```
User views results
    ↓
Clicks "Revision Test"
    ↓
Frontend calls POST /test/create with nextDifficulty
    ↓
Repeat test flow with new difficulty
    ↓
Results are tracked separately
    ↓
User can take multiple revision tests
```

## Key Design Patterns

### 1. Service-Oriented Architecture
- Separation of concerns
- TestEngine handles all test logic
- DocumentService handles all document ops
- RAGService handles all LLM operations

### 2. Layered Architecture
- API Layer: HTTP endpoints
- Service Layer: Business logic
- Data Layer: Database operations

### 3. State Management (Frontend)
- React useState for component-level state
- Props passing for communication
- Conditional rendering for different screens

### 4. Error Handling
- Try-catch blocks in all services
- HTTP exceptions with proper status codes
- User-friendly error messages
- Logging for debugging

## Integration Points

### External Services
1. **Groq API** (LLM)
   - Model: `llama-3.3-70b-versatile`
   - Used for: Material generation, question generation
   - Cost: Pay-per-token

2. **PyTube** (YouTube)
   - Used for: Video search
   - Free service
   - Retrieves title, URL, channel, duration

3. **pgVector** (PostgreSQL Extension)
   - Used for: Vector similarity search
   - Efficient semantic search
   - ~384-dimensional embeddings

4. **Sentence Transformers**
   - Model: `all-MiniLM-L6-v2`
   - Used for: Text embedding generation
   - Local/offline capable

## Performance Considerations

### Optimization Strategies
1. **Caching**
   - Cache generated questions
   - Cache embeddings
   - Cache YouTube search results

2. **Batch Operations**
   - Batch insert chunks when uploading
   - Batch store answers in bulk

3. **Vector Search**
   - pgVector provides efficient similarity search
   - HNSW index on embedding column

4. **Pagination**
   - Limit number of documents shown
   - Pagination for large result sets

### Bottlenecks
1. LLM API latency (mitigable with caching)
2. PDF extraction time (varies by size)
3. Vector embedding computation (1-2 seconds)
4. YouTube search latency (internet dependent)

## Security Considerations

### Current Implementation
- CORS enabled for all origins (insecure for production)
- No authentication
- PDFs stored in database
- API keys in .env

### Production Hardening
1. Add JWT authentication
2. Restrict CORS to frontend domain
3. Rate limiting on API endpoints
4. Input validation (already present)
5. SQL injection protection (using parameterized queries)
6. HTTPS only
7. Environment-specific API keys

## Testing Strategy

### Unit Tests
- EmbeddingService.embed()
- PDFService.extract_text_from_pdf()
- TestEngine.next_difficulty()

### Integration Tests
- Document upload → storage → retrieval
- Test creation → question generation → answer validation
- LLM material generation

### End-to-End Tests
- Full workflow: Upload → Generate → Test → Results
- Revision test flow
- Difficulty progression

## Deployment Architecture

```
Production:
├── Docker Container (FastAPI)
│   ├── Python environment
│   ├── Services
│   └── Dependencies
├── Database (PostgreSQL + pgVector)
├── Static Files (React build)
└── Reverse Proxy (Nginx)
    ├── HTTPS termination
    ├── Load balancing
    └── Caching headers
```

## Monitoring & Logging

### Metrics to Track
- API response times
- Error rates
- Document upload success rate
- Test completion rate
- LLM API costs

### Logs to Collect
- API request/response logs
- Error stack traces
- Database query logs
- External API calls

## Future Enhancement Opportunities

1. **ML-Based Difficulty Estimation**
   - Learn difficulty patterns
   - Predict optimal difficulty

2. **Adaptive Question Generation**
   - Mark different concept areas per question
   - Generate questions targeting weak areas

3. **Progress Dashboard**
   - Visual progress tracking
   - Learning analytics
   - Performance graphs

4. **Gamification**
   - Badges for achievements
   - Leaderboards (optional, for ASD considerations)
   - Streak tracking

5. **Collaborative Learning**
   - Group studies
   - Peer review
   - Teacher monitoring

---

This architecture is scalable, maintainable, and extensible for future enhancements.

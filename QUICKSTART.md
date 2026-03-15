# ASD Multimodal Learning System - Quick Start Guide

## 🎯 What Was Built

A complete adaptive learning platform with:
- **PDF Document Upload** with semantic embeddings
- **AI-Generated Study Materials** with YouTube videos
- **Interactive Testing System** with real-time feedback
- **Progressive Difficulty** based on performance
- **Revision Testing** for reinforcement learning

---

## 🚀 Getting Started

### Backend Setup

1. **Install Dependencies**
```bash
cd backend
pipenv install
```

2. **Configure Environment**
Create `.env` file in backend folder:
```
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_HOST=your_db_host
DB_PORT=5432
DB_NAME=your_db_name
GROQ_API_KEY=your_groq_api_key
```

3. **Setup Database**
```bash
python setup_db.py
```

4. **Start Backend**
```bash
pipenv run start
```
Backend runs on http://localhost:8000

### Frontend Setup

1. **Install Dependencies**
```bash
cd frontend
npm install
```

2. **Start Frontend**
```bash
npm start
```
Frontend runs on http://localhost:3000

---

## 📚 User Workflow

### Step 1: Upload Documents
- Click "Upload Learning Material"
- Select PDF files (max 50MB each)
- Document embeddings are automatically generated and stored
- View list of uploaded documents below

### Step 2: Generate Study Material
- Enter a topic in the text field
- Select difficulty level (Easy/Medium/Hard)
- Click "Generate"
- Wait for LLM to generate comprehensive material
- **Bonus**: YouTube video recommendations appear at the bottom

### Step 3: Take Test
- Click "📝 Take Test" button
- Answer 10 questions (one at a time)
- **Instant feedback**:
  - ✅ Green highlight = Correct answer
  - ❌ Red highlight = Wrong answer + explanation
- Progress bar shows completion
- Next button to move to next question

### Step 4: Review Results
- See score, accuracy, and correct/total answers
- Get recommended difficulty for next test
- Choose to:
  - 📚 Get Deeper Study Material (at higher difficulty)
  - 🔄 Take Revision Test (at recommended difficulty)
  - ↻ Start Over (new topic)

### Step 5: Revision Testing (Optional)
- Takes another test at appropriate difficulty level
- Helps reinforce learning
- Based on your performance from previous test
- Can repeat as many times as needed

---

## 🎨 UI Features

### Visual Feedback System
- **Green Highlight**: Correct answer selected
- **Red Highlight**: Incorrect answer selected (shows correct answer in green)
- **Explanation Text**: Why the answer is correct/wrong
- **Progress Bar**: Visual indication of test progress

### Learning Material Display
- **Main Content**: Clear, well-structured study material
- **Video Section**: YouTube recommendations with direct links
- **ASD-Friendly**: Large text, clear sections, high contrast

### Document Management
- List all uploaded PDFs
- See upload dates
- Delete documents easily
- Real-time list updates

---

## 🔧 API Endpoints

### Documents
- `POST /upload` - Upload PDF file
- `GET /documents` - List all documents
- `DELETE /documents/{doc_id}` - Delete document

### Learning
- `GET /learn?topic=X&difficulty=easy` - Generate material

### Testing
- `POST /test/create?topic=X&difficulty=easy` - Create test session
- `POST /test/answer?test_session_id=X&question_id=Y&user_answer=Z` - Submit answer
- `GET /test/score?test_session_id=X` - Get final score

---

## 📊 Data Stored

### Documents
- Filename, upload date
- PDF text chunks
- Vector embeddings (pgvector)

### Learning Memory
- Topic studied
- Score achieved
- Difficulty level
- Date/time

### Test Sessions
- Questions asked
- User answers
- Correct/incorrect marking
- Detailed explanations
- Timestamps

---

## 🎯 Key Features

### For Educators
- Track student progress
- See topic mastery areas
- Monitor learning patterns
- Adaptive difficulty system

### For Students with ASD
- Clear, structured interface
- Minimal distractions
- High contrast colors
- Immediate visual feedback
- Detailed explanations
- Self-paced learning
- Contextual learning from uploaded materials

---

## 🐛 Troubleshooting

### Backend Won't Start
- Check .env file is in backend folder
- Verify PostgreSQL is running
- Run `pipenv install` again

### PDF Upload Fails
- Ensure file is a valid PDF
- File size is less than 50MB
- Check backend logs for details

### Test Questions Don't Generate
- Check GROQ_API_KEY is set
- Verify internet connection
- Check Groq API status

### YouTube Videos Not Showing
- pytube might need internet connection
- Some videos may be restricted
- Check backend logs

---

## 📈 Performance Tips

1. **Upload PDFs First**: Better context for study material
2. **Start with Easy**: Build confidence
3. **Review Wrong Answers**: Focus on explanations
4. **Take Revision Tests**: Space out learning (spaced repetition)
5. **Progress Through Difficulties**: Gradually increase difficulty

---

## 🔐 Security Notes

- PDFs are stored in database
- Embeddings are vector representations (not source text)
- API is open (consider adding authentication for production)
- .env file should never be committed
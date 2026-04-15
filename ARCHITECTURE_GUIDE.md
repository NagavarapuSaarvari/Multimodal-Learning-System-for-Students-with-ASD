# System Architecture Diagram

## User Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      ADMIN WORKFLOW                              │
└─────────────────────────────────────────────────────────────────┘

   ┌──────────────┐
   │   Google     │
   │   OAuth      │
   └──────┬───────┘
          │ (Sign in)
          ▼
   ┌──────────────────────────────────┐
   │   LoginPage (Modern Design)      │
   │   - Feature Showcase             │
   │   - Google Sign-In Button        │
   └──────────┬───────────────────────┘
              │ (Creates admin account)
              ▼
   ┌──────────────────────────────────────┐
   │   AdminDashboard                     │
   │   ┌────────────────┐ ┌─────────────┐│
   │   │ Student List   │ │ Student     ││
   │   │ (Sidebar)      │ │ Stats       ││
   │   │ - John Doe     │ │ - Tests: 5  ││
   │   │ - Jane Smith   │ │ - Score: 78%││
   │   │ - Mike Brown   │ │ - Topics: 8 ││
   │   └────────────────┘ └─────────────┘│
   │   [Add Student] [Manage Students]   │
   └──────────┬──────────────────────────┘
              │
              ├─ Select Student ──┐
              │                    │
              ▼                    ▼
    ┌──────────────────┐  ┌──────────────────────┐
    │ StudentMgmt      │  │ Upload Documents     │
    │ ┌──────────────┐ │  │ ┌────────────────┐   │
    │ │ Add Student  │ │  │ │ Upload PDF     │   │
    │ │ Name: ______ │ │  │ │ Upload YouTube │   │
    │ │ DOB: _______ │ │  │ │ Documents List │   │
    │ │ [Add]       │ │  │ └────────────────┘   │
    │ └──────────────┘ │  │ (With student age   │
    │ ┌──────────────┐ │  │  in LLM context)    │
    │ │ Students     │ │  └──────────────────────┘
    │ │ - John (age9)│ │         │
    │ │ - Jane (age8)│ │         ▼
    │ │ [x] Delete  │ │  ┌──────────────────────┐
    │ └──────────────┘ │  │ Learn & Test         │
    │                  │  │ - Content generated  │
    └──────────────────┘  │   for age 9          │
                         │ - Emotion detection   │
                         │ - Adaptive difficulty │
                         └──────────────────────┘
```

---

## Database Schema

```
┌─────────────────────────────────────────────────────────────┐
│                        ADMINS                               │
├──────────────┬──────────┬────────┬─────────┬──────────────┤
│ id (UUID)*   │ google_id│ email  │ name    │ picture      │
├──────────────┼──────────┼────────┼─────────┼──────────────┤
│ abc-123      │ google1  │ a@g.c  │ Alice   │ pic_url      │
│ def-456      │ google2  │ b@g.c  │ Bob     │ pic_url      │
└──────────────┴──────────┴────────┴─────────┴──────────────┘
       ▲
       │ 1:Many
       │
┌──────────────────────────────────────────────────────────┐
│                     STUDENTS                             │
├──────────────┬──────────────┬────────────┬─────┬────────┤
│ id (UUID)*   │ admin_id (FK)│ name       │ DOB │ age    │
├──────────────┼──────────────┼────────────┼─────┼────────┤
│ stu-111      │ abc-123      │ John Doe   │ 2015│ 9      │
│ stu-222      │ abc-123      │ Jane Doe   │ 2016│ 8      │
│ stu-333      │ def-456      │ Sam Smith  │ 2014│ 10     │
└──────────────┴──────────────┴────────────┴─────┴────────┘
       ▲
       └── Referenced by all learning tables ──┐
                                               │
    ┌──────────────────────────────────────────┤
    │  ┌──────────────────────────────────────┤
    │  │  ┌──────────────────────────────────┤
    ▼  ▼  ▼
 ┌─────────────────┐  ┌──────────────────┐  ┌─────────────┐
 │ test_sessions   │  │ test_results     │  │ documents   │
 │ - student_id(FK)│  │ - student_id(FK) │  │ - admin_id  │
 │ - topic         │  │ - session_id     │  │ - filename  │
 │ - difficulty    │  │ - score          │  │ - type      │
 └─────────────────┘  └──────────────────┘  └─────────────┘

 ┌──────────────────────────────┐  ┌─────────────────┐
 │ test_questions               │  │ test_emotions   │
 │ - student_id(FK)             │  │ - student_id(FK)│
 │ - session_id                 │  │ - session_id    │
 │ - question                   │  │ - emotion       │
 │ - options                    │  │ - confidence    │
 └──────────────────────────────┘  └─────────────────┘

 ┌────────────────────────────────────┐
 │ learning_memory                    │
 │ - student_id(FK)                   │
 │ - topic                            │
 │ - score                            │
 │ - difficulty                       │
 └────────────────────────────────────┘
```

---

## API Layer

```
┌────────────────────────────────────────────────────────┐
│              FRONTEND (React)                          │
├────────────────────────────────────────────────────────┤
│  LoginPage → AdminDashboard → StudentManagement        │
│                    ↓                                    │
│              DocumentUpload → LearnPage                │
└────────────┬───────────────────────────────────────────┘
             │ (API Calls)
             │
┌────────────▼──────────────────────────────────────────┐
│         BACKEND (FastAPI)                             │
├───────────────────────────────────────────────────────┤
│                                                        │
│  Authentication                                       │
│  ├─ POST /auth/google/callback                       │
│  └─ POST /auth/verify                                │
│                                                        │
│  Student Management                                   │
│  ├─ POST /students/create                            │
│  ├─ GET /students/{admin_id}                         │
│  ├─ GET /students/detail/{student_id}               │
│  └─ DELETE /students/{student_id}                    │
│                                                        │
│  Document Management                                  │
│  ├─ POST /upload?admin_id={id}                       │
│  ├─ GET /documents?admin_id={id}                     │
│  └─ DELETE /documents/{doc_id}                       │
│                                                        │
│  Learning Endpoints (Updated)                         │
│  ├─ POST /test/create?student_id={id}&age={age}     │
│  ├─ GET /learn?student_id={id}&studentAge={age}     │
│  └─ POST /test/answer?student_id={id}               │
│                                                        │
└────────────┬──────────────────────────────────────────┘
             │
┌────────────▼──────────────────────────────────────────┐
│       DATABASE (PostgreSQL)                           │
├───────────────────────────────────────────────────────┤
│  admins → students → [learning tables]               │
│  documents (admin_id)                                │
└───────────────────────────────────────────────────────┘
```

---

## Component Hierarchy

```
App.js
├─ Navbar
│  ├─ Dashboard Link
│  ├─ Students Link
│  └─ Logout Button
│
├─ Routes
│  ├─ /login → LoginPage
│  │  └─ Google OAuth Button
│  │
│  ├─ /dashboard → AdminDashboard
│  │  ├─ Student Selection (Sidebar)
│  │  └─ Student Stats (Main Area)
│  │
│  ├─ /students → StudentManagement
│  │  ├─ Add Student Form
│  │  └─ Students List
│  │
│  ├─ /upload → DocumentUpload
│  │  ├─ PDF Upload
│  │  └─ YouTube Upload
│  │
│  └─ /learn → LearnPage
│     ├─ Learning Material
│     └─ Test Engine
│
└─ Global State
   ├─ user (Admin Info)
   ├─ selectedStudent (Current Student)
   └─ loading (Auth State)
```

---

## Data Flow

### Adding a Student
```
StudentManagement Form
    │
    ├─ Input: Name, DOB
    │
    ▼
API Call: POST /students/create
    {
      admin_id: "user-123",
      name: "John Doe",
      date_of_birth: "2015-06-15"
    }
    │
    ▼
Backend:
    ├─ Calculate age: 2024 - 2015 = 9
    ├─ Insert into students table
    └─ Return: student_id, age
    │
    ▼
Frontend:
    ├─ Show success message
    ├─ Refresh student list
    └─ Display with age calculated
```

### Starting a Learning Session
```
AdminDashboard (Select Student)
    │
    ├─ Store selected student in localStorage
    ├─ student.id, student.name, student.age
    │
    ▼
DocumentUpload/LearnPage
    │
    ├─ Retrieve selectedStudent from localStorage
    ├─ Include student.age in API requests
    │
    ▼
Backend Endpoints
    │
    ├─ Receive: student_id, studentAge
    ├─ Pass age to LLM context:
    │  "Generate content for 9-year-old with topic: Math"
    │
    ▼
LLM Response
    │
    └─ Age-appropriate content
```

---

## Storage Strategy

### LocalStorage
```
{
  "accessToken": "jwt-token-here",
  "user": {
    "id": "google-id",
    "name": "Admin Name",
    "email": "admin@gmail.com",
    "picture": "url-to-picture"
  },
  "adminId": "google-id",
  "selectedStudent": {
    "id": "stu-123",
    "name": "John Doe",
    "date_of_birth": "2015-06-15",
    "age": 9
  }
}
```

### Database (PostgreSQL)
```
All persistent data:
- Admin accounts & credentials
- Students (with DOB)
- Learning records per student
- Test results per student
- Document metadata
- Progress tracking
```

---

## State Management Flow

```
User Logs In
    │
    ├─ Google OAuth
    ├─ Backend creates admin
    ├─ JWT token returned
    ├─ localStorage updated
    │
    ▼
App.js State
    ├─ user = { id, name, email, picture }
    ├─ adminId = user.id
    ├─ selectedStudent = null
    │
    ▼
AdminDashboard
    │
    ├─ Fetches students by adminId
    ├─ Displays student list
    │
    ▼
User Selects Student
    │
    ├─ handleSelectStudent() called
    ├─ selectedStudent state updated
    ├─ localStorage.setItem("selectedStudent", ...)
    │
    ▼
Learning Components
    │
    ├─ DocumentUpload enabled
    ├─ LearnPage enabled
    ├─ All API calls include student.age
    │
    ▼
Logout
    │
    ├─ Clear localStorage
    ├─ Reset state
    ├─ Redirect to login
```

---

## Key Design Patterns

### 1. Context Passing
Student age passed through entire stack:
```
Frontend (localStorage) → API Params → Backend → LLM Prompt
```

### 2. Data Isolation
Each admin isolated:
```
Admin A → Students A → Documents A → Learning Records A
Admin B → Students B → Documents B → Learning Records B
```

### 3. Lazy Loading
- Students loaded only when dashboard opens
- Documents loaded when upload page opened
- Stats calculated on-demand

### 4. Error Boundary
- Student must be selected before upload
- Warning messages guide users
- Graceful fallbacks

---

## Performance Considerations

- **Caching**: Student list cached in state
- **Pagination**: Can be added for large student lists
- **Indexing**: Database indexes on admin_id, student_id
- **Batch Operations**: Can delete multiple students
- **Async Loading**: All API calls non-blocking

---

## Security Considerations

- **OAuth 2.0**: Industry-standard authentication
- **JWT**: Secure token-based sessions
- **CORS**: Configured for frontend domain
- **Data Isolation**: Admin can only see own data
- **Password**: Not required (OAuth handles auth)

---

## Scalability

Current architecture supports:
- ✅ Multiple admins
- ✅ Multiple students per admin (unlimited)
- ✅ Concurrent learning sessions
- ✅ Distributed document storage
- ✅ Database replication ready
- ✅ API rate limiting ready

---

## Future Architecture Extensions

```
Current: Admin → Students → Learning

Extended:
┌─ Parent Manager
├─ Multiple Admins per Student
├─ Batch Operations
├─ Analytics Pipeline
├─ Notification System
├─ Reporting Engine
└─ Mobile App Bridge
```

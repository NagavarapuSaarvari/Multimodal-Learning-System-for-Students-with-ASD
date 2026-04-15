# Admin-Student Learning System - Implementation Guide

## Overview

This document describes the complete redesign of the frontend and backend to support an **admin-student learning model** similar to platforms like Udemy, Coursera, and Khan Academy.

## System Architecture

### User Roles
- **Admin (Teacher/Parent)**: Users who log in via Google OAuth 2.0
  - Can manage multiple students
  - Can view each student's progress and analytics
  - Can delete students
  - **Primary interface**: Dashboard & Student Management

- **Students**: Created by admins
  - Associated with an admin account
  - Have personalized learning paths
  - Ages are tracked and passed to LLM context
  - Cannot directly log in (managed by admin)

## Database Schema Changes

### New Tables

#### 1. `admins` Table
```sql
CREATE TABLE admins(
    id UUID PRIMARY KEY,
    google_id TEXT UNIQUE,
    email TEXT UNIQUE,
    name TEXT,
    picture TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### 2. `students` Table
```sql
CREATE TABLE students(
    id UUID PRIMARY KEY,
    admin_id UUID REFERENCES admins(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    date_of_birth DATE NOT NULL,
    age INT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Modified Tables

All learning-related tables now include `student_id` reference:
- `learning_memory` - Added `student_id`, removed global tracking
- `test_sessions` - Added `student_id`
- `test_results` - Added `student_id`
- `test_questions` - Added `student_id`
- `test_emotions` - Added `student_id`
- `documents` - Added `admin_id` (for multi-admin support)

## Backend Endpoints

### Authentication
- `POST /auth/google/callback` - OAuth login (creates/updates admin)
- `POST /auth/verify` - Verify JWT token

### Student Management
- `POST /students/create` - Create new student
  - **Required**: `admin_id`, `name`, `date_of_birth`
  - **Returns**: `student_id`, `name`, `date_of_birth`, `age`

- `GET /students/{admin_id}` - List all students for admin
  - **Returns**: Array of students with all details

- `GET /students/detail/{student_id}` - Get specific student details
  - **Returns**: Single student object

- `DELETE /students/{student_id}` - Delete a student
  - **Returns**: Confirmation

### Document Management
- `POST /upload?admin_id={admin_id}` - Upload document
- `GET /documents?admin_id={admin_id}` - Get admin's documents

## Frontend Components

### 1. LoginPage (`src/components/LoginPage.js`)
**Purpose**: Modern auth interface with feature highlights

**Features**:
- Google OAuth 2.0 integration
- Feature showcase (emotion-aware learning, admin control, etc.)
- Professional gradient design
- Mobile responsive

**Flow**:
1. User clicks "Sign in with Google"
2. Backend creates/updates admin in database
3. JWT token stored in localStorage
4. Redirects to Dashboard

---

### 2. AdminDashboard (`src/components/AdminDashboard.js`)
**Purpose**: Main admin interface showing all students' progress

**Features**:
- Student list in left sidebar
- Click student to view:
  - Demographics (age, DOB)
  - Test completion count
  - Average score
  - Topics covered
  - Last active date
  - Performance charts
  - Progress bars for learning goals

**Behavior**:
- Selects first student by default
- Stores selected student in localStorage
- Fetches stats for each student

---

### 3. StudentManagement (`src/components/StudentManagement.js`)
**Purpose**: Add, view, and manage students

**Features**:
- Add new student form
  - Inputs: Name, Date of Birth
  - Auto-calculates age
- Student list with details
- Delete student with confirmation
- Success/error messaging
- Loading states

**Data Collected**:
- Student name
- Date of birth (passed to LLM as age in context)
- Auto-calculated age

---

### 4. Navbar (`src/components/Navbar.js`)
**Purpose**: Admin-focused navigation

**Features**:
- Dashboard link → `/dashboard`
- Students link → `/students`
- User profile & logout
- Mobile responsive menu

---

### 5. App.js (`src/App.js`)
**Purpose**: Routing and state management

**Routes**:
- `/login` - Public (redirects to dashboard if logged in)
- `/dashboard` - Admin dashboard
- `/students` - Student management
- `/upload` - Document upload (when student selected)
- `/learn` - Learning interface (when student selected)

**State**:
- `user` - Current admin
- `selectedStudent` - Active student for learning
- `loading` - Initial auth check

---

## Workflow

### First Time Login
1. **Google Login** → Creates admin account
2. **Welcome Screen** → Shows dashboard (no students yet)
3. **Add Student** → Redirected to `/students`
4. **Create Student** → Fill name & DOB, click "Add Student"
5. **Select Student** → Click student in dashboard
6. **Ready to Learn** → Access `/upload` and `/learn`

### Daily Admin Workflow
1. Login → Dashboard shows all students
2. Select a student → See their progress
3. Option to:
   - View detailed analytics
   - Add new student
   - Manage existing students

### Learning Session
1. Student selected in dashboard
2. Navigate to upload documents
3. Upload PDFs
4. Navigate to learn page
5. Student's age is passed to LLM for:
   - Age-appropriate content
   - Difficulty adjustment
   - Emotion-aware adaptation

---

## Age Integration with LLM

When making LLM requests for a selected student:

```javascript
// In learn/test endpoints
const student = JSON.parse(localStorage.getItem("selectedStudent"))

// Include in context
const context = {
    studentAge: student.age,
    studentName: student.name,
    // ... other context
}

// Pass to backend
fetch(`/api/endpoint`, {
    body: JSON.stringify({
        ...payload,
        studentId: student.id,
        studentAge: student.age
    })
})
```

Backend then uses `studentAge` in LLM prompts:
```
"Generate educational content for a {studentAge}-year-old student..."
```

---

## Key Design Decisions

### 1. Admin-First Interface
- Dashboard is default landing page
- Student management is primary feature
- Learning is secondary (post student selection)

### 2. Age Tracking
- Stored as date of birth (not hardcoded age)
- Calculated on-the-fly for current accuracy
- Always passed to LLM in context

### 3. Storage Strategy
- `localStorage`:
  - Access token
  - User data
  - Selected student
  - Admin ID

- **Database**:
  - All learning data (student-specific)
  - Admin account info
  - Document metadata

### 4. Modern UI Design
- Gradient backgrounds (blue → purple)
- Card-based layouts
- Smooth animations
- Mobile-first responsive
- Icon-heavy navigation

---

## Setup Instructions

### Backend Changes
1. Run database migrations:
   ```bash
   python backend/setup_db.py
   ```

2. Update `services.py` to accept `admin_id` in document methods

3. New endpoints are in `main.py` after auth section

### Frontend Changes
1. New components created:
   - `StudentManagement.js`
   - `AdminDashboard.js`

2. Updated components:
   - `App.js` - New routing
   - `Navbar.js` - Admin-focused nav
   - `LoginPage.js` - Modern design
   - `App.css` - Enhanced styling

3. Run frontend:
   ```bash
   npm start
   ```

---

## Testing Checklist

- [ ] Google OAuth login works
- [ ] Admin account created in database
- [ ] Can navigate to student management
- [ ] Can add student with name and DOB
- [ ] Age calculates correctly
- [ ] Student appears in dashboard
- [ ] Can select student in dashboard
- [ ] Can delete student
- [ ] localStorage stores selected student
- [ ] Age passed to LLM context
- [ ] Responsive on mobile/tablet

---

## Future Enhancements

1. **Student Login**: Allow students to log in (separate from admin)
2. **Progress Tracking**: Real-time progress charts
3. **Analytics Dashboard**: Advanced metrics per student
4. **Content Library**: Pre-built learning modules
5. **Notifications**: Progress alerts for admins
6. **Export Reports**: PDF/CSV performance reports
7. **Parent Portal**: Extended admin capabilities
8. **Batch Operations**: Add multiple students via CSV

---

## Database Migration Notes

If upgrading from old system:
1. Create new `admins` table
2. Create new `students` table
3. Add `admin_id` column to `documents`
4. Add `student_id` to all learning tables
5. Migrate existing data (if needed):
   ```sql
   -- Create admin from first login
   INSERT INTO admins (id, google_id, email, name)
   VALUES ('legacy-admin-id', 'google-id', 'email@example.com', 'Name');
   
   -- Create student
   INSERT INTO students (id, admin_id, name, date_of_birth, age)
   VALUES ('student-id', 'legacy-admin-id', 'Student Name', '2015-01-01', 9);
   ```

---

## Support & Troubleshooting

### Issue: OAuth token invalid
- Check `GOOGLE_CLIENT_ID` in environment
- Verify token endpoint accessible
- Check token not expired

### Issue: Student not appearing
- Verify `admin_id` is correct user ID from token
- Check database for `admins` entry
- Check `students` table for entries with correct `admin_id`

### Issue: Age not being passed
- Verify student stored in localStorage
- Check `selectedStudent` object has `age` field
- Verify API request includes `studentAge`

---

## Code Examples

### Adding a Student (Frontend)
```javascript
const response = await fetch(`${API_URL}/students/create`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  },
  body: JSON.stringify({
    admin_id: adminId,
    name: "John Doe",
    date_of_birth: "2015-06-15"
  })
})
```

### Creating LLM Prompt with Age
```python
student_age = request.body.get("studentAge")
prompt = f"""
Generate educational content for a {student_age}-year-old student
with autism spectrum disorder on topic: {topic}
...
"""
```

---

## Contact & Support

For issues or questions about this system, refer to:
1. Database schema in `backend/setup_db.py`
2. API endpoints in `backend/main.py`
3. Component documentation in component files
4. This guide for workflow and design decisions

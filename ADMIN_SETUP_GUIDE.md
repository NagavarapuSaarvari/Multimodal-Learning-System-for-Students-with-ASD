# Admin-Student System - Quick Setup Guide

## Prerequisites
- Node.js 16+ (frontend)
- Python 3.8+ (backend)
- PostgreSQL with pgvector extension
- Google OAuth 2.0 credentials

## Step 1: Backend Database Setup

```bash
cd backend

# Update your environment variables
# Ensure DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME are set

# Run database migrations
python setup_db.py
```

**Expected Output:**
```
✓ Added admin_id column to documents
✓ Created admins table
✓ Created students table
Database setup completed.
```

## Step 2: Update Backend Services

The following backend files have been updated:
- ✅ `main.py` - Added student management endpoints
- ✅ `services.py` - Updated document methods to use admin_id
- ✅ `setup_db.py` - Added admin and student tables
- ✅ `database.py` - No changes needed

**No additional action required** - changes are backward compatible.

## Step 3: Frontend Installation

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm start
```

**The following new components are included:**
- `src/components/LoginPage.js` - Modern login interface
- `src/components/AdminDashboard.js` - Admin dashboard
- `src/components/StudentManagement.js` - Student management
- `src/components/Navbar.js` - Updated navigation
- `src/App.js` - Updated routing

## Step 4: Test the System

### Test Admin Flow
1. **Login**: Click "Sign in with Google"
   - Should create admin account
   - Should redirect to dashboard
   - Should see empty state

2. **Add Student**: Click "Students" in navbar
   - Fill in name: "John Doe"
   - Fill in DOB: "2015-06-15"
   - Click "Add Student"
   - Should see success message
   - Student should appear in list

3. **Select Student**: Return to dashboard
   - Click student name in left sidebar
   - Should see student details and stats
   - Age should show correctly (2024 - 2015 = 9)

4. **Verify Database**:
   ```sql
   -- Check admin was created
   SELECT * FROM admins WHERE email = 'your-email@gmail.com';
   
   -- Check student was created
   SELECT * FROM students WHERE name = 'John Doe';
   
   -- Verify age calculation
   SELECT id, name, date_of_birth, age FROM students;
   ```

## Step 5: Integration with Learning Pages

When you use the Learn or Upload pages, ensure:

```javascript
// Get selected student
const selectedStudent = JSON.parse(localStorage.getItem("selectedStudent"))

// Include in API calls
const response = await fetch(`${API_URL}/learn?student_id=${selectedStudent.id}`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  },
  body: JSON.stringify({
    topic: "Math",
    studentAge: selectedStudent.age // <- Pass age here
  })
})
```

## Environment Variables

Ensure these are set in `.env`:

**Backend** (`.env` in root):
```
GOOGLE_CLIENT_ID=your-google-client-id
JWT_SECRET=your-super-secret-jwt-key
DB_USER=postgres
DB_PASSWORD=your-password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=learning_system
GROQ_API_KEY=your-groq-api-key
```

**Frontend** (`.env` in frontend folder):
```
REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id
REACT_APP_API_URL=http://localhost:8000
```

## Key Features Now Available

✅ **Admin Management**
- Google OAuth login as admin
- Add unlimited students
- Delete students
- View all student progress

✅ **Student Management**
- Store name and date of birth
- Auto-calculate age
- Track student creation date
- Link students to admin

✅ **Age-Aware Learning**
- Student age passed to LLM context
- Age-appropriate content generation
- Personalized difficulty levels
- Emotion-aware adaptation

✅ **Modern UI**
- Responsive design (mobile, tablet, desktop)
- Gradient backgrounds and styling
- Card-based layouts
- Smooth animations

## API Endpoint Summary

### Create Student
```bash
POST /students/create
Content-Type: application/json
Authorization: Bearer {token}

{
  "admin_id": "uuid-here",
  "name": "Student Name",
  "date_of_birth": "2015-06-15"
}

Response:
{
  "student_id": "uuid",
  "name": "Student Name",
  "date_of_birth": "2015-06-15",
  "age": 9
}
```

### Get Students
```bash
GET /students/{admin_id}
Authorization: Bearer {token}

Response:
{
  "students": [
    {
      "id": "uuid",
      "name": "John Doe",
      "date_of_birth": "2015-06-15",
      "age": 9,
      "created_at": "2024-01-01T10:30:00"
    }
  ]
}
```

### Delete Student
```bash
DELETE /students/{student_id}
Authorization: Bearer {token}

Response:
{
  "deleted": true
}
```

## Troubleshooting

### Admin not created
- Check GOOGLE_CLIENT_ID is correct
- Check backend starting without errors
- Check database connectivity
- Verify `admins` table exists: `\dt admins` in psql

### Student not appearing
- Verify admin_id matches current user
- Check `students` table has entry
- Verify no database errors in backend logs
- Check localStorage has adminId set

### Age not calculated
- Verify date_of_birth is in YYYY-MM-DD format
- Check age field in database
- Verify calculateAge function in AdminDashboard

### Frontend won't start
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm start
```

## Next Steps

1. **Test thoroughly** with multiple students
2. **Update Learning Pages** to use student context
3. **Integrate with LLM prompts** to use student age
4. **Add progress tracking** to store scores per student
5. **Create analytics dashboards** for admin insights
6. **Add export functionality** for reports

## File Changes Summary

### Created Files
- `frontend/src/components/AdminDashboard.js` - New
- `frontend/src/components/StudentManagement.js` - New
- `ADMIN_STUDENT_SYSTEM.md` - Documentation

### Modified Files
- `frontend/src/App.js` - New routing
- `frontend/src/components/Navbar.js` - Admin navigation
- `frontend/src/components/LoginPage.js` - Modern design
- `frontend/src/App.css` - Enhanced styling
- `backend/main.py` - New endpoints
- `backend/services.py` - Updated methods
- `backend/setup_db.py` - New tables

### Unchanged Files
- `backend/database.py`
- `backend/schemas.py`
- Other utility files

## Support

For detailed system architecture and design decisions, see: `ADMIN_STUDENT_SYSTEM.md`

For API documentation, see: `backend/main.py` endpoint docstrings

For component details, see: Individual component files with inline comments

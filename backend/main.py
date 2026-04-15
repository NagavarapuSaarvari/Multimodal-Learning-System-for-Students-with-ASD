from fastapi import FastAPI, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import traceback
import logging
import base64
import io
import cv2
import numpy as np
import uuid
from PIL import Image
from google.auth.transport import requests
from google.oauth2 import id_token
import jwt
import os
from datetime import datetime, timedelta
from services import (
    DocumentService,
    RAGService,
    MemoryService,
    TestEngine,
    EmotionService
)
from database import db

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Get configuration from environment
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
JWT_SECRET = os.getenv("JWT_SECRET", "your_super_secret_jwt_key_change_this_in_production")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

doc_service = DocumentService()
rag_service = RAGService()
memory_service = MemoryService()
test_engine = TestEngine()
emotion_service = EmotionService()


# ==============================
# AUTHENTICATION ENDPOINTS
# ==============================

@app.post("/auth/google/callback")
async def google_auth_callback(data: dict):
    """Handle Google OAuth token and return JWT"""
    try:
        token = data.get("token")
        
        if not token:
            raise ValueError("No token provided")
        
        logger.info("Processing Google OAuth token")
        
        # Verify Google token
        try:
            idinfo = id_token.verify_oauth2_token(
                token,
                requests.Request(),
                GOOGLE_CLIENT_ID
            )
        except ValueError as e:
            logger.error(f"Invalid token: {e}")
            raise HTTPException(status_code=401, detail="Invalid token")
        
        google_id = idinfo.get("sub")  # Google's numeric ID
        email = idinfo.get("email")
        
        # Extract user information
        user_info = {
            "id": google_id,
            "name": idinfo.get("name"),
            "email": email,
            "picture": idinfo.get("picture"),
            "aud": idinfo.get("aud")
        }
        
        logger.info(f"User authenticated: {user_info['email']}")
        
        # Check if admin exists by google_id
        db.execute(
            "SELECT id FROM admins WHERE google_id = %s",
            (google_id,)
        )
        result = db.fetch()
        
        if result:
            # Admin exists, use existing UUID
            admin_id = str(result[0][0])
            # Update admin info
            db.execute(
                "UPDATE admins SET name = %s, picture = %s WHERE google_id = %s",
                (user_info["name"], user_info["picture"], google_id)
            )
        else:
            # Create new admin with UUID
            admin_id = str(uuid.uuid4())
            try:
                db.execute(
                    """
                    INSERT INTO admins (id, google_id, email, name, picture)
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (admin_id, google_id, email, user_info["name"], user_info["picture"])
                )
                logger.info(f"New admin created: {admin_id}")
            except Exception as e:
                logger.error(f"Error creating admin: {e}")
                raise HTTPException(status_code=500, detail="Failed to create admin account")
        
        # Generate JWT token using admin_id (UUID)
        access_token = jwt.encode(
            {
                "sub": admin_id,
                "email": email,
                "exp": datetime.utcnow() + timedelta(days=30),
                "iat": datetime.utcnow()
            },
            JWT_SECRET,
            algorithm="HS256"
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": admin_id,  # Return the UUID, not the Google ID
                "name": user_info["name"],
                "email": email,
                "picture": user_info["picture"]
            }
        }
        
    except ValueError as e:
        logger.error(f"OAuth error: {e}")
        raise HTTPException(status_code=401, detail=str(e))
    except Exception as e:
        logger.error(f"Authentication error: {e}")
        raise HTTPException(status_code=500, detail="Authentication failed")


@app.post("/auth/verify")
async def verify_token(data: dict):
    """Verify JWT token validity"""
    try:
        token = data.get("token")
        
        if not token:
            raise ValueError("No token provided")
        
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return {"valid": True, "user_id": payload.get("sub")}
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        logger.error(f"Token verification error: {e}")
        raise HTTPException(status_code=500, detail="Token verification failed")


# ==============================
# STUDENT MANAGEMENT ENDPOINTS
# ==============================

@app.post("/students/create")
async def create_student(data: dict):
    """Create a new student"""
    try:
        admin_id = data.get("admin_id")
        name = data.get("name")
        date_of_birth = data.get("date_of_birth")  # Format: YYYY-MM-DD
        
        if not admin_id or not name or not date_of_birth:
            raise ValueError("Missing required fields: admin_id, name, date_of_birth")
        
        # Validate admin_id is a valid UUID
        try:
            uuid.UUID(admin_id)
        except (ValueError, AttributeError):
            logger.error(f"Invalid admin_id format (not a UUID): {admin_id}")
            raise ValueError("Invalid admin_id format. Please log in again. (Clear browser cache if problem persists)")
        
        # Verify admin exists
        db.execute(
            "SELECT id FROM admins WHERE id = %s",
            (admin_id,)
        )
        admin_result = db.fetch()
        if not admin_result:
            logger.error(f"Admin not found: {admin_id}")
            raise ValueError("Admin not found. Please log in again.")
        
        # Calculate age
        from datetime import date as date_class
        birth_date = datetime.strptime(date_of_birth, "%Y-%m-%d").date()
        today = date_class.today()
        age = today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
        
        student_id = str(uuid.uuid4())
        
        db.execute(
            """
            INSERT INTO students (id, admin_id, name, date_of_birth, age)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (student_id, admin_id, name, birth_date, age)
        )
        
        logger.info(f"Student created: {student_id} for admin: {admin_id}")
        
        return {
            "student_id": student_id,
            "name": name,
            "date_of_birth": date_of_birth,
            "age": age
        }
        
    except ValueError as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating student: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Failed to create student")


@app.get("/students/{admin_id}")
async def get_students(admin_id: str):
    """Get all students for an admin"""
    try:
        # Validate admin_id is a valid UUID
        try:
            uuid.UUID(admin_id)
        except (ValueError, AttributeError):
            logger.error(f"Invalid admin_id format (not a UUID): {admin_id}")
            raise ValueError("Invalid admin_id format. Please log in again.")
        
        db.execute(
            """
            SELECT id, name, date_of_birth, age, created_at
            FROM students
            WHERE admin_id = %s
            ORDER BY created_at DESC
            """,
            (admin_id,)
        )
        
        results = db.fetch()
        students = [
            {
                "id": r[0],
                "name": r[1],
                "date_of_birth": r[2].isoformat() if r[2] else None,
                "age": r[3],
                "created_at": r[4].isoformat() if r[4] else None
            }
            for r in results
        ]
        
        return {"students": students}
        
    except ValueError as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error fetching students: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch students")


@app.get("/students/detail/{student_id}")
async def get_student_details(student_id: str):
    """Get detailed information about a specific student"""
    try:
        db.execute(
            """
            SELECT id, name, date_of_birth, age, created_at
            FROM students
            WHERE id = %s
            """,
            (student_id,)
        )
        
        result = db.fetch()
        
        if not result:
            raise HTTPException(status_code=404, detail="Student not found")
        
        r = result[0]
        student = {
            "id": r[0],
            "name": r[1],
            "date_of_birth": r[2].isoformat() if r[2] else None,
            "age": r[3],
            "created_at": r[4].isoformat() if r[4] else None
        }
        
        return student
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching student details: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch student details")


@app.delete("/students/{student_id}")
async def delete_student(student_id: str):
    """Delete a student"""
    try:
        db.execute(
            "DELETE FROM students WHERE id = %s",
            (student_id,)
        )
        
        logger.info(f"Student deleted: {student_id}")
        return {"deleted": True}
        
    except Exception as e:
        logger.error(f"Error deleting student: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete student")


@app.post("/upload")
async def upload_document(file: UploadFile, admin_id: str = None):
    """Upload a PDF document"""
    try:
        if not admin_id:
            raise ValueError("admin_id is required")
        
        logger.info(f"Uploading document: {file.filename} for admin: {admin_id}")
        file_bytes = await file.read()
        doc_id = doc_service.upload_document(file_bytes, file.filename, admin_id)
        logger.info(f"Document uploaded successfully: {doc_id}")
        return {"doc_id": doc_id, "filename": file.filename}
    except ValueError as e:
        logger.error(f"Validation error in upload: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        error_msg = f"Upload failed: {str(e)}\n{traceback.format_exc()}"
        logger.error(error_msg)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/documents")
def get_documents(admin_id: str = None):
    """Get all uploaded documents for an admin"""
    try:
        if not admin_id:
            raise ValueError("admin_id is required")
        
        logger.info(f"Fetching documents list for admin: {admin_id}")
        documents = doc_service.get_documents(admin_id)
        logger.info(f"Retrieved {len(documents)} documents")
        return {"documents": documents}
    except ValueError as e:
        logger.error(f"Validation error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        error_msg = f"Error fetching documents: {str(e)}\n{traceback.format_exc()}"
        logger.error(error_msg)
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/documents/{doc_id}")
def delete_document(doc_id: str):
    """Delete a document"""
    try:
        logger.info(f"Deleting document: {doc_id}")
        doc_service.delete_document(doc_id)
        logger.info(f"Document deleted: {doc_id}")
        return {"deleted": True}
    except Exception as e:
        error_msg = f"Error deleting document: {str(e)}\n{traceback.format_exc()}"
        logger.error(error_msg)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/learn")
def learn(topic: str, difficulty: str = "easy"):
    """Generate learning material for a topic"""
    try:
        logger.info(f"Generating material for topic: {topic}, difficulty: {difficulty}")
        memory = memory_service.get_memory()
        material = rag_service.generate_material(topic, memory, difficulty)
        logger.info(f"Material generated successfully for topic: {topic}")
        return {"material": material, "topic": topic, "difficulty": difficulty}
    except Exception as e:
        error_msg = f"Error generating material: {str(e)}\n{traceback.format_exc()}"
        logger.error(error_msg)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/test/create")
def create_test(topic: str, difficulty: str = "easy", test_number: int = 1):
    """Create a new test session"""
    try:
        logger.info(f"Creating test for topic: {topic}, test #{test_number}")
        
        # If not first test, determine difficulty from previous results
        if test_number > 1:
            last_result = test_engine.get_last_test_result(topic)
            if last_result and test_number <= 3:
                difficulty = last_result["difficulty"]
                logger.info(f"Using previous difficulty: {difficulty}")
        
        test_data = test_engine.create_test_session(topic, difficulty, test_number)
        logger.info(f"Test created successfully. Session ID: {test_data.get('sessionId')}")
        return test_data
    except Exception as e:
        error_msg = f"Error creating test: {str(e)}\n{traceback.format_exc()}"
        logger.error(error_msg)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/test/answer")
def submit_answer(test_session_id: str, question_index: int, user_answer: int):
    """Submit an answer to a test question by index within session"""
    try:
        logger.debug(f"Submitting answer - Session: {test_session_id}, Question Index: {question_index}, Answer: {user_answer}")
        result = test_engine.submit_answer(test_session_id, question_index, user_answer)
        logger.debug(f"Answer submitted successfully. Correct: {result.get('isCorrect')}")
        return result
    except Exception as e:
        error_msg = f"Error submitting answer: {str(e)}\n{traceback.format_exc()}"
        logger.error(error_msg)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/test/score")
def get_test_score(test_session_id: str):
    """Get final test score and results"""
    try:
        logger.info(f"Calculating score for session: {test_session_id}")
        
        # Get average emotion from test session
        avg_emotion = emotion_service.get_average_emotion(test_session_id)
        
        results = test_engine.calculate_score(test_session_id, avg_emotion)
        
        # Store in memory
        memory_service.store_memory(results["topic"], results["score"], results["difficulty"])
        logger.info(f"Score calculated - Accuracy: {results['accuracy']*100:.1f}%, Emotion: {avg_emotion}")
        
        return results
    except Exception as e:
        error_msg = f"Error calculating score: {str(e)}\n{traceback.format_exc()}"
        logger.error(error_msg)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/test/emotion")
def store_emotion(test_session_id: str, emotion: str, confidence: float = 0.0):
    """Store emotion detected during test"""
    try:
        logger.debug(f"Storing emotion for session: {test_session_id}, emotion: {emotion}, confidence: {confidence}")
        emotion_service.store_emotion(test_session_id, emotion, confidence)
        return {"status": "stored"}
    except Exception as e:
        error_msg = f"Error storing emotion: {str(e)}\n{traceback.format_exc()}"
        logger.error(error_msg)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/test/emotion/detect")
def detect_emotion_from_image(data: dict):
    """Detect emotion from webcam image during test"""
    try:
        test_session_id = data.get("test_session_id")
        image_data = data.get("image_data")
        
        logger.debug(f"Detecting emotion from image for session: {test_session_id}")
        
        if not image_data or not test_session_id:
            raise ValueError("Missing test_session_id or image_data")
        
        # Decode base64 image
        image_bytes = base64.b64decode(image_data.split(",")[1])
        
        # Convert to image for cv2 processing
        img = Image.open(io.BytesIO(image_bytes))
        image = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
        
        # Predict emotion
        result = emotion_service.predict(image)
        emotion = result["emotion"]
        confidence = result["confidence"]
        
        # Store in database
        emotion_service.store_emotion(test_session_id, emotion, confidence)
        
        logger.debug(f"Emotion detected: {emotion} ({confidence:.2f}) for session {test_session_id}")
        
        return {
            "status": "detected",
            "emotion": emotion,
            "confidence": float(confidence)
        }
    except Exception as e:
        error_msg = f"Error detecting emotion: {str(e)}\n{traceback.format_exc()}"
        logger.error(error_msg)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/test/batch/next")
def get_next_batch(session_id: str, topic: str, current_difficulty: str = "easy"):
    """Get the next batch of questions (batch 2) with adaptive difficulty"""
    try:
        logger.info(f"Generating batch 2 for session: {session_id}")
        
        batch_data = test_engine.generate_next_batch(session_id, topic, current_difficulty)
        
        logger.info(f"Batch 2 generated successfully. Difficulty: {batch_data['difficulty']}")
        return batch_data
    except Exception as e:
        error_msg = f"Error generating next batch: {str(e)}\n{traceback.format_exc()}"
        logger.error(error_msg)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/test/next-info")
def get_next_test_info(topic: str):
    """Get information about next test"""
    try:
        logger.info(f"Getting next test info for topic: {topic}")
        test_count = test_engine.get_test_count(topic)
        test_number = test_count + 1
        
        if test_number > 3:
            return {
                "testNumber": test_number,
                "testCompleted": True,
                "message": "All 3 tests are completed"
            }
        
        return {
            "testNumber": test_number,
            "testCompleted": False,
            "message": f"Ready for test {test_number} of 3"
        }
    except Exception as e:
        error_msg = f"Error getting next test info: {str(e)}\n{traceback.format_exc()}"
        logger.error(error_msg)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
def health():
    """Health check endpoint"""
    logger.info("Health check")
    return {"status": "ok"}


@app.post("/upload-youtube")
async def upload_youtube(youtube_url: str):
    """Upload a YouTube video transcript as learning material"""
    try:
        logger.info(f"Uploading YouTube: {youtube_url}")
        result = doc_service.upload_youtube(youtube_url)
        logger.info(f"YouTube uploaded successfully: {result['doc_id']}")
        return result
    except ValueError as e:
        logger.error(f"Validation error in YouTube upload: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        error_msg = f"YouTube upload failed: {str(e)}\n{traceback.format_exc()}"
        logger.error(error_msg)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/test/emotion/text")
def analyze_text_emotion(test_session_id: str, answer_text: str):
    """Analyze emotion from student's text answer"""
    try:
        logger.debug(f"Analyzing text emotion for session: {test_session_id}")
        
        if not answer_text or len(answer_text.strip()) < 3:
            return {
                "emotion": "neutral",
                "confidence": 0.0,
                "score": 0.5
            }
        
        result = emotion_service.analyze_answer_emotion(answer_text)
        
        # Store text emotion in database
        emotion_service.store_emotion(
            test_session_id, 
            result.get("emotion", "neutral"),
            result.get("confidence", 0.0),
            emotion_type="text"
        )
        
        logger.debug(f"Text emotion analyzed: {result['emotion']} ({result['confidence']:.2f})")
        return result
    except Exception as e:
        error_msg = f"Error analyzing text emotion: {str(e)}\n{traceback.format_exc()}"
        logger.error(error_msg)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/test/emotion/stats")
def get_emotion_statistics(test_session_id: str):
    """Get emotion statistics for a test session"""
    try:
        logger.debug(f"Getting emotion stats for session: {test_session_id}")
        stats = emotion_service.get_emotion_stats(test_session_id)
        return {
            "sessionId": test_session_id,
            "statistics": stats,
            "avgImage": emotion_service.get_average_emotion(test_session_id, "image"),
            "avgText": emotion_service.get_average_emotion(test_session_id, "text"),
            "avgAll": emotion_service.get_average_emotion(test_session_id, "all")
        }
    except Exception as e:
        error_msg = f"Error getting emotion stats: {str(e)}\n{traceback.format_exc()}"
        logger.error(error_msg)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/test/evaluate-text-answer")
def evaluate_text_answer(test_session_id: str, question_index: int, topic: str, question: str, answer: str):
    """Evaluate student's open-ended text answer using LLM"""
    try:
        logger.info(f"Evaluating text answer for session: {test_session_id}, question index: {question_index}")
        
        # Use TestEngine to evaluate the answer
        evaluation = test_engine.evaluate_text_answer(topic, question, answer)
        
        logger.info(f"Text answer evaluated - Correct: {evaluation['is_correct']}, Score: {evaluation['score']}")
        
        return {
            "status": "evaluated",
            "isCorrect": evaluation["is_correct"],
            "feedback": evaluation["feedback"],
            "score": evaluation["score"],
            "questionIndex": question_index
        }
    except Exception as e:
        error_msg = f"Error evaluating text answer: {str(e)}\n{traceback.format_exc()}"
        logger.error(error_msg)
        raise HTTPException(status_code=500, detail=str(e))
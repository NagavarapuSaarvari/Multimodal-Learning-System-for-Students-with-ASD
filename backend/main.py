from fastapi import FastAPI, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import traceback
import logging
import base64
import io
import cv2
import numpy as np
from PIL import Image
from services import (
    DocumentService,
    RAGService,
    MemoryService,
    TestEngine,
    EmotionService
)

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

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


@app.post("/upload")
async def upload_document(file: UploadFile):
    """Upload a PDF document"""
    try:
        logger.info(f"Uploading document: {file.filename}")
        file_bytes = await file.read()
        doc_id = doc_service.upload_document(file_bytes, file.filename)
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
def get_documents():
    """Get all uploaded documents"""
    try:
        logger.info("Fetching documents list")
        documents = doc_service.get_documents()
        logger.info(f"Retrieved {len(documents)} documents")
        return {"documents": documents}
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
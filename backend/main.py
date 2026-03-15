from fastapi import FastAPI, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import traceback
import logging
from services import (
    DocumentService,
    RAGService,
    MemoryService,
    TestEngine
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
def create_test(topic: str, difficulty: str = "easy"):
    """Create a new test session"""
    try:
        logger.info(f"Creating test for topic: {topic}, difficulty: {difficulty}")
        test_data = test_engine.create_test_session(topic, difficulty)
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
        results = test_engine.calculate_score(test_session_id)
        # Determine next difficulty
        next_difficulty = test_engine.next_difficulty(
            results["difficulty"],
            results["accuracy"]
        )
        results["nextDifficulty"] = next_difficulty
        
        # Store in memory
        memory_service.store_memory(results["topic"], results["score"], results["difficulty"])
        logger.info(f"Score calculated - Accuracy: {results['accuracy']*100:.1f}%, Next Difficulty: {next_difficulty}")
        
        return results
    except Exception as e:
        error_msg = f"Error calculating score: {str(e)}\n{traceback.format_exc()}"
        logger.error(error_msg)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
def health():
    """Health check endpoint"""
    logger.info("Health check")
    return {"status": "ok"}
import uuid
import cv2
import numpy as np
import tensorflow as tf
import os
import json
import re
import logging
import traceback
from io import BytesIO

from sentence_transformers import SentenceTransformer
from youtubesearchpython import VideosSearch
from langchain_groq import ChatGroq
from dotenv import load_dotenv
from database import db

from PyPDF2 import PdfReader
from tensorflow.keras.utils import custom_object_scope

load_dotenv()

GROQ_KEY = os.getenv("GROQ_API_KEY")
logger = logging.getLogger(__name__)


# ==============================
# EMBEDDING SERVICE (Singleton)
# ==============================
class EmbeddingService:

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(EmbeddingService, cls).__new__(cls)
            cls._instance.model = SentenceTransformer("all-MiniLM-L6-v2")
        return cls._instance

    def embed(self, text):
        return self.model.encode(text).tolist()


# ==============================
# PDF SERVICE
# ==============================
class PDFService:

    @staticmethod
    def extract_text_from_pdf(pdf_bytes):

        try:
            reader = PdfReader(BytesIO(pdf_bytes))
            text = ""

            for page in reader.pages:
                page_text = page.extract_text() or ""
                page_text = page_text.replace("\x00", "")
                page_text = re.sub(r"[\x00-\x1F\x7F]", " ", page_text)
                text += page_text

            return text.strip()

        except Exception as e:
            logger.error(f"PDF extraction error: {e}")
            return ""


# ==============================
# DOCUMENT SERVICE
# ==============================
class DocumentService:

    def __init__(self):
        self.embedder = EmbeddingService()

    def upload_document(self, file_bytes, filename):

        if not filename.lower().endswith(".pdf"):
            raise ValueError("Only PDF files allowed")

        text = PDFService.extract_text_from_pdf(file_bytes)

        if not text:
            raise ValueError("Could not extract text")

        doc_id = str(uuid.uuid4())

        db.execute(
            "INSERT INTO documents (id, filename, file_type, uploaded_at) VALUES (%s,%s,%s,NOW())",
            (doc_id, filename, "pdf"),
        )

        chunks = [c.strip() for c in text.split("\n\n") if c.strip()]

        for chunk in chunks:

            embedding = self.embedder.embed(chunk)

            db.execute(
                """
                INSERT INTO document_chunks
                (id,document_id,content,embedding)
                VALUES (%s,%s,%s,%s)
                """,
                (str(uuid.uuid4()), doc_id, chunk, embedding),
            )

        return doc_id

    def get_documents(self):

        db.execute(
            "SELECT id, filename, uploaded_at FROM documents ORDER BY uploaded_at DESC"
        )

        results = db.fetch()

        return [
            {
                "id": r[0],
                "filename": r[1],
                "uploaded_at": r[2].isoformat() if r[2] else None,
            }
            for r in results
        ]

    def delete_document(self, doc_id):

        db.execute("DELETE FROM document_chunks WHERE document_id=%s", (doc_id,))
        db.execute("DELETE FROM documents WHERE id=%s", (doc_id,))

        return True


# ==============================
# YOUTUBE SERVICE
# ==============================
class YouTubeService:

    @staticmethod
    def search_videos(topic, num_results=3):
        try:
            videos = VideosSearch(topic, limit=num_results).result()
            return [
                {
                    "title": v["title"],
                    "url": v["link"],
                    "channel": v["channel"]["name"],
                }   
                for v in videos["result"]
            ]
        except Exception as e:
            logger.error(f"YouTube search error: {e}")
            return []


# ==============================
# RAG SERVICE
# ==============================
class RAGService:

    def __init__(self):

        self.embedder = EmbeddingService()

        self.llm = ChatGroq(
            model="llama-3.3-70b-versatile",
            api_key=GROQ_KEY,
        )

        self.youtube_service = YouTubeService()

    def retrieve_context(self, topic, limit=5):

        embedding = self.embedder.embed(topic)

        vector_str = "[" + ",".join(map(str, embedding)) + "]"

        db.execute(
            "SELECT content FROM match_documents(%s::vector,%s)",
            (vector_str, limit),
        )

        results = db.fetch()

        return "\n".join([r[0] for r in results])

    def generate_material(self, topic, memory, difficulty="easy"):

        context = self.retrieve_context(topic, limit=2)[:1500]

        prompt = f"""
Create learning material for {topic} at {difficulty} level.

Include: definitions, examples, key points. Keep it concise.

Context: {context}
"""

        response = self.llm.invoke(prompt)

        videos = self.youtube_service.search_videos(topic, num_results=2)

        video_section = "\n\n---\n\n## Videos\n\n"

        if videos:

            for i, v in enumerate(videos, 1):
                video_section += f"{i}. {v['title']}\n{v['url']}\n\n"

        return response.content + video_section


# ==============================
# MEMORY SERVICE
# ==============================
class MemoryService:

    def get_memory(self):

        db.execute(
            "SELECT topic,score FROM learning_memory ORDER BY created_at DESC LIMIT 10"
        )

        return db.fetch()

    def store_memory(self, topic, score, difficulty="easy"):

        db.execute(
            """
            INSERT INTO learning_memory
            (topic,score,difficulty,created_at)
            VALUES (%s,%s,%s,NOW())
            """,
            (topic, score, difficulty),
        )


# ==============================
# TEST ENGINE
# ==============================
class TestEngine:

    def __init__(self):

        self.llm = ChatGroq(
            model="llama-3.3-70b-versatile",
            api_key=GROQ_KEY,
        )

        self.levels = ["easy", "medium", "hard"]

    def next_difficulty(self, current, accuracy, test_number, avg_emotion=0.0):

        idx = self.levels.index(current)

        if test_number == 1:
            return "easy"

        # Low emotion (< 0.3) suggests confused/bored - make easier
        if avg_emotion < 0.3:
            idx = max(idx - 1, 0)
        # High accuracy and emotion - increase difficulty
        elif accuracy > 0.75 and avg_emotion > 0.6:
            idx = min(idx + 1, 2)
        # Low accuracy - decrease difficulty
        elif accuracy < 0.5:
            idx = max(idx - 1, 0)

        return self.levels[idx]

    def generate_short_answer_questions(self, topic, difficulty="easy"):
        """Generate 2 short answer questions - separate LLM call"""
        prompt = f"Generate exactly 2 one-sentence short answer questions about {topic} at {difficulty} level.\n\nJSON: {{\"questions\": [{{\"query\": \"text\", \"answer\": \"text\"}}]}}"
        
        response = self.llm.invoke(prompt)
        text = response.content.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        
        try:
            data = json.loads(text)
            return data.get("questions", [])
        except:
            match = re.search(r"\{.*\}", text, re.DOTALL)
            if match:
                data = json.loads(match.group())
                return data.get("questions", [])
            logger.warning(f"Failed to parse short answer questions for {topic}")
            return []

    def generate_mcq_questions(self, topic, difficulty="easy"):
        """Generate 5 MCQ questions - separate LLM call"""
        prompt = f"Generate exactly 5 multiple choice questions about {topic} at {difficulty} level.\n\nJSON: {{\"questions\": [{{\"question\": \"text\", \"options\": [\"A\",\"B\",\"C\",\"D\"], \"answer\": 0, \"explanation\": \"text\"}}]}}"
        
        response = self.llm.invoke(prompt)
        text = response.content.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        
        try:
            data = json.loads(text)
            return data.get("questions", [])
        except:
            match = re.search(r"\{.*\}", text, re.DOTALL)
            if match:
                data = json.loads(match.group())
                return data.get("questions", [])
            logger.warning(f"Failed to parse MCQ questions for {topic}")
            return []

    def create_test_session(self, topic, difficulty, test_number=1):

        session_id = str(uuid.uuid4())

        db.execute(
            """
            INSERT INTO test_sessions
            (id,topic,test_number,initial_difficulty,current_difficulty)
            VALUES (%s,%s,%s,%s,%s)
            """,
            (session_id, topic, test_number, difficulty, difficulty),
        )

        logger.info(f"Generating batch 1 questions - topic: {topic}, difficulty: {difficulty}")

        # Generate batch 1: 2 short answer + 5 MCQ = 7 questions (separate LLM calls)
        sa_questions = self.generate_short_answer_questions(topic, difficulty)
        mcq_questions = self.generate_mcq_questions(topic, difficulty)

        # Store short answer questions (batch 1)
        for sa_q in sa_questions[:2]:
            try:
                db.execute(
                    """
                    INSERT INTO test_questions
                    (session_id,topic,difficulty,question,options,correct_answer,explanation,batch_number)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
                    """,
                    (
                        session_id,
                        topic,
                        difficulty,
                        sa_q.get("query") or sa_q.get("question"),
                        [sa_q.get("answer") or sa_q.get("sampleAnswer", "")],
                        0,
                        sa_q.get("answer") or sa_q.get("sampleAnswer", ""),
                        1,
                    ),
                )
            except Exception as e:
                logger.error(f"Error storing short answer: {e}")

        # Store MCQ questions (batch 1)
        for q in mcq_questions[:5]:
            try:
                db.execute(
                    """
                    INSERT INTO test_questions
                    (session_id,topic,difficulty,question,options,correct_answer,explanation,batch_number)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
                    """,
                    (
                        session_id,
                        topic,
                        difficulty,
                        q.get("question"),
                        q.get("options", ["A","B","C","D"]),
                        q.get("answer") or q.get("correctAnswer", 0),
                        q.get("explanation", ""),
                        1,
                    ),
                )
            except Exception as e:
                logger.error(f"Error storing MCQ: {e}")

        # Fetch batch 1 questions
        db.execute(
            """
            SELECT id, question, options, correct_answer, explanation FROM test_questions
            WHERE session_id = %s AND batch_number = 1
            ORDER BY id ASC
            """,
            (session_id,),
        )
        question_rows = db.fetch()
        
        questions = []
        for qrow in question_rows:
            questions.append({
                "id": qrow[0],
                "question": qrow[1],
                "options": qrow[2],
                "correctAnswer": qrow[3],
                "explanation": qrow[4],
            })

        logger.info(f"Batch 1 created with {len(questions)} questions for session {session_id}")

        return {
            "sessionId": session_id,
            "topic": topic,
            "difficulty": difficulty,
            "testNumber": test_number,
            "totalQuestions": len(questions),
            "questions": questions,
            "batchNumber": 1,
        }

    def submit_answer(self, test_session_id, question_index, user_answer):
        """Submit an answer for a question"""
        try:
            # Get question at given index
            db.execute(
                """
                SELECT id, correct_answer FROM test_questions 
                WHERE session_id = %s
                ORDER BY id ASC
                OFFSET %s LIMIT 1
                """,
                (test_session_id, question_index),
            )
            result = db.fetch()
            if not result:
                raise ValueError(f"Question not found at index {question_index}")
            
            question_id, correct_answer = result[0]
            is_correct = user_answer == correct_answer
            
            # Store user's answer
            db.execute(
                """
                INSERT INTO user_test_answers
                (test_session_id, question_id, user_answer, is_correct)
                VALUES (%s, %s, %s, %s)
                """,
                (test_session_id, question_id, user_answer, is_correct),
            )
            
            return {
                "isCorrect": is_correct,
                "correctAnswer": correct_answer,
                "userAnswer": user_answer
            }
        except Exception as e:
            logger.error(f"Error submitting answer: {e}")
            raise

    def calculate_score(self, test_session_id, avg_emotion=0.0):
        """Calculate final score for a test session"""
        try:
            # Get test session
            db.execute(
                "SELECT topic, initial_difficulty, test_number FROM test_sessions WHERE id = %s",
                (test_session_id,),
            )
            session = db.fetch()
            if not session:
                raise ValueError("Test session not found")
            
            topic, difficulty, test_number = session[0]
            
            # Count correct answers
            db.execute(
                """
                SELECT COUNT(*) as total, SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) as correct
                FROM user_test_answers
                WHERE test_session_id = %s
                """,
                (test_session_id,),
            )
            stats = db.fetch()[0]
            total_questions = stats[0] or 10
            correct_answers = stats[1] or 0
            
            accuracy = correct_answers / total_questions if total_questions > 0 else 0
            score = int(accuracy * 100)
            
            # Determine next difficulty for next test (including emotion factor)
            next_difficulty = self.next_difficulty(difficulty, accuracy, test_number, avg_emotion)
            
            # Store results
            db.execute(
                """
                INSERT INTO test_results
                (session_id, topic, score, total_questions, difficulty, avg_emotion, test_number)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (test_session_id, topic, score, total_questions, difficulty, str(avg_emotion), test_number),
            )
            
            # Update test session status
            db.execute(
                "UPDATE test_sessions SET status = 'completed', completed_at = NOW() WHERE id = %s",
                (test_session_id,),
            )
            
            return {
                "sessionId": test_session_id,
                "topic": topic,
                "score": score,
                "accuracy": accuracy,
                "difficulty": difficulty,
                "nextDifficulty": next_difficulty,
                "totalQuestions": total_questions,
                "correctAnswers": correct_answers,
                "avgEmotion": avg_emotion,
                "testNumber": test_number,
            }
        except Exception as e:
            logger.error(f"Error calculating score: {e}")
            raise

    def get_test_count(self, topic):
        """Get number of completed tests for a topic"""
        try:
            db.execute(
                """
                SELECT COUNT(*) FROM test_results
                WHERE topic = %s
                """,
                (topic,),
            )
            result = db.fetch()
            return result[0][0] if result else 0
        except Exception as e:
            logger.warning(f"Error getting test count: {e}")
            return 0

    def get_last_test_result(self, topic):
        """Get the last test result for a topic to determine next difficulty"""
        try:
            db.execute(
                """
                SELECT score, accuracy, difficulty, next_difficulty, test_number
                FROM (
                    SELECT 
                        score, 
                        CAST(score AS FLOAT) / 100.0 as accuracy,
                        difficulty,
                        CASE 
                            WHEN CAST(score AS FLOAT) / 100.0 > 0.75 THEN 'hard'
                            WHEN CAST(score AS FLOAT) / 100.0 < 0.5 THEN 'easy'
                            ELSE difficulty
                        END as next_difficulty,
                        test_number
                    FROM test_results
                    WHERE topic = %s
                    ORDER BY created_at DESC
                    LIMIT 1
                ) as last_test
                """,
                (topic,),
            )
            result = db.fetch()
            if result:
                score, accuracy, difficulty, next_difficulty, test_number = result[0]
                return {
                    "score": score,
                    "accuracy": accuracy,
                    "difficulty": next_difficulty,
                    "testNumber": test_number,
                }
            return None
        except Exception as e:
            logger.warning(f"Error getting last test result: {e}")
            return None

    def generate_next_batch(self, session_id, topic, current_difficulty):
        """
        Generate batch 2 (second set of questions) with adaptive difficulty.
        
        Difficulty logic:
        - High accuracy (>75%) AND positive emotion (>0.6) → increase difficulty
        - Low accuracy (<50%) → decrease difficulty
        - Low emotion (<0.3) → decrease difficulty
        - Otherwise → keep same difficulty
        """
        try:
            # Get batch 1 performance
            db.execute(
                """
                SELECT COUNT(*), SUM(CASE WHEN is_correct THEN 1 ELSE 0 END)
                FROM user_test_answers
                WHERE test_session_id = %s
                """,
                (session_id,),
            )
            result = db.fetch()[0]
            total = result[0] or 1
            correct = result[1] or 0
            accuracy = correct / total if total > 0 else 0
            
            logger.info(f"Batch 1 Performance - Accuracy: {accuracy:.2f}")
            
            # Get average emotion from batch 1
            emotion_service = EmotionService()
            avg_emotion = emotion_service.get_average_emotion(session_id)
            logger.info(f"Average Emotion for batch 1: {avg_emotion:.2f}")
            
            # Determine batch 2 difficulty based on performance + emotion
            new_difficulty = self.next_difficulty(current_difficulty, accuracy, test_number=2, avg_emotion=avg_emotion)
            logger.info(f"Batch 2 difficulty: {current_difficulty} → {new_difficulty} (accuracy: {accuracy:.2f}, emotion: {avg_emotion:.2f})")
            
            # Generate batch 2 questions with new difficulty
            logger.info(f"Generating batch 2 questions - topic: {topic}, difficulty: {new_difficulty}")
            sa_questions = self.generate_short_answer_questions(topic, new_difficulty)
            mcq_questions = self.generate_mcq_questions(topic, new_difficulty)
            
            # Store short answer questions (batch 2)
            for sa_q in sa_questions[:2]:
                try:
                    db.execute(
                        """
                        INSERT INTO test_questions
                        (session_id,topic,difficulty,question,options,correct_answer,explanation,batch_number)
                        VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
                        """,
                        (
                            session_id,
                            topic,
                            new_difficulty,
                            sa_q.get("query") or sa_q.get("question"),
                            [sa_q.get("answer") or sa_q.get("sampleAnswer", "")],
                            0,
                            sa_q.get("answer") or sa_q.get("sampleAnswer", ""),
                            2,
                        ),
                    )
                except Exception as e:
                    logger.error(f"Error storing batch 2 short answer: {e}")
            
            # Store MCQ questions (batch 2)
            for q in mcq_questions[:5]:
                try:
                    db.execute(
                        """
                        INSERT INTO test_questions
                        (session_id,topic,difficulty,question,options,correct_answer,explanation,batch_number)
                        VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
                        """,
                        (
                            session_id,
                            topic,
                            new_difficulty,
                            q.get("question"),
                            q.get("options", ["A","B","C","D"]),
                            q.get("answer") or q.get("correctAnswer", 0),
                            q.get("explanation", ""),
                            2,
                        ),
                    )
                except Exception as e:
                    logger.error(f"Error storing batch 2 MCQ: {e}")
            
            # Fetch batch 2 questions
            db.execute(
                """
                SELECT id, question, options, correct_answer, explanation FROM test_questions
                WHERE session_id = %s AND batch_number = 2
                ORDER BY id ASC
                """,
                (session_id,),
            )
            question_rows = db.fetch()
            
            questions = []
            for qrow in question_rows:
                questions.append({
                    "id": qrow[0],
                    "question": qrow[1],
                    "options": qrow[2],
                    "correctAnswer": qrow[3],
                    "explanation": qrow[4],
                })
            
            logger.info(f"Batch 2 created with {len(questions)} questions for session {session_id}")
            
            return {
                "sessionId": session_id,
                "topic": topic,
                "difficulty": new_difficulty,
                "totalQuestions": len(questions),
                "questions": questions,
                "batchNumber": 2,
                "batch1Performance": {
                    "accuracy": accuracy,
                    "avgEmotion": avg_emotion,
                }
            }
            
        except Exception as e:
            logger.error(f"Error generating next batch: {e}")
            raise


# ==============================
# EMOTION SERVICE
# ==============================
class EmotionService:

    def __init__(self):

        try:

            with custom_object_scope({'TFOpLambda': tf.keras.layers.Lambda}):
                self.model = tf.keras.models.load_model("image_model.h5",compile=False)
                self.labels = ["confused", "focused", "bored", "happy"]

        except Exception as e:

            logger.warning(f"Emotion model load failed: {e}")

            self.model = None
            self.labels = []

    def predict(self, image):

        if self.model is None:
            return {"emotion": "focused", "confidence": 0.0}

        try:

            img = cv2.resize(image, (96, 96))
            img = img / 255.0
            img = np.expand_dims(img, 0)

            pred = self.model.predict(img, verbose=0)

            idx = np.argmax(pred)

            return {
                "emotion": self.labels[idx],
                "confidence": float(np.max(pred)),
            }

        except Exception as e:

            logger.warning(f"Emotion prediction error {e}")

            return {"emotion": "focused", "confidence": 0.0}

    def store_emotion(self, test_session_id, emotion, confidence=0.0):
        """Store emotion for test session"""
        try:
            db.execute(
                """
                INSERT INTO test_emotions (session_id, emotion, confidence)
                VALUES (%s, %s, %s)
                """,
                (test_session_id, emotion, confidence),
            )
            logger.debug(f"Emotion stored: {test_session_id} - {emotion} ({confidence:.2f})")
        except Exception as e:
            logger.warning(f"Error storing emotion: {e}")

    def get_average_emotion(self, test_session_id):
        """Get average emotion confidence for test session"""
        try:
            db.execute(
                """
                SELECT AVG(confidence) as avg_confidence
                FROM test_emotions
                WHERE session_id = %s
                """,
                (test_session_id,),
            )
            result = db.fetch()
            if result and result[0][0]:
                return float(result[0][0])
            return 0.0
        except Exception as e:
            logger.warning(f"Error getting average emotion: {e}")
            return 0.0

    def extract_emotion_from_text(self, text):
        """
        Extract emotion from textual answer (placeholder for future NLP implementation)
        
        TODO: Implement sentiment analysis on student's text answers
        - Analyze answer length (short/verbose)
        - Check for frustration keywords
        - Detect confidence in response
        - Return emotion score 0.0-1.0
        
        For now, returns neutral emotion score
        """
        # Placeholder implementation
        return {
            "emotion": "neutral",
            "confidence": 0.5,
            "details": "Text analysis not yet implemented"
        }
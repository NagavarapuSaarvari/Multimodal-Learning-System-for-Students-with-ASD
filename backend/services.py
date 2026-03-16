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
from langchain_groq import ChatGroq
from dotenv import load_dotenv
from database import db
from pytube import Search
from PyPDF2 import PdfReader

load_dotenv()

GROQ_KEY = os.getenv("GROQ_API_KEY")
logger = logging.getLogger(__name__)


class EmbeddingService:

    def __init__(self):
        self.model = SentenceTransformer("all-MiniLM-L6-v2")

    def embed(self, text):
        return self.model.encode(text).tolist()


class PDFService:
    
    @staticmethod
    def extract_text_from_pdf(pdf_bytes):
        """Extract text from PDF bytes"""
        try:
            pdf_reader = PdfReader(BytesIO(pdf_bytes))
            text = ""

            for page in pdf_reader.pages:
                page_text = page.extract_text() or ""
                
                # REMOVE NULL BYTES
                page_text = page_text.replace("\x00", "")

                text += page_text

            return text

        except Exception as e:
            print(f"Error extracting PDF: {e}")
            return ""


class DocumentService:

    def __init__(self):
        self.embedder = EmbeddingService()

    def upload_document(self, file_bytes, filename):
        """Upload PDF document and store embeddings"""
        
        # Validate PDF
        if not filename.lower().endswith('.pdf'):
            raise ValueError("Only PDF files are allowed")

        # Extract text from PDF
        text = PDFService.extract_text_from_pdf(file_bytes)
        
        if not text:
            raise ValueError("Could not extract text from PDF")

        doc_id = str(uuid.uuid4())

        db.execute(
            "INSERT INTO documents (id, filename, file_type, uploaded_at) VALUES (%s,%s,%s,NOW())",
            (doc_id, filename, 'pdf')
        )

        # Split text into chunks
        chunks = text.split("\n\n")
        clean_chunks = []
        for chunk in chunks:
            chunk = chunk.strip()

            # remove null characters
            chunk = chunk.replace("\x00", "")

            # remove weird control characters
            chunk = re.sub(r'[\x00-\x1F\x7F]', ' ', chunk)

            if chunk:
                clean_chunks.append(chunk)

        chunks = clean_chunks

        for chunk in chunks:
            embedding = self.embedder.embed(chunk)
            db.execute(
                """
                INSERT INTO document_chunks
                (id,document_id,content,embedding)
                VALUES (%s,%s,%s,%s)
                """,
                (
                    str(uuid.uuid4()),
                    doc_id,
                    chunk,
                    embedding
                )
            )

        return doc_id

    def get_documents(self):
        """Get all uploaded documents"""
        db.execute("SELECT id, filename, uploaded_at FROM documents ORDER BY uploaded_at DESC")
        results = db.fetch()
        return [
            {
                "id": r[0],
                "filename": r[1],
                "uploaded_at": r[2].isoformat() if r[2] else None
            }
            for r in results
        ]

    def delete_document(self, doc_id):
        """Delete document and its chunks"""
        db.execute("DELETE FROM document_chunks WHERE document_id = %s", (doc_id,))
        db.execute("DELETE FROM documents WHERE id = %s", (doc_id,))
        return True


class YouTubeService:
    
    @staticmethod
    def search_videos(topic, num_results=3):
        """Search YouTube for relevant videos"""
        try:
            search = Search(topic)
            results = []
            for video in search.results[:num_results]:
                results.append({
                    "title": video.title,
                    "url": f"https://www.youtube.com/watch?v={video.video_id}",
                    "channel": video.author,
                    "length": video.length
                })
            return results
        except Exception as e:
            print(f"Error searching YouTube: {e}")
            return []


class RAGService:

    def __init__(self):
        self.embedder = EmbeddingService()
        self.llm = ChatGroq(
            model="llama-3.3-70b-versatile",
            api_key=GROQ_KEY
        )
        self.youtube_service = YouTubeService()

    def retrieve_context(self, topic, limit=5):
        embedding = self.embedder.embed(topic)
        vector_str = "[" + ",".join(map(str, embedding)) + "]"

        db.execute(
            "SELECT content FROM match_documents(%s::vector,%s)",
            (vector_str, limit)
        )

        results = db.fetch()
        context = "\n".join([r[0] for r in results])
        return context

    def generate_material(self, topic, memory, difficulty="easy"):
        """Generate comprehensive learning material with YouTube references"""
        
        context = self.retrieve_context(topic)
        
        memory_text = ""
        if memory:
            memory_text = "Past learning:\n"
            for item in memory:
                memory_text += f"- {item[0]}: Score {item[1]}\n"

        prompt = f"""
You are an expert AI tutor for students with autism spectrum disorder (ASD). 
Create clear, structured, and sensory-friendly learning material.

Difficulty Level: {difficulty}

Previous Learning:
{memory_text}

Available Context:
{context}

Topic: {topic}

Generate comprehensive study material that:
1. Uses clear, simple language
2. Breaks down concepts into small, manageable parts
3. Includes relevant examples
4. Uses bullet points and visual hierarchies
5. Provides definitions for technical terms
6. Includes summary at the end

Be thorough but organized.
"""

        response = self.llm.invoke(prompt)
        
        # Get YouTube references
        videos = self.youtube_service.search_videos(topic, num_results=3)
        
        video_references = "\n\n---\n\n## Recommended Video Resources\n\n"
        if videos:
            for i, video in enumerate(videos, 1):
                video_references += f"{i}. **{video['title']}**\n"
                video_references += f"   Channel: {video['channel']}\n"
                video_references += f"   Duration: {video['length']} seconds\n"
                video_references += f"   Link: {video['url']}\n\n"
        else:
            video_references += "No videos found for this topic."

        return response.content + video_references


class MemoryService:

    def get_memory(self):
        """Get learning memory for context"""
        db.execute("SELECT topic, score FROM learning_memory ORDER BY created_at DESC LIMIT 10")
        return db.fetch()

    def store_memory(self, topic, score, difficulty="easy"):
        """Store learning memory"""
        db.execute(
            "INSERT INTO learning_memory(topic, score, difficulty, created_at) VALUES(%s,%s,%s,NOW())",
            (topic, score, difficulty)
        )


class TestEngine:

    def __init__(self):
        self.llm = ChatGroq(
            model="llama-3.3-70b-versatile",
            api_key=GROQ_KEY
        )
        self.levels = ["easy", "medium", "hard"]

    def next_difficulty(self, current, accuracy, emotion_score=0.5):
        """Determine next difficulty based on performance"""
        idx = self.levels.index(current)

        if accuracy > 0.8 and emotion_score > 0.5:
            idx = min(idx + 1, 2)
        elif accuracy < 0.4:
            idx = max(idx - 1, 0)

        return self.levels[idx]

    def generate_questions(self, topic, difficulty="easy"):
        """Generate test questions with explanations"""
        
        try:
            logger.info(f"Generating {difficulty} questions for topic: {topic}")
            
            difficulty_guidelines = {
                "easy": "Basic understanding, straightforward concepts",
                "medium": "Intermediate understanding, application of concepts",
                "hard": "Deep understanding, analysis and synthesis of concepts"
            }

            prompt = f"""
Generate exactly 10 multiple choice questions about "{topic}" with {difficulty} difficulty level.

Difficulty Guidelines: {difficulty_guidelines[difficulty]}

Return ONLY a valid JSON array. No markdown, no explanations outside JSON.

Format:
[
  {{
    "question": "Clear question text",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "explanation": "Why this is correct and why others are wrong"
  }}
]

Requirements:
- Exactly 10 questions
- Each question has 4 options
- correctAnswer is 0-3 (index of correct option)
- Clear explanations for learning
- Valid JSON only
"""

            logger.debug(f"Calling LLM for question generation...")
            response = self.llm.invoke(prompt)
            logger.debug(f"LLM response received, length: {len(response.content)}")
            
            # Clean the response to ensure it's valid JSON
            text = response.content.strip()
            logger.debug(f"Raw response text (first 200 chars): {text[:200]}")
            
            # Remove markdown code blocks if present
            if text.startswith("```"):
                logger.debug("Removing markdown code block")
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
                text = text.strip()
            
            # Parse JSON
            try:
                logger.debug("Parsing JSON...")
                questions = json.loads(text)
                logger.info(f"Successfully generated {len(questions)} questions")
                return questions
            except json.JSONDecodeError as e:
                logger.warning(f"JSON parse error, attempting regex extraction: {str(e)}")
                # Try to extract JSON from the response
                json_match = re.search(r'\[.*\]', text, re.DOTALL)
                if json_match:
                    logger.debug("Found JSON match with regex")
                    questions = json.loads(json_match.group())
                    logger.info(f"Successfully extracted {len(questions)} questions via regex")
                    return questions
                else:
                    error_msg = f"Could not parse test questions. Response: {text[:500]}"
                    logger.error(error_msg)
                    raise ValueError(error_msg)
        except Exception as e:
            error_msg = f"Error generating questions: {str(e)}\n{traceback.format_exc()}"
            logger.error(error_msg)
            raise

    def create_test_session(self, topic, difficulty):
        """Create a test session and store questions"""
        try:
            logger.info(f"Creating test session for topic: {topic}, difficulty: {difficulty}")
            session_id = str(uuid.uuid4())
            logger.debug(f"Generated session ID: {session_id}")
            
            logger.debug("Calling generate_questions...")
            questions = self.generate_questions(topic, difficulty)
            logger.debug(f"Generated {len(questions)} questions")

            # Store questions in database
            logger.debug("Storing questions in database...")
            for idx, q in enumerate(questions):
                try:
                    db.execute(
                        """
                        INSERT INTO test_questions 
                        (session_id, topic, difficulty, question, options, correct_answer, explanation)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                        """,
                        (
                            session_id,
                            topic,
                            difficulty,
                            q.get("question"),
                            q.get("options"),
                            q.get("correctAnswer"),
                            q.get("explanation")
                        )
                    )
                except Exception as e:
                    logger.error(f"Error storing question {idx}: {str(e)}")
                    raise
            
            logger.info(f"Test session created successfully. Session ID: {session_id}")
            return {
                "sessionId": session_id,
                "topic": topic,
                "difficulty": difficulty,
                "questions": questions
            }
        except Exception as e:
            error_msg = f"Error creating test session: {str(e)}\n{traceback.format_exc()}"
            logger.error(error_msg)
            raise
        session_id = str(uuid.uuid4())
        questions = self.generate_questions(topic, difficulty)

        # Store questions in database
        for idx, q in enumerate(questions):
            db.execute(
                """
                INSERT INTO test_questions 
                (session_id, topic, difficulty, question, options, correct_answer, explanation)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    session_id,
                    topic,
                    difficulty,
                    q.get("question"),
                    q.get("options"),
                    q.get("correctAnswer"),
                    q.get("explanation")
                )
            )

        return {
            "sessionId": session_id,
            "topic": topic,
            "difficulty": difficulty,
            "questions": questions
        }

    def submit_answer(self, test_session_id, question_index, user_answer):
        """Submit and validate an answer by question index within session"""
        
        try:
            logger.debug(f"Looking up question - Session: {test_session_id}, Index: {question_index}")
            
            # Get the question by index within the session (1-indexed in DB)
            db.execute(
                """SELECT id, correct_answer, explanation FROM test_questions 
                   WHERE session_id = %s 
                   ORDER BY id ASC
                   LIMIT 1 OFFSET %s""",
                (test_session_id, question_index - 1)  # Convert to 0-indexed for OFFSET
            )
            result = db.fetch()
            
            if not result:
                error_msg = f"Question not found - Session: {test_session_id}, Index: {question_index}"
                logger.error(error_msg)
                raise ValueError(error_msg)

            question_id = result[0][0]
            correct_answer = result[0][1]
            explanation = result[0][2]
            is_correct = (user_answer == correct_answer)
            
            logger.debug(f"Question found - ID: {question_id}, Correct Answer: {correct_answer}, User Answer: {user_answer}, Is Correct: {is_correct}")

            # Store the answer
            db.execute(
                """
                INSERT INTO user_test_answers 
                (test_session_id, question_id, user_answer, is_correct)
                VALUES (%s, %s, %s, %s)
                """,
                (test_session_id, question_id, user_answer, is_correct)
            )
            
            logger.info(f"Answer stored - Session: {test_session_id}, Question: {question_id}, Correct: {is_correct}")

            return {
                "isCorrect": is_correct,
                "correctAnswer": correct_answer,
                "explanation": explanation
            }
        except Exception as e:
            error_msg = f"Error submitting answer: {str(e)}\n{traceback.format_exc()}"
            logger.error(error_msg)
            raise

    def calculate_score(self, test_session_id):
        """Calculate test score and return results"""
        
        db.execute(
            """
            SELECT COUNT(*), SUM(CASE WHEN is_correct THEN 1 ELSE 0 END), 
                   topic, difficulty
            FROM user_test_answers uta
            JOIN test_questions tq ON uta.question_id = tq.id
            WHERE uta.test_session_id = %s
            GROUP BY uta.test_session_id, tq.topic, tq.difficulty
            """,
            (test_session_id,)
        )
        
        result = db.fetch()
        if not result:
            raise ValueError("Test session not found")

        total_questions = result[0][0]
        correct_answers = result[0][1]
        topic = result[0][2]
        difficulty = result[0][3]

        score = int((correct_answers / total_questions) * 100) if total_questions > 0 else 0
        accuracy = correct_answers / total_questions if total_questions > 0 else 0

        # Store test result
        db.execute(
            """
            INSERT INTO test_results 
            (topic, score, total_questions, difficulty, created_at)
            VALUES (%s, %s, %s, %s, NOW())
            """,
            (topic, score, total_questions, difficulty)
        )

        return {
            "score": score,
            "accuracy": accuracy,
            "correctAnswers": correct_answers,
            "totalQuestions": total_questions,
            "topic": topic,
            "difficulty": difficulty
        }


class EmotionService:

    def __init__(self):
        try:
            self.model = tf.keras.models.load_model("image_model.h5")
            self.labels = ["confused", "focused", "bored", "happy"]
        except:
            self.model = None
            self.labels = []

    def predict(self, image):
        """Predict emotion from image"""
        if self.model is None:
            return "focused"

        try:
            img = cv2.resize(image, (96, 96))
            img = img / 255.0
            img = np.expand_dims(img, 0)
            pred = self.model.predict(img)
            return self.labels[np.argmax(pred)]
        except:
            return "focused"

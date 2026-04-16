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
from urllib.parse import urlparse, parse_qs

from sentence_transformers import SentenceTransformer
from youtubesearchpython import VideosSearch
from langchain_groq import ChatGroq
from dotenv import load_dotenv
from database import db

from PyPDF2 import PdfReader
from tensorflow.keras.utils import custom_object_scope

try:
    from transformers import pipeline
except ImportError:
    pass

try:
    from youtube_transcript_api import YouTubeTranscriptApi
except ImportError:
    YouTubeTranscriptApi = None

try:
    import yt_dlp
except ImportError:
    yt_dlp = None

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

    def upload_document(self, file_bytes, filename, admin_id):

        if not filename.lower().endswith(".pdf"):
            raise ValueError("Only PDF files allowed")

        text = PDFService.extract_text_from_pdf(file_bytes)

        if not text:
            raise ValueError("Could not extract text")

        doc_id = str(uuid.uuid4())

        db.execute(
            "INSERT INTO documents (id, admin_id, filename, file_type, uploaded_at) VALUES (%s,%s,%s,%s,NOW())",
            (doc_id, admin_id, filename, "pdf"),
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

    def get_documents(self, admin_id):

        db.execute(
            """
            SELECT 
                d.id, 
                d.filename, 
                d.file_type,
                d.source_url,
                d.uploaded_at,
                ys.title as youtube_title
            FROM documents d
            LEFT JOIN youtube_sources ys ON d.id = ys.document_id
            WHERE d.admin_id=%s 
            ORDER BY d.uploaded_at DESC
            """,
            (admin_id,)
        )

        results = db.fetch()

        return [
            {
                "id": r[0],
                "filename": r[1],
                "file_type": r[2],
                "source_url": r[3],
                "uploaded_at": r[4].isoformat() if r[4] else None,
                "youtube_title": r[5],
            }
            for r in results
        ]

    def delete_document(self, doc_id):

        db.execute("DELETE FROM document_chunks WHERE document_id=%s", (doc_id,))
        db.execute("DELETE FROM documents WHERE id=%s", (doc_id,))

        return True

    def upload_youtube(self, youtube_url, admin_id):
        """Upload YouTube transcript as a document"""
        try:
            # Extract video ID
            video_id = YouTubeTranscriptService.extract_video_id(youtube_url)
            if not video_id:
                raise ValueError(f"Invalid YouTube URL format: {youtube_url}")

            logger.info(f"Extracted video ID: {video_id} from {youtube_url}")

            # Get transcript - this will raise ValueError if not available
            transcript_text = YouTubeTranscriptService.get_transcript(video_id)

            # Create document with admin_id
            doc_id = str(uuid.uuid4())
            video_info = YouTubeTranscriptService.get_video_info(video_id)
            
            db.execute(
                """
                INSERT INTO documents (id, admin_id, filename, file_type, source_url, uploaded_at) 
                VALUES (%s, %s, %s, %s, %s, NOW())
                """,
                (doc_id, admin_id, f"YouTube: {video_id}", "youtube", youtube_url),
            )
            logger.info(f"Document created: {doc_id}")

            # Chunk and embed transcript
            chunks = [c.strip() for c in transcript_text.split("\n\n") if c.strip() and len(c.strip()) > 50]
            
            if not chunks:
                # If no good chunks, split by sentences
                import re
                sentences = re.split(r'[.!?]+', transcript_text)
                chunks = [s.strip() for s in sentences if len(s.strip()) > 20]

            logger.info(f"Processing {len(chunks)} chunks for video {video_id}")

            for chunk in chunks[:100]:  # Limit chunks per video
                embedding = self.embedder.embed(chunk)

                db.execute(
                    """
                    INSERT INTO document_chunks
                    (id, document_id, content, embedding)
                    VALUES (%s, %s, %s, %s)
                    """,
                    (str(uuid.uuid4()), doc_id, chunk, embedding),
                )

            # Insert into youtube_sources table to track YouTube videos
            db.execute(
                """
                INSERT INTO youtube_sources (document_id, video_id, url, title, transcript_chunks, added_at)
                VALUES (%s, %s, %s, %s, %s, NOW())
                """,
                (doc_id, video_id, youtube_url, f"YouTube: {video_id}", len(chunks)),
            )

            logger.info(f"YouTube transcript uploaded successfully: {doc_id} - {len(chunks)} chunks - {video_id}")
            return {
                "doc_id": doc_id,
                "video_id": video_id,
                "url": youtube_url,
                "chunks": len(chunks),
                "message": f"Successfully uploaded transcript with {len(chunks)} chunks"
            }

        except ValueError as e:
            logger.error(f"Validation error uploading YouTube: {str(e)}")
            raise  # Re-raise ValueError so it becomes a 400 error in main.py
        except Exception as e:
            logger.error(f"Error uploading YouTube: {str(e)}")
            raise ValueError(f"Failed to process video: {str(e)}")


# ==============================
# TEXT EMOTION SERVICE (Singleton)
# ==============================
class TextEmotionService:
    """
    Use HuggingFace transformers for text emotion/sentiment analysis
    Models: distilbert-base-uncased-finetuned-sst-2-english, 
            cardiffnlp/twitter-roberta-base-emotion
    """

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(TextEmotionService, cls).__new__(cls)
            try:
                # Use lightweight model for faster inference
                cls._instance.classifier = pipeline(
                    "sentiment-analysis",
                    model="distilbert-base-uncased-finetuned-sst-2-english",
                    device=-1  # CPU, use 0 for GPU
                )
                cls._instance.available = True
                logger.info("TextEmotionService initialized successfully")
            except Exception as e:
                logger.warning(f"TextEmotionService initialization failed: {e}")
                cls._instance.available = False
                cls._instance.classifier = None
        return cls._instance

    def analyze_text(self, text):
        """Analyze emotion/sentiment from text"""
        if not self.available or not text.strip():
            return {
                "emotion": "neutral",
                "confidence": 0.0,
                "label": "NEUTRAL",
                "score": 0.5
            }

        try:
            # Truncate to avoid token limit
            text = text[:512]
            result = self.classifier(text)[0]
            
            # Map sentiment to emotion score
            label = result['label']  # POSITIVE or NEGATIVE
            score = result['score']  # 0.0 -> 1.0
            
            # Convert to emotion metric
            if label == 'POSITIVE':
                confidence = score  # 0.5 -> 1.0
                emotion = "positive"
            else:
                confidence = score  # 0.5 -> 1.0
                emotion = "negative"
            
            return {
                "emotion": emotion,
                "confidence": confidence,
                "label": label,
                "score": score,
                "text_sample": text[:100]
            }
        except Exception as e:
            logger.warning(f"Text emotion analysis error: {e}")
            return {
                "emotion": "neutral",
                "confidence": 0.0,
                "label": "ERROR",
                "score": 0.5
            }


# ==============================
# YOUTUBE TRANSCRIPT SERVICE
# ==============================
class YouTubeTranscriptService:
    """Extract transcripts/captions from YouTube videos with multiple fallback methods"""

    @staticmethod
    def extract_video_id(youtube_url):
        """Extract video ID from various YouTube URL formats"""
        try:
            # Handle youtu.be links
            if 'youtu.be' in youtube_url:
                return youtube_url.split('youtu.be/')[-1].split('?')[0]
            
            # Handle youtube.com links
            parsed_url = urlparse(youtube_url)
            if parsed_url.hostname and 'youtube' in parsed_url.hostname:
                query_params = parse_qs(parsed_url.query)
                if 'v' in query_params:
                    return query_params['v'][0]
                return parsed_url.path.split('/')[-1]
            
            # Assume it's already a video ID
            return youtube_url if len(youtube_url) == 11 else None
        except Exception as e:
            logger.error(f"Error extracting video ID from {youtube_url}: {e}")
            return None

    @staticmethod
    def get_transcript_yt_dlp(video_id):
        """Get transcript using yt-dlp (primary method)"""
        try:
            import yt_dlp
            
            ydl_opts = {
                'quiet': True,
                'no_warnings': True,
                'writesubtitles': True,
                'skip_download': True,
            }
            
            url = f"https://www.youtube.com/watch?v={video_id}"
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                
                # Try to get subtitles (captions)
                if 'subtitles' in info and info['subtitles']:
                    # Prefer English subtitles
                    lang_priority = ['en', 'en-US', 'en-GB']
                    for lang in lang_priority:
                        if lang in info['subtitles']:
                            subs = info['subtitles'][lang]
                            break
                    else:
                        # Use first available language
                        first_lang = list(info['subtitles'].keys())[0]
                        subs = info['subtitles'][first_lang]
                    
                    # Extract text from subtitle entries
                    text = " ".join([entry.get('text', '') for entry in subs if entry.get('text')])
                    if text.strip():
                        logger.info(f"Successfully extracted transcript for {video_id} using yt-dlp: {len(text)} chars")
                        return text
                
                # Fallback to auto-generated captions
                if 'automatic_captions' in info and info['automatic_captions']:
                    lang_priority = ['en', 'en-US', 'en-GB']
                    for lang in lang_priority:
                        if lang in info['automatic_captions']:
                            subs = info['automatic_captions'][lang]
                            break
                    else:
                        first_lang = list(info['automatic_captions'].keys())[0]
                        subs = info['automatic_captions'][first_lang]
                    
                    text = " ".join([entry.get('text', '') for entry in subs if entry.get('text')])
                    if text.strip():
                        logger.info(f"Successfully extracted auto-generated transcript for {video_id} using yt-dlp: {len(text)} chars")
                        return text
        except Exception as e:
            logger.warning(f"yt-dlp transcript extraction failed for {video_id}: {e}")
            return None

    @staticmethod
    def get_transcript_youtube_api(video_id):
        """Get transcript using youtube_transcript_api (fallback method)"""
        try:
            try:
                transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
                text = " ".join([t['text'] for t in transcript_list])
                logger.info(f"Successfully extracted transcript for {video_id} using youtube_transcript_api: {len(text)} chars")
                return text
            except:
                # Try with auto-generated captions
                logger.warning(f"Manual captions not found, trying auto-generated for {video_id}")
                transcript_list = YouTubeTranscriptApi.get_transcript(
                    video_id, 
                    languages=['en']
                )
                text = " ".join([t['text'] for t in transcript_list])
                logger.info(f"Successfully extracted auto-generated transcript for {video_id} using youtube_transcript_api: {len(text)} chars")
                return text
        except Exception as e:
            logger.warning(f"youtube_transcript_api failed for {video_id}: {e}")
            return None

    @staticmethod
    def get_video_description(video_id):
        """Get video description and metadata as fallback (when captions not available)"""
        try:
            import yt_dlp
            
            ydl_opts = {
                'quiet': True,
                'no_warnings': True,
                'skip_download': True,
            }
            
            url = f"https://www.youtube.com/watch?v={video_id}"
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                
                # Build comprehensive document from metadata
                content_parts = []
                
                # Add title
                if 'title' in info and info['title']:
                    content_parts.append(f"Title: {info['title']}\n")
                
                # Add description
                if 'description' in info and info['description']:
                    content_parts.append(f"Description:\n{info['description']}\n")
                
                # Add channel info
                if 'uploader' in info and info['uploader']:
                    content_parts.append(f"Channel: {info['uploader']}\n")
                
                # Add duration
                if 'duration' in info and info['duration']:
                    mins = info['duration'] // 60
                    secs = info['duration'] % 60
                    content_parts.append(f"Duration: {mins}m {secs}s\n")
                
                # Add tags
                if 'tags' in info and info['tags']:
                    content_parts.append(f"Tags: {', '.join(info['tags'][:10])}\n")
                
                content = " ".join(content_parts).strip()
                
                if content:
                    logger.info(f"Successfully extracted video description for {video_id}: {len(content)} chars")
                    return content
            
            return None
        except Exception as e:
            logger.warning(f"Failed to get video description for {video_id}: {e}")
            return None

    @staticmethod
    def scrape_video_page(video_id):
        """Scrape video page directly using httpx to extract title and description"""
        try:
            import httpx
            import json
            
            url = f"https://www.youtube.com/watch?v={video_id}"
            
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            
            with httpx.Client(timeout=30.0, headers=headers) as client:
                response = client.get(url, follow_redirects=True)
                html = response.text
                
                content_parts = []
                
                # Extract title using regex from og:title meta tag
                title_match = re.search(r'"og:title"\s*content="([^"]*)"', html)
                if title_match:
                    title = title_match.group(1)
                    content_parts.append(f"Title: {title}\n")
                    logger.info(f"Extracted title from page: {title}")
                
                # Extract description using regex from og:description meta tag
                desc_match = re.search(r'"og:description"\s*content="([^"]*)"', html)
                if desc_match:
                    description = desc_match.group(1)
                    content_parts.append(f"Description: {description}\n")
                    logger.info(f"Extracted description from page: {len(description)} chars")
                
                # Try to extract from JSON-LD
                jsonld_match = re.search(r'<script type="application/ld\+json">({.*?"uploadDate".*?})</script>', html, re.DOTALL)
                if jsonld_match:
                    try:
                        jsonld = json.loads(jsonld_match.group(1))
                        if 'description' in jsonld and jsonld['description']:
                            content_parts.append(f"Extended Description: {jsonld['description']}\n")
                    except:
                        pass
                
                content = " ".join(content_parts).strip()
                if content and len(content) > 20:
                    logger.info(f"Successfully scraped video page for {video_id}: {len(content)} chars")
                    return content
            
            return None
        except Exception as e:
            logger.warning(f"Failed to scrape video page for {video_id}: {e}")
            return None

    @staticmethod
    def generate_placeholder_content(video_id):
        """Generate placeholder content when all extraction methods fail"""
        try:
            content = f"""
VIDEO LEARNING RESOURCE
Video ID: {video_id}
URL: https://www.youtube.com/watch?v={video_id}

This video could not be automatically analyzed due to access restrictions or platform limitations.
However, you can use this video resource for learning.

SUGGESTIONS FOR BETTER RESULTS:
1. Make sure the video is publicly accessible
2. Try uploading the video description manually as a PDF
3. Use videos with subtitles/captions enabled
4. Contact the video creator if you need more information

The system will still track your engagement with this video for learning analytics.
""".strip()
            
            logger.info(f"Generated placeholder content for {video_id}: {len(content)} chars")
            return content
        except Exception as e:
            logger.error(f"Failed to generate placeholder content: {e}")
            return None

    @staticmethod
    def get_transcript(video_id):
        """Get transcript for a YouTube video using multiple aggressive fallback methods"""
        # Method 1: Try yt-dlp subtitles first (most reliable)
        logger.info(f"[1/5] Attempting yt-dlp subtitle extraction for {video_id}")
        transcript = YouTubeTranscriptService.get_transcript_yt_dlp(video_id)
        if transcript:
            logger.info(f"✓ Success: yt-dlp subtitles extracted")
            return transcript
        
        # Method 2: Try youtube_transcript_api
        logger.info(f"[2/5] Attempting youtube_transcript_api for {video_id}")
        transcript = YouTubeTranscriptService.get_transcript_youtube_api(video_id)
        if transcript:
            logger.info(f"✓ Success: youtube_transcript_api worked")
            return transcript
        
        # Method 3: Try yt-dlp video metadata/description
        logger.info(f"[3/5] Attempting yt-dlp video metadata extraction for {video_id}")
        description = YouTubeTranscriptService.get_video_description(video_id)
        if description:
            logger.info(f"✓ Success: video metadata extracted")
            return description
        
        # Method 4: Try web scraping the YouTube page directly
        logger.info(f"[4/5] Attempting to scrape YouTube page for {video_id}")
        scraped = YouTubeTranscriptService.scrape_video_page(video_id)
        if scraped:
            logger.info(f"✓ Success: page scraping worked")
            return scraped
        
        # Method 5: Generate placeholder content (last resort - always works)
        logger.info(f"[5/5] Generating placeholder content for {video_id}")
        placeholder = YouTubeTranscriptService.generate_placeholder_content(video_id)
        if placeholder:
            logger.warning(f"⚠ Using placeholder content for {video_id}")
            return placeholder
        
        # This should almost never happen
        logger.error(f"CRITICAL: All methods failed for {video_id}")
        raise ValueError(f"Unable to process this video. Please try another video.")


    @staticmethod
    def get_video_info(video_id):
        """Get basic video info"""
        try:
            return {
                "video_id": video_id,
                "url": f"https://www.youtube.com/watch?v={video_id}",
                "source": "youtube"
            }
        except Exception as e:
            logger.error(f"Error getting video info: {e}")
            return None


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
        """
        Enhanced context retrieval with better coverage
        Uses multiple queries and combines results
        """
        try:
            results = []
            
            # Primary query: exact topic
            embedding = self.embedder.embed(topic)
            vector_str = "[" + ",".join(map(str, embedding)) + "]"
            
            db.execute(
                "SELECT content FROM match_documents(%s::vector,%s)",
                (vector_str, limit),
            )
            
            primary_results = db.fetch()
            for r in primary_results:
                if r[0] not in [item[0] for item in results]:
                    results.append(r)
            
            # Secondary query: related concepts (if not enough results)
            if len(results) < limit:
                # Generate related search terms
                related_terms = self._generate_related_terms(topic)
                for term in related_terms[:2]:
                    embedding = self.embedder.embed(term)
                    vector_str = "[" + ",".join(map(str, embedding)) + "]"
                    
                    db.execute(
                        "SELECT content FROM match_documents(%s::vector,%s)",
                        (vector_str, limit // 2),
                    )
                    
                    secondary_results = db.fetch()
                    for r in secondary_results:
                        if r[0] not in [item[0] for item in results]:
                            results.append(r)
                            if len(results) >= limit:
                                break
                    if len(results) >= limit:
                        break
            
            context = "\n\n---\n\n".join([r[0] for r in results[:limit]])
            logger.info(f"Retrieved {len(results[:limit])} context chunks for '{topic}'")
            return context
            
        except Exception as e:
            logger.warning(f"Error in enhanced context retrieval: {e}")
            # Fallback to simple retrieval
            embedding = self.embedder.embed(topic)
            vector_str = "[" + ",".join(map(str, embedding)) + "]"
            db.execute(
                "SELECT content FROM match_documents(%s::vector,%s)",
                (vector_str, limit),
            )
            results = db.fetch()
            return "\n".join([r[0] for r in results])

    def _generate_related_terms(self, topic):
        """Generate related search terms using LLM"""
        try:
            prompt = f"Generate 3 related keywords or concepts for '{topic}'. Return as comma-separated list."
            response = self.llm.invoke(prompt)
            terms = [t.strip() for t in response.content.split(',')]
            return terms[:3]
        except:
            return []

    def generate_material(self, topic, memory, difficulty="easy"):
        """
        Generate ULTRA COMPREHENSIVE learning material optimized for students with Autism Spectrum Disorder.
        Uses clear language, structured format, and sensory-friendly presentation.
        Generates material that takes 20-30 minutes to read (4500-6000 words).
        This material will be used as the primary context for test questions.
        """
        # Retrieve better context
        context = self.retrieve_context(topic, limit=10)
        if len(context) > 4000:
            context = context[:4000]

        # ULTRA COMPREHENSIVE ASD-Friendly Learning Material Prompt
        prompt = f"""You are creating EXTREMELY DETAILED, COMPREHENSIVE learning material specifically for students with Autism Spectrum Disorder (ASD).

Topic: {topic}
Difficulty Level: {difficulty}

CRITICAL REQUIREMENTS:
1. Generate ULTRA-COMPREHENSIVE material that is 4500-6000 words long - this should take 20-30 minutes to read thoroughly
2. This material MUST be thorough enough to serve as the primary knowledge source for tests
3. Include EXTENSIVE examples, detailed explanations, and comprehensive coverage of the topic
4. Prioritize clarity and absolute completeness of information

CONTENT GUIDELINES for ASD learners:
- Use ONLY clear, concrete language (NO metaphors, idioms, or abstract concepts)
- Break information into small, logical chunks with clear spacing
- Use numbered lists and bullet points instead of paragraphs
- Be explicit about ALL connections between concepts
- Provide clear definitions before using every new term
- Include step-by-step explanations for EVERYTHING
- Use consistent formatting throughout (same font, same colors, same structure)
- Avoid ALL sensory language that might be overwhelming
- Be literal and specific (NOT figurative or poetic)
- Include MANY MULTIPLE DETAILED examples for each concept (at least 3-4 examples per concept)
- Provide extensive practice scenarios with detailed explanations
- Include detailed explanations of WHY things work the way they do
- Explain common misconceptions and why they are wrong
- Add visual organization tips (ASCII art, tables, structured lists)

ULTRA-COMPREHENSIVE STRUCTURE (Target: 4500-6000 words):

## 1. Comprehensive Introduction to {topic}
- Detailed definition with multiple explanations (5-7 sentences)
- Multiple reasons why this topic is important
- Complete overview of what you will learn
- How this topic appears in different real-world contexts
- Common myths and false beliefs about {topic}

## 2. ULTRA-DETAILED Core Concepts (LARGEST Section)
- Explain 8-10 main concepts related to {topic} (not just 5-7)
- For each concept, provide:
  * Detailed definition (3-4 clear sentences)
  * Minimum 4-5 concrete, detailed examples
  * Explicit connections to other concepts
  * Multiple reasons why this concept matters
  * Common misconceptions with explanations of why they're wrong
  * Real-world applications with specific examples
  * Visual representation or ASCII diagram if helpful

## 3. Extremely Detailed Step-by-Step Examples (Multiple Examples)
- Provide 4-5 COMPLETE worked examples (increase from 3-4)
- For each example:
  * Detailed problem statement with full context
  * Detailed step-by-step solution (number EVERY step with full explanations)
  * Complete explanation of WHY each step was taken
  * Alternative methods or approaches
  * Common mistakes that students make with this type of problem
  * The final answer with complete verification
  * How this example relates to the concepts

## 4. Extensive Practice Scenarios
- Provide 5-6 detailed practice situations (increase from 4-5)
- For each situation:
  * Complete scenario description with full context and details
  * Step-by-step approach to solve or handle the situation
  * Detail of what NOT to do and explanations of why
  * Explanation of why common mistakes happen
  * Expected outcomes with complete explanations
  * Additional tips or considerations

## 5. Advanced Visual Organization Guide
- Multiple ways to organize information about {topic}
- Helpful structures and formats for learning (tables, flowcharts, structured lists)
- Mnemonic devices, memory aids, and learning systems
- How to create comprehensive study guides for {topic}
- Organization strategies specifically designed for {topic}
- Sample organized templates you can use

## 6. Comprehensive Common Challenges Guide
- List 5-6 common difficulties students face with {topic}
- For each difficulty:
  * Complete description of what the challenge is
  * Detailed explanation of why students struggle with it
  * Comprehensive step-by-step solution with multiple approaches
  * Prevention strategies and tips
  * Practice problems and exercises to build confidence
  * How to recognize when you're making this mistake

## 7. Advanced Insights and Deep Understanding
- Deeper theoretical understanding of {topic}
- Interesting facts and background information
- How experts and professionals think about {topic}
- Historical context and development of {topic}
- Advanced applications and extensions
- Connections to other fields and subjects
- Future developments and how {topic} is evolving

## 8. Very Detailed Real-World Applications
- 4-5 detailed real-world examples of how {topic} is used
- Complete detail of how professionals use this information
- Step-by-step explanation of application in each example
- Why learning this will help you in different contexts
- Current real-world uses and future applications
- Career fields that extensively use {topic}
- How {topic} impacts daily life

## 9. Interactive Self-Check and Quiz Section
- Comprehensive numbered list of the MOST important information
- Clear, explicit distinction between essential and optional information
- 8-10 detailed self-check questions with comprehensive answers
- Multiple ways to assess your understanding
- Reference material for each question

## 10. Comprehensive Next Steps for Learning
- Detailed, step-by-step practice plan
- Specific exercises and problems to solve
- Where to find more information and resources
- How to apply this knowledge in different contexts
- Recommended next topics to learn after this one
- Tips for retaining this information long-term
- How to test yourself and measure your understanding

DIFFICULTY LEVEL GUIDANCE:
- Easy: Extreme simplicity, basic 3-4 main concepts covered thoroughly, very familiar everyday examples, EXTREMELY detailed step-by-step instructions, short sentences
- Medium: Clear common language, 6-8 related concepts covered comprehensively, varied detailed examples, moderate detail with explicit connections between ideas, longer more complex explanations
- Hard: Precise technical terminology, 9-10 complex concepts with nuance and detail, advanced real-world examples, thorough explanations with complete theoretical background, sophisticated connections

Reference Material (Use this as PRIMARY source, not supplementary):
{context}

CRITICAL INSTRUCTIONS:
1. Generate EXTREMELY comprehensive content - aim for 4500-6000 words minimum
2. Include MANY examples - at least 4-5 per concept, 4-5 complete worked examples, 5-6 detailed practice scenarios
3. Make EVERYTHING concrete, specific, and detailed
4. Provide COMPLETE explanations, not abbreviated ones
5. Use clear headers and consistent formatting
6. Use the PROVIDED CONTEXT as your PRIMARY knowledge source - rely on it heavily
7. Focus on depth and completeness over brevity

Generate the ULTRA-COMPREHENSIVE learning material now. This material will be the primary source of knowledge for test questions, so make it thorough and complete."""

        try:
            response = self.llm.invoke(prompt)
            material = response.content
        except Exception as e:
            logger.error(f"Error generating material: {e}")
            material = f"Error generating material for {topic}. Please try again."

        # Add recommended YouTube videos
        videos = self.youtube_service.search_videos(topic, num_results=3)

        video_section = "\n\n---\n\n## Recommended Learning Videos\n\nWatch these videos to supplement your learning:\n\n"

        if videos:
            for i, v in enumerate(videos, 1):
                video_section += f"### {i}. {v['title']}\n"
                video_section += f"**Channel:** {v['channel']}\n\n"
                video_section += f"**Link:** {v['url']}\n\n"
        else:
            video_section += "No videos found for this topic currently.\n"

        logger.info(f"Generated ultra-comprehensive learning material for '{topic}' at {difficulty} level ({len(material)} chars)")
        return material + video_section


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

    def next_difficulty(self, current, accuracy, test_number, avg_emotion=0.0, avg_text_emotion=0.0):
        """
        Adaptive difficulty adjustment based on:
        - Current difficulty level
        - Test performance (accuracy)
        - Emotional state (image-based)
        - Text analysis emotion (from answers)
        - Test progression (1, 2, or 3)
        
        Logic:
        - Test 1: Always start at 'easy'
        - If distressed (emotion < 0.3 or negative text) → decrease difficulty
        - If confident & doing well → increase difficulty
        - Balance: maintain difficulty if moderate performance
        """
        idx = self.levels.index(current)

        # Test 1 is always easy
        if test_number == 1:
            return "easy"

        # Determine emotional state
        # Image emotion: 0.0 = low engagement, 1.0 = high focused/happy
        # Text emotion: 0.0 = negative, 1.0 = positive
        combined_emotion = (avg_emotion + avg_text_emotion) / 2 if avg_text_emotion > 0 else avg_emotion
        
        logger.info(f"Difficulty adjustment: accuracy={accuracy:.2f}, "
                   f"img_emotion={avg_emotion:.2f}, text_emotion={avg_text_emotion:.2f}, "
                   f"combined={combined_emotion:.2f}")

        # Decision logic (ordered by priority)
        
        # 1. DISTRESSED STATE: Low emotion + low accuracy
        if avg_emotion < 0.3 and accuracy < 0.6:
            logger.info("Student appears distressed - decreasing difficulty")
            idx = max(idx - 1, 0)
        
        # 2. CONFUSED STATE: Low emotion (confusion) even with decent accuracy
        elif avg_emotion < 0.35 and accuracy < 0.7:
            logger.info("Student appears confused - decreasing difficulty")
            idx = max(idx - 1, 0)
        
        # 3. FRUSTRATION: Negative text emotion (from answers) + low score
        elif avg_text_emotion > 0 and avg_text_emotion < 0.3 and accuracy < 0.6:
            logger.info("Student appears frustrated (text analysis) - decreasing difficulty")
            idx = max(idx - 1, 0)
        
        # 4. OPTIMAL PERFORMANCE: High accuracy + good emotion
        elif accuracy > 0.8 and combined_emotion > 0.65:
            logger.info("Optimal performance - increasing difficulty")
            idx = min(idx + 1, 2)
        
        # 5. GOOD PERFORMANCE: Good accuracy + neutral/positive emotion
        elif accuracy > 0.7 and combined_emotion > 0.5:
            logger.info("Good performance - considering difficulty increase")
            if idx < 2:  # Not already at max
                idx = min(idx + 1, 2)
        
        # 6. LOW ACCURACY: Below 50% performance
        elif accuracy < 0.5:
            logger.info("Low accuracy - decreasing difficulty")
            idx = max(idx - 1, 0)
        
        # 7. MODERATE ACCURACY: 50-70% with okay emotion
        elif accuracy >= 0.5 and accuracy <= 0.7:
            if combined_emotion < 0.4:
                logger.info("Moderate accuracy with low engagement - decreasing difficulty")
                idx = max(idx - 1, 0)
            else:
                logger.info("Moderate accuracy with good engagement - maintaining difficulty")
                # Keep same difficulty
                pass
        
        next_level = self.levels[idx]
        logger.info(f"Difficulty change: {current} → {next_level} (test #{test_number})")
        return next_level

    def generate_text_answer_questions(self, topic, difficulty="easy", learning_material=None):
        """Generate 5 open-ended text questions optimized for ASD students - separate LLM call"""
        
        # Build context section with learning material if provided
        context_section = ""
        if learning_material:
            # Truncate to first 3000 chars to keep it reasonable
            material_for_context = learning_material[:3000] if len(learning_material) > 3000 else learning_material
            context_section = f"""
REFERENCE MATERIAL (Use this as your PRIMARY source for creating questions):
{material_for_context}

"""
        
        prompt = f"""Generate exactly 5 open-ended questions about {topic} at {difficulty} level for students with Autism Spectrum Disorder.

{context_section}
Guidelines for ASD-friendly questions:
- Use clear, simple language
- Ask specific questions (not vague ones)
- Avoid open-ended vague prompts - guide students toward specific answers
- Use concrete examples or scenarios when possible
- Be literal and straightforward
- One question per concept
- Questions MUST be answerable based on the provided material

Difficulty: {difficulty}
- Easy: Literal questions, factual recall, simple applications
- Medium: Explanations, simple connections between concepts
- Hard: Analysis, comparisons, complex problem-solving

Do NOT provide expected answers.
Format as JSON with questions array.

Generate the questions now:"""
        
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
            logger.warning(f"Failed to parse text answer questions for {topic}")
            return []

    def generate_mcq_questions(self, topic, difficulty="easy", num_questions=15, learning_material=None):
        """Generate MCQ questions optimized for ASD students - configurable count (default 15)"""
        
        # Build context section with learning material if provided
        context_section = ""
        if learning_material:
            # Truncate to first 3000 chars to keep it reasonable
            material_for_context = learning_material[:3000] if len(learning_material) > 3000 else learning_material
            context_section = f"""
REFERENCE MATERIAL (Use this as your PRIMARY source for creating questions):
{material_for_context}

"""
        
        prompt = f"""Generate exactly {num_questions} multiple choice questions about {topic} at {difficulty} level for students with Autism Spectrum Disorder.

{context_section}
Guidelines for ASD-friendly multiple choice:
- Use clear, straightforward language
- Avoid trick questions or subtle differences
- Make wrong answers obviously wrong (not tricky)
- Each option should be clearly distinct
- Use concrete examples, not abstract concepts
- Be literal and specific

Difficulty: {difficulty}
- Easy: Direct factual questions, obvious correct answers
- Medium: Application questions, clearer distractors
- Hard: Complex understanding, more similar options

Each question must have exactly 4 options.
Format as JSON with questions array.

Generate the questions now:"""
        
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

    def create_test_session(self, topic, difficulty, test_number=1, student_id=None, learning_material=None):

        session_id = str(uuid.uuid4())

        # Try to insert with student_id column first (new schema)
        try:
            db.execute(
                """
                INSERT INTO test_sessions
                (id,student_id,topic,test_number,initial_difficulty,current_difficulty)
                VALUES (%s,%s,%s,%s,%s,%s)
                """,
                (session_id, student_id, topic, test_number, difficulty, difficulty),
            )
            logger.info(f"Test session created with student_id: {student_id}")
        except Exception as e:
            # Fallback: insert without student_id column (old schema)
            logger.warning(f"Insert with student_id failed: {e}. Trying fallback without student_id...")
            try:
                db.execute(
                    """
                    INSERT INTO test_sessions
                    (id,topic,test_number,initial_difficulty,current_difficulty)
                    VALUES (%s,%s,%s,%s,%s)
                    """,
                    (session_id, topic, test_number, difficulty, difficulty),
                )
                logger.info(f"Test session created (without student_id)")
            except Exception as fallback_error:
                logger.error(f"Both insert attempts failed: {fallback_error}")
                raise fallback_error

        logger.info(f"Generating batch 1 questions - topic: {topic}, difficulty: {difficulty}, has_material: {learning_material is not None}")

        # Generate batch 1: 5 text answer + 15 MCQ = 20 questions (separate LLM calls)
        # Pass learning material as context if provided
        text_questions = self.generate_text_answer_questions(topic, difficulty, learning_material)
        mcq_questions = self.generate_mcq_questions(topic, difficulty, num_questions=15, learning_material=learning_material)

        # Store text answer questions (batch 1) - no predefined answers
        for text_q in text_questions[:5]:
            try:
                db.execute(
                    """
                    INSERT INTO test_questions
                    (session_id,topic,difficulty,question,options,correct_answer,explanation,batch_number,question_type)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
                    """,
                    (
                        session_id,
                        topic,
                        difficulty,
                        text_q.get("query") or text_q.get("question"),
                        None,  # No predefined options for text questions
                        None,  # No predefined correct answer for text questions
                        None,  # No predefined explanation
                        1,  # batch_number
                        'text',  # question_type
                    ),
                )
            except Exception as e:
                # Fallback: try without question_type column if it doesn't exist
                logger.warning(f"Insert with question_type failed: {e}. Trying fallback...")
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
                            text_q.get("query") or text_q.get("question"),
                            None,
                            None,
                            None,
                            1,
                        ),
                    )
                except Exception as fallback_error:
                    logger.error(f"Error storing text answer (both attempts failed): {fallback_error}")

        # Store MCQ questions (batch 1) - 15 MCQs
        for q in mcq_questions[:15]:
            try:
                # Extract correct answer index
                correct_answer = 0  # default
                
                # Try multiple formats to find correct answer
                if "correctAnswer" in q:
                    # If it's already a number, use it
                    if isinstance(q.get("correctAnswer"), int):
                        correct_answer = q.get("correctAnswer")
                    else:
                        # If it's text like "Machine Learning", find its index in options
                        answer_text = str(q.get("correctAnswer")).strip()
                        options = q.get("options", [])
                        try:
                            correct_answer = options.index(answer_text)
                        except (ValueError, TypeError):
                            # If not found, default to 0
                            correct_answer = 0
                            logger.warning(f"Could not find '{answer_text}' in options {options}, defaulting to 0")
                
                elif "answer" in q:
                    if isinstance(q.get("answer"), int):
                        correct_answer = q.get("answer")
                    else:
                        answer_text = str(q.get("answer")).strip()
                        options = q.get("options", [])
                        try:
                            correct_answer = options.index(answer_text)
                        except (ValueError, TypeError):
                            correct_answer = 0
                
                db.execute(
                    """
                    INSERT INTO test_questions
                    (session_id,topic,difficulty,question,options,correct_answer,explanation,batch_number,question_type)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
                    """,
                    (
                        session_id,
                        topic,
                        difficulty,
                        q.get("question"),
                        q.get("options", ["A","B","C","D"]),
                        correct_answer,  # Now guaranteed to be an integer
                        q.get("explanation", ""),
                        1,  # batch_number
                        'mcq',  # question_type
                    ),
                )
            except Exception as e:
                # Fallback: try without question_type column if it doesn't exist
                logger.warning(f"Insert with question_type failed: {e}. Trying fallback...")
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
                except Exception as fallback_error:
                    logger.error(f"Error storing MCQ (both attempts failed): {fallback_error}")

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
        """Calculate final score for a test session with multimodal emotion analysis"""
        try:
            # Get test session (try with student_id first, fallback if column doesn't exist)
            student_id = None
            try:
                db.execute(
                    "SELECT student_id, topic, initial_difficulty, test_number FROM test_sessions WHERE id = %s",
                    (test_session_id,),
                )
                session = db.fetch()
                if session:
                    student_id, topic, difficulty, test_number = session[0]
            except:
                # Column doesn't exist, try without it
                logger.warning("student_id column not found, querying without it")
                db.execute(
                    "SELECT topic, initial_difficulty, test_number FROM test_sessions WHERE id = %s",
                    (test_session_id,),
                )
                session = db.fetch()
                if session:
                    topic, difficulty, test_number = session[0]
                else:
                    raise ValueError("Test session not found")
            
            if not session:
                raise ValueError("Test session not found")
            
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
            
            # Get emotion statistics from multimodal analysis
            emotion_service = EmotionService()
            emotion_stats = emotion_service.get_emotion_stats(test_session_id)
            
            # Extract averages
            avg_image_emotion = emotion_stats.get("image", {}).get("average", 0.0)
            avg_text_emotion = emotion_stats.get("text", {}).get("average", 0.0)
            avg_combined_emotion = (avg_image_emotion + avg_text_emotion) / 2 if avg_text_emotion > 0 else avg_image_emotion
            
            logger.info(
                f"Emotion Summary for {test_session_id}: "
                f"image={avg_image_emotion:.2f}, text={avg_text_emotion:.2f}, combined={avg_combined_emotion:.2f}"
            )
            
            # Determine next difficulty for next test (including combined emotion)
            next_difficulty = self.next_difficulty(
                difficulty, 
                accuracy, 
                test_number, 
                avg_emotion=avg_image_emotion,
                avg_text_emotion=avg_text_emotion
            )
            
            # Store results with comprehensive emotion data and student_id
            # Try with student_id column first (new schema)
            try:
                db.execute(
                    """
                    INSERT INTO test_results
                    (session_id, student_id, topic, score, total_questions, difficulty, avg_emotion, avg_text_emotion, test_number)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (test_session_id, student_id, topic, score, total_questions, difficulty, 
                     avg_image_emotion, avg_text_emotion, test_number),
                )
            except Exception as insert_error:
                # Fallback: try without student_id
                logger.warning(f"Insert with student_id failed: {insert_error}. Trying without student_id...")
                try:
                    db.execute(
                        """
                        INSERT INTO test_results
                        (session_id, topic, score, total_questions, difficulty, avg_emotion, avg_text_emotion, test_number)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                        """,
                        (test_session_id, topic, score, total_questions, difficulty, 
                         avg_image_emotion, avg_text_emotion, test_number),
                    )
                except Exception as fallback_error:
                    # Last fallback: try without avg_text_emotion too
                    logger.warning(f"Insert without student_id failed: {fallback_error}. Trying without avg_text_emotion...")
                    try:
                        db.execute(
                            """
                            INSERT INTO test_results
                            (session_id, topic, score, total_questions, difficulty, avg_emotion, test_number)
                            VALUES (%s, %s, %s, %s, %s, %s, %s)
                            """,
                            (test_session_id, topic, score, total_questions, difficulty, 
                             avg_image_emotion, test_number),
                        )
                    except Exception as final_error:
                        logger.error(f"All insert attempts failed: {final_error}")
                        raise final_error
            
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
                "total": total_questions,
                "correct": correct_answers,
                "emotionAnalysis": {
                    "avgImageEmotion": avg_image_emotion,
                    "avgTextEmotion": avg_text_emotion,
                    "avgCombined": avg_combined_emotion,
                    "statistics": emotion_stats
                },
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
        """Get the last test result for a topic to determine next difficulty (case-insensitive)"""
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
                    WHERE LOWER(topic) = LOWER(%s)
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
        Uses multimodal emotion analysis (image + text) for better adaptation.
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
            
            # Get multimodal emotion analysis  
            emotion_service = EmotionService()
            emotion_stats = emotion_service.get_emotion_stats(session_id)
            avg_image_emotion = emotion_stats.get("image", {}).get("average", 0.0)
            avg_text_emotion = emotion_stats.get("text", {}).get("average", 0.0)
            
            logger.info(f"Batch 1 Emotion - Image: {avg_image_emotion:.2f}, Text: {avg_text_emotion:.2f}")
            
            # Determine batch 2 difficulty based on performance + combined emotion
            new_difficulty = self.next_difficulty(
                current_difficulty, 
                accuracy, 
                test_number=2, 
                avg_emotion=avg_image_emotion,
                avg_text_emotion=avg_text_emotion
            )
            logger.info(f"Batch 2 difficulty: {current_difficulty} → {new_difficulty} "
                       f"(accuracy: {accuracy:.2f}, img_emotion: {avg_image_emotion:.2f}, "
                       f"text_emotion: {avg_text_emotion:.2f})")
            
            # Generate batch 2 questions with new difficulty
            logger.info(f"Generating batch 2 questions - topic: {topic}, difficulty: {new_difficulty}")
            text_questions = self.generate_text_answer_questions(topic, new_difficulty)
            mcq_questions = self.generate_mcq_questions(topic, new_difficulty, num_questions=15)
            
            # Store text answer questions (batch 2) - no predefined answers
            for text_q in text_questions[:5]:
                try:
                    db.execute(
                        """
                        INSERT INTO test_questions
                        (session_id,topic,difficulty,question,options,correct_answer,explanation,batch_number,question_type)
                        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
                        """,
                        (
                            session_id,
                            topic,
                            new_difficulty,
                            text_q.get("query") or text_q.get("question"),
                            None,  # No predefined options for text questions
                            None,  # No predefined correct answer for text questions
                            None,  # No predefined explanation
                            2,  # batch_number
                            'text',  # question_type
                        ),
                    )
                except Exception as e:
                    # Fallback: try without question_type column if it doesn't exist
                    logger.warning(f"Insert with question_type failed: {e}. Trying fallback...")
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
                                text_q.get("query") or text_q.get("question"),
                                None,
                                None,
                                None,
                                2,
                            ),
                        )
                    except Exception as fallback_error:
                        logger.error(f"Error storing batch 2 text answer (both attempts failed): {fallback_error}")
            
            # Store MCQ questions (batch 2) - 15 MCQs
            for q in mcq_questions[:15]:
                try:
                    # Extract correct answer index
                    correct_answer = 0  # default
                    
                    # Try multiple formats to find correct answer
                    if "correctAnswer" in q:
                        # If it's already a number, use it
                        if isinstance(q.get("correctAnswer"), int):
                            correct_answer = q.get("correctAnswer")
                        else:
                            # If it's text like "Machine Learning", find its index in options
                            answer_text = str(q.get("correctAnswer")).strip()
                            options = q.get("options", [])
                            try:
                                correct_answer = options.index(answer_text)
                            except (ValueError, TypeError):
                                # If not found, default to 0
                                correct_answer = 0
                                logger.warning(f"Could not find '{answer_text}' in options {options}, defaulting to 0")
                    
                    elif "answer" in q:
                        if isinstance(q.get("answer"), int):
                            correct_answer = q.get("answer")
                        else:
                            answer_text = str(q.get("answer")).strip()
                            options = q.get("options", [])
                            try:
                                correct_answer = options.index(answer_text)
                            except (ValueError, TypeError):
                                correct_answer = 0
                    
                    db.execute(
                        """
                        INSERT INTO test_questions
                        (session_id,topic,difficulty,question,options,correct_answer,explanation,batch_number,question_type)
                        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
                        """,
                        (
                            session_id,
                            topic,
                            new_difficulty,
                            q.get("question"),
                            q.get("options", ["A","B","C","D"]),
                            correct_answer,  # Now guaranteed to be an integer
                            q.get("explanation", ""),
                            2,  # batch_number
                            'mcq',  # question_type
                        ),
                    )
                except Exception as e:
                    # Fallback: try without question_type column if it doesn't exist
                    logger.warning(f"Insert with question_type failed: {e}. Trying fallback...")
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
                    except Exception as fallback_error:
                        logger.error(f"Error storing batch 2 MCQ (both attempts failed): {fallback_error}")
            
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
                    "avgEmotion": avg_image_emotion,
                }
            }
            
        except Exception as e:
            logger.error(f"Error generating next batch: {e}")
            raise

    def evaluate_text_answer(self, topic, question, user_answer):
        """
        Evaluate student's open-ended text answer using LLM.
        Returns: {"is_correct": bool, "feedback": str, "score": float (0-1)}
        """
        try:
            evaluation_prompt = f"""
You are an educator evaluating a student's answer to a question.
Topic: {topic}
Question: {question}
Student's Answer: {user_answer}

Evaluate if the student's answer is correct and appropriate for the question.
Respond with a JSON object: {{"is_correct": true/false, "feedback": "explanation", "score": 0.0-1.0}}
Where:
- is_correct: true if answer demonstrates understanding, false otherwise
- feedback: Brief explanation (2-3 sentences) of why answer is correct/incorrect
- score: Decimal between 0 and 1 indicating answer quality (0=completely wrong, 1=excellent)

Only respond with JSON, no other text.
"""
            response = self.llm.invoke(evaluation_prompt)
            text = response.content.strip()
            
            # Clean up markdown if present
            if text.startswith("```"):
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
            
            # Parse JSON response
            try:
                result = json.loads(text)
                return {
                    "is_correct": result.get("is_correct", False),
                    "feedback": result.get("feedback", "Unable to evaluate"),
                    "score": result.get("score", 0.0)
                }
            except json.JSONDecodeError:
                # Try to extract JSON from response
                match = re.search(r"\{.*\}", text, re.DOTALL)
                if match:
                    result = json.loads(match.group())
                    return {
                        "is_correct": result.get("is_correct", False),
                        "feedback": result.get("feedback", "Unable to evaluate"),
                        "score": result.get("score", 0.0)
                    }
                else:
                    logger.error(f"Failed to parse LLM evaluation response: {text}")
                    return {
                        "is_correct": False,
                        "feedback": "Unable to evaluate answer",
                        "score": 0.0
                    }
        except Exception as e:
            logger.error(f"Error evaluating text answer: {e}")
            return {
                "is_correct": False,
                "feedback": f"Evaluation error: {str(e)}",
                "score": 0.0
            }


# ==============================
# EMOTION SERVICE
# ==============================
class EmotionService:

    def __init__(self):

        try:
            import os
            
            # Try multiple possible locations for the model file
            possible_paths = [
                "image_model.h5",
                "backend/image_model.h5",
                os.path.join(os.path.dirname(__file__), "image_model.h5"),
                "/app/backend/image_model.h5"
            ]
            
            model_path = None
            for path in possible_paths:
                if os.path.exists(path):
                    model_path = path
                    logger.info(f"Found emotion model at: {model_path}")
                    break
            
            if model_path is None:
                logger.warning(f"Emotion model file not found. Tried: {possible_paths}")
                self.model = None
                self.labels = []
                return
            
            # Load model with better error handling
            # Don't use custom_object_scope as it may cause issues
            try:
                self.model = tf.keras.models.load_model(model_path, compile=False)
                self.labels = ["confused", "focused", "bored", "happy"]
                logger.info("Emotion model loaded successfully")
            except Exception as load_error:
                logger.error(f"Failed to load emotion model from {model_path}: {load_error}")
                # Try alternative loading without custom objects
                try:
                    self.model = tf.keras.models.load_model(model_path)
                    self.labels = ["confused", "focused", "bored", "happy"]
                    logger.info("Emotion model loaded successfully (with compile)")
                except Exception as alt_error:
                    logger.error(f"Alternative load also failed: {alt_error}")
                    self.model = None
                    self.labels = []

        except Exception as e:

            logger.warning(f"Emotion model initialization failed: {e}")

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

    def store_emotion(self, test_session_id, emotion, confidence=0.0, emotion_type="image"):
        """Store emotion for test session with type tracking"""
        try:
            db.execute(
                """
                INSERT INTO test_emotions (session_id, emotion, emotion_type, confidence)
                VALUES (%s, %s, %s, %s)
                """,
                (test_session_id, emotion, emotion_type, confidence),
            )
            logger.debug(f"Emotion stored: {test_session_id} - {emotion_type}: {emotion} ({confidence:.2f})")
        except Exception as e:
            logger.warning(f"Error storing emotion: {e}")

    def get_average_emotion(self, test_session_id, emotion_type="image"):
        """Get average emotion confidence for test session"""
        try:
            if emotion_type == "all":
                # Get average of all emotions
                db.execute(
                    """
                    SELECT AVG(confidence) as avg_confidence
                    FROM test_emotions
                    WHERE session_id = %s
                    """,
                    (test_session_id,),
                )
            else:
                # Get specific emotion type average
                db.execute(
                    """
                    SELECT AVG(confidence) as avg_confidence
                    FROM test_emotions
                    WHERE session_id = %s AND emotion_type = %s
                    """,
                    (test_session_id, emotion_type),
                )
            result = db.fetch()
            if result and result[0][0]:
                return float(result[0][0])
            return 0.0
        except Exception as e:
            logger.warning(f"Error getting average emotion: {e}")
            return 0.0

    def get_emotion_stats(self, test_session_id):
        """Get detailed emotion statistics for test session"""
        try:
            db.execute(
                """
                SELECT 
                    emotion_type,
                    AVG(confidence) as avg_confidence,
                    COUNT(*) as sample_count,
                    MAX(confidence) as max_confidence,
                    MIN(confidence) as min_confidence
                FROM test_emotions
                WHERE session_id = %s
                GROUP BY emotion_type
                """,
                (test_session_id,),
            )
            results = db.fetch()
            stats = {}
            for row in results:
                emotion_type, avg_conf, count, max_conf, min_conf = row
                stats[emotion_type] = {
                    "average": float(avg_conf) if avg_conf else 0.0,
                    "samples": count,
                    "max": float(max_conf) if max_conf else 0.0,
                    "min": float(min_conf) if min_conf else 0.0
                }
            return stats
        except Exception as e:
            logger.warning(f"Error getting emotion stats: {e}")
            return {}

    def analyze_answer_emotion(self, answer_text):
        """Analyze emotion from student's text answer using TextEmotionService"""
        try:
            text_service = TextEmotionService()
            result = text_service.analyze_text(answer_text)
            return result
        except Exception as e:
            logger.warning(f"Error analyzing answer emotion: {e}")
            return {
                "emotion": "neutral",
                "confidence": 0.0,
                "score": 0.5
            }

    def extract_emotion_from_text(self, text):
        """
        Extract emotion from textual answer using sentiment analysis
        Uses TextEmotionService for analysis
        """
        return self.analyze_answer_emotion(text)
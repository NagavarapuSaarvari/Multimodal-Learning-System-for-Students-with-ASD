"""
Database initialization and schema setup for Multimodal Learning System
Clean, properly designed schema with all relationships
"""

import logging
from database import db

logger = logging.getLogger(__name__)


class DatabaseSetup:

    def create_extensions(self):
        """Create required PostgreSQL extensions"""
        try:
            db.execute("CREATE EXTENSION IF NOT EXISTS vector;")
            logger.info("✓ Vector extension ready")
        except Exception as e:
            logger.warning(f"Vector extension: {e}")

    def create_tables(self):
        """Create all database tables with proper relationships"""

        # ========================
        # CORE USER TABLES
        # ========================

        db.execute("""
        CREATE TABLE IF NOT EXISTS admins (
            id UUID PRIMARY KEY,
            google_id TEXT UNIQUE,
            email TEXT UNIQUE,
            name TEXT,
            picture TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        );
        """)

        db.execute("""
        CREATE TABLE IF NOT EXISTS students (
            id UUID PRIMARY KEY,
            admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            date_of_birth DATE,
            age INT,
            created_at TIMESTAMP DEFAULT NOW()
        );
        """)

        # ========================
        # LEARNING MATERIALS
        # ========================

        db.execute("""
        CREATE TABLE IF NOT EXISTS documents (
            id UUID PRIMARY KEY,
            admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
            filename TEXT NOT NULL,
            file_type TEXT DEFAULT 'pdf',
            source_url TEXT,
            uploaded_at TIMESTAMP DEFAULT NOW()
        );
        """)

        db.execute("""
        CREATE TABLE IF NOT EXISTS document_chunks (
            id UUID PRIMARY KEY,
            document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
            content TEXT NOT NULL,
            embedding VECTOR(384)
        );
        """)

        db.execute("""
        CREATE TABLE IF NOT EXISTS youtube_sources (
            id SERIAL PRIMARY KEY,
            document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
            video_id TEXT UNIQUE,
            url TEXT NOT NULL,
            title TEXT,
            transcript_chunks INT DEFAULT 0,
            added_at TIMESTAMP DEFAULT NOW()
        );
        """)

        # ========================
        # TEST MANAGEMENT
        # ========================

        db.execute("""
        CREATE TABLE IF NOT EXISTS test_sessions (
            id UUID PRIMARY KEY,
            student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
            topic TEXT NOT NULL,
            test_number INT DEFAULT 1,
            initial_difficulty TEXT DEFAULT 'easy',
            status TEXT DEFAULT 'in_progress',
            created_at TIMESTAMP DEFAULT NOW(),
            completed_at TIMESTAMP,
            CONSTRAINT unique_student_topic_test UNIQUE(student_id, topic, test_number)
        );
        """)

        db.execute("""
        CREATE TABLE IF NOT EXISTS test_questions (
            id SERIAL PRIMARY KEY,
            session_id UUID NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
            question_number INT NOT NULL,
            question_type TEXT NOT NULL CHECK (question_type IN ('text', 'mcq')),
            question TEXT NOT NULL,
            options TEXT[],
            correct_answer INT,
            explanation TEXT,
            difficulty TEXT DEFAULT 'easy',
            created_at TIMESTAMP DEFAULT NOW()
        );
        """)

        db.execute("""
        CREATE TABLE IF NOT EXISTS user_test_answers (
            id SERIAL PRIMARY KEY,
            session_id UUID NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
            question_number INT NOT NULL,
            answer_type TEXT NOT NULL CHECK (answer_type IN ('text', 'mcq')),
            user_answer TEXT,
            answer_index INT,
            is_correct BOOLEAN DEFAULT FALSE,
            score FLOAT DEFAULT 0.0,
            feedback TEXT,
            submitted_at TIMESTAMP DEFAULT NOW()
        );
        """)

        # ========================
        # TEST RESULTS & SCORING
        # ========================

        db.execute("""
        CREATE TABLE IF NOT EXISTS test_results (
            id SERIAL PRIMARY KEY,
            session_id UUID NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
            student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
            topic TEXT NOT NULL,
            test_number INT DEFAULT 1,
            score INT NOT NULL,
            total_questions INT NOT NULL,
            correct_answers INT NOT NULL,
            difficulty TEXT NOT NULL,
            avg_emotion FLOAT DEFAULT 0.0,
            avg_text_emotion FLOAT DEFAULT 0.0,
            started_at TIMESTAMP NOT NULL,
            completed_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT NOW()
        );
        """)

        # ========================
        # EMOTION TRACKING
        # ========================

        db.execute("""
        CREATE TABLE IF NOT EXISTS test_emotions (
            id SERIAL PRIMARY KEY,
            session_id UUID NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
            emotion TEXT NOT NULL,
            emotion_type TEXT NOT NULL CHECK (emotion_type IN ('image', 'text')),
            confidence FLOAT DEFAULT 0.0,
            question_number INT,
            captured_at TIMESTAMP DEFAULT NOW()
        );
        """)

        # ========================
        # LEARNING MEMORY & PROGRESS
        # ========================

        db.execute("""
        CREATE TABLE IF NOT EXISTS learning_memory (
            id SERIAL PRIMARY KEY,
            student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
            topic TEXT NOT NULL,
            last_score INT,
            last_difficulty TEXT,
            test_count INT DEFAULT 0,
            avg_score FLOAT,
            last_tested_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW(),
            CONSTRAINT unique_student_topic UNIQUE(student_id, topic)
        );
        """)

        logger.info("✓ All tables created successfully")


    def create_similarity_function(self):
        """Create vector similarity search function"""
        try:
            db.execute("""
            CREATE OR REPLACE FUNCTION match_documents(
                query_embedding VECTOR(384),
                match_count INT
            )
            RETURNS TABLE(
                content TEXT,
                similarity FLOAT
            )
            LANGUAGE SQL
            AS $$
                SELECT
                    content,
                    1 - (embedding <=> query_embedding) AS similarity
                FROM document_chunks
                ORDER BY embedding <=> query_embedding
                LIMIT match_count;
            $$;
            """)
            logger.info("✓ Similarity function created")
        except Exception as e:
            logger.warning(f"Similarity function: {e}")

    def migrate_add_missing_columns(self):
        """Add missing columns for backward compatibility"""
        migrations = [
            ("test_sessions", "student_id", "ALTER TABLE test_sessions ADD COLUMN student_id UUID REFERENCES students(id) ON DELETE CASCADE"),
            ("test_results", "avg_emotion", "ALTER TABLE test_results ADD COLUMN avg_emotion FLOAT DEFAULT 0.0"),
            ("test_results", "avg_text_emotion", "ALTER TABLE test_results ADD COLUMN avg_text_emotion FLOAT DEFAULT 0.0"),
            ("test_results", "student_id", "ALTER TABLE test_results ADD COLUMN student_id UUID REFERENCES students(id) ON DELETE CASCADE"),
        ]

        for table, column, migration_sql in migrations:
            try:
                db.execute(f"SELECT 1 FROM information_schema.columns WHERE table_name='{table}' AND column_name='{column}'")
                if not db.fetch():
                    db.execute(migration_sql)
                    logger.info(f"✓ Added {column} to {table}")
            except Exception as e:
                logger.debug(f"Migration {table}.{column}: {e}")

    def create_indexes(self):
        """Create indexes for query performance"""
        indexes = [
            "CREATE INDEX IF NOT EXISTS idx_students_admin ON students(admin_id)",
            "CREATE INDEX IF NOT EXISTS idx_documents_admin ON documents(admin_id)",
            "CREATE INDEX IF NOT EXISTS idx_chunks_doc ON document_chunks(document_id)",
            "CREATE INDEX IF NOT EXISTS idx_sessions_student ON test_sessions(student_id, topic)",
            "CREATE INDEX IF NOT EXISTS idx_results_student ON test_results(student_id, topic)",
            "CREATE INDEX IF NOT EXISTS idx_emotions_session ON test_emotions(session_id)",
            "CREATE INDEX IF NOT EXISTS idx_answers_session ON user_test_answers(session_id)",
            "CREATE INDEX IF NOT EXISTS idx_memory_student ON learning_memory(student_id, topic)",
        ]

        for idx_sql in indexes:
            try:
                db.execute(idx_sql)
            except Exception as e:
                logger.debug(f"Index creation: {e}")

        logger.info("✓ Indexes created")

    def setup_all(self):
        """Run complete database setup"""
        try:
            logger.info("🔧 Starting database setup...")
            self.create_extensions()
            self.create_tables()
            self.create_similarity_function()
            self.migrate_add_missing_columns()
            self.create_indexes()
            logger.info("✅ Database setup completed successfully!")
            return True
        except Exception as e:
            logger.error(f"❌ Database setup failed: {e}")
            raise


if __name__ == "__main__":
    setup = DatabaseSetup()
    setup.setup_all()
    print("✅ Database initialization complete")
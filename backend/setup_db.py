from database import db


class DatabaseSetup:

    def create_extensions(self):

        db.execute(
            "CREATE EXTENSION IF NOT EXISTS vector;"
        )

    def create_tables(self):

        db.execute("""
        CREATE TABLE IF NOT EXISTS documents(
            id UUID PRIMARY KEY,
            filename TEXT,
            file_type TEXT DEFAULT 'pdf',
            source_url TEXT,
            uploaded_at TIMESTAMP DEFAULT NOW()
        );
        """)

        db.execute("""
        CREATE TABLE IF NOT EXISTS document_chunks(
            id UUID PRIMARY KEY,
            document_id UUID REFERENCES documents(id),
            content TEXT,
            embedding VECTOR(384)
        );
        """)

        db.execute("""
        CREATE TABLE IF NOT EXISTS learning_memory(
            id SERIAL PRIMARY KEY,
            topic TEXT,
            score INT,
            difficulty TEXT DEFAULT 'easy',
            created_at TIMESTAMP DEFAULT NOW()
        );
        """)

        db.execute("""
        CREATE TABLE IF NOT EXISTS test_sessions(
            id UUID PRIMARY KEY,
            topic TEXT,
            test_number INT DEFAULT 1,
            initial_difficulty TEXT DEFAULT 'easy',
            current_difficulty TEXT DEFAULT 'easy',
            status TEXT DEFAULT 'in_progress',
            created_at TIMESTAMP DEFAULT NOW(),
            completed_at TIMESTAMP
        );
        """)

        db.execute("""
        CREATE TABLE IF NOT EXISTS test_results(
            id SERIAL PRIMARY KEY,
            session_id UUID REFERENCES test_sessions(id),
            topic TEXT,
            score INT,
            total_questions INT,
            difficulty TEXT,
            avg_emotion FLOAT DEFAULT 0.0,
            avg_text_emotion FLOAT DEFAULT 0.0,
            test_number INT DEFAULT 1,
            created_at TIMESTAMP DEFAULT NOW()
        );
        """)

        db.execute("""
        CREATE TABLE IF NOT EXISTS test_questions(
            id SERIAL PRIMARY KEY,
            session_id UUID REFERENCES test_sessions(id),
            topic TEXT,
            difficulty TEXT,
            question TEXT,
            options TEXT[],
            correct_answer INT,
            explanation TEXT,
            batch_number INT DEFAULT 1,
            created_at TIMESTAMP DEFAULT NOW()
        );
        """)

        db.execute("""
        CREATE TABLE IF NOT EXISTS user_test_answers(
            id SERIAL PRIMARY KEY,
            test_session_id UUID REFERENCES test_sessions(id),
            question_id INT REFERENCES test_questions(id),
            user_answer INT,
            answer_text TEXT,
            is_correct BOOLEAN,
            created_at TIMESTAMP DEFAULT NOW()
        );
        """)

        db.execute("""
        CREATE TABLE IF NOT EXISTS test_emotions(
            id SERIAL PRIMARY KEY,
            session_id UUID REFERENCES test_sessions(id),
            emotion TEXT,
            emotion_type TEXT DEFAULT 'image',
            confidence FLOAT,
            captured_at TIMESTAMP DEFAULT NOW()
        );
        """)

        # Add YouTube sources table for tracking
        db.execute("""
        CREATE TABLE IF NOT EXISTS youtube_sources(
            id SERIAL PRIMARY KEY,
            document_id UUID REFERENCES documents(id),
            video_id TEXT,
            url TEXT,
            title TEXT,
            transcript_chunks INT DEFAULT 0,
            added_at TIMESTAMP DEFAULT NOW()
        );
        """)

    def create_similarity_function(self):

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

    def migrate_add_missing_columns(self):
        """Safely add missing columns to existing tables"""
        # Add avg_text_emotion to test_results if missing
        try:
            db.execute("""
            ALTER TABLE test_results
            ADD COLUMN avg_text_emotion FLOAT DEFAULT 0.0;
            """)
            print("✓ Added avg_text_emotion column to test_results")
        except Exception as e:
            print(f"avg_text_emotion column already exists or error: {e}")

        # Add emotion_type to test_emotions if missing
        try:
            db.execute("""
            ALTER TABLE test_emotions
            ADD COLUMN emotion_type TEXT DEFAULT 'image';
            """)
            print("✓ Added emotion_type column to test_emotions")
        except Exception as e:
            print(f"emotion_type column already exists or error: {e}")

        # Add answer_text to user_test_answers if missing
        try:
            db.execute("""
            ALTER TABLE user_test_answers
            ADD COLUMN answer_text TEXT;
            """)
            print("✓ Added answer_text column to user_test_answers")
        except Exception as e:
            print(f"answer_text column already exists or error: {e}")

        # Add source_url to documents if missing
        try:
            db.execute("""
            ALTER TABLE documents
            ADD COLUMN source_url TEXT;
            """)
            print("✓ Added source_url column to documents")
        except Exception as e:
            print(f"source_url column already exists or error: {e}")

        # Add question_type to test_questions if missing
        try:
            db.execute("""
            ALTER TABLE test_questions
            ADD COLUMN question_type TEXT DEFAULT 'mcq';
            """)
            print("✓ Added question_type column to test_questions")
        except Exception as e:
            print(f"question_type column already exists or error: {e}")

        # Add evaluation_result to user_test_answers if missing
        try:
            db.execute("""
            ALTER TABLE user_test_answers
            ADD COLUMN evaluation_result TEXT;
            """)
            print("✓ Added evaluation_result column to user_test_answers")
        except Exception as e:
            print(f"evaluation_result column already exists or error: {e}")


if __name__ == "__main__":

    setup = DatabaseSetup()

    setup.create_extensions()
    setup.create_tables()
    setup.create_similarity_function()
    setup.migrate_add_missing_columns()

    print("Database setup completed.")
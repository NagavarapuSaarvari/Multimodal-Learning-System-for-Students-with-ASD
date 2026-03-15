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
        CREATE TABLE IF NOT EXISTS test_results(
            id SERIAL PRIMARY KEY,
            topic TEXT,
            score INT,
            total_questions INT,
            difficulty TEXT,
            avg_emotion TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        );
        """)

        db.execute("""
        CREATE TABLE IF NOT EXISTS test_questions(
            id SERIAL PRIMARY KEY,
            session_id UUID,
            topic TEXT,
            difficulty TEXT,
            question TEXT,
            options TEXT[],
            correct_answer INT,
            explanation TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        );
        """)

        db.execute("""
        CREATE TABLE IF NOT EXISTS user_test_answers(
            id SERIAL PRIMARY KEY,
            test_session_id UUID,
            question_id INT REFERENCES test_questions(id),
            user_answer INT,
            is_correct BOOLEAN,
            created_at TIMESTAMP DEFAULT NOW()
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


if __name__ == "__main__":

    setup = DatabaseSetup()

    setup.create_extensions()
    setup.create_tables()
    setup.create_similarity_function()

    print("Database setup completed.")
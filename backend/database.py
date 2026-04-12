import os
import psycopg2
from dotenv import load_dotenv
from pgvector.psycopg2 import register_vector

load_dotenv()


class Database:

    def __init__(self):

        self.connection = psycopg2.connect(
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            host=os.getenv("DB_HOST"),
            port=os.getenv("DB_PORT"),
            dbname=os.getenv("DB_NAME"),
            sslmode="require"
        )

        register_vector(self.connection)

        self.cursor = self.connection.cursor()

        print("Database connected successfully")

    def execute(self, query, values=None):

        try:
            self.cursor.execute(query, values)
            self.connection.commit()
        except Exception as e:
            self.connection.rollback()
            raise e

    def fetch(self):

        return self.cursor.fetchall()


db = Database()
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
            sslmode="require",
            connect_timeout=10
        )

        register_vector(self.connection)

        self.cursor = self.connection.cursor()

        print("Database connected successfully")

    def is_connected(self):
        """Check if connection is still active"""
        try:
            self.cursor.execute("SELECT 1")
            return True
        except:
            return False

    def reconnect(self):
        """Reconnect to database if connection is lost"""
        try:
            if self.connection:
                self.connection.close()
        except:
            pass
        
        self.connection = psycopg2.connect(
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            host=os.getenv("DB_HOST"),
            port=os.getenv("DB_PORT"),
            dbname=os.getenv("DB_NAME"),
            sslmode="require",
            connect_timeout=10
        )
        register_vector(self.connection)
        self.cursor = self.connection.cursor()
        print("Database reconnected successfully")

    def execute(self, query, values=None):

        try:
            # Check if connection is still alive
            if not self.is_connected():
                self.reconnect()
            
            self.cursor.execute(query, values)
            self.connection.commit()
        except Exception as e:
            try:
                if self.connection:
                    self.connection.rollback()
            except:
                # Connection already closed, reconnect
                self.reconnect()
            raise e

    def fetch(self):

        return self.cursor.fetchall()


db = Database()
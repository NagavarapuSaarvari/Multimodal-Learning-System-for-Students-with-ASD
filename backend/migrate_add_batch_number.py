"""
Migration script to add batch_number column to test_questions table.
Run this if you have an existing database without the batch_number column.
"""

from database import db
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def migrate_add_batch_number():
    """Add batch_number column to test_questions table if it doesn't exist"""
    try:
        # Check if column already exists
        db.execute(
            """
            SELECT column_name FROM information_schema.columns 
            WHERE table_name='test_questions' AND column_name='batch_number'
            """
        )
        result = db.fetch()
        
        if result:
            logger.info("batch_number column already exists")
            return True
        
        # Add the column
        logger.info("Adding batch_number column to test_questions table...")
        db.execute(
            """
            ALTER TABLE test_questions
            ADD COLUMN batch_number INT DEFAULT 1
            """
        )
        logger.info("✓ batch_number column added successfully")
        return True
        
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        return False


if __name__ == "__main__":
    logger.info("Starting migration...")
    success = migrate_add_batch_number()
    if success:
        logger.info("✓ Migration completed successfully")
    else:
        logger.error("✗ Migration failed")

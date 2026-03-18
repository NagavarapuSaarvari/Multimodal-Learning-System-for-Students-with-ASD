"""
Debug script to test emotion detection system
Run this to verify the model loads and emotion detection works
"""

import logging
import sys
import os

logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

try:
    import tensorflow as tf
    logger.info("✓ TensorFlow imported successfully")
except Exception as e:
    logger.error(f"✗ TensorFlow import failed: {e}")
    sys.exit(1)

try:
    import cv2
    logger.info("✓ OpenCV (cv2) imported successfully")
except Exception as e:
    logger.error(f"✗ OpenCV import failed: {e}")

try:
    import numpy as np
    logger.info("✓ NumPy imported successfully")
except Exception as e:
    logger.error(f"✗ NumPy import failed: {e}")

# Check if model file exists
model_path = "image_model.h5"
if os.path.exists(model_path):
    logger.info(f"✓ Model file found: {model_path}")
    file_size = os.path.getsize(model_path)
    logger.info(f"  File size: {file_size / (1024*1024):.2f} MB")
else:
    logger.error(f"✗ Model file not found: {model_path}")
    sys.exit(1)

# Try to load the model
try:
    logger.info("Attempting to load TensorFlow model...")
    model = tf.keras.models.load_model("image_model.h5")
    logger.info("✓ Model loaded successfully")
    logger.info(f"  Model input shape: {model.input_shape}")
    logger.info(f"  Model output shape: {model.output_shape}")
    
    # Try a dummy prediction
    logger.info("Testing dummy prediction...")
    dummy_input = np.zeros((1, 96, 96, 3))
    prediction = model.predict(dummy_input, verbose=0)
    logger.info(f"✓ Dummy prediction successful")
    logger.info(f"  Prediction shape: {prediction.shape}")
    logger.info(f"  Prediction values: {prediction[0]}")
    
except Exception as e:
    logger.error(f"✗ Model loading/prediction failed: {e}")
    import traceback
    logger.error(traceback.format_exc())
    sys.exit(1)

# Now test the EmotionService
try:
    from services import EmotionService
    logger.info("Importing EmotionService...")
    
    emotion_service = EmotionService()
    logger.info("✓ EmotionService instantiated")
    
    if emotion_service.model is None:
        logger.warning("⚠ EmotionService.model is None - model failed to load")
    else:
        logger.info("✓ Model loaded in EmotionService")
        logger.info(f"  Emotion labels: {emotion_service.labels}")
        
except Exception as e:
    logger.error(f"✗ EmotionService initialization failed: {e}")
    import traceback
    logger.error(traceback.format_exc())
    sys.exit(1)

logger.info("\n✓✓✓ All emotion detection tests passed!")
logger.info("\nNext steps:")
logger.info("1. Verify EmotionCapture is sending requests to /test/emotion/detect")
logger.info("2. Check browser console for any network errors")
logger.info("3. Test webcam permission is granted")
logger.info("4. Run test and check PostgreSQL test_emotions table: SELECT * FROM test_emotions;")

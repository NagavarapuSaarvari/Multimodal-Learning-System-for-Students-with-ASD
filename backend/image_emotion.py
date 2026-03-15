import os
import numpy as np
import tensorflow as tf
from tensorflow.keras.preprocessing import image_dataset_from_directory
from tensorflow.keras import layers, models
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
from sklearn.utils.class_weight import compute_class_weight
from sklearn.metrics import classification_report, confusion_matrix
import matplotlib.pyplot as plt
import itertools


DATA_DIR = "Autism Facial Recognition Dataset"
TRAIN_DIR = os.path.join(DATA_DIR, "train")
TEST_DIR = os.path.join(DATA_DIR, "test")

IMG_SIZE = (96, 96)
BATCH_SIZE = 32
EPOCHS = 70


def load_datasets():
    train_ds = image_dataset_from_directory(
        TRAIN_DIR,
        labels='inferred',
        label_mode='int',
        image_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        validation_split=0.2,
        subset='training',
        seed=123
    )

    val_ds = image_dataset_from_directory(
        TRAIN_DIR,
        labels='inferred',
        label_mode='int',
        image_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        validation_split=0.2,
        subset='validation',
        seed=123
    )

    test_ds = image_dataset_from_directory(
        TEST_DIR,
        labels='inferred',
        label_mode='int',
        image_size=IMG_SIZE,
        batch_size=BATCH_SIZE
    )

    return train_ds, val_ds, test_ds


def compute_class_weights(train_ds):

    labels_list = []

    for _, y in train_ds.unbatch():
        labels_list.append(int(y))

    class_weights = compute_class_weight(
        class_weight='balanced',
        classes=np.unique(labels_list),
        y=labels_list
    )

    class_weights = dict(enumerate(class_weights))

    return class_weights


def build_model(num_classes):

    base_model = tf.keras.applications.MobileNetV2(
        input_shape=(IMG_SIZE[0], IMG_SIZE[1], 3),
        include_top=False,
        weights='imagenet'
    )

    base_model.trainable = False

    inputs = layers.Input(shape=(IMG_SIZE[0], IMG_SIZE[1], 3))

    x = preprocess_input(inputs)

    x = base_model(x, training=False)

    x = layers.Conv2D(128, (3, 3), activation='relu', padding="same")(x)
    x = layers.BatchNormalization()(x)

    x = layers.Conv2D(256, (3, 3), activation='relu', padding="same")(x)
    x = layers.BatchNormalization()(x)

    x = layers.GlobalAveragePooling2D()(x)

    x = layers.Dense(256, activation='relu')(x)
    x = layers.Dropout(0.5)(x)

    x = layers.Dense(128, activation='relu')(x)
    x = layers.Dropout(0.3)(x)

    outputs = layers.Dense(num_classes, activation='softmax')(x)

    model = models.Model(inputs, outputs)

    model.compile(
        optimizer='adam',
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy']
    )

    return model


def evaluate_model(model, test_ds, class_names):

    y_true = []
    y_pred = []

    for images, labels in test_ds:

        preds = model.predict(images)

        y_true.extend(labels.numpy())
        y_pred.extend(np.argmax(preds, axis=1))

    print("\nClassification Report:\n")
    print(classification_report(y_true, y_pred, target_names=class_names))

    cm = confusion_matrix(y_true, y_pred)

    plot_confusion_matrix(cm, class_names)


def plot_confusion_matrix(cm, class_names):

    plt.figure(figsize=(8, 8))

    plt.imshow(cm, interpolation='nearest', cmap=plt.cm.Blues)

    plt.title("Confusion Matrix")
    plt.colorbar()

    tick_marks = np.arange(len(class_names))

    plt.xticks(tick_marks, class_names, rotation=45)
    plt.yticks(tick_marks, class_names)

    thresh = cm.max() / 2.

    for i, j in itertools.product(range(cm.shape[0]), range(cm.shape[1])):

        plt.text(
            j,
            i,
            cm[i, j],
            horizontalalignment="center",
            color="white" if cm[i, j] > thresh else "black"
        )

    plt.ylabel('True label')
    plt.xlabel('Predicted label')

    plt.tight_layout()

    plt.show()


def main():

    train_ds, val_ds, test_ds = load_datasets()

    class_names = train_ds.class_names
    num_classes = len(class_names)

    print("Detected classes:", class_names)

    class_weights = compute_class_weights(train_ds)

    print("Class weights:", class_weights)

    model = build_model(num_classes)

    model.summary()

    history = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=EPOCHS,
        class_weight=class_weights
    )

    evaluate_model(model, test_ds, class_names)

    model.save("image_model.h5")

    print("\nModel saved as image_model.h5")


main()
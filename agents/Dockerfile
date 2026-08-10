FROM nvidia/cuda:12.3.1-runtime-ubuntu22.04

# System dependencies
RUN apt-get update && apt-get install -y \
    python3.11 \
    python3.11-dev \
    python3-pip \
    python3.11-venv \
    # FFmpeg for video processing
    ffmpeg \
    # Tesseract OCR
    tesseract-ocr \
    tesseract-ocr-eng \
    tesseract-ocr-spa \
    tesseract-ocr-fra \
    # ExifTool
    libimage-exiftool-perl \
    # Audio libraries
    libsndfile1 \
    # System utilities
    curl \
    git \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Set python3.11 as default
RUN update-alternatives --install /usr/bin/python python /usr/bin/python3.11 1 && \
    update-alternatives --install /usr/bin/pip pip /usr/bin/pip3 1

WORKDIR /agents

COPY pyproject.toml ./
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -e ".[dev]"

# Download spaCy model
RUN python -m spacy download en_core_web_lg

# Download NLTK data
RUN python -c "import nltk; nltk.download('punkt'); nltk.download('stopwords'); nltk.download('averaged_perceptron_tagger')"

COPY . .

CMD ["celery", "-A", "celery_app", "worker", "--loglevel=info", "-Q", "analysis", "--concurrency=2"]

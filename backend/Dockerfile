FROM python:3.11-slim-bookworm

# System dependencies
RUN apt-get update && apt-get install -y \
    # ExifTool
    libimage-exiftool-perl \
    # Tesseract OCR
    tesseract-ocr \
    tesseract-ocr-eng \
    tesseract-ocr-spa \
    tesseract-ocr-fra \
    # FFmpeg
    ffmpeg \
    # Image libraries
    libmagic1 \
    libpq-dev \
    # Build tools
    gcc \
    g++ \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY pyproject.toml ./
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -e ".[dev]"

# Install spaCy model
RUN python -m spacy download en_core_web_lg

COPY . .

# Create upload temp directory
RUN mkdir -p /tmp/uploads /data/known_hashes

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

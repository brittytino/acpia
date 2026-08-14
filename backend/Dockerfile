FROM python:3.11-slim-bookworm

# System dependencies
RUN apt-get update && apt-get install -y \
    # ExifTool
    libimage-exiftool-perl \
    # Tesseract OCR
    tesseract-ocr \
    tesseract-ocr-eng \
    # FFmpeg
    ffmpeg \
    # Image libraries
    libmagic1 \
    libpq-dev \
    # Build tools
    gcc \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY pyproject.toml ./
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir .

# Copy application code
COPY . .

# Create required directories
RUN mkdir -p /tmp/uploads /data/known_hashes ./storage

EXPOSE 47802

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "47802"]

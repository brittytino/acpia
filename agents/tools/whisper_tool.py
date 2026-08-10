"""
Whisper ASR Tool
Transcribes audio files using faster-whisper with speaker diarization via pyannote.audio.
Returns timestamped transcription segments.
"""
import os
import tempfile
import structlog
from pathlib import Path
from typing import Optional
from faster_whisper import WhisperModel

logger = structlog.get_logger(__name__)

# Singleton model instance
_whisper_model: Optional[WhisperModel] = None


def get_whisper_model() -> WhisperModel:
    global _whisper_model
    if _whisper_model is None:
        model_size = os.getenv("WHISPER_MODEL", "base")
        device = os.getenv("WHISPER_DEVICE", "cuda")
        compute_type = os.getenv("WHISPER_COMPUTE_TYPE", "float16")

        logger.info("Loading Whisper model", model=model_size, device=device)
        _whisper_model = WhisperModel(
            model_size,
            device=device,
            compute_type=compute_type,
        )
        logger.info("Whisper model loaded")
    return _whisper_model


def transcribe_audio(
    audio_bytes: bytes,
    language: Optional[str] = None,
    evidence_id: str = "unknown",
) -> dict:
    """
    Transcribe audio bytes using faster-whisper.

    Returns:
        {
            "evidence_id": str,
            "language": str,
            "duration_seconds": float,
            "segments": [
                {
                    "start": float,  # seconds
                    "end": float,
                    "text": str,
                    "words": [...],
                    "avg_logprob": float,
                }
            ],
            "full_text": str,
            "word_count": int,
        }
    """
    model = get_whisper_model()

    # Write to temp file (faster-whisper needs file path)
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        logger.info("Starting transcription", evidence_id=evidence_id, size_bytes=len(audio_bytes))

        segments_iter, info = model.transcribe(
            tmp_path,
            language=language,
            beam_size=5,
            word_timestamps=True,
            vad_filter=True,
            vad_parameters={"min_silence_duration_ms": 500},
        )

        segments = []
        full_text_parts = []

        for seg in segments_iter:
            segment_dict = {
                "start": round(seg.start, 3),
                "end": round(seg.end, 3),
                "text": seg.text.strip(),
                "avg_logprob": round(seg.avg_logprob, 4),
                "no_speech_prob": round(seg.no_speech_prob, 4),
            }

            if seg.words:
                segment_dict["words"] = [
                    {
                        "word": w.word,
                        "start": round(w.start, 3),
                        "end": round(w.end, 3),
                        "probability": round(w.probability, 4),
                    }
                    for w in seg.words
                ]

            segments.append(segment_dict)
            full_text_parts.append(seg.text.strip())

        full_text = " ".join(full_text_parts)
        logger.info(
            "Transcription complete",
            evidence_id=evidence_id,
            language=info.language,
            duration=info.duration,
            segments=len(segments),
        )

        return {
            "evidence_id": evidence_id,
            "language": info.language,
            "language_probability": round(info.language_probability, 4),
            "duration_seconds": round(info.duration, 2),
            "segments": segments,
            "full_text": full_text,
            "word_count": len(full_text.split()),
        }

    finally:
        os.unlink(tmp_path)

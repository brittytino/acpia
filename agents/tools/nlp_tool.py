"""
NLP Tool — spaCy NER, stylometric feature extraction, and local LLM reasoning.
Used by multiple agents for text analysis.
"""
import spacy
import re
import math
import httpx
import os
import structlog
from typing import Optional, List, Dict, Any
from collections import Counter

logger = structlog.get_logger(__name__)

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://ollama:11434")
LLM_MODEL = os.getenv("OLLAMA_LLM_MODEL", "llama3.1:8b")

# Load spaCy model (singleton)
_nlp = None


def get_nlp():
    global _nlp
    if _nlp is None:
        logger.info("Loading spaCy model: en_core_web_lg")
        _nlp = spacy.load("en_core_web_lg")
        logger.info("spaCy model loaded")
    return _nlp


def query_llm(
    prompt: str,
    temperature: float = 0.2,
    max_tokens: int = 2048,
    system_prompt: Optional[str] = None,
) -> str:
    """Send a prompt to the local Ollama LLM and return the response text."""
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})

    try:
        response = httpx.post(
            f"{OLLAMA_BASE_URL}/api/chat",
            json={
                "model": LLM_MODEL,
                "messages": messages,
                "stream": False,
                "options": {
                    "temperature": temperature,
                    "num_predict": max_tokens,
                },
            },
            timeout=120,
        )
        response.raise_for_status()
        return response.json()["message"]["content"]
    except Exception as e:
        logger.error("LLM query failed", error=str(e))
        raise


def extract_entities(text: str) -> Dict[str, List[str]]:
    """
    Extract named entities from text using spaCy.
    Returns entities grouped by type: PERSON, ORG, GPE, DATE, PHONE, EMAIL, URL
    """
    nlp = get_nlp()
    doc = nlp(text[:100000])  # Limit for large documents

    entities: Dict[str, List[str]] = {
        "persons": [],
        "organizations": [],
        "locations": [],
        "dates": [],
        "phones": [],
        "emails": [],
        "urls": [],
        "usernames": [],
    }

    for ent in doc.ents:
        if ent.label_ == "PERSON":
            entities["persons"].append(ent.text)
        elif ent.label_ in ("ORG", "PRODUCT"):
            entities["organizations"].append(ent.text)
        elif ent.label_ in ("GPE", "LOC"):
            entities["locations"].append(ent.text)
        elif ent.label_ in ("DATE", "TIME"):
            entities["dates"].append(ent.text)

    # Regex-based extraction for patterns spaCy misses
    email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    phone_pattern = r'\b(\+?1?[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b'
    url_pattern = r'https?://[^\s<>"{}|\\^`\[\]]+'
    username_pattern = r'@[A-Za-z0-9_]{2,50}'

    entities["emails"] = list(set(re.findall(email_pattern, text)))
    entities["phones"] = list(set(re.findall(phone_pattern, text)))
    entities["urls"] = list(set(re.findall(url_pattern, text)))
    entities["usernames"] = list(set(re.findall(username_pattern, text)))

    # Deduplicate
    for key in entities:
        entities[key] = list(dict.fromkeys(entities[key]))

    return entities


def extract_stylometric_features(text: str) -> Dict[str, Any]:
    """
    Extract stylometric features for identity fingerprinting.
    These features are combined into a writing-style profile used for cross-platform identity resolution.
    """
    nlp = get_nlp()
    doc = nlp(text[:50000])

    # Tokenization
    sentences = list(doc.sents)
    tokens = [t for t in doc if not t.is_space]
    words = [t for t in tokens if t.is_alpha]
    punct_tokens = [t for t in tokens if t.is_punct]

    if not words:
        return {"error": "No analyzable text content"}

    # Sentence-level statistics
    sent_lengths = [len(list(s)) for s in sentences]
    avg_sent_length = sum(sent_lengths) / max(len(sentences), 1)
    sent_length_variance = (
        sum((l - avg_sent_length) ** 2 for l in sent_lengths) / max(len(sent_lengths), 1)
    )

    # Vocabulary richness (Type-Token Ratio, limited to first 1000 tokens)
    limited_words = [w.lower_ for w in words[:1000]]
    ttr = len(set(limited_words)) / max(len(limited_words), 1)

    # Hapax legomena ratio (words used only once)
    word_freq = Counter(w.lower_ for w in words)
    hapax = sum(1 for count in word_freq.values() if count == 1)
    hapax_ratio = hapax / max(len(word_freq), 1)

    # Part-of-speech distribution
    pos_counts = Counter(t.pos_ for t in tokens)
    total_tokens = max(len(tokens), 1)
    pos_ratios = {
        "noun_ratio": pos_counts.get("NOUN", 0) / total_tokens,
        "verb_ratio": pos_counts.get("VERB", 0) / total_tokens,
        "adj_ratio": pos_counts.get("ADJ", 0) / total_tokens,
        "adv_ratio": pos_counts.get("ADV", 0) / total_tokens,
        "pronoun_ratio": pos_counts.get("PRON", 0) / total_tokens,
    }

    # Function word usage (common function words are style markers)
    function_words = {"the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with"}
    fw_count = sum(1 for w in words if w.lower_ in function_words)
    function_word_ratio = fw_count / max(len(words), 1)

    # Punctuation density
    punct_density = len(punct_tokens) / max(len(tokens), 1)

    # Uppercase word ratio
    upper_words = [w for w in words if w.text.isupper() and len(w.text) > 1]
    uppercase_ratio = len(upper_words) / max(len(words), 1)

    # Most frequent words (excluding stopwords)
    content_words = [w.lower_ for w in words if not w.is_stop and len(w.text) > 2]
    top_words = [w for w, _ in Counter(content_words).most_common(20)]

    return {
        "total_tokens": len(tokens),
        "total_sentences": len(sentences),
        "avg_sentence_length": round(avg_sent_length, 2),
        "sentence_length_variance": round(sent_length_variance, 2),
        "vocabulary_richness_ttr": round(ttr, 4),
        "hapax_legomena_ratio": round(hapax_ratio, 4),
        "function_word_ratio": round(function_word_ratio, 4),
        "punctuation_density": round(punct_density, 4),
        "uppercase_ratio": round(uppercase_ratio, 4),
        **{k: round(v, 4) for k, v in pos_ratios.items()},
        "top_content_words": top_words[:10],
        "unique_word_count": len(word_freq),
    }


def compute_stylometric_similarity(features_a: Dict, features_b: Dict) -> float:
    """
    Compute a similarity score between two stylometric feature vectors.
    Returns a float in [0, 1] where 1 = identical style.
    Used for cross-platform identity resolution.
    """
    numeric_keys = [
        "avg_sentence_length", "vocabulary_richness_ttr", "hapax_legomena_ratio",
        "function_word_ratio", "punctuation_density", "uppercase_ratio",
        "noun_ratio", "verb_ratio", "adj_ratio", "pronoun_ratio",
    ]

    scores = []
    for key in numeric_keys:
        if key in features_a and key in features_b:
            va, vb = features_a[key], features_b[key]
            max_val = max(abs(va), abs(vb), 0.001)
            diff = abs(va - vb) / max_val
            scores.append(max(0.0, 1.0 - diff))

    return round(sum(scores) / max(len(scores), 1), 4) if scores else 0.0


def classify_grooming_stage(text: str, context: str = "") -> Dict[str, Any]:
    """
    Classify conversation text into behavioral stages.
    Returns a stage label and confidence score.

    Note: Stage names are intentionally descriptive of the behavioral pattern,
    not enumerated in detail per architecture doc Section 3, Pillar 1.
    """
    prompt = f"""You are a forensic conversation analyst. Analyze this conversation excerpt for behavioral patterns.

Context: {context[:500] if context else 'No additional context'}

Conversation text:
{text[:3000]}

Classify the overall behavioral pattern into ONE of these stages:
1. rapport_building - Initial friendly contact, establishing trust
2. trust_deepening - Increasing personal disclosure, exclusivity  
3. dependency_creation - Emotional reliance, obligation signals
4. isolation - Attempts to limit third-party contact
5. boundary_testing - Gradual normalization of inappropriate topics
6. escalation - Direct concerning requests or behaviors
7. neutral - Normal, benign conversation
8. unclear - Insufficient context to classify

Return a JSON object:
{{
  "stage": "stage_name",
  "confidence": 0.0-1.0,
  "reasoning": "brief factual observation about the behavioral pattern",
  "risk_indicators": ["list of specific behavioral signals observed"],
  "uncertainty_note": "what would change this assessment"
}}

Return ONLY valid JSON."""

    try:
        response = query_llm(prompt, temperature=0.1, max_tokens=512)
        start = response.find("{")
        end = response.rfind("}") + 1
        if start >= 0 and end > start:
            import json
            result = json.loads(response[start:end])
            return result
    except Exception as e:
        logger.warning("Grooming stage classification failed", error=str(e))

    return {
        "stage": "unclear",
        "confidence": 0.0,
        "reasoning": "Classification failed due to processing error",
        "risk_indicators": [],
    }

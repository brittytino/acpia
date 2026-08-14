from dataclasses import dataclass
from statistics import mean, pstdev

from app.lang.detect import detect
from app.lang.normalize import normalize_token


@dataclass
class StyleFingerprint:
    tamil_share: float          # personal, persists across platforms
    avg_tokens: float
    token_sd: float
    type_token_ratio: float     # on normalized tokens only
    punctuation_rate: float
    emoji_rate: float
    laugh_marker_rate: float    # "aaa", "hehe", "😂" — highly individual


def fingerprint(messages: list[str]) -> StyleFingerprint:
    if not messages:
        return StyleFingerprint(0, 0, 0, 0, 0, 0, 0)

    shares, lengths, all_tokens = [], [], []
    punct = emoji = laugh = 0

    for m in messages:
        prof = detect(m)
        shares.append(prof.tamil_share)
        toks = m.split()
        lengths.append(len(toks))
        all_tokens.extend(normalize_token(t) for t in toks)
        punct += sum(1 for ch in m if ch in ".,!?;:")
        emoji += sum(1 for ch in m if ord(ch) > 0x1F000)
        laugh += m.lower().count("haha") + m.lower().count("hehe")

    total_chars = sum(len(m) for m in messages) or 1
    return StyleFingerprint(
        tamil_share=round(mean(shares), 3),
        avg_tokens=round(mean(lengths), 2),
        token_sd=round(pstdev(lengths), 2) if len(lengths) > 1 else 0.0,
        type_token_ratio=round(len(set(all_tokens)) / max(len(all_tokens), 1), 3),
        punctuation_rate=round(punct / total_chars, 4),
        emoji_rate=round(emoji / total_chars, 4),
        laugh_marker_rate=round(laugh / len(messages), 3),
    )


def similarity(a: StyleFingerprint, b: StyleFingerprint) -> float:
    """Weighted similarity. Tamil share is weighted heaviest — it's the
    most personal and most persistent feature across pseudonyms."""
    def close(x: float, y: float, scale: float) -> float:
        return max(0.0, 1.0 - abs(x - y) / scale)

    parts = [
        (close(a.tamil_share, b.tamil_share, 1.0),               0.30),
        (close(a.avg_tokens, b.avg_tokens, 25.0),                0.15),
        (close(a.token_sd, b.token_sd, 15.0),                    0.10),
        (close(a.type_token_ratio, b.type_token_ratio, 0.6),     0.15),
        (close(a.punctuation_rate, b.punctuation_rate, 0.12),    0.10),
        (close(a.emoji_rate, b.emoji_rate, 0.06),                0.10),
        (close(a.laugh_marker_rate, b.laugh_marker_rate, 1.5),   0.10),
    ]
    return round(sum(v * w for v, w in parts), 3)

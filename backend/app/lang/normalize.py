"""Normalise romanized Tamil so spelling variants collapse to one form."""
import re

_REPEATS = re.compile(r"(.)\1{2,}")          # "irukaaaa" -> "irukaa"
_DOUBLE_VOWEL = re.compile(r"([aeiou])\1")   # "irukaa"   -> "iruka"

_SUBSTITUTIONS = [
    (re.compile(r"dh"), "th"),   # dhan / than
    (re.compile(r"zh"), "l"),    # tamizh / tamil
    (re.compile(r"ck"), "k"),
    (re.compile(r"gg"), "g"),
    (re.compile(r"kk"), "k"),
    (re.compile(r"tt"), "t"),
    (re.compile(r"pp"), "p"),
    (re.compile(r"nn"), "n"),
    (re.compile(r"ee"), "i"),    # nee -> ni
    (re.compile(r"oo"), "u"),
]


def normalize_token(token: str) -> str:
    t = _REPEATS.sub(r"\1\1", token.lower())
    t = _DOUBLE_VOWEL.sub(r"\1", t)
    for pattern, repl in _SUBSTITUTIONS:
        t = pattern.sub(repl, t)
    return t


def normalize(text: str) -> str:
    return " ".join(normalize_token(t) for t in text.split())

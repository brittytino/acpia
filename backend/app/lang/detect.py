"""Language detection for Tamil / Tanglish / English code-mixed text."""
from __future__ import annotations
import re
from dataclasses import dataclass
from enum import Enum

TAMIL_BLOCK = re.compile(r"[\u0B80-\u0BFF]")

# High-signal romanized Tamil function words and discourse markers.
# Function words beat content words for detection: they appear constantly
# and rarely collide with English.
TANGLISH_LEXICON: frozenset[str] = frozenset("""
na la da di dhan than thaan illa ille illai iruku irukku irukka irukken
irukaa pannu panra panren panni pannitu sollu solli sonna sonnen sollala
enna epdi eppadi romba konjam seri sari vanakkam machan machi nee naan
avan ava avanga unga enga yaru enge epo eppo ipo ippo apram aprom appuram
vaa va po poi poitu varen vandhu vantha kuda koodu mattum mudiyala mudiyum
theriyum theriyala venum vendam adhu idhu ithu athu ennaku enaku unaku
kekala kekalai paaru paru paatha nalla kastam ivlo evlo sema pathi mari
maadhiri ozhunga summa yen edhuku ennamo aama amaam illainu nu nga ya
""".split())

# Frequent English tokens, to avoid scoring an English sentence as Tanglish
# just because it contains "la" or "da".
ENGLISH_COMMON: frozenset[str] = frozenset("""
the a an and or but if then is are was were be been being have has had
do does did will would can could should i you he she it we they me him
her us them my your his its our their this that these those to of in on
at for with from by about as not no yes ok okay
""".split())


class Language(str, Enum):
    TAMIL = "ta"          # Tamil script
    TANGLISH = "ta_latn"  # romanized Tamil
    ENGLISH = "en"
    MIXED = "mixed"
    UNKNOWN = "unknown"


@dataclass(frozen=True)
class LanguageProfile:
    language: Language
    tamil_script_ratio: float
    tanglish_ratio: float
    english_ratio: float
    token_count: int

    @property
    def tamil_share(self) -> float:
        """Total Tamil content — script plus romanized. The drift metric."""
        return self.tamil_script_ratio + self.tanglish_ratio


def _tokenize(text: str) -> list[str]:
    return re.findall(r"[\w\u0B80-\u0BFF]+", text.lower())


def detect(text: str) -> LanguageProfile:
    tokens = _tokenize(text)
    if not tokens:
        return LanguageProfile(Language.UNKNOWN, 0.0, 0.0, 0.0, 0)

    tamil_script = sum(1 for t in tokens if TAMIL_BLOCK.search(t))
    tanglish = sum(1 for t in tokens
                   if not TAMIL_BLOCK.search(t) and t in TANGLISH_LEXICON)
    english = sum(1 for t in tokens if t in ENGLISH_COMMON)

    n = len(tokens)
    ts, tg, en = tamil_script / n, tanglish / n, english / n

    if ts > 0.5:
        lang = Language.TAMIL
    elif ts > 0.1 and (tg + en) > 0.1:
        lang = Language.MIXED
    elif tg >= 0.15:
        lang = Language.MIXED if en >= 0.20 else Language.TANGLISH
    elif en > 0.15:
        lang = Language.ENGLISH
    else:
        lang = Language.UNKNOWN

    return LanguageProfile(lang, ts, tg, en, n)

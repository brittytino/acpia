"""fpdf2's built-in core fonts (Helvetica, Courier) only cover Latin-1.
Case titles, filenames, and statements can contain Tamil script or other
non-Latin-1 text — exactly the input this product exists to handle. Rather
than crash certificate/report generation on that input, degrade it
visibly (an accurate PDF that reads "invalid character" beats a 500).
A production build should instead embed a Unicode TTF (e.g. Noto Sans
Tamil) via `pdf.add_font()`; this is the safety net until then.
"""


def pdf_safe(text) -> str:
    if text is None:
        return ""
    s = str(text)
    return s.encode("latin-1", errors="replace").decode("latin-1")

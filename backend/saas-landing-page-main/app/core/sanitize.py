import html
import re

_TAG_RE = re.compile(r"<[^>]*>")
_CONTROL_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
_SPACE_RE = re.compile(r"[ \t]+")


def strip_html(value: str, *, multiline: bool = False) -> str:
    """Remove HTML tags and control characters. Output is plain text; render it as text."""
    text = html.unescape(value)
    text = _TAG_RE.sub("", text)
    text = _TAG_RE.sub("", text)  # catches tags that were entity-encoded
    text = _CONTROL_RE.sub("", text)
    if multiline:
        return "\n".join(_SPACE_RE.sub(" ", line).strip() for line in text.splitlines()).strip()
    return _SPACE_RE.sub(" ", text.replace("\n", " ").replace("\r", " ")).strip()

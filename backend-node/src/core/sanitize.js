const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

/** Small HTML entity decoder (named basics + numeric). `&lt` and friends also work without ';' like browsers. */
function unescapeHtml(text) {
  return text.replace(/&(?:#(\d+);?|#[xX]([0-9a-fA-F]+);?|(amp|lt|gt|quot|apos|nbsp)(;?))/g, (m, dec, hex, name, semi) => {
    if (name) return name === 'apos' && !semi ? m : NAMED[name];
    const code = dec !== undefined ? parseInt(dec, 10) : parseInt(hex, 16);
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '�';
  });
}

const TAG = /<[^>]*>/g;
const CONTROL = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g;

/** Remove HTML tags and control characters. Output is plain text; render it as text. */
export function stripHtml(value, { multiline = false } = {}) {
  let text = unescapeHtml(value);
  text = text.replace(TAG, '').replace(TAG, ''); // second pass catches tags that were entity-encoded
  text = text.replace(CONTROL, '');
  if (multiline) {
    return text
      .split(/\r\n|\r|\n/)
      .map((line) => line.replace(/[ \t]+/g, ' ').trim())
      .join('\n')
      .trim();
  }
  return text.replace(/[\r\n]/g, ' ').replace(/[ \t]+/g, ' ').trim();
}

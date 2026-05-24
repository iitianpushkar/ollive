const EMAIL_PATTERN = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi;
const PHONE_PATTERN =
  /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
const SSN_PATTERN = /\b\d{3}-\d{2}-\d{4}\b/g;
const CARD_PATTERN = /\b(?:\d[ -]*?){13,16}\b/g;
const API_KEY_PATTERN = /\b(sk-|pk-|api[_-]?key)[A-Za-z0-9_-]{10,}\b/gi;

const REDACTIONS: Array<[RegExp, string]> = [
  [EMAIL_PATTERN, "[EMAIL_REDACTED]"],
  [PHONE_PATTERN, "[PHONE_REDACTED]"],
  [SSN_PATTERN, "[SSN_REDACTED]"],
  [CARD_PATTERN, "[CARD_REDACTED]"],
  [API_KEY_PATTERN, "[API_KEY_REDACTED]"],
];

export function redactPii(text: string | undefined, enabled = true): string | undefined {
  if (!text || !enabled) return text;
  let result = text;
  for (const [pattern, replacement] of REDACTIONS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

export function preview(
  text: string | undefined,
  maxChars = 500,
  redact = true
): string | undefined {
  if (text == null) return undefined;
  const cleaned = redactPii(text, redact) ?? "";
  if (cleaned.length <= maxChars) return cleaned;
  return cleaned.slice(0, maxChars) + "…";
}

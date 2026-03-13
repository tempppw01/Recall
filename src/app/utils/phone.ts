export type DetectedPhone = {
  raw: string;
  normalized: string;
};

const PHONE_CANDIDATE_RE = /(?:\+?\d[\d\s().-]{6,}\d)/g;

export function extractPhoneNumbers(text: string): DetectedPhone[] {
  const source = String(text || '');
  const matches = source.match(PHONE_CANDIDATE_RE) || [];
  const results: DetectedPhone[] = [];
  const seen = new Set<string>();

  for (const raw of matches) {
    const normalized = raw.replace(/[\s().-]/g, '');
    const digitsOnly = normalized.replace(/[^\d+]/g, '');
    const digitCount = digitsOnly.replace(/\D/g, '').length;
    if (digitCount < 7 || digitCount > 20) continue;
    if (seen.has(digitsOnly)) continue;
    seen.add(digitsOnly);
    results.push({ raw: raw.trim(), normalized: digitsOnly });
  }

  return results;
}

export function buildTelHref(phone: DetectedPhone): string {
  return `tel:${phone.normalized}`;
}

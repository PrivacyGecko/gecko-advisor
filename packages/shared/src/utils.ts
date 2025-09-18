export function normalizeUrl(input: string): URL {
  let u: URL;
  try {
    u = new URL(input);
  } catch {
    // try to add scheme if missing
    u = new URL('http://' + input);
  }
  if (!['http:', 'https:'].includes(u.protocol)) {
    throw new Error('Invalid scheme');
  }
  u.hash = '';
  // Remove default ports
  if ((u.protocol === 'http:' && u.port === '80') || (u.protocol === 'https:' && u.port === '443')) {
    u.port = '';
  }
  return u;
}

export function etldPlusOne(hostname: string): string {
  // Naive eTLD+1: return last two labels; for ccTLD like co.uk, keep last 3
  const parts = hostname.split('.').filter(Boolean);
  if (parts.length <= 2) return hostname;
  const lastTwo = parts.slice(-2).join('.');
  // Handle common multi-part TLDs in demo
  const lastThree = parts.slice(-3).join('.');
  if (/\.co\.uk$/.test(lastThree)) return lastThree;
  return lastTwo;
}

export function labelForScore(score: number): 'Safe' | 'Caution' | 'High Risk' {
  // Align bands with PRD: Safe ≥70, Caution 40–69, High Risk <40
  if (score >= 70) return 'Safe';
  if (score >= 40) return 'Caution';
  return 'High Risk';
}

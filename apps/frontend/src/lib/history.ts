export interface ScanHistoryEntry {
  slug: string;
  domain: string;
  score: number | null;
  label: string | null;
  scannedAt: string;
}

const STORAGE_KEY = 'privacy-advisor:scan-history';
const HISTORY_LIMIT = 8;

function getStorage(): Storage | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

export function readHistory(): ScanHistoryEntry[] {
  const storage = getStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => normalizeEntry(item))
      .filter((entry): entry is ScanHistoryEntry => Boolean(entry));
  } catch {
    return [];
  }
}

export function addHistory(entry: Omit<ScanHistoryEntry, 'scannedAt'> & { scannedAt?: string }): ScanHistoryEntry[] {
  const normalized = normalizeEntry({ ...entry, scannedAt: entry.scannedAt ?? new Date().toISOString() });
  if (!normalized) return readHistory();

  const storage = getStorage();
  if (!storage) return [];

  const current = readHistory();
  const next = [normalized, ...current.filter((item) => item.slug !== normalized.slug)];
  const trimmed = next.slice(0, HISTORY_LIMIT);

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // ignore quota errors
  }

  dispatchHistoryEvent(trimmed);
  return trimmed;
}

export function clearHistory(): void {
  const storage = getStorage();
  storage?.removeItem(STORAGE_KEY);
  dispatchHistoryEvent([]);
}

function normalizeEntry(value: unknown): ScanHistoryEntry | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const candidate = value as Record<string, unknown>;
  const slug = typeof candidate.slug === 'string' ? candidate.slug : undefined;
  const domain = typeof candidate.domain === 'string' ? candidate.domain : undefined;
  const label = typeof candidate.label === 'string' ? candidate.label : null;
  const score = typeof candidate.score === 'number' ? candidate.score : null;
  const scannedAt = typeof candidate.scannedAt === 'string' ? candidate.scannedAt : undefined;

  if (!slug || !domain || !scannedAt) return undefined;

  return { slug, domain, label, score, scannedAt };
}

function dispatchHistoryEvent(entries: ScanHistoryEntry[]) {
  if (typeof window === 'undefined') return;
  const event = new CustomEvent('privacy-history-updated', { detail: entries });
  window.dispatchEvent(event);
}

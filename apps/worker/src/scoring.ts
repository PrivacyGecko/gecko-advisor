import type { PrismaClient } from "@prisma/client";
import type { ScoreResult } from "@privacy-advisor/shared";
import { labelForScore } from "@privacy-advisor/shared";

const coerceDetail = <T extends object>(value: unknown): T =>
  (typeof value === 'object' && value !== null ? (value as T) : ({} as T));

const isString = (value: unknown): value is string => typeof value === 'string';

type IssueSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

const severityWeight: Record<IssueSeverity, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
};

interface TrackerDetail {
  domain?: string;
  fingerprinting?: boolean;
}

interface ThirdPartyDetail {
  domain?: string;
}

interface HeaderDetail {
  name?: string;
}

interface TLSDetail {
  grade?: 'A' | 'B' | 'C' | 'D' | 'F';
}

interface PolicyDetail {
  href?: string;
}

interface IssueInput {
  key: string;
  severity: IssueSeverity;
  category: string;
  title: string;
  summary?: string;
  howToFix?: string;
  whyItMatters?: string;
  references?: { label?: string; url: string }[];
  sortWeight?: number;
}

export interface ComputedScanResult extends ScoreResult {
  summary: string;
  issues: IssueInput[];
  meta: Record<string, unknown>;
}

export async function computeScore(prisma: PrismaClient, scanId: string): Promise<ComputedScanResult> {
  const evidence = await prisma.evidence.findMany({ where: { scanId } });
  let score = 100;
  const explanations: { evidenceId: string; points: number; reason: string }[] = [];

  const trackers = evidence.filter((entry) => entry.kind === 'tracker');
  const uniqueTrackerDomains = new Set(
    trackers.map((entry) => coerceDetail<TrackerDetail>(entry.details).domain).filter(isString),
  );
  let trackerPenalty = Math.min(uniqueTrackerDomains.size * 5, 40);
  trackers.forEach((entry) => {
    if (coerceDetail<TrackerDetail>(entry.details).fingerprinting) trackerPenalty += 5;
  });
  if (trackerPenalty > 0) {
    trackers.forEach((entry) => explanations.push({ evidenceId: entry.id, points: -5, reason: 'Tracker domain' }));
  }
  score -= trackerPenalty;

  const thirdParty = evidence.filter((entry) => entry.kind === 'thirdparty');
  const uniqueThird = new Set(
    thirdParty.map((entry) => coerceDetail<ThirdPartyDetail>(entry.details).domain).filter(isString),
  );
  const thirdPenalty = Math.min(uniqueThird.size * 2, 20);
  if (thirdPenalty) {
    thirdParty.forEach((entry) => explanations.push({ evidenceId: entry.id, points: -2, reason: 'Third-party request' }));
  }
  score -= thirdPenalty;

  const insecure = evidence.filter((entry) => entry.kind === 'insecure');
  const insecurePenalty = Math.min(insecure.length * 10, 20);
  if (insecurePenalty) {
    insecure.forEach((entry) => explanations.push({ evidenceId: entry.id, points: -10, reason: 'Insecure/mixed content' }));
  }
  score -= insecurePenalty;

  const headersMissing = evidence
    .filter((entry) => entry.kind === 'header')
    .map((entry) => coerceDetail<HeaderDetail>(entry.details).name)
    .filter(isString);
  const headerPenalty = headersMissing.length * 3;
  if (headerPenalty) {
    evidence
      .filter((entry) => entry.kind === 'header')
      .forEach((entry) => explanations.push({ evidenceId: entry.id, points: -3, reason: 'Missing security header' }));
  }
  score -= headerPenalty;

  const cookieIssues = evidence.filter((entry) => entry.kind === 'cookie');
  const cookiePenalty = Math.min(cookieIssues.length * 2, 10);
  if (cookiePenalty) {
    cookieIssues.forEach((entry) => explanations.push({ evidenceId: entry.id, points: -2, reason: 'Cookie missing flags' }));
  }
  score -= cookiePenalty;

  const policyEntries = evidence.filter((entry) => entry.kind === 'policy');
  const policyFound = policyEntries.length > 0;
  if (!policyFound) {
    score -= 5;
  } else {
    const [firstPolicy] = policyEntries;
    if (firstPolicy) explanations.push({ evidenceId: firstPolicy.id, points: 0, reason: 'Privacy policy found' });
  }

  const tlsEntries = evidence.filter((entry) => entry.kind === 'tls');
  const [tlsRecord] = tlsEntries;
  let tlsGrade: TLSDetail['grade'] | undefined;
  if (tlsRecord) {
    tlsGrade = coerceDetail<TLSDetail>(tlsRecord.details).grade ?? 'A';
    let penalty = 0;
    if (tlsGrade === 'C') penalty = 3;
    else if (tlsGrade === 'D') penalty = 7;
    else if (tlsGrade === 'F') penalty = 12;
    score -= penalty;
    if (penalty) explanations.push({ evidenceId: tlsRecord.id, points: -penalty, reason: `TLS grade ${tlsGrade}` });
  }

  const fingerprintEntries = evidence.filter((entry) => entry.kind === 'fingerprint');
  const fingerprintDetected = fingerprintEntries.length > 0;
  if (fingerprintDetected) {
    score -= 5;
    const [firstFingerprint] = fingerprintEntries;
    if (firstFingerprint) explanations.push({ evidenceId: firstFingerprint.id, points: -5, reason: 'Fingerprinting heuristics' });
  }

  score = Math.max(0, score);
  const label = labelForScore(score);

  const issues: IssueInput[] = [];

  if (uniqueTrackerDomains.size) {
    const domains = Array.from(uniqueTrackerDomains).slice(0, 5).join(', ');
    issues.push({
      key: 'tracking.trackers',
      severity: 'high',
      category: 'tracking',
      title: `${uniqueTrackerDomains.size} tracker${uniqueTrackerDomains.size > 1 ? 's' : ''} observed`,
      summary: `Trackers detected: ${domains}${uniqueTrackerDomains.size > 5 ? '…' : ''}`,
      howToFix: 'Review marketing and analytics tags. Remove unnecessary trackers or load them only after explicit consent via a consent management platform.',
      whyItMatters: 'Trackers monitor user behaviour and may violate privacy laws if deployed without consent or disclosures.',
      references: [
        { label: 'Mozilla: Managing tracking scripts', url: 'https://developer.mozilla.org/en-US/docs/Web/Privacy/Tracking_Protection' },
      ],
      sortWeight: 10,
    });
  }

  if (uniqueThird.size > 5) {
    const domains = Array.from(uniqueThird).slice(0, 5).join(', ');
    issues.push({
      key: 'tracking.third-party',
      severity: 'medium',
      category: 'tracking',
      title: `${uniqueThird.size} third-party domains contacted`,
      summary: `Notable domains: ${domains}${uniqueThird.size > 5 ? '…' : ''}`,
      howToFix: 'Audit external requests and remove unused libraries. Where possible, self-host critical assets or route via privacy-preserving CDNs.',
      whyItMatters: 'Each third-party call shares visitor metadata (IP, user agent) with outside companies, which can be used for profiling.',
      references: [
        { label: 'OWASP: Third-Party Requests', url: 'https://owasp.org/www-community/Web_Application_Security_Risk' },
      ],
      sortWeight: 30,
    });
  }

  if (headersMissing.length) {
    issues.push({
      key: 'security.headers',
      severity: 'medium',
      category: 'security',
      title: 'Missing security headers',
      summary: `Add: ${headersMissing.join(', ')}`,
      howToFix: 'Set the recommended HTTP response headers (CSP, HSTS, Referrer-Policy, Permissions-Policy, X-Content-Type-Options) at the proxy or application layer.',
      whyItMatters: 'Security headers harden the site against clickjacking, XSS, and data leakage. Without them browsers cannot enforce modern protections.',
      references: [
        { label: 'MDN: HTTP security headers', url: 'https://developer.mozilla.org/en-US/docs/Web/Security' },
      ],
      sortWeight: 20,
    });
  }

  if (cookieIssues.length) {
    issues.push({
      key: 'security.cookies',
      severity: 'medium',
      category: 'security',
      title: 'Cookies missing Secure/SameSite flags',
      summary: `${cookieIssues.length} cookie${cookieIssues.length > 1 ? 's' : ''} missing recommended attributes`,
      howToFix: 'Mark cookies with Secure and SameSite=strict or lax, and HttpOnly where appropriate, to prevent interception or CSRF.',
      whyItMatters: 'Without Secure/SameSite, cookies can leak over HTTP or be sent in cross-site requests, enabling session hijacking.',
      references: [
        { label: 'MDN: Set-Cookie', url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie' },
      ],
      sortWeight: 35,
    });
  }

  if (tlsGrade && ['C', 'D', 'F'].includes(tlsGrade)) {
    issues.push({
      key: 'security.tls',
      severity: tlsGrade === 'F' ? 'high' : 'medium',
      category: 'security',
      title: `TLS configuration graded ${tlsGrade}`,
      howToFix: 'Update the TLS configuration to disable weak protocols/ciphers and enable HSTS. Use modern suites recommended by Mozilla or SSL Labs.',
      whyItMatters: 'Weak TLS grades indicate outdated encryption that attackers can exploit to intercept traffic.',
      references: [
        { label: 'Mozilla TLS Guidelines', url: 'https://wiki.mozilla.org/Security/Server_Side_TLS' },
      ],
      sortWeight: 25,
    });
  }

  if (fingerprintDetected) {
    issues.push({
      key: 'tracking.fingerprinting',
      severity: 'high',
      category: 'tracking',
      title: 'Browser fingerprinting behaviour observed',
      howToFix: 'Remove or gate fingerprinting scripts. Consider alternatives that rely on consent or anonymized analytics.',
      whyItMatters: 'Fingerprinting scripts combine browser traits to create persistent identifiers that are difficult for users to clear.',
      references: [
        { label: 'EFF: What is fingerprinting?', url: 'https://panopticlick.eff.org/about' },
      ],
      sortWeight: 15,
    });
  }

  if (insecure.length) {
    issues.push({
      key: 'security.mixed-content',
      severity: 'high',
      category: 'security',
      title: 'Mixed-content detected over HTTPS',
      howToFix: 'Serve all assets over HTTPS. Update hard-coded http:// URLs to https:// or relative paths.',
      whyItMatters: 'Loading HTTP assets on HTTPS pages lets attackers tamper with scripts or leak data.',
      references: [
        { label: 'MDN: Mixed Content', url: 'https://developer.mozilla.org/en-US/docs/Web/Security/Mixed_content' },
      ],
      sortWeight: 18,
    });
  }

  if (!policyFound) {
    issues.push({
      key: 'compliance.policy',
      severity: 'low',
      category: 'compliance',
      title: 'Privacy policy link not found',
      howToFix: 'Publish a clear privacy policy and link it in the footer or primary navigation.',
      whyItMatters: 'Most privacy laws require transparent disclosure of data collection practices.',
      references: [
        { label: 'Privacy: policy best practices', url: 'https://www.ftc.gov/business-guidance/small-businesses/privacy-security' },
      ],
      sortWeight: 60,
    });
  }

  issues.sort((a, b) => {
    const severityDiff = severityWeight[b.severity] - severityWeight[a.severity];
    if (severityDiff !== 0) return severityDiff;
    return (a.sortWeight ?? 0) - (b.sortWeight ?? 0);
  });

  const summaryParts: string[] = [];
  if (uniqueTrackerDomains.size) {
    summaryParts.push(`${uniqueTrackerDomains.size} tracker${uniqueTrackerDomains.size > 1 ? 's' : ''} flagged`);
  }
  if (headersMissing.length) {
    summaryParts.push(`${headersMissing.length} security header${headersMissing.length > 1 ? 's' : ''} missing`);
  }
  if (!policyFound) {
    summaryParts.push('No privacy policy detected');
  }
  if (fingerprintDetected) {
    summaryParts.push('Fingerprinting heuristics present');
  }
  if (summaryParts.length === 0) {
    summaryParts.push('No major privacy risks detected');
  }

  const summary = summaryParts.join('; ');

  const meta = {
    trackerDomains: Array.from(uniqueTrackerDomains),
    thirdPartyDomains: Array.from(uniqueThird),
    missingHeaders: headersMissing,
    cookieIssues: cookieIssues.length,
    policyFound,
    tlsGrade,
    fingerprintDetected,
    mixedContent: insecure.length > 0,
  };

  return { score, label, explanations, issues, summary, meta };
}



# Privacy Compliance & Data Handling Analysis

## Current Data Storage Assessment

### Personal Data Classification

**Directly Stored Personal Data**:
- `Scan.input`: URLs that may contain personal identifiers
- `Scan.normalizedInput`: Normalized URLs (potential PII exposure)
- `Evidence.details`: JSON containing tracker data, cookies, etc.
- `Issue.references`: May contain personal data in examples

**Indirectly Personal Data**:
- IP addresses in scan metadata
- Browser fingerprinting evidence
- Cookie values and tracking identifiers

### GDPR/CCPA Compliance Issues

#### Issue 1: Data Retention Without User Consent
**Problem**: Indefinite storage of scan results containing personal data
**Risk**: GDPR Article 5(e) - Storage limitation violation
**Current Impact**: All scans stored permanently

#### Issue 2: No Data Subject Rights Implementation
**Problem**: No mechanism for data deletion, access, or portability
**Risk**: GDPR Articles 15-20 violations
**Current Impact**: Cannot fulfill user rights requests

#### Issue 3: Sensitive Data in Evidence
**Problem**: Uncontrolled storage of cookies, tokens, personal identifiers
**Risk**: GDPR Article 9 - Special category data exposure
**Current Impact**: Potential storage of authentication tokens, session IDs

## Privacy-by-Design Schema Improvements

### Data Minimization Strategy

```typescript
// Enhanced schema with privacy controls
model Scan {
  id               String     @id @default(cuid())
  targetType       String
  inputHash        String     // Store hash instead of raw URL for privacy
  normalizedHash   String?    // Hash of normalized input
  status           ScanStatus
  score            Int?
  label            String?
  summary          String?
  startedAt        DateTime?
  finishedAt       DateTime?
  slug             String     @unique
  source           String     @default("manual")
  dedupeOfId       String?
  shareMessage     String?
  meta             Json?

  // Privacy controls
  retentionDate    DateTime?  // Auto-deletion date
  isAnonymized     Boolean    @default(false)
  dataClassification String   @default("public") // public, personal, sensitive

  evidence         Evidence[]
  issues           Issue[]

  createdAt        DateTime   @default(now())
  updatedAt        DateTime   @default(now()) @updatedAt

  // Privacy-aware indexes
  @@index([normalizedHash, status, finishedAt(sort: Desc)],
          where: "status = 'done' AND finishedAt IS NOT NULL")
  @@index([retentionDate], where: "retentionDate IS NOT NULL")
}

model Evidence {
  id        String   @id @default(cuid())
  scanId    String
  kind      String
  severity  Int
  title     String
  details   Json     // Sanitized details only
  rawHash   String?  // Hash of original data for deduplication

  // Privacy controls
  containsPII Boolean @default(false)
  sanitized   Boolean @default(false)

  createdAt DateTime @default(now())
  scan      Scan     @relation(fields: [scanId], references: [id], onDelete: Cascade)

  @@index([scanId, containsPII])
}

// New table for PII audit trail
model DataProcessingLog {
  id          String   @id @default(cuid())
  scanId      String
  action      String   // collect, store, process, delete, anonymize
  dataType    String   // url, cookie, tracker, personal_data
  legalBasis  String   // legitimate_interest, consent, contract
  purpose     String   // privacy_analysis, security_scan
  retention   String   // e.g., "30_days", "1_year"
  createdAt   DateTime @default(now())

  scan        Scan     @relation(fields: [scanId], references: [id], onDelete: Cascade)
}
```

### Data Sanitization Functions

```typescript
// Privacy-aware data processing
export function sanitizeUrl(url: string): { hash: string; domain: string; isPersonal: boolean } {
  const parsed = new URL(url);

  // Check for personal data patterns
  const personalPatterns = [
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,  // Email
    /\/user\/\d+/,                                        // User IDs
    /[?&]id=\d+/,                                        // ID parameters
    /[?&]email=/,                                        // Email parameters
    /[?&]name=/,                                         // Name parameters
  ];

  const isPersonal = personalPatterns.some(pattern => pattern.test(url));

  // Create hash for deduplication without storing personal data
  const hash = crypto.createHash('sha256').update(url).digest('hex');

  // Extract domain for analysis (non-personal)
  const domain = parsed.hostname;

  return { hash, domain, isPersonal };
}

export function sanitizeEvidenceDetails(details: any, kind: string): {
  sanitized: any;
  containsPII: boolean;
  rawHash: string;
} {
  const rawHash = crypto.createHash('sha256').update(JSON.stringify(details)).digest('hex');
  let containsPII = false;
  let sanitized = { ...details };

  switch (kind) {
    case 'cookie':
      // Remove cookie values, keep names and attributes
      if (sanitized.value) {
        containsPII = true;
        sanitized.value = '[REDACTED]';
      }
      break;

    case 'tracker':
      // Remove query parameters that might contain personal data
      if (sanitized.url) {
        const url = new URL(sanitized.url);
        // Keep only non-personal parameters
        const allowedParams = ['utm_source', 'utm_medium', 'utm_campaign'];
        const newParams = new URLSearchParams();
        allowedParams.forEach(param => {
          if (url.searchParams.has(param)) {
            newParams.set(param, url.searchParams.get(param)!);
          }
        });
        url.search = newParams.toString();
        sanitized.url = url.toString();
        containsPII = details.url !== sanitized.url;
      }
      break;

    case 'thirdparty':
      // Only keep domain and purpose, remove identifying data
      sanitized = {
        domain: sanitized.domain,
        purpose: sanitized.purpose || 'unknown',
        category: sanitized.category || 'uncategorized'
      };
      containsPII = Object.keys(details).length > Object.keys(sanitized).length;
      break;
  }

  return { sanitized, containsPII, rawHash };
}
```

### Automated Data Retention & Deletion

```sql
-- Privacy-compliant data retention
CREATE OR REPLACE FUNCTION apply_data_retention()
RETURNS void AS $$
DECLARE
  default_retention INTERVAL := '1 year';
  personal_retention INTERVAL := '30 days';
BEGIN
  -- Set retention dates for scans without explicit retention
  UPDATE "Scan"
  SET "retentionDate" =
    CASE
      WHEN "dataClassification" = 'personal' THEN "createdAt" + personal_retention
      ELSE "createdAt" + default_retention
    END
  WHERE "retentionDate" IS NULL;

  -- Delete scans past retention date
  DELETE FROM "Scan"
  WHERE "retentionDate" < NOW()
    AND "status" IN ('done', 'failed');

  -- Anonymize scans approaching retention (grace period)
  UPDATE "Scan"
  SET
    "isAnonymized" = true,
    "inputHash" = encode(sha256(random()::text::bytea), 'hex'),
    "normalizedHash" = encode(sha256(random()::text::bytea), 'hex'),
    "shareMessage" = NULL,
    "meta" = '{}'
  WHERE "retentionDate" BETWEEN NOW() AND NOW() + INTERVAL '7 days'
    AND NOT "isAnonymized";

  -- Update evidence to remove PII
  UPDATE "Evidence"
  SET "details" = '{"sanitized": true}'
  WHERE "scanId" IN (
    SELECT "id" FROM "Scan" WHERE "isAnonymized" = true
  ) AND "containsPII" = true;

END;
$$ LANGUAGE plpgsql;

-- Schedule daily execution
-- SELECT cron.schedule('data-retention', '0 2 * * *', 'SELECT apply_data_retention();');
```

### Data Subject Rights Implementation

```typescript
// GDPR Data Subject Rights API
export async function handleDataSubjectRequest(
  type: 'access' | 'delete' | 'portability',
  identifier: string // email, URL, or scan ID
) {
  switch (type) {
    case 'access':
      return await getPersonalDataReport(identifier);
    case 'delete':
      return await deletePersonalData(identifier);
    case 'portability':
      return await exportPersonalData(identifier);
  }
}

async function getPersonalDataReport(identifier: string) {
  // Find all scans related to the identifier
  const scans = await prisma.scan.findMany({
    where: {
      OR: [
        { inputHash: hashIdentifier(identifier) },
        { normalizedHash: hashIdentifier(identifier) },
      ]
    },
    include: {
      evidence: {
        where: { containsPII: true }
      },
      _count: {
        select: {
          evidence: true,
          issues: true
        }
      }
    }
  });

  return {
    totalScans: scans.length,
    personalDataItems: scans.reduce((acc, scan) => acc + scan.evidence.length, 0),
    retentionSchedule: scans.map(scan => ({
      scanId: scan.id,
      retentionDate: scan.retentionDate,
      isAnonymized: scan.isAnonymized
    }))
  };
}

async function deletePersonalData(identifier: string) {
  const hashedId = hashIdentifier(identifier);

  // Mark scans for immediate deletion
  const updatedScans = await prisma.scan.updateMany({
    where: {
      OR: [
        { inputHash: hashedId },
        { normalizedHash: hashedId },
      ]
    },
    data: {
      retentionDate: new Date(), // Immediate deletion
    }
  });

  // Apply data retention function
  await prisma.$executeRaw`SELECT apply_data_retention();`;

  return { deletedScans: updatedScans.count };
}
```

### Privacy Configuration

```typescript
// Privacy settings configuration
export const privacyConfig = {
  dataRetention: {
    default: 365, // days
    personal: 30, // days for personal data
    sensitive: 7,  // days for sensitive data
  },

  anonymization: {
    enabled: true,
    gracePeriod: 7, // days before deletion
  },

  piiDetection: {
    patterns: [
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, // Email
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN pattern
      /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, // Credit card
    ],

    sensitiveParams: [
      'email', 'user_id', 'session_id', 'token',
      'api_key', 'password', 'auth', 'login'
    ]
  },

  legalBasis: {
    default: 'legitimate_interest',
    purposes: {
      'privacy_analysis': 'legitimate_interest',
      'security_scan': 'legitimate_interest',
      'compliance_check': 'legal_obligation'
    }
  }
};
```

## Compliance Checklist

### GDPR Compliance ✅
- [ ] **Lawful Basis**: Document legitimate interest for privacy scanning
- [ ] **Data Minimization**: Store only necessary data for analysis
- [ ] **Purpose Limitation**: Use data only for stated privacy analysis
- [ ] **Storage Limitation**: Implement automated data retention
- [ ] **Accuracy**: Provide mechanisms to correct scan data
- [ ] **Integrity**: Encrypt sensitive data, maintain audit logs
- [ ] **Accountability**: Document data processing activities

### Technical Privacy Controls ✅
- [ ] **Pseudonymization**: Hash URLs and personal identifiers
- [ ] **Encryption**: Encrypt database at rest and in transit
- [ ] **Access Controls**: Implement role-based access to scan data
- [ ] **Audit Logging**: Log all data access and processing activities
- [ ] **Data Breach Detection**: Monitor for unauthorized access

### User Rights Implementation ✅
- [ ] **Right of Access**: API for users to see their data
- [ ] **Right to Rectification**: Ability to correct scan results
- [ ] **Right to Erasure**: Automated and manual deletion capabilities
- [ ] **Right to Portability**: Export user's scan data
- [ ] **Right to Object**: Opt-out mechanism for processing
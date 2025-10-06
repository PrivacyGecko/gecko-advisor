import { parse } from 'tldts';

interface FirstPartyPattern {
  root: string;
  firstParty: string[];
}

/**
 * Known first-party CDN and infrastructure patterns
 * These domains belong to the same organization as the root domain
 */
const KNOWN_FIRST_PARTY_PATTERNS: FirstPartyPattern[] = [
  // GitHub
  { root: 'github.com', firstParty: ['githubusercontent.com', 'githubassets.com', 'github.io'] },

  // Google
  { root: 'google.com', firstParty: ['gstatic.com', 'googleusercontent.com', 'ggpht.com'] },

  // Facebook/Meta
  { root: 'facebook.com', firstParty: ['fbcdn.net', 'fbsbx.com'] },

  // Twitter/X
  { root: 'twitter.com', firstParty: ['twimg.com', 't.co'] },
  { root: 'x.com', firstParty: ['twimg.com', 't.co'] },

  // Amazon
  { root: 'amazon.com', firstParty: ['media-amazon.com', 'ssl-images-amazon.com'] },

  // Wikipedia
  { root: 'wikipedia.org', firstParty: ['wikimedia.org', 'wikidata.org', 'wikis.world'] },

  // Microsoft
  { root: 'microsoft.com', firstParty: ['microsoftonline.com', 'live.com', 'msn.com'] },

  // Apple
  { root: 'apple.com', firstParty: ['icloud.com', 'mzstatic.com', 'cdn-apple.com'] },

  // LinkedIn
  { root: 'linkedin.com', firstParty: ['licdn.com'] },

  // Reddit
  { root: 'reddit.com', firstParty: ['redd.it', 'redditstatic.com'] },

  // Stack Overflow/Stack Exchange
  { root: 'stackoverflow.com', firstParty: ['sstatic.net', 'stackexchange.com'] },

  // YouTube
  { root: 'youtube.com', firstParty: ['ytimg.com', 'googlevideo.com'] },

  // Netflix
  { root: 'netflix.com', firstParty: ['nflxext.com', 'nflximg.net', 'nflxvideo.net'] },
];

/**
 * Determines if a domain is first-party (same organization) relative to the root domain
 *
 * @param domain - The domain to check (e.g., 'github.githubassets.com')
 * @param rootDomain - The root domain being scanned (e.g., 'github.com')
 * @returns true if the domain belongs to the same organization
 *
 * @example
 * isFirstParty('github.githubassets.com', 'github.com') // true
 * isFirstParty('google-analytics.com', 'github.com') // false
 */
export function isFirstParty(domain: string, rootDomain: string): boolean {
  if (!domain || !rootDomain) {
    return false;
  }

  // Normalize domains
  const normalizedDomain = domain.toLowerCase().trim();
  const normalizedRoot = rootDomain.toLowerCase().trim();

  // Exact match
  if (normalizedDomain === normalizedRoot) {
    return true;
  }

  // Parse domains using tldts for accurate eTLD+1 extraction
  const domainInfo = parse(normalizedDomain);
  const rootInfo = parse(normalizedRoot);

  // Check if both domains share the same eTLD+1 (e.g., github.com)
  // This handles: api.github.com, gist.github.com, etc.
  if (domainInfo.domain && rootInfo.domain && domainInfo.domain === rootInfo.domain) {
    return true;
  }

  // Check against known first-party patterns
  // This handles cases where CDNs use different domains (e.g., github.com → githubusercontent.com)
  if (rootInfo.domain) {
    for (const pattern of KNOWN_FIRST_PARTY_PATTERNS) {
      if (rootInfo.domain === pattern.root) {
        // Check if the domain matches any known first-party pattern
        if (pattern.firstParty.some(fp => normalizedDomain.includes(fp))) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Determines if a domain is a known CDN (content delivery network)
 * Even if not first-party, CDNs are generally functional infrastructure, not tracking
 *
 * @param domain - The domain to check
 * @returns true if the domain is a known CDN
 */
export function isKnownCDN(domain: string): boolean {
  const cdnPatterns = [
    'cloudflare.com',
    'fastly.net',
    'akamai.net',
    'cloudfront.net',
    'cdn77.com',
    'jsdelivr.net',
    'unpkg.com',
    'cdnjs.com',
    'bootstrapcdn.com',
    'fontawesome.com',
    'typekit.net',
    'fonts.googleapis.com',
    'fonts.gstatic.com',
  ];

  const normalizedDomain = domain.toLowerCase();
  return cdnPatterns.some(cdn => normalizedDomain.includes(cdn));
}

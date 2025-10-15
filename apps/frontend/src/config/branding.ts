/*
SPDX-FileCopyrightText: 2025 Privacy Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * PrivacyGecko Brand Configuration
 *
 * Centralized branding configuration for Gecko Advisor by PrivacyGecko.
 * This file contains all brand-related constants including company info,
 * product details, contact information, colors, and SEO metadata.
 *
 * Usage:
 * ```typescript
 * import { BRAND } from '@/config/branding';
 *
 * <h1>{BRAND.productName}</h1>
 * <p>{BRAND.tagline}</p>
 * ```
 */

/**
 * Brand configuration type definitions
 */
export interface BrandConfig {
  /** Company information */
  companyName: string;
  productName: string;
  tagline: string;
  shortDescription: string;

  /** Contact information */
  emails: {
    support: string;
    hello: string;
    noreply: string;
  };

  /** Social media links */
  social: {
    twitter: string;
    github: string;
    linkedin: string;
  };

  /** SEO metadata */
  seo: {
    title: string;
    description: string;
    keywords: string[];
  };

  /** Brand colors */
  colors: {
    primary: string;
    primaryDark: string;
    accent: string;
    background: string;
    text: string;
    textLight: string;
  };

  /** Logo configuration */
  logo: {
    src: string;
    alt: string;
    text: string;
  };

  /** Domains */
  domains: {
    production: string;
    staging: string;
  };
}

/**
 * Main brand configuration object
 */
export const BRAND: BrandConfig = {
  // Company & Product Information
  companyName: 'PrivacyGecko',
  productName: 'Gecko Advisor',
  tagline: 'Watch Over Your Privacy',
  shortDescription: 'Scan and monitor privacy policies instantly with AI-powered analysis',

  // Contact Information
  emails: {
    support: 'support@geckoadvisor.com',
    hello: 'hello@geckoadvisor.com',
    noreply: 'noreply@geckoadvisor.com',
  },

  // Social Media (placeholder links - update with real accounts)
  social: {
    twitter: '@PrivacyGecko',
    github: 'github.com/privacygecko',
    linkedin: 'linkedin.com/company/privacygecko',
  },

  // SEO Metadata
  seo: {
    title: 'Gecko Advisor - Privacy Policy Scanner by PrivacyGecko',
    description: 'Scan and monitor privacy policies with Gecko Advisor. Get instant privacy scores, track changes, and protect your data with our AI-powered privacy scanner.',
    keywords: [
      'privacy policy scanner',
      'privacy monitoring',
      'GDPR compliance',
      'data protection',
      'privacy advisor',
      'privacy score',
      'privacy analysis',
      'website privacy',
      'privacy tracker',
    ],
  },

  // Brand Colors - Gecko Green Theme
  colors: {
    primary: '#2ecc71',      // Gecko green - main brand color
    primaryDark: '#27ae60',  // Darker green - hover states
    accent: '#3498db',       // Trust blue - links and info
    background: '#ffffff',   // Clean white background
    text: '#333333',         // Dark gray for text
    textLight: '#666666',    // Light gray for secondary text
  },

  // Logo Configuration
  logo: {
    src: '/images/GeckoAdvisor_Logo.png',  // PNG logo image
    alt: 'Gecko Advisor by PrivacyGecko',  // Alt text for accessibility
    text: 'Gecko Advisor',                  // Text logo fallback
  },

  // Domain Configuration
  domains: {
    production: 'geckoadvisor.com',
    staging: 'stage.geckoadvisor.com',
  },
};

/**
 * Helper function to get the full page title
 * @param pageTitle - Optional page-specific title
 * @returns Complete page title with branding
 */
export function getPageTitle(pageTitle?: string): string {
  if (!pageTitle) {
    return BRAND.seo.title;
  }
  return `${pageTitle} | ${BRAND.productName} by ${BRAND.companyName}`;
}

/**
 * Helper function to get social media URL
 * @param platform - Social media platform
 * @returns Full URL for the social media profile
 */
export function getSocialUrl(platform: keyof BrandConfig['social']): string {
  const handle = BRAND.social[platform];

  switch (platform) {
    case 'twitter':
      return `https://twitter.com/${handle.replace('@', '')}`;
    case 'github':
      return `https://${handle}`;
    case 'linkedin':
      return `https://${handle}`;
    default:
      return '#';
  }
}

/**
 * Helper function to get current domain based on environment
 * @returns Current domain (production or staging)
 */
export function getCurrentDomain(): string {
  if (typeof window === 'undefined') {
    return BRAND.domains.production;
  }

  const hostname = window.location.hostname;
  if (hostname.includes('stage.')) {
    return BRAND.domains.staging;
  }

  return BRAND.domains.production;
}

/**
 * Helper function to format email with mailto link
 * @param emailType - Type of email (support, hello, noreply)
 * @returns mailto: URL
 */
export function getEmailLink(emailType: keyof BrandConfig['emails']): string {
  return `mailto:${BRAND.emails[emailType]}`;
}

/**
 * Export individual brand constants for convenience
 */
export const COMPANY_NAME = BRAND.companyName;
export const PRODUCT_NAME = BRAND.productName;
export const TAGLINE = BRAND.tagline;
export const LOGO_SRC = BRAND.logo.src;

/**
 * Type re-export for use in components
 */
export type BrandConfiguration = BrandConfig;

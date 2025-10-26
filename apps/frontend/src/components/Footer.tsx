/*
SPDX-FileCopyrightText: 2025 Privacy Advisor contributors
SPDX-License-Identifier: MIT
*/
import React from 'react';
import { Link } from 'react-router-dom';
import { BRAND, getEmailLink, getSocialUrl } from '../config/branding';

/**
 * Footer Component - PrivacyGecko Branding
 *
 * Comprehensive footer with PrivacyGecko branding, navigation links,
 * contact information, social media links, and copyright notice.
 *
 * Features:
 * - PrivacyGecko logo and tagline
 * - Product links (Features, Pricing, API Docs)
 * - Company links (About, Contact, Email)
 * - Legal links (Privacy Policy, Terms of Service)
 * - Social media links (Twitter, GitHub, LinkedIn)
 * - Copyright notice
 * - Responsive grid layout
 * - WCAG AA accessible
 *
 * @example
 * <Footer />
 */
export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-50 border-t border-gray-200 mt-auto" role="contentinfo">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
          {/* Brand Column */}
          <div className="col-span-1 sm:col-span-2 lg:col-span-1">
            <Link
              to="/"
              className="inline-block mb-3 group hover:opacity-80 transition-opacity"
              aria-label="Gecko Advisor Home"
            >
              <img
                src={BRAND.logo.src}
                alt={BRAND.logo.alt}
                className="h-10 w-auto object-contain"
              />
            </Link>
            <p className="text-sm text-gecko-600 font-semibold mb-2">
              {BRAND.tagline}
            </p>
            <p className="text-sm text-gray-600 leading-relaxed">
              {BRAND.shortDescription}
            </p>

            {/* Social Media Links */}
            <div className="flex items-center gap-4 mt-4">
              <a
                href={getSocialUrl('twitter')}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-gecko-600 transition-colors"
                aria-label="Follow us on Twitter"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                </svg>
              </a>
              <a
                href={getSocialUrl('github')}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-gecko-600 transition-colors"
                aria-label="View our code on GitHub"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
              </a>
              <a
                href={getSocialUrl('linkedin')}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-gecko-600 transition-colors"
                aria-label="Connect with us on LinkedIn"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" clipRule="evenodd" />
                </svg>
              </a>
            </div>
          </div>

          {/* Product Column */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
              Product
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  to="/"
                  className="text-sm text-gray-600 hover:text-gecko-600 transition-colors"
                >
                  Features
                </Link>
              </li>
              <li>
                <Link
                  to="/docs"
                  className="text-sm text-gray-600 hover:text-gecko-600 transition-colors"
                >
                  API Docs
                </Link>
              </li>
              <li>
                <Link
                  to="/compare"
                  className="text-sm text-gray-600 hover:text-gecko-600 transition-colors"
                >
                  Compare Sites
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/privacygecko/gecko-advisor"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-600 hover:text-gecko-600 transition-colors"
                >
                  View on GitHub
                </a>
              </li>
            </ul>
          </div>

          {/* Company Column */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
              Company
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  to="/about"
                  className="text-sm text-gray-600 hover:text-gecko-600 transition-colors"
                >
                  About
                </Link>
              </li>
              <li>
                <a
                  href={getEmailLink('hello')}
                  className="text-sm text-gray-600 hover:text-gecko-600 transition-colors"
                >
                  Contact
                </a>
              </li>
              <li>
                <a
                  href={getEmailLink('hello')}
                  className="text-sm text-gray-600 hover:text-gecko-600 transition-colors"
                >
                  {BRAND.emails.hello}
                </a>
              </li>
              <li>
                <a
                  href={getEmailLink('support')}
                  className="text-sm text-gray-600 hover:text-gecko-600 transition-colors"
                >
                  Support
                </a>
              </li>
            </ul>
          </div>

          {/* Legal Column */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
              Legal
            </h3>
            <ul className="space-y-3">
              <li>
                <a
                  href="/privacy.html"
                  className="text-sm text-gray-600 hover:text-gecko-600 transition-colors"
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <a
                  href="/terms.html"
                  className="text-sm text-gray-600 hover:text-gecko-600 transition-colors"
                >
                  Terms of Service
                </a>
              </li>
              <li>
                <a
                  href="/NOTICE.md"
                  className="text-sm text-gray-600 hover:text-gecko-600 transition-colors"
                >
                  Notice
                </a>
              </li>
              <li>
                <a
                  href="/LICENSE-THIRD-PARTY.md"
                  className="text-sm text-gray-600 hover:text-gecko-600 transition-colors"
                >
                  Licenses
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-200 mt-8 pt-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            {/* Copyright */}
            <p className="text-sm text-gray-500 text-center sm:text-left">
              © {currentYear} {BRAND.companyName}. All rights reserved.
            </p>

            {/* Additional Links */}
            <div className="flex items-center gap-4 sm:gap-6 text-xs sm:text-sm text-gray-500 flex-wrap justify-center sm:justify-end">
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4 text-gecko-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
                Open Source
              </span>
              <span>100% Free Forever</span>
              <span>No Limits</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

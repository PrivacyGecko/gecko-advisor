/*
SPDX-FileCopyrightText: 2025 Privacy Advisor contributors
SPDX-License-Identifier: MIT
*/
import React from 'react';

export default function AboutCredits() {
  return (
    <div className="prose max-w-none p-6">
      <h1>About & Credits</h1>
      <p>
        Privacy Advisor provides explainable privacy checks for user-submitted URLs.
        It uses bundled, offline lists for deterministic scans in tests and production.
      </p>

      <h2>Data Sources</h2>
      <ul>
        <li>
          EasyPrivacy — attribution provided; used server-side. <a href="https://easylist.to/" target="_blank" rel="noreferrer">Site</a>
        </li>
        <li>
          WhoTracks.me — data under CC BY 4.0. <a href="https://whotracks.me/" target="_blank" rel="noreferrer">Site</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">License</a>
        </li>
        <li>
          Public Suffix List — maintained by Mozilla contributors. <a href="https://publicsuffix.org/" target="_blank" rel="noreferrer">Site</a>
        </li>
      </ul>

      <h2>Legal</h2>
      <ul>
        <li><a href="/terms.html">Terms of Use</a></li>
        <li><a href="/privacy.html">Privacy Policy</a></li>
        <li><a href="/NOTICE.md">NOTICE</a></li>
        <li><a href="/LICENSE-THIRD-PARTY.md">Third-Party Licenses</a></li>
      </ul>

      <h2>Scanning Policy</h2>
      <p>
        We only scan URLs explicitly submitted by users. Crawls are shallow (≤10 pages or ≤10s) and rate-limited.
        For concerns, contact us via the link in the footer.
      </p>
    </div>
  );
}

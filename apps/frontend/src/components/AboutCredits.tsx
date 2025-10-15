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
          <strong>EasyPrivacy</strong> — Dual licensed (GPL v3 + Creative Commons BY-SA 3.0). Used server-side for tracker detection.
          <br />
          <a href="https://easylist.to/" target="_blank" rel="noreferrer">Official Site</a> ·
          <a href="https://easylist.to/easylist/easyprivacy.txt" target="_blank" rel="noreferrer">License Info</a> ·
          <a href="https://github.com/easylist/easylist" target="_blank" rel="noreferrer">GitHub</a>
          <br />
          <em>Attribution: EasyPrivacy filter list by EasyList contributors (easylist.to)</em>
        </li>
        <li>
          <strong>WhoTracks.me</strong> — Tracker database under Creative Commons Attribution 4.0 International License.
          <br />
          <a href="https://whotracks.me/" target="_blank" rel="noreferrer">Official Site</a> ·
          <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0 License</a> ·
          <a href="https://github.com/ghostery/whotracks.me" target="_blank" rel="noreferrer">GitHub</a>
          <br />
          <em>Attribution: WhoTracks.me data by Ghostery GmbH, used under CC BY 4.0</em>
        </li>
        <li>
          <strong>Public Suffix List</strong> — Maintained by Mozilla contributors under Mozilla Public License.
          <br />
          <a href="https://publicsuffix.org/" target="_blank" rel="noreferrer">Official Site</a> ·
          <a href="https://github.com/publicsuffix/list" target="_blank" rel="noreferrer">GitHub</a>
        </li>
      </ul>

      <h2>Fonts</h2>
      <ul>
        <li>
          <strong>Inter Font</strong> — Created by Rasmus Andersson, licensed under SIL Open Font License 1.1.
          <br />
          <a href="https://github.com/rsms/inter" target="_blank" rel="noreferrer">GitHub</a> ·
          <a href="https://rsms.me/inter/" target="_blank" rel="noreferrer">Official Site</a> ·
          <a href="/fonts/OFL.txt" target="_blank" rel="noreferrer">OFL License</a>
          <br />
          <em>Copyright © 2020 The Inter Project Authors</em>
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

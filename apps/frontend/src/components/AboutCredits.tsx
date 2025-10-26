/*
SPDX-FileCopyrightText: 2025 Privacy Advisor contributors
SPDX-License-Identifier: MIT
*/
import React from 'react';

export default function AboutCredits() {
  return (
    <div className="prose max-w-none p-6">
      <h1>About & Credits</h1>

      <section className="mb-8 p-6 bg-advisor-50 border-l-4 border-advisor-600 rounded-r-lg">
        <h2 className="text-2xl font-bold text-advisor-900 mt-0">About Privacy Gecko</h2>
        <p className="text-lg text-gray-800 leading-relaxed">
          Privacy Gecko helps everyone understand how websites track and collect data. Our open-source privacy scanner reveals hidden trackers, cookies, and data collection practices—making privacy transparency accessible to all.
        </p>
        <p className="text-lg text-gray-800 leading-relaxed">
          Our open-source methodology ensures transparency and reproducibility. All scanning logic is public, deterministic, and auditable. We analyze privacy practices without collecting user data—our commitment to privacy extends to our own operations.
        </p>
        <p className="text-lg text-gray-800 leading-relaxed">
          Founded on the principle that privacy transparency benefits everyone, Privacy Gecko is free and accessible to anyone who wants to understand how websites handle their data.
        </p>

        <h3 className="text-xl font-bold text-advisor-900 mt-6 mb-3">Our Approach</h3>
        <ul className="text-base text-gray-800 space-y-2 my-4">
          <li><strong>Open-source methodology</strong> for full auditability</li>
          <li><strong>Deterministic scoring</strong> for reproducible results</li>
          <li><strong>Evidence-based analysis</strong> backed by recognized privacy databases</li>
          <li><strong>Free and accessible</strong> for everyone who cares about privacy</li>
        </ul>

        <h3 className="text-xl font-bold text-advisor-900 mt-6 mb-3">Our Values</h3>
        <ul className="text-base text-gray-800 space-y-2 my-4">
          <li><strong>Transparency:</strong> Our code, data sources, and methodology are public</li>
          <li><strong>Accuracy:</strong> We cite sources and provide evidence for every finding</li>
          <li><strong>Privacy:</strong> We don't track users while analyzing tracking</li>
          <li><strong>Accessibility:</strong> Free and open for everyone to use</li>
        </ul>
      </section>

      <h2>What We Do</h2>
      <p>
        Gecko Advisor provides explainable privacy checks for user-submitted URLs.
        It uses bundled, offline lists for deterministic scans in tests and production.
      </p>

      <h2>Data Sources & Attribution</h2>
      <p className="text-base text-gray-700 mb-4">
        Gecko Advisor's privacy analysis is powered by industry-recognized privacy databases and our own proprietary scanning engine. We transparently disclose all data sources:
      </p>
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

/*
SPDX-FileCopyrightText: 2025 Privacy Advisor contributors
SPDX-License-Identifier: MIT
*/
import React from 'react';
import Card from '../components/Card';
import Header from '../components/Header';
import Footer from '../components/Footer';
import LoginModal from '../components/LoginModal';
import SignupModal from '../components/SignupModal';
import ForgotPasswordModal from '../components/ForgotPasswordModal';

export default function Docs() {
  const [showLogin, setShowLogin] = React.useState(false);
  const [showSignup, setShowSignup] = React.useState(false);
  const [showForgotPassword, setShowForgotPassword] = React.useState(false);
  const [forgotEmail, setForgotEmail] = React.useState('');

  return (
    <>
      <Header onShowLogin={() => setShowLogin(true)} onShowSignup={() => setShowSignup(true)} />
      <main className="max-w-3xl mx-auto p-6 space-y-6">
        <header>
          <h1 className="text-3xl font-bold">Gecko Advisor Docs</h1>
          <p className="text-slate-600">How we compute scores and labels.</p>
        </header>
      <Card>
        <h2 id="trackers" className="text-xl font-semibold">Trackers</h2>
        <p className="text-slate-700 mt-2">
          We identify tracker domains using bundled lists (EasyPrivacy, WhoTracks.me). The count shown is the number of
          unique tracker domains observed during a shallow crawl of the site.
        </p>
      </Card>
      <Card>
        <h2 id="ssl" className="text-xl font-semibold">SSL/HTTPS</h2>
        <p className="text-slate-700 mt-2">
          SSL/HTTPS status reflects TLS grading and mixed‑content checks. If mixed content is present, we mark it Invalid.
          Otherwise, TLS grades of C/D/F are considered Weak; A/B are considered Valid.
        </p>
      </Card>
      <Card>
        <h2 id="scoring" className="text-xl font-semibold">Scoring Bands</h2>
        <p className="text-slate-700 mt-2">
          We compute a 0–100 score with three bands:
        </p>
        <ul className="list-disc pl-6 mt-2 text-slate-700">
          <li><span className="font-medium">Safe</span>: 70–100</li>
          <li><span className="font-medium">Caution</span> (labeled “Risky” internally): 40–69</li>
          <li><span className="font-medium">High Risk</span>: 0–39</li>
        </ul>
        <p className="text-slate-700 mt-2">
          Deductions consider trackers, third‑party requests, mixed content, missing security headers,
          cookie flag issues, TLS grade, and basic fingerprinting signals. See the report evidence
          for per‑item reasons.
        </p>
      </Card>
      <Card>
        <h2 id="data-sharing" className="text-xl font-semibold">Data Sharing Indicator</h2>
        <p className="text-slate-700 mt-2">
          The Data Sharing level is a heuristic derived from:
        </p>
        <ul className="list-disc pl-6 mt-2 text-slate-700">
          <li>Unique tracker domains (weighted ×2)</li>
          <li>Unique third‑party request domains (×1)</li>
          <li>Cookie issues like missing <code>Secure</code>/<code>SameSite</code> (×1)</li>
        </ul>
        <p className="text-slate-700 mt-2">
          Levels: None (0), Low (≤3), Medium (≤8), High (&gt;8). We aim to move
          this derivation to the backend for transparency and consistency.
        </p>
      </Card>
      </main>
      <Footer />
      <LoginModal
        isOpen={showLogin}
        onClose={() => setShowLogin(false)}
        onSwitchToSignup={() => {
          setShowLogin(false);
          setShowSignup(true);
        }}
        onForgotPassword={(emailValue) => {
          setForgotEmail(emailValue ?? '');
          setShowLogin(false);
          setShowForgotPassword(true);
        }}
      />
      <SignupModal
        isOpen={showSignup}
        onClose={() => setShowSignup(false)}
        onSwitchToLogin={() => {
          setShowSignup(false);
          setShowLogin(true);
        }}
      />
      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
        onBackToLogin={() => setShowLogin(true)}
        defaultEmail={forgotEmail}
      />
    </>
  );
}

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
import { useSearchParams } from 'react-router-dom';

export default function Compare() {
  const [sp, setSp] = useSearchParams();
  const left = sp.get('left') || '';
  const right = sp.get('right') || '';
  const [input, setInput] = React.useState(right);
  const [showLogin, setShowLogin] = React.useState(false);
  const [showSignup, setShowSignup] = React.useState(false);
  const [showForgotPassword, setShowForgotPassword] = React.useState(false);
  const [forgotEmail, setForgotEmail] = React.useState('');

  function addRight() {
    const s = new URLSearchParams(sp);
    if (input) s.set('right', input);
    setSp(s, { replace: true });
  }

  return (
    <>
      <Header onShowLogin={() => setShowLogin(true)} onShowSignup={() => setShowSignup(true)} />
      <div className="max-w-5xl mx-auto p-6 space-y-4">
        <h1 className="text-2xl font-bold">Compare Reports (beta)</h1>
      <div className="flex gap-4">
        <Card>
          <div className="font-semibold mb-2">Left</div>
          {left ? (
            <a className="text-security-blue underline" href={`/r/${left}`}>{left}</a>
          ) : (
            <div className="text-slate-500">Add left via the Compare button on a report.</div>
          )}
        </Card>
        <Card>
          <div className="font-semibold mb-2">Right</div>
          {right ? (
            <a className="text-security-blue underline" href={`/r/${right}`}>{right}</a>
          ) : (
            <div className="flex gap-2">
              <input value={input} onChange={(e) => setInput(e.target.value)} className="border rounded px-2 py-1" placeholder="enter report slug" />
              <button className="px-3 py-1 rounded bg-security-blue text-white" onClick={addRight}>Add</button>
            </div>
          )}
        </Card>
      </div>
      {(left && right) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <iframe title="left" src={`/r/${left}`} className="w-full h-[70vh] border rounded" />
          <iframe title="right" src={`/r/${right}`} className="w-full h-[70vh] border rounded" />
        </div>
      )}
      </div>
      <Footer />
      <LoginModal
        isOpen={showLogin}
        onClose={() => setShowLogin(false)}
        onForgotPassword={(emailValue) => {
          setForgotEmail(emailValue ?? '');
          setShowLogin(false);
          setShowForgotPassword(true);
        }}
        onSwitchToSignup={() => {
          setShowLogin(false);
          setShowSignup(true);
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

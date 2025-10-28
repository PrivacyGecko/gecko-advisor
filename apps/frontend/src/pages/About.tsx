/*
SPDX-FileCopyrightText: 2025 Privacy Advisor contributors
SPDX-License-Identifier: MIT
*/
import React from 'react';
import AboutCredits from '../components/AboutCredits';
import Footer from '../components/Footer';
import Header from '../components/Header';
import LoginModal from '../components/LoginModal';
import SignupModal from '../components/SignupModal';
import ForgotPasswordModal from '../components/ForgotPasswordModal';

export default function AboutRoute() {
  const [showLogin, setShowLogin] = React.useState(false);
  const [showSignup, setShowSignup] = React.useState(false);
  const [showForgotPassword, setShowForgotPassword] = React.useState(false);
  const [forgotEmail, setForgotEmail] = React.useState('');

  return (
    <>
      <Header onShowLogin={() => setShowLogin(true)} onShowSignup={() => setShowSignup(true)} />
      <main className="max-w-5xl mx-auto p-6">
        <AboutCredits />
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

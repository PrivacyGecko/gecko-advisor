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

export default function AboutRoute() {
  const [showLogin, setShowLogin] = React.useState(false);
  const [showSignup, setShowSignup] = React.useState(false);

  return (
    <>
      <Header onLoginClick={() => setShowLogin(true)} onSignupClick={() => setShowSignup(true)} />
      <div className="max-w-5xl mx-auto p-6">
        <AboutCredits />
        <Footer />
      </div>
      <LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} />
      <SignupModal isOpen={showSignup} onClose={() => setShowSignup(false)} />
    </>
  );
}

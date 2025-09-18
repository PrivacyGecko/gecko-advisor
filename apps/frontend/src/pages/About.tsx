/*
SPDX-FileCopyrightText: 2025 Privacy Advisor contributors
SPDX-License-Identifier: MIT
*/
import React from 'react';
import AboutCredits from '../components/AboutCredits';
import Footer from '../components/Footer';

export default function AboutRoute() {
  return (
    <div className="max-w-5xl mx-auto p-6">
      <AboutCredits />
      <Footer />
    </div>
  );
}

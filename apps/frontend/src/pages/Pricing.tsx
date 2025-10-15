/*
SPDX-FileCopyrightText: 2025 Privacy Advisor contributors
SPDX-License-Identifier: MIT
*/
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { BRAND } from '../config/branding';
import Header from '../components/Header';
import Footer from '../components/Footer';
import LoginModal from '../components/LoginModal';
import SignupModal from '../components/SignupModal';

/**
 * PricingTier Interface
 * Defines the structure for pricing tier data
 */
interface PricingFeature {
  text: string;
  included: boolean;
  highlight?: boolean;
  comingSoon?: boolean;
}

interface PricingTier {
  name: string;
  price: string;
  period: string;
  description: string;
  features: PricingFeature[];
  cta: string;
  ctaVariant: 'primary' | 'secondary';
  popular?: boolean;
}

/**
 * FAQ Interface
 */
interface FAQItem {
  question: string;
  answer: string;
}

/**
 * Pricing Page Component - Gecko Advisor
 *
 * Comprehensive pricing page with FREE vs PRO tier comparison,
 * feature breakdown, FAQ section, and conversion-optimized design.
 *
 * Features:
 * - Mobile-responsive pricing cards with Gecko branding
 * - Clear feature comparison with visual hierarchy
 * - PRO tier stands out with gradient and "Most Popular" badge
 * - Trust indicators and social proof elements
 * - FAQ accordion for common questions
 * - WCAG AA compliant accessibility
 * - Integration with AuthContext for personalized CTAs
 *
 * Design Philosophy:
 * - Privacy-focused messaging
 * - No dark patterns
 * - Clear value propositions
 * - Friendly but professional tone
 * - Gecko green (#2ecc71) for brand reinforcement
 *
 * @example
 * <Pricing />
 */
export default function Pricing() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);

  const isPro = user?.subscription === 'PRO' || user?.subscription === 'TEAM';

  // Pricing tiers configuration
  const pricingTiers: PricingTier[] = [
    {
      name: 'FREE',
      price: '$0',
      period: 'forever',
      description: 'Perfect for occasional privacy checks',
      features: [
        { text: '3 scans per day', included: true },
        { text: '7-day scan history', included: true },
        { text: 'Basic privacy scores', included: true },
        { text: 'Shareable public reports', included: true },
        { text: 'Community support', included: true },
        { text: 'Advanced privacy insights', included: false },
        { text: 'Private scan results', included: false },
        { text: 'API access', included: false },
      ],
      cta: 'Get Started Free',
      ctaVariant: 'secondary',
    },
    {
      name: 'PRO',
      price: '$4.99',
      period: 'per month',
      description: 'For privacy-conscious users and professionals',
      features: [
        { text: 'Unlimited scans', included: true, highlight: true },
        { text: '90-day scan history', included: true },
        { text: 'Advanced privacy insights', included: true, highlight: true },
        { text: 'Private scan results', included: true },
        { text: 'API access', included: true, comingSoon: true },
        { text: 'Priority email support', included: true },
        { text: 'Batch scanning', included: true, comingSoon: true },
        { text: 'Custom alerts', included: true, comingSoon: true },
      ],
      cta: 'Upgrade to Pro',
      ctaVariant: 'primary',
      popular: true,
    },
  ];

  // FAQ data
  const faqs: FAQItem[] = [
    {
      question: 'What happens when I exceed the FREE tier limit?',
      answer:
        'On the FREE tier, you can perform 3 scans per day. Once you reach this limit, you\'ll need to wait until the next day (resets at midnight UTC) or upgrade to PRO for unlimited scans.',
    },
    {
      question: 'Can I upgrade or downgrade at any time?',
      answer:
        'Yes! You can upgrade to PRO at any time for immediate benefits. If you downgrade from PRO to FREE, you\'ll retain PRO features until the end of your billing period, then automatically switch to FREE.',
    },
    {
      question: 'What payment methods do you accept?',
      answer:
        'We accept all major credit cards (Visa, Mastercard, American Express, Discover) through our secure payment processor Stripe. We do not store your payment information.',
    },
    {
      question: 'Is my payment information secure?',
      answer:
        'Absolutely. We use Stripe, an industry-leading payment processor, to handle all transactions. Your payment information is encrypted and never stored on our servers. We are PCI compliant.',
    },
    {
      question: 'What are "Advanced privacy insights"?',
      answer:
        'Advanced privacy insights include detailed tracker analysis, cookie classification, third-party request breakdowns, historical trend analysis, and actionable recommendations for improving your privacy posture.',
    },
    {
      question: 'When will API access be available?',
      answer:
        'API access is currently in development and will be available to PRO users in the coming months. If you upgrade to PRO now, you\'ll automatically gain API access when it launches at no additional cost.',
    },
    {
      question: 'Do you offer refunds?',
      answer:
        'Yes, we offer a 30-day money-back guarantee. If you\'re not satisfied with PRO for any reason within the first 30 days, contact support@geckoadvisor.com for a full refund.',
    },
    {
      question: 'Can I use Gecko Advisor for commercial purposes?',
      answer:
        'Yes! Both FREE and PRO tiers can be used for commercial purposes. PRO tier is recommended for businesses that need to scan multiple sites regularly or require API access.',
    },
  ];

  // Handle CTA clicks
  const handleFreeCTA = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      setShowSignupModal(true);
    }
  };

  const handleProCTA = async () => {
    if (isPro) {
      navigate('/dashboard');
      return;
    }

    // Require login first
    if (!user || !token) {
      setShowSignupModal(true);
      return;
    }

    setIsCheckoutLoading(true);

    try {
      // Call backend to create Stripe checkout session
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to create checkout session');
      }

      const { url } = await response.json();

      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (error) {
      console.error('Checkout error:', error);
      alert(
        'Failed to start checkout process.\n\n' +
        'Please try again or contact support@geckoadvisor.com if the problem persists.'
      );
      setIsCheckoutLoading(false);
    }
  };

  // Toggle FAQ accordion
  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  return (
    <>
      <Header onShowLogin={() => setShowLoginModal(true)} onShowSignup={() => setShowSignupModal(true)} />

      <main className="bg-white">
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-gecko-50 to-white py-16 sm:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            {/* Logo */}
            <div className="mb-6 flex justify-center">
              <img
                src={BRAND.logo.src}
                alt={BRAND.logo.alt}
                className="h-20 w-auto object-contain"
              />
            </div>

            {/* Heading */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
              Simple, Transparent Pricing
            </h1>

            {/* Subheading */}
            <p className="text-xl sm:text-2xl text-gray-600 max-w-3xl mx-auto mb-4">
              Choose the plan that fits your privacy needs
            </p>

            {/* Value proposition */}
            <p className="text-base sm:text-lg text-gray-500 max-w-2xl mx-auto">
              Start free, upgrade when you need more. No hidden fees, no commitments, cancel anytime.
            </p>
          </div>
        </section>

        {/* Pricing Cards Section */}
        <section className="py-16 sm:py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {pricingTiers.map((tier) => (
                <div
                  key={tier.name}
                  className={`relative rounded-2xl border-2 p-8 ${
                    tier.popular
                      ? 'border-gecko-500 shadow-xl scale-105 bg-gradient-to-br from-gecko-50 to-white'
                      : 'border-gray-200 shadow-lg'
                  }`}
                  data-testid={`pricing-tier-${tier.name.toLowerCase()}`}
                >
                  {/* Popular badge */}
                  {tier.popular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <span className="bg-gradient-to-r from-gecko-500 to-gecko-600 text-white text-sm font-bold px-4 py-1.5 rounded-full shadow-md">
                        Most Popular
                      </span>
                    </div>
                  )}

                  {/* Tier name */}
                  <div className="text-center mb-6">
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">{tier.name}</h2>
                    <p className="text-gray-600">{tier.description}</p>
                  </div>

                  {/* Price */}
                  <div className="text-center mb-8">
                    <div className="flex items-baseline justify-center gap-2">
                      <span className="text-5xl font-bold text-gray-900">{tier.price}</span>
                      <span className="text-gray-500 text-lg">/ {tier.period}</span>
                    </div>
                  </div>

                  {/* CTA Button */}
                  <button
                    onClick={tier.name === 'FREE' ? handleFreeCTA : handleProCTA}
                    disabled={tier.name === 'PRO' && isCheckoutLoading}
                    className={`w-full py-4 px-6 rounded-lg font-semibold text-base transition-all shadow-md hover:shadow-lg mb-8 disabled:opacity-50 disabled:cursor-not-allowed ${
                      tier.ctaVariant === 'primary'
                        ? 'bg-gradient-to-r from-gecko-500 to-gecko-600 text-white hover:from-gecko-600 hover:to-gecko-700'
                        : 'bg-white text-gecko-600 border-2 border-gecko-500 hover:bg-gecko-50'
                    }`}
                    aria-label={tier.cta}
                  >
                    {tier.name === 'PRO' && isCheckoutLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Loading...
                      </span>
                    ) : (
                      tier.cta
                    )}
                  </button>

                  {/* Features list */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                      Features Included:
                    </h3>
                    <ul className="space-y-3">
                      {tier.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-3">
                          {/* Check/X icon */}
                          <span className="flex-shrink-0 mt-0.5">
                            {feature.included ? (
                              <svg
                                className={`w-5 h-5 ${feature.highlight ? 'text-gecko-600' : 'text-gecko-500'}`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2.5}
                                aria-hidden="true"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg
                                className="w-5 h-5 text-gray-300"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                                aria-hidden="true"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            )}
                          </span>

                          {/* Feature text */}
                          <span
                            className={`text-base ${
                              feature.included
                                ? feature.highlight
                                  ? 'text-gray-900 font-semibold'
                                  : 'text-gray-700'
                                : 'text-gray-400 line-through'
                            }`}
                          >
                            {feature.text}
                            {feature.comingSoon && (
                              <span className="ml-2 text-xs text-gecko-600 font-medium bg-gecko-100 px-2 py-0.5 rounded">
                                Coming Soon
                              </span>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Feature Comparison Section */}
        <section className="py-16 sm:py-24 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                Compare Plans
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                See which features are available in each tier
              </p>
            </div>

            {/* Comparison table */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden max-w-4xl mx-auto">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="py-4 px-6 text-left text-sm font-semibold text-gray-900">Feature</th>
                      <th className="py-4 px-6 text-center text-sm font-semibold text-gray-900">FREE</th>
                      <th className="py-4 px-6 text-center text-sm font-semibold text-gecko-600">PRO</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr>
                      <td className="py-4 px-6 text-sm text-gray-700">Daily scans</td>
                      <td className="py-4 px-6 text-center text-sm text-gray-700">3</td>
                      <td className="py-4 px-6 text-center text-sm font-semibold text-gecko-600">Unlimited</td>
                    </tr>
                    <tr>
                      <td className="py-4 px-6 text-sm text-gray-700">Scan history</td>
                      <td className="py-4 px-6 text-center text-sm text-gray-700">7 days</td>
                      <td className="py-4 px-6 text-center text-sm font-semibold text-gecko-600">90 days</td>
                    </tr>
                    <tr>
                      <td className="py-4 px-6 text-sm text-gray-700">Privacy scores</td>
                      <td className="py-4 px-6 text-center">
                        <svg
                          className="w-5 h-5 text-gecko-500 mx-auto"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2.5}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <svg
                          className="w-5 h-5 text-gecko-500 mx-auto"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2.5}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-4 px-6 text-sm text-gray-700">Advanced insights</td>
                      <td className="py-4 px-6 text-center">
                        <svg
                          className="w-5 h-5 text-gray-300 mx-auto"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <svg
                          className="w-5 h-5 text-gecko-500 mx-auto"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2.5}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-4 px-6 text-sm text-gray-700">Private scans</td>
                      <td className="py-4 px-6 text-center">
                        <svg
                          className="w-5 h-5 text-gray-300 mx-auto"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <svg
                          className="w-5 h-5 text-gecko-500 mx-auto"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2.5}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-4 px-6 text-sm text-gray-700">API access</td>
                      <td className="py-4 px-6 text-center">
                        <svg
                          className="w-5 h-5 text-gray-300 mx-auto"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <svg
                            className="w-5 h-5 text-gecko-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2.5}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-xs text-gray-500">Soon</span>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-4 px-6 text-sm text-gray-700">Support</td>
                      <td className="py-4 px-6 text-center text-sm text-gray-700">Community</td>
                      <td className="py-4 px-6 text-center text-sm font-semibold text-gecko-600">Priority</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* Trust Indicators Section */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
              {/* Trust indicator 1 */}
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-gecko-100 rounded-full flex items-center justify-center mb-4">
                  <svg
                    className="w-8 h-8 text-gecko-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Secure Payment</h3>
                <p className="text-sm text-gray-600">
                  All payments processed securely through Stripe. We never store your card details.
                </p>
              </div>

              {/* Trust indicator 2 */}
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-gecko-100 rounded-full flex items-center justify-center mb-4">
                  <svg
                    className="w-8 h-8 text-gecko-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Commitment</h3>
                <p className="text-sm text-gray-600">
                  Cancel anytime, no questions asked. Switch between plans as your needs change.
                </p>
              </div>

              {/* Trust indicator 3 */}
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-gecko-100 rounded-full flex items-center justify-center mb-4">
                  <svg
                    className="w-8 h-8 text-gecko-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">30-Day Guarantee</h3>
                <p className="text-sm text-gray-600">
                  Not satisfied? Get a full refund within 30 days, no questions asked.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 sm:py-24 bg-gray-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                Frequently Asked Questions
              </h2>
              <p className="text-lg text-gray-600">
                Everything you need to know about Gecko Advisor pricing
              </p>
            </div>

            {/* FAQ accordion */}
            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <div
                  key={index}
                  className="bg-white rounded-lg shadow-md overflow-hidden"
                  data-testid={`faq-item-${index}`}
                >
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full px-6 py-5 text-left flex items-center justify-between hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gecko-500 focus:ring-inset"
                    aria-expanded={openFaqIndex === index}
                    aria-controls={`faq-answer-${index}`}
                  >
                    <span className="text-lg font-semibold text-gray-900 pr-8">{faq.question}</span>
                    <svg
                      className={`w-5 h-5 text-gray-500 flex-shrink-0 transition-transform ${
                        openFaqIndex === index ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {openFaqIndex === index && (
                    <div
                      id={`faq-answer-${index}`}
                      className="px-6 pb-5 text-gray-700 leading-relaxed"
                      role="region"
                    >
                      {faq.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 sm:py-24 bg-gradient-to-r from-gecko-500 to-gecko-600">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
              Ready to watch over your privacy?
            </h2>
            <p className="text-xl text-gecko-50 mb-8 max-w-2xl mx-auto">
              Start scanning websites for free today. No credit card required.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleFreeCTA}
                className="px-8 py-4 bg-white text-gecko-600 rounded-lg font-semibold text-lg hover:bg-gecko-50 transition-colors shadow-lg hover:shadow-xl"
              >
                Get Started Free
              </button>
              <Link
                to="/docs"
                className="px-8 py-4 bg-gecko-700 text-white rounded-lg font-semibold text-lg hover:bg-gecko-800 transition-colors shadow-lg hover:shadow-xl"
              >
                View Documentation
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />

      {/* Modals */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSwitchToSignup={() => {
          setShowLoginModal(false);
          setShowSignupModal(true);
        }}
      />
      <SignupModal
        isOpen={showSignupModal}
        onClose={() => setShowSignupModal(false)}
        onSwitchToLogin={() => {
          setShowSignupModal(false);
          setShowLoginModal(true);
        }}
      />
    </>
  );
}

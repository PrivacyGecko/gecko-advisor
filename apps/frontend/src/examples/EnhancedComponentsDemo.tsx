/*
SPDX-FileCopyrightText: 2025 Privacy Advisor contributors
SPDX-License-Identifier: MIT

Enhanced Components Demo Page
This file demonstrates all premium visual components side-by-side with their basic versions.
Use this for visual testing and comparison during development.
*/

import React from 'react';
import ScoreDial from '../components/ScoreDial';
import EnhancedScoreDial from '../components/EnhancedScoreDial';
import EnhancedTrustIndicator from '../components/EnhancedTrustIndicator';
import EnhancedSeverityBadge from '../components/EnhancedSeverityBadge';
import EnhancedExpandControls from '../components/EnhancedExpandControls';

/**
 * Demo page showing before/after comparisons of enhanced components
 *
 * Usage:
 * 1. Add route to your router: <Route path="/demo" element={<EnhancedComponentsDemo />} />
 * 2. Visit http://localhost:5173/demo
 * 3. Compare basic vs enhanced versions
 */
export default function EnhancedComponentsDemo() {
  const [expandedCount, setExpandedCount] = React.useState(2);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-12">
      <header className="text-center space-y-3">
        <h1 className="text-4xl font-extrabold text-slate-900">
          Premium Visual Components Demo
        </h1>
        <p className="text-lg text-slate-600">
          Compare basic MVP components with premium enhanced versions
        </p>
      </header>

      {/* Score Dial Comparison */}
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Score Dial Components</h2>
          <p className="text-slate-600">
            The centerpiece component that defines brand perception
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Basic Score Dial */}
          <div className="space-y-4">
            <div className="bg-slate-50 border-2 border-slate-200 rounded-lg p-6">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
                Basic (Current)
              </h3>
              <div className="flex justify-center">
                <ScoreDial score={72} size="lg" />
              </div>
            </div>
            <ul className="text-sm text-slate-600 space-y-1">
              <li>✗ Flat colors (no gradient)</li>
              <li>✗ No animation</li>
              <li>✗ No glow effects</li>
              <li>✗ Basic accessibility patterns</li>
            </ul>
          </div>

          {/* Enhanced Score Dial */}
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-blue-50 to-white border-2 border-blue-200 rounded-lg p-6">
              <h3 className="text-sm font-semibold text-blue-600 uppercase tracking-wide mb-4">
                Enhanced (Premium)
              </h3>
              <div className="flex justify-center">
                <EnhancedScoreDial score={72} size="lg" />
              </div>
            </div>
            <ul className="text-sm text-gecko-600 space-y-1">
              <li>✓ Gradient ring (gecko 500→600)</li>
              <li>✓ 1.5s smooth animation on mount</li>
              <li>✓ Multi-layer glow effects</li>
              <li>✓ Color-blind patterns (diagonal/dots)</li>
              <li>✓ Larger badge with better typography</li>
            </ul>
          </div>
        </div>

        {/* Score Examples */}
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">All Score Ranges (Enhanced)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="text-center">
              <EnhancedScoreDial score={85} size="md" label="SAFE" />
              <p className="mt-2 text-sm text-slate-600">Safe (70-100)</p>
            </div>
            <div className="text-center">
              <EnhancedScoreDial score={55} size="md" label="CAUTION" />
              <p className="mt-2 text-sm text-slate-600">Caution (40-69)</p>
            </div>
            <div className="text-center">
              <EnhancedScoreDial score={25} size="md" label="HIGH RISK" />
              <p className="mt-2 text-sm text-slate-600">Danger (0-39)</p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Indicators Comparison */}
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Trust Indicator Cards</h2>
          <p className="text-slate-600">
            Building credibility through professional visual design
          </p>
        </div>

        <div className="space-y-6">
          {/* Basic Version */}
          <div>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Basic (Current)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-start gap-3 p-4 rounded-lg bg-gecko-50 border border-gecko-200">
                <div className="flex-shrink-0 mt-0.5">
                  <svg className="w-5 h-5 text-gecko-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gecko-900">Open source</div>
                  <p className="text-xs text-gecko-700 mt-1">Public scoring logic</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 border border-blue-200">
                <div className="flex-shrink-0 mt-0.5">
                  <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-blue-900">Privacy-first</div>
                  <p className="text-xs text-blue-700 mt-1">No tracking</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200">
                <div className="flex-shrink-0 mt-0.5">
                  <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-amber-900">Fast results</div>
                  <p className="text-xs text-amber-700 mt-1">Instant scanning</p>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Version */}
          <div>
            <h3 className="text-sm font-semibold text-blue-600 uppercase tracking-wide mb-3">
              Enhanced (Premium)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <EnhancedTrustIndicator
                variant="gecko"
                icon={
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
                title="Open source & transparent"
                description="All scoring logic is public and auditable"
              />

              <EnhancedTrustIndicator
                variant="blue"
                icon={
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                }
                title="No personal data collected"
                description="We don't track you while scanning others"
              />

              <EnhancedTrustIndicator
                variant="amber"
                icon={
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                }
                title="Results in seconds"
                description="Fast scanning with instant privacy scores"
              />
            </div>
          </div>

          <ul className="text-sm text-gecko-600 space-y-1 pl-4">
            <li>✓ Gradient backgrounds create visual depth</li>
            <li>✓ Icon containers with gradient fills and shadows</li>
            <li>✓ Hover states (shadow elevation + border color)</li>
            <li>✓ Background decoration (blurred circle)</li>
            <li>✓ Improved typography hierarchy</li>
          </ul>
        </div>
      </section>

      {/* Severity Badges Comparison */}
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Severity Badges</h2>
          <p className="text-slate-600">
            Making critical issues impossible to miss
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Basic Badges */}
          <div className="space-y-4">
            <div className="bg-slate-50 border-2 border-slate-200 rounded-lg p-6">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
                Basic (Current)
              </h3>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-xs font-medium border border-red-300">
                  <span aria-hidden="true">⚠️</span>
                  <span className="ml-1">5</span>
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-medium border border-amber-300">
                  <span aria-hidden="true">⚡</span>
                  <span className="ml-1">3</span>
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-medium border border-slate-300">
                  <span aria-hidden="true">ℹ️</span>
                  <span className="ml-1">2</span>
                </span>
              </div>
            </div>
            <ul className="text-sm text-slate-600 space-y-1">
              <li>✗ Too small (px-2 py-0.5)</li>
              <li>✗ Emoji same size as text</li>
              <li>✗ Font weight too light</li>
            </ul>
          </div>

          {/* Enhanced Badges */}
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-blue-50 to-white border-2 border-blue-200 rounded-lg p-6">
              <h3 className="text-sm font-semibold text-blue-600 uppercase tracking-wide mb-4">
                Enhanced (Premium)
              </h3>
              <div className="flex flex-wrap gap-2">
                <EnhancedSeverityBadge severity="high" count={5} />
                <EnhancedSeverityBadge severity="medium" count={3} />
                <EnhancedSeverityBadge severity="low" count={2} />
              </div>
            </div>
            <ul className="text-sm text-gecko-600 space-y-1">
              <li>✓ 150% larger (px-3 py-1.5)</li>
              <li>✓ Emoji text-base (16px)</li>
              <li>✓ Bold font weight for counts</li>
              <li>✓ Hover scale effect (105%)</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Expand Controls Comparison */}
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Expand/Collapse Controls</h2>
          <p className="text-slate-600">
            Better affordance and visual hierarchy
          </p>
        </div>

        <div className="space-y-6">
          {/* Basic Controls */}
          <div>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Basic (Current)
            </h3>
            <div className="flex items-center justify-between py-3 px-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-sm text-slate-600">
                <span className="font-medium text-slate-900">{expandedCount}</span>
                {' of '}
                <span className="font-medium text-slate-900">5</span>
                {' categories visible'}
              </div>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1.5 min-h-[36px] text-xs font-medium text-security-blue">
                  Expand all
                </button>
                <span className="text-slate-300">|</span>
                <button className="px-3 py-1.5 min-h-[36px] text-xs font-medium text-slate-600">
                  Collapse all
                </button>
              </div>
            </div>
          </div>

          {/* Enhanced Controls */}
          <div>
            <h3 className="text-sm font-semibold text-blue-600 uppercase tracking-wide mb-3">
              Enhanced (Premium)
            </h3>
            <EnhancedExpandControls
              expandedCount={expandedCount}
              totalCount={5}
              onExpandAll={() => setExpandedCount(5)}
              onCollapseAll={() => setExpandedCount(0)}
            />
          </div>

          <ul className="text-sm text-gecko-600 space-y-1 pl-4">
            <li>✓ Larger text (text-sm vs text-xs)</li>
            <li>✓ Button backgrounds for affordance</li>
            <li>✓ Proper vertical divider (not "|")</li>
            <li>✓ Border hover effects</li>
            <li>✓ Color hierarchy (blue=primary, slate=secondary)</li>
          </ul>
        </div>
      </section>

      {/* Animation Examples */}
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Animation System</h2>
          <p className="text-slate-600">
            Premium micro-interactions and smooth transitions
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Shine Effect */}
          <div className="bg-white border rounded-lg p-6 space-y-3">
            <h3 className="font-semibold text-slate-900">CTA Shine Effect</h3>
            <button className="w-full px-6 py-3 rounded-lg bg-security-blue hover:bg-blue-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 shine-effect">
              Scan Now
            </button>
            <p className="text-sm text-slate-600">Hover to see sliding gradient shine</p>
          </div>

          {/* Hover Lift */}
          <div className="bg-white border rounded-lg p-6 space-y-3">
            <h3 className="font-semibold text-slate-900">Hover Lift</h3>
            <div className="bg-gradient-to-br from-gecko-50 to-white border-2 border-gecko-200 rounded-lg p-4 hover-lift cursor-pointer">
              <p className="text-gecko-900 font-medium">Hover me!</p>
              <p className="text-sm text-gecko-600">I lift -2px on hover</p>
            </div>
            <p className="text-sm text-slate-600">Smooth translateY(-2px) on hover</p>
          </div>

          {/* Active Press */}
          <div className="bg-white border rounded-lg p-6 space-y-3">
            <h3 className="font-semibold text-slate-900">Active Press</h3>
            <button className="w-full px-6 py-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold active-press">
              Click Me
            </button>
            <p className="text-sm text-slate-600">Scales to 98% when clicked</p>
          </div>

          {/* Fade In */}
          <div className="bg-white border rounded-lg p-6 space-y-3">
            <h3 className="font-semibold text-slate-900">Fade & Slide</h3>
            <div className="space-y-2">
              <div className="bg-blue-50 border border-blue-200 rounded p-3 animate-fade-in" style={{ animationDelay: '0ms' }}>
                <p className="text-sm text-blue-900">Fades in (0ms)</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded p-3 animate-slide-up" style={{ animationDelay: '150ms' }}>
                <p className="text-sm text-blue-900">Slides up (150ms)</p>
              </div>
            </div>
            <p className="text-sm text-slate-600">Staggered entrance animations</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center text-sm text-slate-500 border-t pt-6">
        <p>All components are production-ready, fully accessible (WCAG AA), and respect prefers-reduced-motion.</p>
        <p className="mt-2">See PREMIUM_COMPONENTS_INTEGRATION.md for implementation guide.</p>
      </footer>
    </div>
  );
}

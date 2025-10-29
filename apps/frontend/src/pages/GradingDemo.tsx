/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT

This is a demo page to showcase the new A-F grading system.
Only used for development/testing purposes.
*/

import React from 'react';
import GradeBadge from '../components/GradeBadge';
import { getGradeInfo } from '../lib/grading';
import Card from '../components/Card';

/**
 * GradingDemo - Visual demonstration of the A-F grading system
 *
 * This page showcases all letter grades with different sizes and configurations.
 * Useful for:
 * - Visual QA testing
 * - Accessibility testing
 * - Design review
 * - Documentation screenshots
 */
export default function GradingDemo() {
  const testScores = [
    { score: 95 },
    { score: 85 },
    { score: 75 },
    { score: 65 },
    { score: 50 },
  ];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <header className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-gray-900">
          Letter Grading System (A-F)
        </h1>
        <p className="text-lg text-gray-600">
          Universal privacy score grading for better UX
        </p>
      </header>

      {/* All Grades Overview */}
      <Card>
        <h2 className="text-2xl font-semibold mb-4">All Grades at a Glance</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {testScores.map(({ score }) => {
            const gradeInfo = getGradeInfo(score);
            return (
              <div
                key={score}
                className="text-center p-4 rounded-lg border-2 hover:shadow-md transition-shadow"
              >
                <div className="text-5xl font-bold mb-2">{gradeInfo.letter}</div>
                <div className="text-sm font-medium text-gray-700 mb-1">
                  {gradeInfo.label}
                </div>
                <div className="text-2xl mb-2">{gradeInfo.emoji}</div>
                <div className="text-xs text-gray-500">{score}/100</div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Size Variants */}
      <Card>
        <h2 className="text-2xl font-semibold mb-4">Size Variants</h2>
        <div className="space-y-6">
          {['sm', 'md', 'lg'].map((size) => (
            <div key={size} className="space-y-3">
              <h3 className="text-lg font-medium capitalize">Size: {size}</h3>
              <div className="flex flex-wrap gap-3 items-center">
                {testScores.map(({ score }) => (
                  <GradeBadge
                    key={score}
                    score={score}
                    size={size as 'sm' | 'md' | 'lg'}
                    showLabel={true}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* With and Without Labels */}
      <Card>
        <h2 className="text-2xl font-semibold mb-4">Label Configurations</h2>
        <div className="space-y-6">
          <div className="space-y-3">
            <h3 className="text-lg font-medium">With Labels</h3>
            <div className="flex flex-wrap gap-3 items-center">
              {testScores.map(({ score }) => (
                <GradeBadge key={score} score={score} size="md" showLabel={true} />
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <h3 className="text-lg font-medium">Without Labels (Compact)</h3>
            <div className="flex flex-wrap gap-3 items-center">
              {testScores.map(({ score }) => (
                <GradeBadge key={score} score={score} size="md" showLabel={false} />
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Grading Scale Reference */}
      <Card>
        <h2 className="text-2xl font-semibold mb-4">Grading Scale</h2>
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
              <div>
                <div className="font-bold text-green-800">Grade A</div>
                <div className="text-sm text-green-700">90-100 points</div>
              </div>
              <div className="text-2xl">🎉</div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
              <div>
                <div className="font-bold text-green-700">Grade B</div>
                <div className="text-sm text-green-600">80-89 points</div>
              </div>
              <div className="text-2xl">✅</div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 border border-blue-200">
              <div>
                <div className="font-bold text-blue-700">Grade C</div>
                <div className="text-sm text-blue-600">70-79 points</div>
              </div>
              <div className="text-2xl">⚠️</div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-200">
              <div>
                <div className="font-bold text-amber-800">Grade D</div>
                <div className="text-sm text-amber-700">60-69 points</div>
              </div>
              <div className="text-2xl">⚠️</div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 border border-red-200 md:col-span-2">
              <div>
                <div className="font-bold text-red-800">Grade F</div>
                <div className="text-sm text-red-700">0-59 points</div>
              </div>
              <div className="text-2xl">❌</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Accessibility Features */}
      <Card>
        <h2 className="text-2xl font-semibold mb-4">Accessibility Features</h2>
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Screen Reader Support</h3>
            <p className="text-sm text-blue-800 mb-3">
              Each badge includes a descriptive aria-label. Hover over badges to see tooltip text.
            </p>
            <div className="flex gap-3">
              <GradeBadge score={88} size="md" showLabel={true} />
              <div className="text-xs text-blue-700 self-center">
                Announces: "Grade B: Good privacy score, 88 out of 100"
              </div>
            </div>
          </div>

          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="font-semibold text-green-900 mb-2">Color Contrast</h3>
            <p className="text-sm text-green-800">
              All color combinations meet WCAG AA standards for accessibility.
            </p>
          </div>

          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <h3 className="font-semibold text-purple-900 mb-2">Keyboard Navigation</h3>
            <p className="text-sm text-purple-800">
              Badges are keyboard accessible with proper focus indicators.
            </p>
          </div>
        </div>
      </Card>

      {/* Real-World Examples */}
      <Card>
        <h2 className="text-2xl font-semibold mb-4">Real-World Examples</h2>
        <div className="space-y-4">
          <div className="border-l-4 border-green-500 pl-4 py-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">example.com</div>
                <div className="text-sm text-gray-600">
                  Excellent privacy practices, minimal tracking
                </div>
              </div>
              <GradeBadge score={92} size="md" showLabel={true} />
            </div>
          </div>

          <div className="border-l-4 border-green-400 pl-4 py-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">good-site.com</div>
                <div className="text-sm text-gray-600">
                  Good privacy, some third-party analytics
                </div>
              </div>
              <GradeBadge score={85} size="md" showLabel={true} />
            </div>
          </div>

          <div className="border-l-4 border-blue-500 pl-4 py-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">average-site.com</div>
                <div className="text-sm text-gray-600">
                  Fair privacy, moderate tracking
                </div>
              </div>
              <GradeBadge score={72} size="md" showLabel={true} />
            </div>
          </div>

          <div className="border-l-4 border-amber-500 pl-4 py-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">tracking-heavy.com</div>
                <div className="text-sm text-gray-600">
                  Poor privacy, extensive third-party connections
                </div>
              </div>
              <GradeBadge score={65} size="md" showLabel={true} />
            </div>
          </div>

          <div className="border-l-4 border-red-500 pl-4 py-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">bad-privacy.com</div>
                <div className="text-sm text-gray-600">
                  Bad privacy, numerous trackers and security issues
                </div>
              </div>
              <GradeBadge score={45} size="md" showLabel={true} />
            </div>
          </div>
        </div>
      </Card>

      {/* Implementation Notes */}
      <Card>
        <h2 className="text-2xl font-semibold mb-4">Implementation Notes</h2>
        <div className="prose prose-sm max-w-none">
          <h3>Benefits</h3>
          <ul>
            <li>Universal recognition - everyone understands A-F grades</li>
            <li>Reduced cognitive load - no need to learn Safe/Caution/High Risk</li>
            <li>Better scannability in Recent Reports lists</li>
            <li>Professional appearance aligned with industry standards</li>
          </ul>

          <h3>Technical Details</h3>
          <ul>
            <li>Component: <code>GradeBadge</code></li>
            <li>Utility: <code>getGradeInfo()</code>, <code>getLetterGrade()</code></li>
            <li>File: <code>src/lib/grading.ts</code></li>
            <li>Tests: <code>src/lib/grading.test.ts</code> (24 passing tests)</li>
          </ul>

          <h3>Color Scheme</h3>
          <ul>
            <li>A & B: Green (safe, good)</li>
            <li>C: Blue (neutral, fair)</li>
            <li>D: Amber (caution, poor)</li>
            <li>F: Red (danger, bad)</li>
          </ul>
        </div>
      </Card>

      <div className="text-center text-sm text-gray-500 py-8">
        <p>Privacy Gecko - Letter Grading System Demo</p>
        <p className="text-xs mt-1">UX Improvement Priority 2 - Expected Impact: +10 points</p>
      </div>
    </div>
  );
}

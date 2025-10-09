/*
SPDX-FileCopyrightText: 2025 Privacy Advisor contributors
SPDX-License-Identifier: MIT
*/
import React from 'react';
import ProgressDial from './ProgressDial';
import clsx from 'clsx';

export interface ScanProgressProps {
  /** Current progress percentage (0-100) */
  progress: number;
  /** Current scan status */
  status: 'pending' | 'processing' | 'done' | 'error';
  /** Current step being processed */
  currentStep?: string;
  /** Estimated time remaining */
  estimatedTimeRemaining?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Detailed scan progress component with step-by-step visualization
 *
 * Features:
 * - Visual progress indication with steps
 * - Estimated time remaining
 * - Accessibility compliant with ARIA live regions
 * - Responsive design for mobile and desktop
 * - Real-time progress updates
 */
const ScanProgress = React.memo(function ScanProgress({
  progress,
  status,
  currentStep,
  estimatedTimeRemaining,
  className = ''
}: ScanProgressProps) {
  // Define scan steps with their typical progress ranges
  const scanSteps = [
    { id: 'initial', label: 'Initializing scan', range: [0, 10], icon: '🔄' },
    { id: 'fetch', label: 'Fetching website', range: [10, 25], icon: '📥' },
    { id: 'analyze', label: 'Analyzing content', range: [25, 50], icon: '🔍' },
    { id: 'trackers', label: 'Checking trackers', range: [50, 70], icon: '🎯' },
    { id: 'security', label: 'Security analysis', range: [70, 85], icon: '🔒' },
    { id: 'privacy', label: 'Privacy assessment', range: [85, 95], icon: '🛡️' },
    { id: 'finalize', label: 'Finalizing report', range: [95, 100], icon: '✅' }
  ];

  // Determine current step based on progress
  const getCurrentStep = () => {
    for (const step of scanSteps) {
      if (progress >= step.range[0] && progress <= step.range[1]) {
        return step;
      }
    }
    return scanSteps[scanSteps.length - 1];
  };

  const activeStep = getCurrentStep();

  // Format time remaining
  const formatTimeRemaining = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${Math.round(remainingSeconds)}s`;
  };

  // Get status color and message
  const getStatusInfo = () => {
    switch (status) {
      case 'pending':
        return { color: 'text-blue-600', bgColor: 'bg-blue-50', message: 'Starting scan...' };
      case 'processing':
        return { color: 'text-blue-600', bgColor: 'bg-blue-50', message: 'Scanning in progress...' };
      case 'done':
        return { color: 'text-green-600', bgColor: 'bg-green-50', message: 'Scan completed!' };
      case 'error':
        return { color: 'text-red-600', bgColor: 'bg-red-50', message: 'Scan failed' };
      default:
        return { color: 'text-gray-600', bgColor: 'bg-gray-50', message: 'Unknown status' };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Main progress display */}
      <div className="flex flex-col items-center text-center space-y-4">
        <ProgressDial percent={progress} />

        {/* Status and current step */}
        <div
          className={clsx(
            'px-4 py-2 rounded-full text-sm font-medium transition-colors',
            statusInfo.bgColor,
            statusInfo.color
          )}
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <span className="mr-2" aria-hidden="true">{activeStep.icon}</span>
          {currentStep || activeStep.label}
        </div>

        {/* Time remaining */}
        {estimatedTimeRemaining && estimatedTimeRemaining > 0 && status === 'processing' && (
          <div className="text-sm text-gray-600">
            Estimated time remaining: {formatTimeRemaining(estimatedTimeRemaining)}
          </div>
        )}
      </div>

      {/* Step progress visualization */}
      <div className="space-y-3">
        <div className="text-sm font-medium text-gray-700 text-center">
          Scan Progress
        </div>

        <div className="space-y-2">
          {scanSteps.map((step, index) => {
            const isCompleted = progress > step.range[1];
            const isActive = progress >= step.range[0] && progress <= step.range[1];
            const isPending = progress < step.range[0];

            return (
              <div
                key={step.id}
                className={clsx(
                  'flex items-center gap-2 sm:gap-3 p-2 rounded-lg transition-all duration-300',
                  {
                    'bg-green-50 border border-green-200': isCompleted,
                    'bg-blue-50 border border-blue-200 shadow-sm': isActive,
                    'bg-gray-50 border border-gray-200': isPending
                  }
                )}
                data-testid={`scan-step-${step.id}`}
              >
                {/* Step icon */}
                <div
                  className={clsx(
                    'w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm transition-colors flex-shrink-0',
                    {
                      'bg-green-500 text-white': isCompleted,
                      'bg-blue-500 text-white animate-pulse': isActive,
                      'bg-gray-300 text-gray-600': isPending
                    }
                  )}
                  aria-hidden="true"
                >
                  {isCompleted ? '✓' : isActive ? step.icon : index + 1}
                </div>

                {/* Step label */}
                <div className="flex-1 min-w-0">
                  <div
                    className={clsx(
                      'text-xs sm:text-sm font-medium transition-colors truncate',
                      {
                        'text-green-700': isCompleted,
                        'text-blue-700': isActive,
                        'text-gray-500': isPending
                      }
                    )}
                  >
                    {step.label}
                  </div>

                  {/* Progress bar for active step */}
                  {isActive && (
                    <div className="mt-1 w-full bg-gray-200 rounded-full h-1 sm:h-1.5">
                      <div
                        className="bg-blue-500 h-1 sm:h-1.5 rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, ((progress - step.range[0]) / (step.range[1] - step.range[0])) * 100)}%`
                        }}
                        role="progressbar"
                        aria-valuenow={progress}
                        aria-valuemin={step.range[0]}
                        aria-valuemax={step.range[1]}
                        aria-label={`${step.label} progress`}
                      />
                    </div>
                  )}
                </div>

                {/* Step status indicator */}
                <div
                  className={clsx(
                    'text-2xs sm:text-xs px-1 sm:px-2 py-1 rounded transition-colors whitespace-nowrap',
                    {
                      'bg-green-100 text-green-700': isCompleted,
                      'bg-blue-100 text-blue-700': isActive,
                      'bg-gray-100 text-gray-500': isPending
                    }
                  )}
                >
                  {isCompleted ? 'Done' : isActive ? 'Processing' : 'Pending'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Trust indicators */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-sm text-gray-600">
        <span className="inline-flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" aria-hidden="true"/>
          Secure connection
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" aria-hidden="true"/>
          Transparent scan
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" aria-hidden="true"/>
          No data stored
        </span>
      </div>

      {/* Screen reader announcements */}
      <div className="sr-only" aria-live="assertive" aria-atomic="true">
        {status === 'processing' && `Scan progress: ${progress}% complete. Currently ${activeStep.label}.`}
        {status === 'done' && 'Scan completed successfully.'}
        {status === 'error' && 'Scan encountered an error.'}
      </div>
    </div>
  );
});

export default ScanProgress;
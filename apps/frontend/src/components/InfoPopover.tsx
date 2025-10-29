/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import React from 'react';

export interface InfoPopoverProps {
  /** Label describing the popover content */
  label: string;
  /** Content to display in the popover */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Position of the popover relative to trigger */
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

/**
 * InfoPopover component provides accessible information disclosure
 *
 * Features:
 * - WCAG AA compliant with proper ARIA labeling
 * - Enhanced keyboard navigation (Enter, Space, Escape, Tab)
 * - Screen reader support with semantic HTML
 * - Focus management and proper icon
 *
 * @param props - Component props
 * @returns JSX element representing the info popover
 */
export default function InfoPopover({
  label,
  children,
  className = '',
  placement = 'bottom'
}: InfoPopoverProps) {
  const [open, setOpen] = React.useState(false);
  const [focusedElement, setFocusedElement] = React.useState<Element | null>(null);
  const id = React.useId();
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const popoverRef = React.useRef<HTMLDivElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Focus management for accessibility
  React.useEffect(() => {
    if (open && popoverRef.current) {
      // Store the previously focused element
      setFocusedElement(document.activeElement);

      // Focus the popover for screen readers
      popoverRef.current.focus();
    } else if (!open && focusedElement) {
      // Restore focus to the previously focused element
      (focusedElement as HTMLElement).focus?.();
      setFocusedElement(null);
    }
  }, [open, focusedElement]);

  React.useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
        return;
      }

      // Enhanced keyboard navigation
      if (open && e.key === 'Tab') {
        // Trap focus within popover
        e.preventDefault();
        setOpen(false);
        buttonRef.current?.focus();
      }
    }

    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handleToggle = () => {
    setOpen(prev => !prev);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleToggle();
    }
  };

  // Position classes based on placement
  const getPositionClasses = () => {
    switch (placement) {
      case 'top':
        return 'bottom-full mb-2 left-1/2 transform -translate-x-1/2';
      case 'left':
        return 'right-full mr-2 top-1/2 transform -translate-y-1/2';
      case 'right':
        return 'left-full ml-2 top-1/2 transform -translate-y-1/2';
      case 'bottom':
      default:
        return 'top-full mt-2 left-1/2 transform -translate-x-1/2';
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative inline-block ${className}`}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        aria-describedby={`${id}-desc`}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-gray-300 text-xs text-slate-700 bg-white hover:bg-slate-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-security-blue focus:ring-offset-2 transition-colors duration-200"
        data-testid="info-popover-trigger"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 16v-4"/>
          <path d="M12 8h.01"/>
        </svg>
        <span className="sr-only">More information about {label}</span>
      </button>

      {/* Hidden description for screen readers */}
      <span id={`${id}-desc`} className="sr-only">
        Press Enter or Space to show more information about {label}
      </span>

      {open && (
        <>
          {/* Backdrop for mobile */}
          <div
            className="fixed inset-0 z-10 bg-black bg-opacity-25 sm:hidden"
            aria-hidden="true"
            onClick={() => setOpen(false)}
          />

          <div
            ref={popoverRef}
            id={id}
            role="tooltip"
            aria-label={`Information about ${label}`}
            tabIndex={-1}
            className={`absolute z-20 w-64 max-w-sm p-4 rounded-lg border border-gray-200 bg-white shadow-lg text-sm text-slate-700 ${getPositionClasses()}`}
            data-testid="info-popover-content"
          >
            {/* Arrow indicator */}
            <div
              className={`absolute w-2 h-2 bg-white border-l border-t border-gray-200 transform rotate-45 ${
                placement === 'top'
                  ? 'top-full left-1/2 -translate-x-1/2 -mt-1'
                  : placement === 'left'
                  ? 'left-full top-1/2 -translate-y-1/2 -ml-1'
                  : placement === 'right'
                  ? 'right-full top-1/2 -translate-y-1/2 -mr-1'
                  : 'bottom-full left-1/2 -translate-x-1/2 -mb-1'
              }`}
              aria-hidden="true"
            />

            {/* Content */}
            <div className="relative z-10">
              <div className="font-semibold text-gray-900 mb-2 text-xs uppercase tracking-wide">
                {label}
              </div>
              <div>
                {children}
              </div>
            </div>

            {/* Close instructions for screen readers */}
            <div className="sr-only" aria-live="polite">
              Press Escape to close this information panel and return to the previous element.
            </div>
          </div>
        </>
      )}
    </div>
  );
}

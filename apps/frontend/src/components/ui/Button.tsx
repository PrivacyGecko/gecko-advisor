import React, { forwardRef } from 'react';

/**
 * Button Component for Gecko Advisor Design System
 *
 * A comprehensive, accessible button component with consistent styling across the application.
 * Implements WCAG AA accessibility standards and supports all interaction states.
 *
 * @example
 * ```tsx
 * // Primary CTA
 * <Button variant="primary" size="lg" onClick={handleScan}>
 *   Scan Now
 * </Button>
 *
 * // Secondary action
 * <Button variant="secondary" size="md" onClick={handleCancel}>
 *   Cancel
 * </Button>
 *
 * // Loading state
 * <Button variant="primary" loading={isLoading}>
 *   Submitting...
 * </Button>
 *
 * // With icons
 * <Button variant="ghost" leftIcon={<ArrowLeftIcon />}>
 *   Back
 * </Button>
 *
 * // Full width on mobile
 * <Button variant="primary" fullWidth className="md:w-auto">
 *   Sign Up Free
 * </Button>
 * ```
 */

/**
 * Button component props interface
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Visual style variant of the button
   * - **primary**: Gecko green, high contrast, for primary actions (Sign Up, Scan Now, Upgrade)
   * - **secondary**: White/gray outline, for secondary actions (Cancel, Back)
   * - **ghost**: Transparent with gecko text, for tertiary actions (text links that need button behavior)
   * - **danger**: Red, for destructive actions (Delete, Log Out)
   *
   * @default "primary"
   */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';

  /**
   * Size variant of the button
   * - **sm**: 36px min-height, compact buttons
   * - **md**: 44px min-height, default size, meets touch target requirements
   * - **lg**: 52px min-height, hero CTAs and landing page buttons
   *
   * @default "md"
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Shows loading spinner and disables interaction
   * @default false
   */
  loading?: boolean;

  /**
   * Makes button expand to full width of container
   * @default false
   */
  fullWidth?: boolean;

  /**
   * Icon element to display on the left side of button text
   */
  leftIcon?: React.ReactNode;

  /**
   * Icon element to display on the right side of button text
   */
  rightIcon?: React.ReactNode;

  /**
   * Button content (text or elements)
   */
  children: React.ReactNode;
}

/**
 * Loading spinner component with animation
 * Respects prefers-reduced-motion for accessibility
 */
const LoadingSpinner: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    className={`animate-spin h-5 w-5 motion-reduce:animate-none ${className}`}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

/**
 * Get variant-specific Tailwind classes
 */
const getVariantClasses = (variant: ButtonProps['variant'] = 'primary'): string => {
  const variants = {
    primary: [
      'bg-gecko-500',
      'text-white',
      'shadow-md',
      'hover:bg-gecko-600',
      'hover:shadow-lg',
      'active:bg-gecko-700',
      'focus-visible:ring-gecko-500',
      'disabled:bg-gecko-500',
    ].join(' '),

    secondary: [
      'bg-white',
      'text-gray-700',
      'border-2',
      'border-gray-300',
      'shadow-sm',
      'hover:bg-gray-50',
      'hover:border-gray-400',
      'hover:shadow-md',
      'active:bg-gray-100',
      'focus-visible:ring-trust-500',
      'disabled:bg-white',
      'disabled:border-gray-300',
    ].join(' '),

    ghost: [
      'bg-transparent',
      'text-gecko-600',
      'hover:bg-gecko-50',
      'active:bg-gecko-100',
      'focus-visible:ring-gecko-500',
      'disabled:bg-transparent',
    ].join(' '),

    danger: [
      'bg-red-500',
      'text-white',
      'shadow-md',
      'hover:bg-red-600',
      'hover:shadow-lg',
      'active:bg-red-700',
      'focus-visible:ring-red-500',
      'disabled:bg-red-500',
    ].join(' '),
  };

  return variants[variant];
};

/**
 * Get size-specific Tailwind classes
 */
const getSizeClasses = (size: ButtonProps['size'] = 'md'): string => {
  const sizes = {
    sm: 'min-h-[36px] px-3 py-1.5 text-sm',
    md: 'min-h-[44px] px-4 py-2.5 text-base',
    lg: 'min-h-[52px] px-6 py-3.5 text-lg',
  };

  return sizes[size];
};

/**
 * Button Component
 *
 * A fully accessible, production-ready button with comprehensive state management,
 * icon support, and loading states. Built with TypeScript and Tailwind CSS.
 *
 * **Accessibility Features:**
 * - WCAG AA compliant color contrast
 * - Keyboard navigation support with visible focus states
 * - Screen reader compatible with proper ARIA attributes
 * - Respects prefers-reduced-motion for animations
 * - Proper disabled state management
 *
 * **Performance:**
 * - Uses React.forwardRef for advanced component composition
 * - Optimized re-renders with proper prop spreading
 * - Lightweight with minimal runtime overhead
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      leftIcon,
      rightIcon,
      children,
      className = '',
      disabled,
      type = 'button',
      ...props
    },
    ref
  ) => {
    // Combine disabled states (loading counts as disabled)
    const isDisabled = disabled || loading;

    // Build complete class string
    const buttonClasses = [
      // Base styles
      'inline-flex',
      'items-center',
      'justify-center',
      'gap-2',
      'font-medium',
      'rounded-lg',
      'transition-all',
      'duration-200',
      'ease-in-out',

      // Focus styles for accessibility
      'focus:outline-none',
      'focus-visible:ring-2',
      'focus-visible:ring-offset-2',

      // Disabled styles
      'disabled:opacity-50',
      'disabled:cursor-not-allowed',
      'disabled:shadow-none',

      // Motion preferences
      'motion-reduce:transition-none',

      // Size-specific classes
      getSizeClasses(size),

      // Variant-specific classes
      getVariantClasses(variant),

      // Full width option
      fullWidth ? 'w-full' : '',

      // Custom className
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button
        ref={ref}
        type={type}
        className={buttonClasses}
        disabled={isDisabled}
        aria-busy={loading}
        aria-disabled={isDisabled}
        {...props}
      >
        {/* Loading spinner (replaces left icon when loading) */}
        {loading && <LoadingSpinner />}

        {/* Left icon (hidden when loading) */}
        {!loading && leftIcon && (
          <span className="inline-flex shrink-0" aria-hidden="true">
            {leftIcon}
          </span>
        )}

        {/* Button text content */}
        <span className="inline-flex items-center">{children}</span>

        {/* Right icon */}
        {rightIcon && (
          <span className="inline-flex shrink-0" aria-hidden="true">
            {rightIcon}
          </span>
        )}
      </button>
    );
  }
);

// Display name for better debugging
Button.displayName = 'Button';

export default Button;

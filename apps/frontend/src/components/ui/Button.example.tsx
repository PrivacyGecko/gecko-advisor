/**
 * Button Component - Usage Examples
 *
 * This file demonstrates all variants, sizes, and states of the Button component.
 * Use these examples as a reference when implementing buttons in your features.
 *
 * To view this demo:
 * 1. Import this component in a route or page
 * 2. Render <ButtonExamples /> in your JSX
 */

import { Button } from './Button';

/**
 * Icon components for demonstration
 * In production, use your actual icon library (Heroicons, Lucide, etc.)
 */
const ScanIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
    />
  </svg>
);

const ArrowLeftIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M10 19l-7-7m0 0l7-7m-7 7h18"
    />
  </svg>
);

const TrashIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
    />
  </svg>
);

const DownloadIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
    />
  </svg>
);

/**
 * Demonstration component showing all Button variants and use cases
 */
export const ButtonExamples: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto p-8 space-y-12">
      <header className="space-y-2">
        <h1 className="text-4xl font-bold text-gray-900">Button Component</h1>
        <p className="text-lg text-gray-600">
          Gecko Advisor Design System - Comprehensive button component with accessibility and
          consistency
        </p>
      </header>

      {/* Variants Section */}
      <section className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-gray-900">Variants</h2>
          <p className="text-gray-600">Four button variants for different use cases</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3 p-6 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900">Primary</h3>
            <p className="text-sm text-gray-600">
              High-contrast gecko green for primary actions: Sign Up, Scan Now, Submit
            </p>
            <Button variant="primary">Primary Button</Button>
          </div>

          <div className="space-y-3 p-6 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900">Secondary</h3>
            <p className="text-sm text-gray-600">
              Outlined style for secondary actions: Cancel, Back, Learn More
            </p>
            <Button variant="secondary">Secondary Button</Button>
          </div>

          <div className="space-y-3 p-6 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900">Ghost</h3>
            <p className="text-sm text-gray-600">
              Transparent with gecko text for tertiary actions: View Details, Edit
            </p>
            <Button variant="ghost">Ghost Button</Button>
          </div>

          <div className="space-y-3 p-6 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900">Danger</h3>
            <p className="text-sm text-gray-600">
              Red style for destructive actions: Delete, Remove, Log Out
            </p>
            <Button variant="danger">Danger Button</Button>
          </div>
        </div>
      </section>

      {/* Sizes Section */}
      <section className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-gray-900">Sizes</h2>
          <p className="text-gray-600">Three size options to match your layout needs</p>
        </div>

        <div className="space-y-4 p-6 bg-gray-50 rounded-lg">
          <div className="flex flex-wrap items-center gap-4">
            <Button variant="primary" size="sm">
              Small (36px)
            </Button>
            <Button variant="primary" size="md">
              Medium (44px) - Default
            </Button>
            <Button variant="primary" size="lg">
              Large (52px)
            </Button>
          </div>
          <p className="text-sm text-gray-600">
            Medium size meets minimum 44px touch target for mobile accessibility
          </p>
        </div>
      </section>

      {/* States Section */}
      <section className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-gray-900">States</h2>
          <p className="text-gray-600">Interactive states with proper accessibility support</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3 p-6 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900">Normal</h3>
            <Button variant="primary">Normal State</Button>
          </div>

          <div className="space-y-3 p-6 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900">Hover</h3>
            <p className="text-sm text-gray-600">
              Hover over buttons to see shadow elevation and color changes
            </p>
            <Button variant="primary">Hover Me</Button>
          </div>

          <div className="space-y-3 p-6 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900">Disabled</h3>
            <p className="text-sm text-gray-600">50% opacity, cursor not allowed</p>
            <Button variant="primary" disabled>
              Disabled Button
            </Button>
          </div>

          <div className="space-y-3 p-6 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900">Loading</h3>
            <p className="text-sm text-gray-600">Spinner animation, interaction disabled</p>
            <Button variant="primary" loading>
              Loading...
            </Button>
          </div>

          <div className="space-y-3 p-6 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900">Focus (Keyboard)</h3>
            <p className="text-sm text-gray-600">
              Press Tab to focus - visible ring for accessibility
            </p>
            <Button variant="primary">Focus Me</Button>
          </div>
        </div>
      </section>

      {/* Icons Section */}
      <section className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-gray-900">Icons</h2>
          <p className="text-gray-600">Add icons to enhance button meaning</p>
        </div>

        <div className="space-y-4 p-6 bg-gray-50 rounded-lg">
          <div className="flex flex-wrap gap-4">
            <Button variant="primary" leftIcon={<ScanIcon />}>
              Scan Now
            </Button>
            <Button variant="secondary" leftIcon={<ArrowLeftIcon />}>
              Go Back
            </Button>
            <Button variant="danger" leftIcon={<TrashIcon />}>
              Delete
            </Button>
            <Button variant="ghost" rightIcon={<DownloadIcon />}>
              Download Report
            </Button>
          </div>
          <p className="text-sm text-gray-600">
            Icons automatically disappear when loading state is active
          </p>
          <Button variant="primary" leftIcon={<ScanIcon />} loading>
            Scanning...
          </Button>
        </div>
      </section>

      {/* Full Width Section */}
      <section className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-gray-900">Full Width</h2>
          <p className="text-gray-600">Expand buttons to container width (useful for mobile)</p>
        </div>

        <div className="space-y-4 p-6 bg-gray-50 rounded-lg">
          <Button variant="primary" fullWidth>
            Full Width Button
          </Button>
          <Button variant="secondary" fullWidth>
            Full Width Secondary
          </Button>
          <p className="text-sm text-gray-600">
            Combine with responsive classes for mobile-first design:
          </p>
          <Button variant="primary" fullWidth className="md:w-auto">
            Full Width on Mobile, Auto on Desktop
          </Button>
        </div>
      </section>

      {/* Real-World Examples Section */}
      <section className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-gray-900">Real-World Examples</h2>
          <p className="text-gray-600">Common button patterns in Gecko Advisor</p>
        </div>

        <div className="space-y-8">
          {/* Hero CTA */}
          <div className="space-y-3 p-6 bg-white border-2 border-gray-200 rounded-lg">
            <h3 className="font-medium text-gray-900">Hero Section CTA</h3>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="primary" size="lg" leftIcon={<ScanIcon />}>
                Scan Your Site Now
              </Button>
              <Button variant="secondary" size="lg">
                View Sample Report
              </Button>
            </div>
          </div>

          {/* Form Actions */}
          <div className="space-y-3 p-6 bg-white border-2 border-gray-200 rounded-lg">
            <h3 className="font-medium text-gray-900">Form Actions</h3>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" size="md">
                Cancel
              </Button>
              <Button variant="primary" size="md">
                Save Changes
              </Button>
            </div>
          </div>

          {/* Card Actions */}
          <div className="space-y-3 p-6 bg-white border-2 border-gray-200 rounded-lg">
            <h3 className="font-medium text-gray-900">Report Card Actions</h3>
            <div className="flex flex-wrap gap-3">
              <Button variant="ghost" size="sm">
                View Details
              </Button>
              <Button variant="ghost" size="sm" rightIcon={<DownloadIcon />}>
                Export
              </Button>
              <Button variant="danger" size="sm" leftIcon={<TrashIcon />}>
                Delete
              </Button>
            </div>
          </div>

          {/* Loading State in Form */}
          <div className="space-y-3 p-6 bg-white border-2 border-gray-200 rounded-lg">
            <h3 className="font-medium text-gray-900">Submit with Loading State</h3>
            <Button variant="primary" size="lg" fullWidth loading>
              Submitting Scan Request...
            </Button>
          </div>
        </div>
      </section>

      {/* Accessibility Section */}
      <section className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-gray-900">Accessibility Features</h2>
          <p className="text-gray-600">Built-in WCAG AA compliance</p>
        </div>

        <div className="space-y-4 p-6 bg-gray-50 rounded-lg">
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-gecko-500 font-bold">✓</span>
              <span>Minimum 44px touch target for medium and large sizes (mobile friendly)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gecko-500 font-bold">✓</span>
              <span>WCAG AA color contrast ratios for all variants</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gecko-500 font-bold">✓</span>
              <span>Visible focus ring for keyboard navigation (try pressing Tab)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gecko-500 font-bold">✓</span>
              <span>Proper ARIA attributes (aria-busy, aria-disabled)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gecko-500 font-bold">✓</span>
              <span>Respects prefers-reduced-motion for animations</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gecko-500 font-bold">✓</span>
              <span>Screen reader compatible with semantic HTML</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Code Examples Section */}
      <section className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-gray-900">Code Examples</h2>
          <p className="text-gray-600">Copy-paste ready implementations</p>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-gray-900 rounded-lg overflow-x-auto">
            <pre className="text-sm text-gray-100 font-mono">
              <code>{`// Import the Button component
import { Button } from '@/components/ui';

// Primary CTA with icon
<Button
  variant="primary"
  size="lg"
  leftIcon={<ScanIcon />}
  onClick={handleScan}
>
  Scan Now
</Button>

// Form submission with loading state
const [isSubmitting, setIsSubmitting] = useState(false);

<Button
  variant="primary"
  loading={isSubmitting}
  onClick={handleSubmit}
>
  {isSubmitting ? 'Submitting...' : 'Submit'}
</Button>

// Responsive full-width button
<Button
  variant="primary"
  fullWidth
  className="md:w-auto"
>
  Sign Up Free
</Button>

// Destructive action with confirmation
<Button
  variant="danger"
  leftIcon={<TrashIcon />}
  onClick={() => {
    if (confirm('Are you sure?')) {
      handleDelete();
    }
  }}
>
  Delete Report
</Button>`}</code>
            </pre>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ButtonExamples;

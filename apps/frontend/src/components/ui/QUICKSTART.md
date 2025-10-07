# Button Component - Quick Start Guide

## Installation

The Button component is already installed. Just import and use!

```tsx
import { Button } from '@/components/ui';
```

## Basic Usage

### Variants

```tsx
// Primary - Main actions (gecko green)
<Button variant="primary">Sign Up</Button>

// Secondary - Alternative actions (outlined)
<Button variant="secondary">Cancel</Button>

// Ghost - Tertiary actions (transparent)
<Button variant="ghost">View Details</Button>

// Danger - Destructive actions (red)
<Button variant="danger">Delete</Button>
```

### Sizes

```tsx
<Button size="sm">Small</Button>      // 36px height
<Button size="md">Medium</Button>     // 44px height (default)
<Button size="lg">Large</Button>      // 52px height
```

### States

```tsx
// Disabled
<Button disabled>Disabled</Button>

// Loading (shows spinner, disables interaction)
<Button loading={isLoading}>
  {isLoading ? 'Saving...' : 'Save'}
</Button>
```

### Icons

```tsx
// Left icon
<Button leftIcon={<ScanIcon />}>Scan Now</Button>

// Right icon
<Button rightIcon={<DownloadIcon />}>Download</Button>

// Both
<Button
  leftIcon={<AlertIcon />}
  rightIcon={<ArrowIcon />}
>
  Continue
</Button>
```

### Layout

```tsx
// Full width
<Button fullWidth>Full Width Button</Button>

// Responsive (full on mobile, auto on desktop)
<Button fullWidth className="md:w-auto">
  Responsive Button
</Button>
```

## Common Patterns

### Form Submit

```tsx
const [isSubmitting, setIsSubmitting] = useState(false);

<Button
  type="submit"
  variant="primary"
  loading={isSubmitting}
>
  {isSubmitting ? 'Submitting...' : 'Submit'}
</Button>
```

### Modal Actions

```tsx
<div className="flex justify-end gap-3">
  <Button variant="secondary" onClick={onClose}>
    Cancel
  </Button>
  <Button variant="primary" onClick={onConfirm}>
    Confirm
  </Button>
</div>
```

### Hero CTA

```tsx
<Button
  variant="primary"
  size="lg"
  leftIcon={<ScanIcon className="w-6 h-6" />}
  onClick={handleScan}
>
  Scan Your Site Now
</Button>
```

### Delete with Confirmation

```tsx
<Button
  variant="danger"
  size="sm"
  leftIcon={<TrashIcon />}
  onClick={() => {
    if (confirm('Are you sure?')) {
      handleDelete();
    }
  }}
>
  Delete
</Button>
```

## Props Reference

```typescript
interface ButtonProps {
  // Appearance
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';  // default: 'primary'
  size?: 'sm' | 'md' | 'lg';                               // default: 'md'

  // States
  loading?: boolean;                                        // default: false
  disabled?: boolean;                                       // default: false

  // Layout
  fullWidth?: boolean;                                      // default: false

  // Icons
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;

  // Content
  children: React.ReactNode;                                // Required

  // All standard button attributes
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';                    // default: 'button'
  className?: string;
  'aria-label'?: string;
  // ... and more
}
```

## Color Reference

| Variant   | Base Color    | Hover         | Active        |
|-----------|---------------|---------------|---------------|
| primary   | gecko-500     | gecko-600     | gecko-700     |
| secondary | white/gray    | gray-50       | gray-100      |
| ghost     | transparent   | gecko-50      | gecko-100     |
| danger    | red-500       | red-600       | red-700       |

## Accessibility

All buttons include:
- Proper ARIA attributes
- Keyboard navigation (Tab, Enter, Space)
- Visible focus ring
- Minimum 44px touch target (md/lg)
- Screen reader support

## Tips

1. **Default is Primary**: No need to specify `variant="primary"`
2. **Default is Medium**: No need to specify `size="md"`
3. **Type is Button**: No need to specify `type="button"` (only needed for submit/reset)
4. **Icons Hide on Load**: Left icon automatically replaced by spinner when loading
5. **Custom Classes**: Add `className` to extend styling (e.g., margins, responsive)

## Examples Page

See all variants, sizes, and states in action:

```tsx
import { ButtonExamples } from '@/components/ui/Button.example';

// Render in your route/page
<ButtonExamples />
```

## Migration from Manual Buttons

**Before:**
```tsx
<button className="px-6 py-3 bg-gecko-500 text-white rounded-lg hover:bg-gecko-600">
  Click Me
</button>
```

**After:**
```tsx
<Button variant="primary" size="lg">
  Click Me
</Button>
```

See `MIGRATION.md` for comprehensive migration guide.

## Need Help?

- **Examples**: Check `Button.example.tsx`
- **Migration**: See `MIGRATION.md`
- **Full Docs**: Read `README.md`
- **Source Code**: Review `Button.tsx` (has JSDoc comments)
- **Tests**: Check `Button.test.tsx` for usage patterns

## File Locations

```
apps/frontend/src/components/ui/
├── Button.tsx           - Main component
├── Button.example.tsx   - Visual examples
├── index.ts             - Exports
└── ...documentation
```

## Import Path

Always use the barrel export:
```tsx
import { Button } from '@/components/ui';
```

## Version

Created: 2025-10-07
Component Version: 1.0.0
Design System: Gecko Advisor

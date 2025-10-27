# Button Component Migration Guide

This guide helps you migrate manually-styled buttons throughout the Gecko Advisor application to use the new standardized Button component.

## Quick Reference

### Before (Manual Tailwind)
```tsx
<button
  className="px-6 py-3 bg-gecko-500 text-white rounded-lg hover:bg-gecko-600 transition-colors"
  onClick={handleClick}
>
  Click Me
</button>
```

### After (Button Component)
```tsx
import { Button } from '@/components/ui';

<Button variant="primary" size="lg" onClick={handleClick}>
  Click Me
</Button>
```

## Variant Mapping

### Primary Actions (Gecko Green)
**Before:**
```tsx
<button className="bg-gecko-500 text-white hover:bg-gecko-600 px-4 py-2 rounded">
  Sign Up
</button>
```

**After:**
```tsx
<Button variant="primary">Sign Up</Button>
```

### Secondary Actions (Outlined)
**Before:**
```tsx
<button className="bg-white text-gray-700 border-2 border-gray-300 hover:bg-gray-50 px-4 py-2 rounded">
  Cancel
</button>
```

**After:**
```tsx
<Button variant="secondary">Cancel</Button>
```

### Tertiary/Ghost Actions
**Before:**
```tsx
<button className="bg-transparent text-gecko-600 hover:bg-gecko-50 px-4 py-2 rounded">
  View Details
</button>
```

**After:**
```tsx
<Button variant="ghost">View Details</Button>
```

### Destructive Actions (Red)
**Before:**
```tsx
<button className="bg-red-500 text-white hover:bg-red-600 px-4 py-2 rounded">
  Delete
</button>
```

**After:**
```tsx
<Button variant="danger">Delete</Button>
```

## Size Mapping

### Small Buttons
**Before:**
```tsx
<button className="px-3 py-1.5 text-sm ...">Small</button>
```

**After:**
```tsx
<Button size="sm">Small</Button>
```

### Medium Buttons (Default)
**Before:**
```tsx
<button className="px-4 py-2.5 text-base ...">Medium</button>
```

**After:**
```tsx
<Button size="md">Medium</Button>
{/* or just: */}
<Button>Medium</Button>
```

### Large Buttons
**Before:**
```tsx
<button className="px-6 py-3.5 text-lg ...">Large</button>
```

**After:**
```tsx
<Button size="lg">Large</Button>
```

## State Mapping

### Disabled State
**Before:**
```tsx
<button disabled className="opacity-50 cursor-not-allowed ...">
  Disabled
</button>
```

**After:**
```tsx
<Button disabled>Disabled</Button>
```

### Loading State
**Before:**
```tsx
<button disabled className="...">
  {isLoading ? (
    <>
      <svg className="animate-spin ...">...</svg>
      Loading...
    </>
  ) : (
    'Submit'
  )}
</button>
```

**After:**
```tsx
<Button loading={isLoading}>
  {isLoading ? 'Loading...' : 'Submit'}
</Button>
```

### Full Width
**Before:**
```tsx
<button className="w-full ...">Full Width</button>
```

**After:**
```tsx
<Button fullWidth>Full Width</Button>
```

## Icon Integration

### Left Icon
**Before:**
```tsx
<button className="flex items-center gap-2 ...">
  <ScanIcon className="w-5 h-5" />
  Scan Now
</button>
```

**After:**
```tsx
<Button leftIcon={<ScanIcon className="w-5 h-5" />}>
  Scan Now
</Button>
```

### Right Icon
**Before:**
```tsx
<button className="flex items-center gap-2 ...">
  Download
  <DownloadIcon className="w-5 h-5" />
</button>
```

**After:**
```tsx
<Button rightIcon={<DownloadIcon className="w-5 h-5" />}>
  Download
</Button>
```

## Common Patterns

### Form Submit Button
**Before:**
```tsx
<button
  type="submit"
  disabled={isSubmitting}
  className="w-full bg-gecko-500 text-white px-4 py-2.5 rounded-lg hover:bg-gecko-600"
>
  {isSubmitting ? 'Submitting...' : 'Submit'}
</button>
```

**After:**
```tsx
<Button
  type="submit"
  variant="primary"
  fullWidth
  loading={isSubmitting}
>
  {isSubmitting ? 'Submitting...' : 'Submit'}
</Button>
```

### Hero CTA with Icon
**Before:**
```tsx
<button className="flex items-center gap-2 bg-gecko-500 text-white px-6 py-3.5 text-lg rounded-lg shadow-lg hover:bg-gecko-600 hover:shadow-xl transition-all">
  <ScanIcon className="w-6 h-6" />
  Scan Your Site Now
</button>
```

**After:**
```tsx
<Button
  variant="primary"
  size="lg"
  leftIcon={<ScanIcon className="w-6 h-6" />}
>
  Scan Your Site Now
</Button>
```

### Card Action Buttons
**Before:**
```tsx
<div className="flex gap-2">
  <button className="text-gecko-600 hover:bg-gecko-50 px-3 py-1.5 text-sm rounded">
    View
  </button>
  <button className="text-red-600 hover:bg-red-50 px-3 py-1.5 text-sm rounded">
    Delete
  </button>
</div>
```

**After:**
```tsx
<div className="flex gap-2">
  <Button variant="ghost" size="sm">View</Button>
  <Button variant="danger" size="sm">Delete</Button>
</div>
```

### Responsive Mobile-First Button
**Before:**
```tsx
<button className="w-full md:w-auto bg-gecko-500 text-white px-4 py-2.5 rounded">
  Sign Up
</button>
```

**After:**
```tsx
<Button variant="primary" fullWidth className="md:w-auto">
  Sign Up
</Button>
```

## Files to Migrate

Search for these patterns in the codebase to find buttons to migrate:

```bash
# Find button elements with manual styling
grep -r "className.*bg-gecko" apps/frontend/src/

# Find button elements with click handlers
grep -r "<button.*onClick" apps/frontend/src/

# Find disabled buttons
grep -r "<button.*disabled" apps/frontend/src/
```

### Priority Files (Based on Common Usage)

1. **Landing Page Components**
   - Hero section CTAs
   - Sign up buttons
   - Demo scan buttons

2. **Form Components**
   - Submit buttons
   - Cancel buttons
   - Form action buttons

3. **Modal Components**
   - LoginModal.tsx
   - SignupModal.tsx
   - Confirmation dialogs

4. **Navigation Components**
   - Header.tsx
   - Footer.tsx
   - Mobile menu buttons

5. **Report Page**
   - ReportPage.tsx
   - Scan action buttons
   - Export/share buttons

## Testing Checklist

After migrating buttons, verify:

- [ ] Visual appearance matches design system
- [ ] Hover states work correctly
- [ ] Focus states are visible (keyboard navigation)
- [ ] Loading states display spinner
- [ ] Disabled states prevent interaction
- [ ] Touch targets are at least 44px (medium/large sizes)
- [ ] Icons display correctly with proper spacing
- [ ] Responsive behavior works on mobile
- [ ] Screen readers announce button state correctly

## Accessibility Improvements

The Button component automatically provides:

1. **Better Touch Targets**: Minimum 44px height for md/lg sizes
2. **Visible Focus States**: 2px ring with offset for keyboard users
3. **ARIA Attributes**: Proper aria-busy and aria-disabled
4. **Reduced Motion**: Respects user's motion preferences
5. **Color Contrast**: WCAG AA compliant for all variants

## Need Help?

- View examples: `src/components/ui/Button.example.tsx`
- Read documentation: JSDoc comments in `Button.tsx`
- Check Storybook (when available): `pnpm storybook`

## Breaking Changes

None - the Button component is additive and doesn't break existing code. Migrate incrementally.

## Future Enhancements

Planned features for future versions:

- Button groups (connected buttons)
- Icon-only buttons with tooltips
- Split buttons with dropdown
- Async action handling with error states
- Keyboard shortcuts display

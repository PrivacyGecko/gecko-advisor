# Gecko Advisor UI Component Library

This directory contains the foundational design system components for Gecko Advisor. All components are built with accessibility, performance, and consistency in mind.

## Components

### Button

A comprehensive, accessible button component with consistent styling across the application.

**Features:**
- 4 variants: primary, secondary, ghost, danger
- 3 sizes: sm (36px), md (44px), lg (52px)
- Loading states with animated spinner
- Icon support (left/right)
- Full accessibility (WCAG AA)
- TypeScript with complete type safety

**Quick Start:**
```tsx
import { Button } from '@/components/ui';

<Button variant="primary" size="lg" onClick={handleClick}>
  Click Me
</Button>
```

**Documentation:**
- Component: `Button.tsx`
- Examples: `Button.example.tsx`
- Tests: `Button.test.tsx`
- Migration Guide: `MIGRATION.md`

## Design System Principles

### Accessibility First
All components meet WCAG AA standards:
- Color contrast ratios 4.5:1 minimum
- Keyboard navigation support
- Screen reader compatibility
- Focus indicators
- Touch targets 44px minimum

### Consistent Styling
Components use the Gecko Advisor color system:
- **Gecko Green** (#2ecc71): Primary actions, brand identity
- **Trust Blue** (#3498db): Secondary brand color
- **Privacy Scores**: Green (70-100), Yellow (40-69), Red (0-39)
- **Gray Scale**: Neutral UI elements

### Performance Optimized
- Minimal bundle size impact
- Optimized re-renders
- CSS-in-JS avoided (Tailwind CSS only)
- Tree-shakeable exports

### TypeScript Native
- Full type safety
- IntelliSense support
- Prop validation
- Generic type support where applicable

## Usage Guidelines

### Importing Components

Always import from the barrel export:
```tsx
import { Button } from '@/components/ui';
```

Don't import directly from component files:
```tsx
// ❌ Don't do this
import { Button } from '@/components/ui/Button';
```

### Customization

Components accept a `className` prop for custom styling:
```tsx
<Button className="mt-4 md:mt-0" variant="primary">
  Custom Spacing
</Button>
```

Custom classes are merged with default styles, allowing you to extend without replacing.

### Variants

Choose the appropriate variant based on action priority:

1. **Primary** - Most important action on the page
   - Sign Up, Submit, Scan Now, Save

2. **Secondary** - Alternative actions
   - Cancel, Back, Learn More

3. **Ghost** - Tertiary actions, low visual weight
   - View Details, Edit, Expand

4. **Danger** - Destructive actions requiring caution
   - Delete, Remove, Log Out

### Sizes

Match button size to context:

1. **Small (sm)** - Compact UIs, cards, tables
2. **Medium (md)** - Default size, most common use case
3. **Large (lg)** - Hero sections, landing pages, primary CTAs

## Component Development

### Adding New Components

1. Create component file: `ComponentName.tsx`
2. Add TypeScript interface with JSDoc
3. Implement with accessibility in mind
4. Export from `index.ts`
5. Create example file: `ComponentName.example.tsx`
6. Write tests: `ComponentName.test.tsx`
7. Update this README

### Component Template

```tsx
import React, { forwardRef } from 'react';

/**
 * ComponentName - Brief description
 *
 * @example
 * ```tsx
 * <ComponentName prop="value">Content</ComponentName>
 * ```
 */

export interface ComponentNameProps {
  /** Prop description */
  prop: string;
  children?: React.ReactNode;
}

export const ComponentName = forwardRef<HTMLElement, ComponentNameProps>(
  ({ prop, children, ...props }, ref) => {
    return (
      <div ref={ref} {...props}>
        {children}
      </div>
    );
  }
);

ComponentName.displayName = 'ComponentName';
```

### Testing Standards

All components must have:
- [ ] Unit tests for all variants/states
- [ ] Accessibility tests (roles, labels, keyboard)
- [ ] Event handler tests
- [ ] Ref forwarding tests
- [ ] Edge case tests

Run tests:
```bash
pnpm test ui/
```

### Accessibility Checklist

- [ ] Semantic HTML elements used
- [ ] ARIA attributes where needed
- [ ] Keyboard navigation supported
- [ ] Focus indicators visible
- [ ] Color contrast meets WCAG AA
- [ ] Screen reader tested
- [ ] Touch targets 44px minimum
- [ ] Motion respects prefers-reduced-motion

## Design Tokens

### Colors

```ts
// Primary Brand
gecko-500: '#2ecc71'   // Primary green
gecko-600: '#27ae60'   // Hover state
gecko-700: '#22c55e'   // Active state

// Secondary Brand
trust-500: '#3498db'   // Trust blue
trust-600: '#2980b9'   // Darker blue

// Privacy Scores
privacy-safe-500: '#16a34a'      // Green (70-100)
privacy-caution-500: '#f59e0b'   // Yellow (40-69)
privacy-danger-500: '#ef4444'    // Red (0-39)

// Semantic
gray-50 to gray-900   // Neutral scale
red-500: '#ef4444'    // Danger actions
```

### Spacing

```ts
// Button padding
sm: px-3 py-1.5    // 12px x 6px
md: px-4 py-2.5    // 16px x 10px
lg: px-6 py-3.5    // 24px x 14px

// Component gaps
gap-2: 8px
gap-3: 12px
gap-4: 16px
```

### Typography

```ts
// Font sizes
text-sm: 14px
text-base: 16px
text-lg: 18px

// Font weights
font-medium: 500
font-semibold: 600
font-bold: 700
```

### Border Radius

```ts
rounded-lg: 8px    // Standard components
rounded-xl: 12px   // Cards
rounded-2xl: 16px  // Large containers
```

### Shadows

```ts
shadow-md: Standard button elevation
shadow-lg: Hover state elevation
shadow-xl: Modals and dialogs
```

## Browser Support

Components are tested and supported in:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

Mobile browsers:
- iOS Safari 14+
- Chrome Android 90+

## Performance

### Bundle Size

Each component is optimized for minimal bundle impact:
- Button: ~2KB gzipped
- Tree-shakeable exports
- No external dependencies (except React)

### Runtime Performance

- Minimal re-renders with React.memo where appropriate
- No inline style objects (Tailwind only)
- Efficient event handlers
- Ref forwarding for advanced optimizations

## Contributing

### Code Style

- Use TypeScript strict mode
- Follow existing component patterns
- Document with JSDoc comments
- Write comprehensive tests
- Use Prettier for formatting
- Follow ESLint rules

### Pull Request Checklist

- [ ] Component implemented with TypeScript
- [ ] Tests written and passing
- [ ] Examples created
- [ ] Documentation updated
- [ ] Accessibility verified
- [ ] Performance impact assessed
- [ ] Mobile responsiveness tested

## Resources

- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Inclusive Components](https://inclusive-components.design/)

## Future Components

Planned additions:
- [ ] Input (text, email, password)
- [ ] Select (dropdown)
- [ ] Checkbox
- [ ] Radio
- [ ] Switch (toggle)
- [ ] Badge
- [ ] Alert
- [ ] Modal
- [ ] Tooltip
- [ ] Card
- [ ] Avatar
- [ ] Skeleton (loading placeholder)
- [ ] Progress Bar
- [ ] Tabs
- [ ] Accordion

## Support

For questions or issues:
1. Check component examples
2. Review migration guide
3. Read JSDoc comments
4. Check test files for usage patterns

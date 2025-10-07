# Privacy Advisor Design System - Quick Reference

**Designer**: Expert Visual Designer Agent
**Date**: 2025-10-06
**Purpose**: Quick copy-paste reference for all design tokens and components

---

## Touch-Friendly Button System

### Primary Buttons (CTAs)
```tsx
// Scan Now, Submit, Primary Actions
className="px-6 py-3 min-h-[44px] rounded-lg bg-pricko-green text-white font-medium text-base transition-all duration-150 hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-pricko-green focus:ring-offset-2 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
```

### Secondary Buttons
```tsx
// Copy, Export, Cancel, Secondary Actions
className="px-4 py-2.5 min-h-[44px] rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-medium transition-all duration-150 hover:bg-slate-50 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-security-blue focus:ring-offset-2 active:scale-[0.98]"
```

### Tab Buttons - Active
```tsx
// URL, All, High (when selected)
className="px-4 py-2.5 min-h-[44px] rounded-full border bg-security-blue text-white border-security-blue text-sm font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-security-blue focus:ring-offset-2"
```

### Tab Buttons - Inactive
```tsx
// URL, All, High (when not selected)
className="px-4 py-2.5 min-h-[44px] rounded-full border bg-white text-slate-700 border-slate-300 hover:bg-slate-50 text-sm font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-security-blue focus:ring-offset-2"
```

### Tab Buttons - Disabled
```tsx
// APP, ADDRESS (disabled features)
className="px-4 py-2.5 min-h-[44px] rounded-full border bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed text-sm font-medium focus:outline-none"
disabled={true}
aria-disabled="true"
```

### Text Link Buttons (with icon)
```tsx
// Show details, Learn more, View roadmap
className="inline-flex items-center gap-2 px-3 py-2.5 min-h-[44px] text-sm text-security-blue font-medium hover:text-security-blue-dark focus:outline-none focus:ring-2 focus:ring-security-blue focus:ring-offset-1 rounded-md transition-colors duration-150"
```

### Icon-Only Buttons
```tsx
// Dismiss, Close, Delete
className="flex-shrink-0 w-10 h-10 min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-security-blue rounded-full transition-colors duration-150"
aria-label="Descriptive action"
```

---

## Severity Badges

### High Severity (Red)
```tsx
<span className="inline-flex items-center px-2 py-0.5 rounded-full bg-privacy-danger-100 text-privacy-danger-800 text-xs font-medium border border-privacy-danger-300">
  <span aria-hidden="true">⚠️</span>
  <span className="ml-1">3</span>
</span>
```

### Medium Severity (Amber)
```tsx
<span className="inline-flex items-center px-2 py-0.5 rounded-full bg-privacy-caution-100 text-privacy-caution-800 text-xs font-medium border border-privacy-caution-300">
  <span aria-hidden="true">⚡</span>
  <span className="ml-1">5</span>
</span>
```

### Low Severity (Slate)
```tsx
<span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-medium border border-slate-300">
  <span aria-hidden="true">ℹ️</span>
  <span className="ml-1">4</span>
</span>
```

### Collapsed Items Indicator
```tsx
<span className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
  12 items collapsed
</span>
```

---

## Notice Components

### Info Notice (Trust Blue)
```tsx
<div className="mt-3 p-4 rounded-lg bg-blue-50 border border-blue-200 animate-slide-up" role="status" aria-live="polite">
  <div className="flex items-start gap-3">
    <div className="flex-shrink-0 w-5 h-5 mt-0.5">
      <svg className="w-5 h-5 text-security-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold text-blue-900">Feature coming soon</p>
      <p className="mt-1 text-sm text-blue-700">Expected availability: Q1 2026</p>
      <p className="mt-2 text-xs text-blue-600">
        Additional context here.
        <a href="/docs" className="ml-1 underline font-medium hover:text-blue-800">Learn more</a>
      </p>
    </div>
    <button className="flex-shrink-0 w-10 h-10 min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-blue-400 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full transition-colors duration-150" aria-label="Dismiss notice">
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </div>
</div>
```

### Warning Notice (Amber)
```tsx
<div className="mt-3 p-4 rounded-lg bg-amber-50 border border-amber-200 animate-slide-up" role="status" aria-live="polite">
  <div className="flex items-start gap-3">
    <div className="flex-shrink-0 w-5 h-5 mt-0.5">
      <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold text-amber-900">Warning message</p>
      <p className="mt-2 text-xs text-amber-700">Details here.</p>
    </div>
  </div>
</div>
```

---

## Section Headers (Evidence Categories)

### Expandable Section Header
```tsx
<button
  className="w-full flex items-center justify-between py-3 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-security-blue rounded transition-colors duration-150 hover:bg-slate-50"
  aria-expanded={isOpen ? 'true' : 'false'}
  aria-controls="section-id"
  onClick={() => toggle()}
>
  <div className="flex items-center gap-3 flex-1 min-w-0">
    <h2 className="font-semibold text-lg text-slate-900">Category Name</h2>
    {!isOpen && (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
        12 items collapsed
      </span>
    )}
  </div>

  <div className="flex items-center gap-3">
    {/* Severity indicators */}
    <div className="flex items-center gap-2">
      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-privacy-danger-100 text-privacy-danger-800 text-xs font-medium border border-privacy-danger-300">
        <span aria-hidden="true">⚠️</span>
        <span className="ml-1">3</span>
      </span>
    </div>

    {/* Chevron */}
    <svg className={`w-5 h-5 text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : 'rotate-0'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  </div>
</button>
```

### Expand/Collapse Controls
```tsx
<div className="flex items-center justify-between py-3 px-4 bg-slate-50 rounded-lg border border-slate-200">
  <div className="text-sm text-slate-600">
    <span className="font-medium text-slate-900">3</span> of <span className="font-medium text-slate-900">8</span> categories visible
  </div>
  <div className="flex items-center gap-2">
    <button className="px-3 py-1.5 min-h-[36px] text-xs font-medium text-security-blue hover:text-security-blue-dark hover:underline focus:outline-none focus:ring-2 focus:ring-security-blue rounded-md transition-colors duration-150">
      Expand all
    </button>
    <span className="text-slate-300">|</span>
    <button className="px-3 py-1.5 min-h-[36px] text-xs font-medium text-slate-600 hover:text-slate-800 hover:underline focus:outline-none focus:ring-2 focus:ring-security-blue rounded-md transition-colors duration-150">
      Collapse all
    </button>
  </div>
</div>
```

---

## Color Tokens

### Brand Colors
```tsx
// Primary Brand
'security-blue': '#0e6fff'           // Trust, professionalism
'pricko-green': '#19c37d'            // Primary CTA, success

// Semantic Privacy Scores
'privacy-safe-500': '#16a34a'        // 70-100 score (green)
'privacy-caution-500': '#f59e0b'     // 40-69 score (amber)
'privacy-danger-500': '#ef4444'      // 0-39 score (red)
```

### Severity Indicators
```tsx
// High Severity (Red)
bg: 'privacy-danger-100'    (#fee2e2)
text: 'privacy-danger-800'  (#991b1b)
border: 'privacy-danger-300' (#fca5a5)

// Medium Severity (Amber)
bg: 'privacy-caution-100'   (#fef3c7)
text: 'privacy-caution-800' (#92400e)
border: 'privacy-caution-300' (#fcd34d)

// Low Severity (Slate)
bg: 'slate-100'             (#f1f5f9)
text: 'slate-700'           (#334155)
border: 'slate-300'         (#cbd5e1)
```

### UI Colors
```tsx
// Backgrounds
'bg-white': '#ffffff'
'bg-slate-50': '#f8fafc'
'bg-slate-100': '#f1f5f9'

// Text
'text-slate-900': '#0f172a'  // Headings
'text-slate-700': '#334155'  // Body text
'text-slate-600': '#475569'  // Secondary text
'text-slate-500': '#64748b'  // Muted text

// Borders
'border-slate-200': '#e2e8f0'
'border-slate-300': '#cbd5e1'
```

---

## Typography Scale

### Font Sizes
```tsx
'text-2xs':   '0.625rem'  // 10px - tiny labels
'text-xs':    '0.75rem'   // 12px - small text, badges
'text-sm':    '0.875rem'  // 14px - body text, buttons
'text-base':  '1rem'      // 16px - default, inputs
'text-lg':    '1.125rem'  // 18px - section headers
'text-xl':    '1.25rem'   // 20px - card titles
'text-2xl':   '1.5rem'    // 24px - page headers
'text-3xl':   '1.875rem'  // 30px - hero headings
```

### Font Weights
```tsx
'font-normal':    400  // Body text
'font-medium':    500  // Buttons, labels, emphasis
'font-semibold':  600  // Section headers
'font-bold':      700  // Page titles
'font-extrabold': 800  // Display text
```

---

## Spacing System

### Touch Targets (WCAG AA Compliant)
```tsx
// Minimum Touch Target (WCAG AA)
min-h-[44px] min-w-[44px]

// Comfortable Touch Target
min-h-[48px] min-w-[48px]

// Generous Touch Target (Primary CTAs)
min-h-[56px] min-w-[56px]
```

### Padding Scale
```tsx
// Buttons
px-3  (12px)  // Compact buttons, small tags
px-4  (16px)  // Standard buttons, tabs
px-6  (24px)  // Primary CTAs

py-1    (4px)   // Compact (avoid for touch targets)
py-1.5  (6px)   // Small controls (36px minimum)
py-2    (8px)   // Standard desktop buttons
py-2.5  (10px)  // Touch-friendly buttons (44px with border)
py-3    (12px)  // Primary CTAs, inputs
```

### Gap Scale
```tsx
gap-1   (4px)   // Tight spacing (icon + text)
gap-2   (8px)   // Standard spacing
gap-3   (12px)  // Comfortable spacing
gap-4   (16px)  // Generous spacing
```

---

## Border Radius

```tsx
'rounded-sm':   '0.125rem'  // 2px - subtle corners
'rounded':      '0.25rem'   // 4px - standard
'rounded-md':   '0.375rem'  // 6px - medium
'rounded-lg':   '0.5rem'    // 8px - large (buttons, cards)
'rounded-xl':   '0.75rem'   // 12px - extra large
'rounded-2xl':  '1rem'      // 16px - very large
'rounded-full': '9999px'    // Circular (pills, tabs)
```

---

## Transitions & Animations

### Standard Transitions
```tsx
// Color transitions (hover, focus)
transition-colors duration-150

// All properties (scale, opacity, colors)
transition-all duration-150

// Transform only (rotation, scale)
transition-transform duration-200
```

### Common Animations
```tsx
// Slide-up entrance (notices, modals)
animate-slide-up

// Chevron rotation
className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : 'rotate-0'}`}

// Button press feedback
active:scale-[0.98] transition-all duration-150

// Fade in
animate-fade-in
```

---

## Focus States (Accessibility)

### Standard Focus Ring
```tsx
// Security Blue ring (most interactive elements)
focus:outline-none focus:ring-2 focus:ring-security-blue focus:ring-offset-2

// Tight focus ring (for inline links)
focus:outline-none focus:ring-2 focus:ring-security-blue focus:ring-offset-1

// Circular focus ring (icon buttons)
focus:outline-none focus:ring-2 focus:ring-security-blue rounded-full
```

### Variant Focus Rings
```tsx
// Primary CTA focus (matches button color)
focus:outline-none focus:ring-2 focus:ring-pricko-green focus:ring-offset-2

// Blue info notice focus
focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1

// Amber warning notice focus
focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1
```

---

## Hover States

### Button Hovers
```tsx
// Primary CTA
hover:bg-emerald-600

// Secondary button
hover:bg-slate-50 hover:border-slate-400

// Text link
hover:text-security-blue-dark hover:underline

// Icon button
hover:text-slate-600

// Tab button (inactive)
hover:bg-slate-50
```

### Section Hovers
```tsx
// Evidence section header
hover:bg-slate-50

// Card hover (if interactive)
hover:shadow-md hover:border-slate-300
```

---

## Accessibility Utilities

### Screen Reader Only
```tsx
<span className="sr-only">
  Hidden text for screen readers
</span>
```

### ARIA Attributes
```tsx
// Buttons
aria-label="Descriptive action"
aria-disabled="true"
aria-pressed={isPressed}

// Tabs
role="tab"
aria-selected={isSelected}

// Expandable sections
aria-expanded={isOpen ? 'true' : 'false'}
aria-controls="section-id"

// Live regions
role="status"
aria-live="polite"
```

---

## Responsive Breakpoints

```tsx
// Mobile first (default)
className="text-sm"

// Small tablets (640px+)
sm:text-base sm:flex-row

// Tablets (768px+)
md:text-lg md:grid-cols-2

// Desktop (1024px+)
lg:text-xl lg:grid-cols-3

// Large desktop (1280px+)
xl:max-w-7xl xl:px-8
```

---

## Icon SVG Templates

### Chevron Down (Expandable Sections)
```tsx
<svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
</svg>
```

### Info Circle (Notices)
```tsx
<svg className="w-5 h-5 text-security-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
</svg>
```

### Close/Dismiss (X)
```tsx
<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
</svg>
```

### Warning Triangle
```tsx
<svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
</svg>
```

---

## Component Composition Patterns

### Button with Icon
```tsx
<button className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] ...">
  <svg className="w-4 h-4">...</svg>
  <span>Button Text</span>
</button>
```

### Badge with Icon
```tsx
<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full ...">
  <span aria-hidden="true">⚠️</span>
  <span className="ml-1">3</span>
</span>
```

### Section with Header + Content
```tsx
<div className="space-y-2">
  <button className="w-full flex items-center justify-between ...">
    {/* Header */}
  </button>
  {isOpen && (
    <div className="mt-2">
      {/* Content */}
    </div>
  )}
</div>
```

---

## Copy-Paste Checklist

When implementing components, ensure:

### Touch Targets
- [ ] `min-h-[44px]` on all interactive elements
- [ ] `min-w-[44px]` on icon-only buttons
- [ ] Appropriate `py-*` padding (usually `py-2.5` or `py-3`)

### Focus States
- [ ] `focus:outline-none` to remove default outline
- [ ] `focus:ring-2 focus:ring-security-blue` for visible indicator
- [ ] `focus:ring-offset-2` for breathing room (or `-1` for inline)

### Transitions
- [ ] `transition-colors duration-150` for hover/focus
- [ ] `transition-transform duration-200` for rotations
- [ ] `transition-all duration-150` for multi-property changes

### Accessibility
- [ ] `aria-label` on icon-only buttons
- [ ] `aria-expanded` on expandable sections
- [ ] `aria-selected` on tabs
- [ ] `aria-disabled` on disabled elements
- [ ] `role="status"` on live regions

### Color Contrast
- [ ] Minimum 4.5:1 for normal text
- [ ] Minimum 3:1 for large text (18px+)
- [ ] Minimum 3:1 for UI components

---

## Quick Reference Card

```
BUTTON HEIGHTS (WCAG Compliant)
────────────────────────────────
Primary/Secondary:  min-h-[44px]
Tabs:              min-h-[44px]
Icon buttons:      w-10 h-10 (44x44)
Small controls:    min-h-[36px] (acceptable)

COLORS
──────
Brand:     security-blue, pricko-green
High:      privacy-danger-* (red)
Medium:    privacy-caution-* (amber)
Low:       slate-* (gray)

SPACING
───────
Button px: px-4 (standard), px-6 (primary)
Button py: py-2.5 (touch), py-3 (generous)
Gaps:      gap-2 (standard), gap-3 (comfortable)

TRANSITIONS
───────────
Colors:    transition-colors duration-150
Transform: transition-transform duration-200
All:       transition-all duration-150

FOCUS
─────
Standard:  focus:ring-2 focus:ring-security-blue focus:ring-offset-2
Inline:    focus:ring-2 focus:ring-security-blue focus:ring-offset-1
```

---

**End of Quick Reference**

All components are WCAG 2.1 AA compliant, mobile-optimized, and aligned with Privacy Advisor's brand identity.

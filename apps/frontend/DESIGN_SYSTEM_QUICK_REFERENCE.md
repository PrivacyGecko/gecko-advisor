# Privacy Advisor Design System - Quick Reference

## Color Palette

### Semantic Score Colors (WCAG AA Compliant)

#### Safe (70-100 score)
```css
/* Gradient */
linear-gradient(135deg, #10b981 0%, #059669 100%)

/* Tailwind Classes */
from-emerald-500 to-emerald-600

/* Glow */
rgba(16, 185, 129, 0.3)

/* Full Scale */
50:  #f0fdf4    100: #dcfce7    500: #16a34a (primary)
600: #15803d    800: #14532d
```

#### Caution (40-69 score)
```css
/* Gradient */
linear-gradient(135deg, #f59e0b 0%, #d97706 100%)

/* Tailwind Classes */
from-amber-500 to-amber-600

/* Glow */
rgba(245, 158, 11, 0.3)

/* Full Scale */
50:  #fffbeb    100: #fef3c7    500: #f59e0b (primary)
600: #d97706    800: #92400e
```

#### Danger (0-39 score)
```css
/* Gradient */
linear-gradient(135deg, #ef4444 0%, #dc2626 100%)

/* Tailwind Classes */
from-red-500 to-red-600

/* Glow */
rgba(239, 68, 68, 0.3)

/* Full Scale */
50:  #fef2f2    100: #fee2e2    500: #ef4444 (primary)
600: #dc2626    800: #991b1b
```

### Brand Colors

```css
/* Primary Brand */
security-blue: #0e6fff (rgb(14, 111, 255))

/* Legacy (being phased out) */
pricko-green: #19c37d

/* Tailwind Usage */
bg-security-blue
text-security-blue
border-security-blue
hover:bg-blue-700
active:bg-blue-800
```

---

## Typography

### Font Family
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', ...;
```

### Size Scale
```
Display:    text-4xl (36px) → text-6xl (60px)
Headline:   text-3xl (30px) → text-5xl (48px)
Score:      text-4xl (36px) → text-6xl (60px)
Body:       text-base (16px) → text-lg (18px)
Label:      text-sm (14px) → text-base (16px)
Caption:    text-xs (12px) → text-sm (14px)
Tiny:       text-2xs (10px)
```

### Font Weights
```
font-normal     400
font-medium     500
font-semibold   600
font-bold       700
font-extrabold  800
```

### Special Typography
```css
/* Tabular Numbers (for scores) */
tabular-nums

/* Tight Tracking (for headlines) */
tracking-tight

/* Wide Tracking (for labels) */
tracking-wide

/* Line Heights */
leading-none       1
leading-tight      1.25
leading-snug       1.375
leading-normal     1.5
leading-relaxed    1.625
leading-loose      1.75
```

---

## Spacing Scale

### Base Unit: 4px

```
xs:  8px   (0.5rem)  space-2
sm:  12px  (0.75rem) space-3
md:  16px  (1rem)    space-4
lg:  20px  (1.25rem) space-5
xl:  24px  (1.5rem)  space-6
2xl: 32px  (2rem)    space-8
3xl: 48px  (3rem)    space-12
4xl: 64px  (4rem)    space-16
```

### Component Padding
```
Card:       p-4 md:p-6
Button:     px-4 py-2 → px-6 py-3 (enhanced)
Badge:      px-2 py-0.5 → px-3 py-1.5 (enhanced)
Input:      px-3 py-2
Container:  p-4 md:p-6
```

### Touch Targets
```
Minimum:    40px (min-h-[40px])
Recommended: 44px (min-h-[44px])
Large:      48px (min-h-[48px])
```

---

## Border Radius

```
sm:   2px   rounded-sm
md:   4px   rounded (default)
lg:   8px   rounded-lg
xl:   12px  rounded-xl
2xl:  16px  rounded-2xl
3xl:  24px  rounded-3xl
full: 9999px rounded-full
```

### Common Usage
```
Buttons:    rounded-lg
Cards:      rounded-lg or rounded-xl
Badges:     rounded-full or rounded-lg
Inputs:     rounded-lg
Modals:     rounded-xl
Avatars:    rounded-full
```

---

## Shadows

### Basic Shadows
```css
shadow-sm   0 1px 2px rgba(0,0,0,0.05)
shadow      0 1px 3px rgba(0,0,0,0.1)
shadow-md   0 4px 6px rgba(0,0,0,0.1)
shadow-lg   0 10px 15px rgba(0,0,0,0.1)
shadow-xl   0 20px 25px rgba(0,0,0,0.1)
```

### Custom Privacy Shadows
```css
shadow-privacy     0 4px 6px rgba(0,0,0,0.1)
shadow-privacy-lg  0 10px 15px rgba(0,0,0,0.1)
shadow-privacy-xl  0 20px 25px rgba(0,0,0,0.1)
```

### Color-Specific Shadows
```css
/* Icon shadows (30% opacity) */
shadow-lg shadow-emerald-500/30
shadow-lg shadow-amber-500/30
shadow-lg shadow-red-500/30
shadow-lg shadow-blue-500/30
```

### Hover Patterns
```css
shadow-sm hover:shadow-lg
shadow-lg hover:shadow-xl
```

---

## Effects & Filters

### Blur
```
blur-sm    4px
blur       8px
blur-md    12px
blur-lg    16px
blur-xl    20px
blur-2xl   40px
blur-3xl   64px
```

### Glow Effect Pattern
```html
<!-- Background glow -->
<div class="absolute inset-0 bg-emerald-100 opacity-30 blur-3xl rounded-full" />

<!-- SVG filter glow -->
<filter id="glow">
  <feGaussianBlur stdDeviation="3" />
  <feMerge>
    <feMergeNode in="coloredBlur"/>
    <feMergeNode in="SourceGraphic"/>
  </feMerge>
</filter>
```

### Gradient Patterns
```css
/* Background gradients */
bg-gradient-to-br from-emerald-50 via-emerald-50/50 to-white
bg-gradient-to-br from-blue-50 via-blue-50/50 to-white
bg-gradient-to-br from-amber-50 via-amber-50/50 to-white

/* Icon gradients */
bg-gradient-to-br from-emerald-500 to-emerald-600
bg-gradient-to-br from-blue-500 to-blue-600
bg-gradient-to-br from-amber-500 to-amber-600
```

---

## Transitions & Animations

### Transition Durations
```
transition-quick:  150ms  (micro-interactions)
transition-smooth: 300ms  (standard transitions)
transition-slow:   500ms  (emphasis)
animation-engage:  1500ms (score dial)
```

### Easing Functions
```css
/* Default (smooth) */
cubic-bezier(0.4, 0, 0.2, 1)

/* Ease out (deceleration) */
cubic-bezier(0, 0, 0.2, 1)

/* Ease in (acceleration) */
cubic-bezier(0.4, 0, 1, 1)
```

### Common Transition Patterns
```css
/* All properties */
transition-all duration-200

/* Specific properties */
transition-colors duration-150
transition-transform duration-200
transition-shadow duration-300

/* Multiple properties */
transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
```

### Animation Classes
```css
.animate-draw-circle   /* Score dial ring */
.animate-fade-in       /* Fade in */
.animate-slide-up      /* Slide up */
.animate-scale-in      /* Scale in */
.shine-effect          /* CTA shine */
.hover-lift            /* Hover lift */
.active-press          /* Press effect */
```

---

## Component Patterns

### Enhanced Score Dial
```tsx
<EnhancedScoreDial
  score={72}
  size="lg"           // md | lg | xl
  label="SAFE"        // Optional
  disableAnimation={false}
/>
```

### Enhanced Trust Indicator
```tsx
<EnhancedTrustIndicator
  variant="emerald"   // emerald | blue | amber
  icon={<svg>...</svg>}
  title="Open source & transparent"
  description="All scoring logic is public"
/>
```

### Enhanced Severity Badge
```tsx
<EnhancedSeverityBadge
  severity="high"     // high | medium | low
  count={5}
/>
```

### Enhanced Expand Controls
```tsx
<EnhancedExpandControls
  expandedCount={2}
  totalCount={5}
  onExpandAll={() => {...}}
  onCollapseAll={() => {...}}
/>
```

---

## Button Styles

### Primary CTA
```html
<button class="
  px-6 py-3 min-h-[48px]
  rounded-lg
  bg-security-blue hover:bg-blue-700 active:bg-blue-800
  text-white font-semibold
  shadow-lg hover:shadow-xl
  transition-all duration-200
  shine-effect
  disabled:opacity-50 disabled:cursor-not-allowed
">
  Scan Now
</button>
```

### Secondary Button
```html
<button class="
  px-4 py-2 min-h-[44px]
  rounded-lg
  bg-white hover:bg-slate-50
  border border-slate-200 hover:border-slate-300
  text-slate-700 font-medium
  transition-colors duration-150
">
  Learn More
</button>
```

### Text Button
```html
<button class="
  px-3 py-1.5
  text-sm font-medium
  text-security-blue hover:text-blue-700
  hover:underline
  transition-colors
">
  View Details
</button>
```

---

## Card Styles

### Basic Card
```html
<div class="
  p-4 md:p-6
  rounded-lg
  border border-slate-200
  bg-white
  shadow-sm
">
  Content
</div>
```

### Enhanced Trust Card
```html
<div class="
  relative overflow-hidden
  p-5 md:p-6
  rounded-xl
  border-2 border-emerald-200 hover:border-emerald-300
  bg-gradient-to-br from-emerald-50 via-emerald-50/50 to-white
  shadow-sm hover:shadow-lg
  transition-all duration-300
">
  Content
</div>
```

### Interactive Card
```html
<div class="
  p-6
  rounded-lg
  border border-slate-200
  bg-white
  hover-lift
  cursor-pointer
  transition-shadow duration-200
  hover:shadow-lg
">
  Content
</div>
```

---

## Accessibility Guidelines

### Color Contrast (WCAG AA)
```
Normal text:  4.5:1 minimum
Large text:   3:1 minimum (18px+ or 14px+ bold)
UI elements:  3:1 minimum

✓ All semantic colors meet AA standards
✓ Use patterns for color-blind users (amber/red scores)
```

### Focus States
```css
/* Always visible focus ring */
focus:outline-none
focus:ring-2 focus:ring-security-blue
focus:ring-offset-2

/* Custom utility */
focus-visible-ring
```

### Touch Targets
```
Minimum: 40px × 40px
Recommended: 44px × 44px

Use: min-h-[44px] min-w-[44px]
```

### Motion
```css
/* Respect user preference */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}

/* Or use Tailwind */
motion-reduce:transition-none
motion-reduce:animate-none
```

### Screen Readers
```html
<!-- Hidden text for context -->
<span class="sr-only">Privacy score</span>

<!-- Descriptive labels -->
<button aria-label="Expand all evidence categories">
  Expand all
</button>

<!-- Status updates -->
<div role="status" aria-live="polite">
  {count} high severity issues
</div>
```

---

## Responsive Breakpoints

```
xs:   475px   (phones landscape)
sm:   640px   (tablets portrait)
md:   768px   (tablets landscape)
lg:   1024px  (laptops)
xl:   1280px  (desktops)
2xl:  1536px  (large desktops)
```

### Mobile-First Patterns
```html
<!-- Base: mobile, then scale up -->
<div class="
  text-base md:text-lg
  p-4 md:p-6
  grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
">
```

---

## Common Utility Combos

### Centered Container
```html
<div class="max-w-5xl mx-auto p-4 md:p-6">
```

### Flex Center
```html
<div class="flex items-center justify-center">
```

### Text Truncate
```html
<p class="truncate">           <!-- Single line -->
<p class="line-clamp-2">       <!-- Multiple lines -->
```

### Screen Reader Only
```html
<span class="sr-only">Hidden from visual, available to screen readers</span>
```

### Visually Hidden (Keep Layout)
```html
<span class="invisible">Invisible but takes space</span>
```

---

## File Locations

```
Components:
/apps/frontend/src/components/EnhancedScoreDial.tsx
/apps/frontend/src/components/EnhancedTrustIndicator.tsx
/apps/frontend/src/components/EnhancedSeverityBadge.tsx
/apps/frontend/src/components/EnhancedExpandControls.tsx

Styles:
/apps/frontend/src/styles/animations.css
/apps/frontend/src/styles.css (imports animations)

Config:
/apps/frontend/tailwind.config.ts

Documentation:
/apps/frontend/PREMIUM_COMPONENTS_INTEGRATION.md
/apps/frontend/VISUAL_UPGRADE_SUMMARY.md
/apps/frontend/DESIGN_SYSTEM_QUICK_REFERENCE.md (this file)

Demo:
/apps/frontend/src/examples/EnhancedComponentsDemo.tsx
```

---

## Quick Copy-Paste

### Gradient Ring SVG
```tsx
<defs>
  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" stopColor="#10b981" />
    <stop offset="100%" stopColor="#059669" />
  </linearGradient>
</defs>
<circle
  stroke="url(#gradient)"
  strokeWidth={8}
  fill="none"
  strokeDasharray={circumference}
  strokeDashoffset={offset}
/>
```

### Glow Effect
```html
<div class="relative">
  <div class="absolute inset-0 bg-emerald-100 opacity-30 blur-3xl rounded-full" />
  <div class="relative">{content}</div>
</div>
```

### Shine Button
```html
<button class="shine-effect bg-security-blue text-white px-6 py-3 rounded-lg">
  Click Me
</button>
```

### Icon Container
```html
<div class="
  w-12 h-12 rounded-xl
  bg-gradient-to-br from-emerald-500 to-emerald-600
  shadow-lg shadow-emerald-500/30
  flex items-center justify-center
">
  <svg class="w-6 h-6 text-white">...</svg>
</div>
```

---

**Last Updated:** 2025-10-06
**Version:** 1.0 (Premium Polish Release)

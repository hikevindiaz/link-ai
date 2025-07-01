# Link AI Design System Guide

This document outlines the complete design system, typography, colors, and styling guidelines used in the Link AI website.

## 🎨 Brand Colors

### Primary Colors
```css
/* Main Brand Colors */
--color-primary-500: oklch(0.84 0.18 117.33); /* Custom primary color */

/* Background Colors */
--bg-light: #ffffff;           /* White background (light mode) */
--bg-dark: #000000;            /* Black background (dark mode) */
--bg-card-light: #F5F5F7;      /* Light neutral card background */
--bg-card-dark: #262626;       /* Dark neutral card background (neutral-800) */
```

### Neutral Color Palette
```css
/* Text Colors */
--text-primary-light: #000000;     /* Black text (light mode) */
--text-primary-dark: #ffffff;      /* White text (dark mode) */
--text-secondary-light: #404040;   /* neutral-700 */
--text-secondary-dark: #e5e5e5;    /* neutral-200 */
--text-muted-light: #525252;       /* neutral-600 */
--text-muted-dark: #a3a3a3;        /* neutral-400 */

/* Border Colors */
--border-light: #e5e5e5;           /* neutral-200 */
--border-dark: #262626;            /* neutral-800 */
```

### Accent Colors
```css
/* neutral (Primary Accent) */
--neutral-600: #4f46e5;             /* Primary neutral */
--neutral-400: #818cf8;             /* Light neutral for dark mode */

/* Green (Success/HIPAA) */
--green-100: #dcfce7;              /* Light green background */
--green-600: #16a34a;              /* Green text */
--green-900-30: rgba(20, 83, 45, 0.3); /* Dark green with opacity */

/* Special Colors */
--card-overlay: #1D1F2F;           /* Dark overlay for cards */
```

## 🔤 Typography

### Font Family
```css
/* Primary Font */
font-family: "Inter", sans-serif;

/* CSS Variable */
--font-inter: "Inter", sans-serif;
--font-display: "Inter", sans-serif;
```

### Font Configuration (Next.js)
```typescript
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

// Usage in body
className={`${inter.variable} font-inter antialiased`}
```

### Typography Scale
```css
/* Headings */
.text-4xl { font-size: 2.25rem; line-height: 2.5rem; }    /* 36px */
.text-5xl { font-size: 3rem; line-height: 1; }            /* 48px */
.text-2xl { font-size: 1.5rem; line-height: 2rem; }       /* 24px */
.text-xl { font-size: 1.25rem; line-height: 1.75rem; }    /* 20px */
.text-lg { font-size: 1.125rem; line-height: 1.75rem; }   /* 18px */

/* Body Text */
.text-base { font-size: 1rem; line-height: 1.5rem; }      /* 16px */
.text-sm { font-size: 0.875rem; line-height: 1.25rem; }   /* 14px */
.text-xs { font-size: 0.75rem; line-height: 1rem; }       /* 12px */

/* Font Weights */
.font-normal { font-weight: 400; }
.font-medium { font-weight: 500; }
.font-semibold { font-weight: 600; }
.font-bold { font-weight: 700; }
```

## 📐 Spacing System

### Base Spacing
```css
--spacing: 0.25rem; /* 4px base unit */

/* Common Spacing Values */
.p-2 { padding: 0.5rem; }      /* 8px */
.p-4 { padding: 1rem; }        /* 16px */
.p-6 { padding: 1.5rem; }      /* 24px */
.p-8 { padding: 2rem; }        /* 32px */
.p-10 { padding: 2.5rem; }     /* 40px */
.p-12 { padding: 3rem; }       /* 48px */
.p-14 { padding: 3.5rem; }     /* 56px */
.p-16 { padding: 4rem; }       /* 64px */

/* Gaps */
.gap-2 { gap: 0.5rem; }        /* 8px */
.gap-3 { gap: 0.75rem; }       /* 12px */
.gap-4 { gap: 1rem; }          /* 16px */
.gap-10 { gap: 2.5rem; }       /* 40px */

/* Margins */
.mb-4 { margin-bottom: 1rem; }     /* 16px */
.mb-6 { margin-bottom: 1.5rem; }   /* 24px */
.mb-8 { margin-bottom: 2rem; }     /* 32px */
.mb-12 { margin-bottom: 3rem; }    /* 48px */
.mb-16 { margin-bottom: 4rem; }    /* 64px */
.mt-8 { margin-top: 2rem; }        /* 32px */
```

## 🎯 Component Patterns

### Card Components
```css
/* Standard Card */
.card-standard {
  @apply bg-[#F5F5F7] dark:bg-neutral-800 p-8 md:p-14 rounded-3xl mb-4;
}

/* Card with Border */
.card-bordered {
  @apply rounded-tl-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-black;
}

/* Overlay Card */
.card-overlay {
  @apply bg-[#1D1F2F] rounded-[1%] overflow-hidden;
}
```

### Button Styles
```css
/* Primary Button */
.btn-primary {
  @apply bg-black hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-black;
}

/* Secondary Button */
.btn-secondary {
  @apply bg-neutral-600 hover:bg-neutral-700 text-white dark:bg-neutral-500 dark:hover:bg-neutral-600;
}

/* Button Sizing */
.btn-base {
  @apply px-4 py-2 rounded-lg font-normal transition-colors;
}
```

### Text Patterns
```css
/* Heading Styles */
.heading-primary {
  @apply text-4xl md:text-5xl font-normal mb-6 leading-tight text-neutral-600 dark:text-white;
}

/* Body Text */
.text-body {
  @apply text-neutral-600 dark:text-neutral-400 text-base md:text-2xl font-sans;
}

/* Muted Text */
.text-muted {
  @apply text-neutral-600 dark:text-neutral-400;
}

/* Emphasized Text */
.text-emphasis {
  @apply font-bold text-neutral-700 dark:text-neutral-200;
}
```

### Link Styles
```css
/* Navigation Links */
.nav-link {
  @apply text-neutral-700 dark:text-neutral-200 text-sm group-hover/sidebar:translate-x-1 transition duration-150;
}

/* Footer Links */
.footer-link {
  @apply text-neutral-600 hover:text-neutral-600 dark:text-neutral-400 dark:hover:text-neutral-400 transition-colors;
}
```

## 🌙 Dark Mode Implementation

### Theme Configuration
```css
/* Base Dark Mode Setup */
@variant dark (&:where(.dark, .dark *));

@layer base {
  body {
    @apply bg-white dark:bg-black text-black dark:text-white transition-colors;
  }
}

/* Dark Mode Utilities */
@layer utilities {
  .dark-mode-toggle {
    @apply transition-all duration-200;
  }
}
```

### Dark Mode Patterns
```css
/* Background Patterns */
.bg-adaptive { @apply bg-white dark:bg-black; }
.bg-card-adaptive { @apply bg-[#F5F5F7] dark:bg-neutral-800; }
.bg-border-adaptive { @apply border-neutral-200 dark:border-neutral-800; }

/* Text Patterns */
.text-adaptive { @apply text-black dark:text-white; }
.text-muted-adaptive { @apply text-neutral-600 dark:text-neutral-400; }
.text-emphasis-adaptive { @apply text-neutral-700 dark:text-neutral-200; }

/* Icon Patterns */
.icon-adaptive { @apply text-neutral-700 dark:text-neutral-200; }
.icon-muted-adaptive { @apply text-neutral-800 dark:text-neutral-200; }
```

## 🎨 Special Color Usage

### neutral Accent (Primary Brand Color)
```css
/* Use neutral for: */
- Primary buttons and CTAs
- Progress bars
- Active states
- Brand accents
- Hover states on links

/* Examples */
.text-neutral-600.dark:text-neutral-400
.hover:text-neutral-600.dark:hover:text-neutral-400
```

### Green Success Color
```css
/* Use green for: */
- Success states
- HIPAA compliance badges
- Positive indicators
- Checkmarks

/* HIPAA Badge Example */
.hipaa-badge {
  @apply bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400;
}
```

### Blue for Contrast
```css
/* Use blue for: */
- Secondary accents (when not related to primary brand)
- Information states
- Links that need contrast from neutral

/* Note: Blue is used sparingly and only for contrast */
```

## 📱 Responsive Design Patterns

### Breakpoints
```css
/* Tailwind Breakpoints */
sm: 640px   /* Small devices */
md: 768px   /* Medium devices */
lg: 1024px  /* Large devices */
xl: 1280px  /* Extra large devices */
2xl: 1536px /* 2X large devices */
```

### Responsive Typography
```css
/* Responsive Heading */
.heading-responsive {
  @apply text-4xl md:text-5xl;
}

/* Responsive Padding */
.padding-responsive {
  @apply p-8 md:p-14;
}

/* Responsive Layout */
.layout-responsive {
  @apply flex-col md:flex-row;
}
```

## 🎭 Animation & Transitions

### Standard Transitions
```css
/* Default Transition */
.transition-default {
  @apply transition-colors duration-200;
}

/* Hover Transitions */
.transition-hover {
  @apply transition duration-150;
}

/* Transform Transitions */
.transition-transform {
  @apply group-hover/sidebar:translate-x-1 transition duration-150;
}
```

### Animation Patterns
```css
/* Fade In */
.animate-fade-in {
  animation: fadeIn 0.3s ease-in-out;
}

/* Slide In */
.animate-slide-in {
  animation: slideIn 0.3s ease-in-out;
}
```

## 🔧 Implementation Guidelines

### CSS Class Naming Convention
```css
/* Use Tailwind utility classes primarily */
/* Custom classes only when necessary */
/* Follow BEM methodology for custom components */

/* Examples */
.component-name { /* Block */ }
.component-name__element { /* Element */ }
.component-name--modifier { /* Modifier */ }
```

### Component Structure
```typescript
// Standard component pattern
export function ComponentName() {
  return (
    <div className="bg-white dark:bg-black p-8 rounded-3xl">
      <h2 className="text-2xl font-bold text-neutral-700 dark:text-neutral-200 mb-4">
        Title
      </h2>
      <p className="text-neutral-600 dark:text-neutral-400 text-base">
        Description text
      </p>
    </div>
  );
}
```

### Theme Provider Setup
```typescript
// Required for dark mode
import { ThemeProvider } from "@/components/ThemeProvider";

// Wrap app in ThemeProvider
<ThemeProvider>
  {children}
</ThemeProvider>
```

## 📋 Quick Reference

### Most Used Color Classes
```css
/* Backgrounds */
bg-white dark:bg-black
bg-[#F5F5F7] dark:bg-neutral-800
border-neutral-200 dark:border-neutral-800

/* Text */
text-neutral-700 dark:text-neutral-200
text-neutral-600 dark:text-neutral-400
text-black dark:text-white

/* Accents */
text-neutral-600 dark:text-neutral-400
hover:text-neutral-600 dark:hover:text-neutral-400
```

### Most Used Spacing
```css
/* Padding */
p-8 md:p-14    /* Card padding */
px-4 py-2      /* Button padding */
p-6            /* General padding */

/* Margins */
mb-4           /* Standard bottom margin */
mb-8           /* Section bottom margin */
mt-8           /* Top margin for sections */

/* Gaps */
gap-2          /* Small gaps */
gap-10         /* Large gaps */
```

### Most Used Typography
```css
/* Headings */
text-4xl md:text-5xl font-normal    /* Main headings */
text-2xl font-normal               /* Section headings */

/* Body */
text-base md:text-2xl font-sans    /* Large body text */
text-sm                           /* Small text */
text-lg                           /* Medium body text */
```

This design system ensures consistency across the entire Link AI website and provides a solid foundation for future development and design decisions. 
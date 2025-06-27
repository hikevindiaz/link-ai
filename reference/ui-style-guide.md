# LinkAI UI Style Guide

## Component Architecture Patterns

### Functional Components
- **Always use functional React components** with hooks
- Prefer `const` declarations for component definitions
- Use TypeScript interfaces for prop definitions
- Export components as named exports

```tsx
interface ComponentProps {
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
}

export function ComponentName({ open, setOpen }: ComponentProps) {
  // Component logic
}
```

### State Management
- Use `useState` for local component state
- Use `useEffect` for side effects and data fetching
- Use `useMemo` for expensive computations
- Use `useCallback` for function memoization when needed

```tsx
const [internalState, setInternalState] = useState(false);
const [mounted, setMounted] = useState(false);

const computedValue = useMemo(() => {
  // Expensive computation
}, [dependencies]);
```

## Styling Conventions

### Tailwind CSS Classes
- **Primary approach**: Use Tailwind utility classes
- **Conditional styling**: Use `cn()` utility for conditional classes
- **Responsive design**: Mobile-first approach with breakpoint prefixes

```tsx
className={cn(
  "base-classes",
  condition ? "conditional-classes" : "alternative-classes",
  "responsive:classes"
)}
```

### Color Palette

#### Neutral Color Scale (Primary Design Foundation)
**Always use `neutral-` classes, never `gray-` classes**

- **Text Primary**: `text-neutral-700 dark:text-neutral-200`
- **Text Secondary**: `text-neutral-500 dark:text-neutral-400`
- **Background Light**: `bg-neutral-100 dark:bg-neutral-800`
- **Background Medium**: `bg-neutral-200 dark:bg-neutral-700`
- **Background Dark**: `bg-neutral-800 dark:bg-neutral-100`
- **Borders**: `border-neutral-300 dark:border-neutral-600`
- **Dividers**: `bg-neutral-300 dark:bg-neutral-600`

#### Neutral Scale Reference
```tsx
// Light backgrounds
bg-neutral-50   // Lightest
bg-neutral-100  // Cards, hover states
bg-neutral-200  // Subtle backgrounds
bg-neutral-300  // Borders, dividers

// Text colors
text-neutral-400  // Muted text (dark mode)
text-neutral-500  // Secondary text
text-neutral-600  // Body text
text-neutral-700  // Primary text
text-neutral-800  // Headings
text-neutral-900  // High contrast text
```

#### Accent Colors (Minimal Usage)
- **Primary Accent**: Indigo (`bg-indigo-600`, `text-indigo-600`) - Use sparingly for CTAs
- **Success**: Green variants - Status indicators only
- **Warning**: Yellow/Orange variants - Alerts only  
- **Error**: Red variants - Error states only

#### Color Usage Philosophy
- **Foundation**: Build entire design system on neutral scale
- **Restraint**: Most UI should be neutral colors only
- **Accent Sparingly**: Use colors only for specific semantic meaning
- **Never use**: `gray-` classes - always use `neutral-` equivalent

#### Theme Support
- **Always provide dark mode variants**: `class dark:class`
- **Consistent scale**: Same neutral numbers work across light/dark themes

### Title and Heading Conventions

#### Design Philosophy
- **Minimal Weight**: All titles and headings use `font-normal` (400 weight)
- **Size for Hierarchy**: Use font size (`text-lg`, `text-xl`, `text-2xl`) to establish hierarchy, not weight
- **Clean Aesthetic**: Regular weight maintains clean, modern appearance
- **Consistency**: Avoid mixing font weights in heading hierarchy

#### Heading Hierarchy
```tsx
// Main page title (top level)
"text-2xl font-normal text-neutral-700 dark:text-neutral-200"

// Page section title  
"text-xl font-normal text-neutral-700 dark:text-neutral-200"

// Subsection title
"text-lg font-normal text-neutral-700 dark:text-neutral-200"

// Component title
"text-base font-normal text-neutral-700 dark:text-neutral-200"
```

#### When to Use Font Weight
- **Labels/Navigation**: `font-medium` for UI labels and navigation items
- **Special Emphasis**: `font-semibold` only for critical emphasis within body text
- **Avoid**: `font-bold` except for very special cases
- **Never**: Bold or semibold for titles and headings

### Typography Scale

#### Font Family
- **Primary**: Inter (`font-family: var(--font-inter)` or `"Inter", sans-serif`)
- **Monospace**: Geist Mono for code snippets
- **Display**: CalSans-SemiBold for special branding only (avoid for regular headings)
- **Fallback Stack**: `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`

#### Font Weights
- **Regular**: `font-normal` (400) - Default for all text including titles and headings
- **Medium**: `font-medium` (500) - Labels, navigation items, emphasis
- **Semibold**: `font-semibold` (600) - Available for special emphasis only
- **Bold**: `font-bold` (700) - Available for special emphasis only

#### Font Sizes
- **Extra Small**: `text-xs` (12px) - Labels, captions
- **Small**: `text-sm` (14px) - Body text, navigation
- **Base**: `text-base` (16px) - Default body text
- **Large**: `text-lg` (18px) - Section titles (use with `font-normal`)
- **Extra Large**: `text-xl` (20px) - Page titles (use with `font-normal`)
- **2XL**: `text-2xl` (24px) - Main page headings (use with `font-normal`)

#### Text Styles
```tsx
// Page titles
"text-xl font-normal text-neutral-700 dark:text-neutral-200"

// Section titles  
"text-lg font-normal text-neutral-700 dark:text-neutral-200"

// Subsection labels
"text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider"

// Navigation links
"text-sm font-medium"

// Body text
"text-sm font-normal"
```

### Spacing System

#### Padding
- **Small**: `p-2` (8px)
- **Medium**: `p-4` (16px)
- **Large**: `p-6` (24px)

#### Margins
- **Small**: `m-2` (8px)
- **Medium**: `m-4` (16px)
- **Section spacing**: `mt-8` (32px)

#### Gaps
- **Small**: `gap-2` (8px)
- **Medium**: `gap-4` (16px)
- **Large**: `gap-6` (24px)

## Icon Usage

### Icon Library
- **Primary**: Tabler Icons (`@tabler/icons-react`)
- **Size**: Default `h-5 w-5` (20px)
- **Color**: Inherit from parent or explicit neutral colors

```tsx
import { IconName } from "@tabler/icons-react";

<IconName className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
```

### Icon Patterns
- **Always use `shrink-0`** to prevent icon distortion
- **Consistent sizing** across similar UI elements
- **Proper semantic usage** (e.g., chevrons for expand/collapse)

## Component Patterns

### Collapsible Sections
```tsx
const CollapsibleSection = ({ 
  title, 
  icon: Icon, 
  children, 
  isExpanded, 
  setIsExpanded,
  sidebarOpen 
}) => (
  <div className="mb-2">
    <button
      onClick={() => setIsExpanded(!isExpanded)}
      className={cn(
        "flex items-center justify-start gap-2 group/sidebar py-2 w-full text-left",
        "text-neutral-700 dark:text-neutral-200 transition-colors"
      )}
    >
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
          {sidebarOpen && (
            <span className="text-sm font-medium group-hover/sidebar:translate-x-1 transition duration-150 whitespace-pre">
              {title}
            </span>
          )}
        </div>
        {sidebarOpen && (
          <div className="ml-auto">
            {isExpanded ? <ChevronUp /> : <ChevronDown />}
          </div>
        )}
      </div>
    </button>
    {sidebarOpen && isExpanded && (
      <div className="ml-8 mt-1 space-y-1">
        {children}
      </div>
    )}
  </div>
);
```

### Navigation Links
```tsx
const NavLink = ({ href, icon: Icon, label, notifications }) => (
  <a
    href={href}
    className={cn(
      "flex items-center gap-3 rounded-xl px-2 py-2 text-sm font-medium transition-colors",
      "hover:bg-neutral-100 dark:hover:bg-neutral-800",
      "text-neutral-700 dark:text-neutral-200"
    )}
  >
    <div className="relative">
      <Icon className="h-5 w-5 shrink-0" />
      {notifications && (
        <span className="absolute -top-1 -right-1 h-2 w-2 bg-neutral-600 rounded-full" />
      )}
    </div>
    <span>{label}</span>
  </a>
);
```

### Section Titles
```tsx
const SectionTitle = ({ title, show }) => (
  <div className="px-2 py-1 mt-4 mb-2">
    <span className={cn(
      "text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider transition-opacity duration-200",
      show ? "opacity-100" : "opacity-0"
    )}>
      {title}
    </span>
  </div>
);
```

## Animation & Transitions

### Hover Effects
```tsx
// Subtle translate on hover
"group-hover/sidebar:translate-x-1 transition duration-150"

// Background color changes
"hover:bg-neutral-100 dark:hover:bg-neutral-800"

// Smooth transitions
"transition-colors duration-200"
```

### State Transitions
- **Duration**: `duration-150` for quick interactions, `duration-200` for state changes
- **Easing**: Default CSS easing (ease-in-out)
- **Properties**: Focus on `transform`, `opacity`, and `background-color`

## Accessibility Guidelines

### Semantic HTML
- Use proper button elements for interactive components
- Use meaningful `href` attributes for navigation links
- Include proper `alt` text for images

### ARIA Patterns
- Use `aria-expanded` for collapsible sections
- Include `aria-label` for icon-only buttons
- Ensure proper focus management

### Keyboard Navigation
- All interactive elements should be keyboard accessible
- Proper tab order and focus indicators
- Support for Enter/Space key interactions

## Layout Patterns

### Sidebar Structure
```tsx
<Sidebar>
  <SidebarBody className="justify-between gap-10">
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Logo */}
      {/* Main Navigation */}
      {/* Sections */}
    </div>
    <div className="space-y-2 flex-shrink-0 overflow-hidden">
      {/* Footer Items */}
    </div>
  </SidebarBody>
</Sidebar>
```

### Responsive Considerations
- **Collapsed state**: Icon-only navigation
- **Expand state**: Full labels and content
- **Mobile handling**: Overlay or slide-in patterns

## State Management Best Practices

### Loading States
```tsx
const [isMounted, setIsMounted] = useState(false);

useEffect(() => {
  setIsMounted(true);
  return () => setIsMounted(false);
}, []);

if (!isMounted) return null;
```

### Data Fetching
```tsx
useEffect(() => {
  if (!isMounted) return;
  
  const fetchData = async () => {
    try {
      const response = await fetch('/api/endpoint');
      if (!isMounted) return; // Prevent state updates on unmounted components
      
      if (response.ok) {
        const data = await response.json();
        setData(data);
      }
    } catch (error) {
      if (!isMounted) return;
      console.error('Error:', error);
    }
  };

  fetchData();
}, [isMounted]);
```

### Session Management
```tsx
const { data: session, status } = useSession();

const isAdmin = useMemo(() => {
  if (status !== 'authenticated' || !session?.user) {
    return false;
  }
  return session.user.role === 'ADMIN';
}, [session, status]);
```

## Performance Optimization

### Memoization
- Use `useMemo` for expensive computations
- Use `React.memo` for component memoization when appropriate
- Use `useCallback` for event handlers passed to child components

### Event Handling
```tsx
// Cleanup event listeners
useEffect(() => {
  const handleEvent = () => { /* handler */ };
  
  window.addEventListener('customEvent', handleEvent);
  
  return () => {
    window.removeEventListener('customEvent', handleEvent);
  };
}, []);
```

## Error Handling

### API Calls
- Always handle both success and error cases
- Check component mount state before updating state
- Provide meaningful error messages
- Use try-catch blocks for async operations

### Conditional Rendering
```tsx
// Safe conditional rendering
{condition && <Component />}

// With fallback
{condition ? <Component /> : <Fallback />}

// With loading state
{loading ? <LoadingSpinner /> : <Content />}
```

## Testing Considerations

### Component Structure
- Separate business logic from presentation
- Use dependency injection for external services
- Make components testable with clear prop interfaces

### Mock Data
- Provide TypeScript interfaces for all data structures
- Use factory functions for generating test data
- Separate concerns (UI logic vs. business logic)

---

This style guide should be followed consistently across all UI components in the LinkAI application to maintain design consistency and code quality. 
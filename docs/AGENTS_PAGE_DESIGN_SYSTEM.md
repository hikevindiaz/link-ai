#Page Design System

This document outlines the comprehensive design standards established for the agents page, serving as a reference for maintaining consistency across all pages in the LinkAI application.

## 🎨 Color System

### Text Colors
- **Primary Text**: `text-black dark:text-white` (instead of neutral variants)
- **Secondary Text**: `text-neutral-500 dark:text-neutral-400`
- **Muted Text**: `text-neutral-600 dark:text-neutral-400`
- **Error Text**: `text-red-600 dark:text-red-400`
- **Success Text**: `text-green-600 dark:text-green-400`

### Background Colors
- **Primary Background**: `bg-white dark:bg-black`
- **Secondary Background**: `bg-neutral-50 dark:bg-neutral-900`
- **Card Background**: `bg-white dark:bg-neutral-900`
- **Header Background**: `bg-neutral-100 dark:bg-neutral-800`
- **Hover Background**: `hover:bg-neutral-50 dark:hover:bg-neutral-900`

### Border Colors
- **Primary Border**: `border-neutral-200 dark:border-neutral-800`
- **Hover Border**: `hover:border-neutral-300 dark:hover:border-neutral-700`
- **Active Border**: `border-neutral-400 dark:border-white`

## 📝 Typography

### Font Weights
- **Headers/Titles**: `font-semibold` (instead of font-medium)
- **Body Text**: `font-normal`
- **Labels**: `font-medium`

### Font Sizes
- **Page Title**: `text-xl sm:text-2xl`
- **Section Headers**: `text-sm font-semibold`
- **Body Text**: `text-sm`
- **Helper Text**: `text-xs`
- **Descriptions**: `text-xs text-neutral-500 dark:text-neutral-400`

## 🔄 Border Radius Standards

**Universal Standard**: `rounded-xl` for ALL interactive elements

### Components Using `rounded-xl`
- All cards (`Card` components)
- All input fields (`Input`, `Textarea`)
- All select dropdowns (`Select`)
- All buttons (`Button`)
- All alerts and notifications
- All skeleton loading components
- All modal/dialog components
- Sidebar list items
- Empty state cards

## 📦 Card Component Structure

### Standard Card Pattern
```tsx
<Card className="overflow-hidden p-0 bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 rounded-xl">
  {/* Header */}
  <div className="border-b border-neutral-200 bg-neutral-100 px-3 py-2 dark:border-neutral-800 dark:bg-neutral-800">
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
      <Label className="text-sm font-semibold text-black dark:text-white">Title</Label>
    </div>
  </div>
  
  {/* Content */}
  <div className="px-3 py-2 bg-white dark:bg-neutral-900">
    {/* Content goes here */}
  </div>
</Card>
```

### Spacing Standards
- **Header Padding**: `px-3 py-2` (updated from `px-6 py-4`)
- **Content Padding**: `px-3 py-2` (updated from `p-6`)
- **Icon Size**: `h-4 w-4`
- **Gap Between Elements**: `gap-2` for icons and text

## 🗂️ Sidebar Design

### Sidebar Container
```tsx
<div className="w-80 border-r border-neutral-200 dark:border-neutral-800 flex flex-col">
```

### Sidebar Header
```tsx
<div className="p-4 pb-0">
  <div className="flex items-center justify-between">
    <h2 className="text-xl font-semibold text-black dark:text-white">
      My Agents
    </h2>
    <Button variant="secondary" className="h-8 w-8 p-0">
      <RiAddLine className="h-4 w-4" />
    </Button>
  </div>
</div>
```

### Sidebar List Items
```tsx
<div className={cn(
  "group transition-all duration-200 cursor-pointer p-3 rounded-xl border relative",
  "hover:bg-neutral-50 dark:hover:bg-neutral-900",
  "hover:shadow-sm",
  "bg-white dark:bg-black border-neutral-200 dark:border-neutral-800",
  "hover:border-neutral-300 dark:hover:border-neutral-700",
  isSelected && [
    "border-neutral-400 dark:border-white",
    "bg-neutral-50 dark:bg-neutral-900"
  ]
)}>
  <div className="flex items-center">
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-medium">
      {getInitials(name)}
    </span>
    <div className="ml-3 w-full overflow-hidden">
      <div className="truncate text-sm font-medium text-black dark:text-white">
        {name}
      </div>
      <p className="mt-1 truncate text-xs text-neutral-600 dark:text-neutral-400">
        ID: {id}
      </p>
    </div>
  </div>
</div>
```

## 🎭 Empty States

### Minimal Empty State Design
```tsx
<Card className="p-6 bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
  <div className="flex flex-col items-center max-w-md">
    {/* Small icon in rounded square */}
    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800">
      <Icon className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
    </div>
    
    {/* Semi-bold title */}
    <h3 className="text-sm font-semibold text-black dark:text-white mb-1">
      Title
    </h3>
    
    {/* Description */}
    <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
      Description text
    </p>
    
    {/* CTA Button */}
    <Button size="sm">
      Action Text
    </Button>
  </div>
</Card>
```

### Empty State Specifications
- **Icon Container**: `h-10 w-10` with `rounded-lg`
- **Icon Size**: `h-5 w-5`
- **Title**: `text-sm font-semibold`
- **Description**: `text-xs`
- **Background**: Light background cards for contrast
- **Button**: `size="sm"` with primary styling

## ⏳ Skeleton Loading

### Standard Skeleton Pattern
```tsx
const ComponentSkeleton = () => (
  <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black">
    <div className="flex items-center">
      <div className="h-8 w-8 rounded-full bg-neutral-200 dark:bg-neutral-700 animate-pulse"></div>
      <div className="ml-3 flex-1">
        <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse mb-2"></div>
        <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse w-3/4"></div>
      </div>
    </div>
  </div>
);
```

### Skeleton Specifications
- **Animation**: `animate-pulse`
- **Colors**: `bg-neutral-200 dark:bg-neutral-700`
- **Border Radius**: `rounded` for skeleton elements, `rounded-xl` for containers
- **Consistent with actual component structure**

## 🔘 Form Elements

### Input Fields
```tsx
<Input 
  className="rounded-xl"
  placeholder="Placeholder text"
/>
```

### Select Dropdowns
```tsx
<Select>
  <SelectTrigger className="rounded-xl">
    <SelectValue placeholder="Select option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option">Option</SelectItem>
  </SelectContent>
</Select>
```

### Buttons
```tsx
<Button className="rounded-xl">
  Button Text
</Button>
```

### Textarea
```tsx
<Textarea 
  className="min-h-32 resize-y rounded-xl"
  placeholder="Placeholder text"
/>
```

## 📱 Responsive Behavior

### Mobile Breakpoints
- **Mobile**: `< 768px` (`md` breakpoint)
- **Tablet**: `768px - 1024px`
- **Desktop**: `> 1024px`

### Mobile-Specific Classes
```tsx
const getTabClassName = (tabName: string) => {
  const mobileClasses = isMobileView ? "py-2 px-3 text-sm" : "py-3 px-3";
  // ... rest of classes
};
```

## 🎯 Tab Navigation

### Tab Link Styling
```tsx
const getTabClassName = (tabName: string) => {
  const baseClasses = "inline-flex gap-2 items-center";
  const activeClasses = "text-black font-medium border-b-2 border-black dark:text-white dark:border-white";
  const inactiveClasses = "text-neutral-500 hover:text-black hover:border-b-2 hover:border-neutral-300 dark:text-neutral-400 dark:hover:text-white dark:hover:border-neutral-700";
  
  return cn(baseClasses, activeClasses || inactiveClasses);
};
```

## 🏷️ Status Badges

### Agent Status Badge
```tsx
<Badge variant="secondary" className="flex items-center gap-1 px-3 py-1 font-medium bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400">
  <Icon className="h-3.5 w-3.5" />
  <span>Active</span>
</Badge>
```

## 🎨 Language Selection with Flags

### Language Dropdown with Flags
```tsx
<SelectItem value="en">
  <div className="flex items-center gap-2">
    <span className="text-lg">🇺🇸</span>
    <span>English</span>
  </div>
</SelectItem>
```

## 📐 Spacing System

### Standard Spacing Values
- **Component Gap**: `gap-2` (8px)
- **Section Spacing**: `space-y-6` (24px)
- **Card Padding**: `px-3 py-2` (12px horizontal, 8px vertical)
- **Container Padding**: `p-4` or `px-4 py-3`
- **Icon-Text Gap**: `gap-2` (8px)

## 🔧 Utility Classes

### Commonly Used Combinations
```tsx
// Standard card header
"border-b border-neutral-200 bg-neutral-100 px-3 py-2 dark:border-neutral-800 dark:bg-neutral-800"

// Standard card content
"px-3 py-2 bg-white dark:bg-neutral-900"

// Standard icon styling
"h-4 w-4 text-neutral-500 dark:text-neutral-400"

// Standard title styling
"text-sm font-semibold text-black dark:text-white"

// Standard description styling
"text-xs text-neutral-500 dark:text-neutral-400"
```

## 🎪 Accordion Components

### Accordion Trigger
```tsx
<AccordionTrigger className="px-3 py-2 text-sm font-semibold text-black dark:text-white hover:no-underline">
  <div className="flex items-center gap-2">
    <Icon className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
    Title
  </div>
</AccordionTrigger>
```

### Accordion Content
```tsx
<AccordionContent className="px-3 py-2 pt-0">
  {/* Content */}
</AccordionContent>
```

## ✅ Implementation Checklist

When applying this design system to other pages:

- [ ] Replace all `text-neutral-*` with `text-black dark:text-white` for primary text
- [ ] Update all headers to use `font-semibold`
- [ ] Change all border radius to `rounded-xl`
- [ ] Update card padding to `px-3 py-2` pattern
- [ ] Implement skeleton loading for all loading states
- [ ] Use minimal empty states with small icons
- [ ] Apply consistent spacing system
- [ ] Ensure proper dark mode support
- [ ] Add flag icons to language selections where applicable
- [ ] Use consistent status badge patterns

## 📋 Notes

- **Theme Compatibility**: All components must work seamlessly in both light and dark modes
- **Accessibility**: Maintain proper contrast ratios and focus states
- [ ] Use `animate-pulse` for skeleton loading, `transition-all duration-200` for hover states
- **Consistency**: Always prioritize design system consistency over one-off customizations

This design system ensures a cohesive, professional, and user-friendly interface across the entire LinkAI application. 
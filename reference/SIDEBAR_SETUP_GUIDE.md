# Sidebar Component Setup Guide

This guide contains everything needed to replicate the animated sidebar component from Link AI in another web app.

## 📦 Dependencies

First, install the required dependencies:

```bash
npm install clsx tailwind-merge motion @tabler/icons-react next-themes --legacy-peer-deps
```

**Note:** `next-themes` is required for the theme toggle functionality in the Link AI implementation.

## 📁 Required Files

### 1. Utils File (`lib/utils.ts`)

```typescript
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

### 2. Sidebar Component (`components/ui/sidebar.tsx`)

```typescript
"use client";
import { cn } from "@/lib/utils";
import React, { useState, createContext, useContext } from "react";
import { AnimatePresence, motion } from "motion/react";
import { IconMenu2, IconX } from "@tabler/icons-react";
import Link from "next/link";

interface Links {
  label: string;
  href: string;
  icon: React.JSX.Element | React.ReactNode;
}

interface SidebarContextProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  animate: boolean;
}

const SidebarContext = createContext<SidebarContextProps | undefined>(
  undefined
);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

export const SidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = true,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  const [openState, setOpenState] = useState(false);

  const open = openProp !== undefined ? openProp : openState;
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

  return (
    <SidebarContext.Provider value={{ open, setOpen, animate: animate }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const Sidebar = ({
  children,
  open,
  setOpen,
  animate,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  return (
    <SidebarProvider open={open} setOpen={setOpen} animate={animate}>
      {children}
    </SidebarProvider>
  );
};

export const SidebarBody = (props: React.ComponentProps<typeof motion.div>) => {
  return (
    <>
      <DesktopSidebar {...props} />
      <MobileSidebar {...(props as React.ComponentProps<"div">)} />
    </>
  );
};

export const DesktopSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<typeof motion.div>) => {
  const { open, setOpen, animate } = useSidebar();
  return (
    <>
      <motion.div
        className={cn(
          "h-full px-4 pt-8 pb-4 hidden md:flex md:flex-col bg-white dark:bg-black w-[300px] shrink-0",
          className
        )}
        animate={{
          width: animate ? (open ? "300px" : "60px") : "300px",
        }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        {...props}
      >
        {children}
      </motion.div>
    </>
  );
};

export const MobileSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) => {
  const { open, setOpen } = useSidebar();
  return (
    <>
      <div
        className={cn(
          "h-10 px-4 py-4 flex flex-row md:hidden  items-center justify-between bg-white dark:bg-black w-full"
        )}
        {...props}
      >
        <div className="flex justify-end z-20 w-full">
          <IconMenu2
            className="text-neutral-800 dark:text-neutral-200"
            onClick={() => setOpen(!open)}
          />
        </div>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ x: "-100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "-100%", opacity: 0 }}
              transition={{
                duration: 0.3,
                ease: "easeInOut",
              }}
              className={cn(
                "fixed h-full w-full inset-0 bg-white dark:bg-black p-10 z-[100] flex flex-col justify-between",
                className
              )}
            >
              <div
                className="absolute right-10 top-10 z-50 text-neutral-800 dark:text-neutral-200"
                onClick={() => setOpen(!open)}
              >
                <IconX />
              </div>
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export const SidebarLink = ({
  link,
  className,
  ...props
}: {
  link: Links;
  className?: string;
}) => {
  const { open, animate } = useSidebar();
  
  // Check if it's an external link
  const isExternal = link.href.startsWith('http') || link.href.startsWith('mailto:');
  
  const linkContent = (
    <>
      {link.icon}
      <motion.span
        animate={{
          display: animate ? (open ? "inline-block" : "none") : "inline-block",
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        className="text-neutral-700 dark:text-neutral-200 text-sm group-hover/sidebar:translate-x-1 transition duration-150 whitespace-pre inline-block !p-0 !m-0"
      >
        {link.label}
      </motion.span>
    </>
  );

  if (isExternal) {
    return (
      <a
        href={link.href}
        className={cn(
          "flex items-center justify-start gap-2  group/sidebar py-2",
          className
        )}
        target="_blank"
        rel="noopener noreferrer"
        {...props}
      >
        {linkContent}
      </a>
    );
  }

  return (
    <Link
      href={link.href}
      className={cn(
        "flex items-center justify-start gap-2  group/sidebar py-2",
        className
      )}
      {...props}
    >
      {linkContent}
    </Link>
  );
};
```

## 🛠️ Link AI Implementation Example

```typescript
"use client";
import Image from "next/image";
import React, { useState, useEffect } from "react";
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";
import { 
  IconCode,
  IconBook,
  IconHeart,
  IconCurrencyDollar,
  IconLogin,
  IconBrandInstagram,
  IconBrandX,
} from "@tabler/icons-react";
import { useTheme } from 'next-themes';

const links = [
  {
    label: "Playground",
    href: "/playground",
    icon: (
      <IconCode className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
    ),
  },
  {
    label: "Features",
    href: "#features",
    icon: (
      <IconBook className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
    ),
  },
  {
    label: "Stories",
    href: "#stories",
    icon: (
      <IconHeart className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
    ),
  },
  {
    label: "Pricing",
    href: "/pricing",
    icon: (
      <IconCurrencyDollar className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
    ),
  },
  {
    label: "Sign In",
    href: "https://dashboard.getlinkai.com/dashboard",
    icon: (
      <IconLogin className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
    ),
  },
];

const Logo = () => {
  return (
    <a
      href="#"
      className="relative z-20 flex items-center justify-start gap-2 py-2 text-sm font-normal text-black"
    >
      <Image
        src="/LINK AI ICON DARK.png"
        className="h-6 w-auto shrink-0 dark:hidden"
        width={24}
        height={24}
        alt="Link AI Logo"
      />
      <Image
        src="/LINK AI ICON LIGHT.png"
        className="hidden h-6 w-auto shrink-0 dark:block"
        width={24}
        height={24}
        alt="Link AI Logo"
      />
    </a>
  );
};

const LogoIcon = () => {
  return (
    <a
      href="#"
      className="relative z-20 flex items-center justify-start gap-2 py-2 text-sm font-normal text-black"
    >
      <Image
        src="/LINK AI ICON DARK.png"
        className="h-6 w-auto shrink-0 dark:hidden"
        width={24}
        height={24}
        alt="Link AI Logo"
      />
      <Image
        src="/LINK AI ICON LIGHT.png"
        className="hidden h-6 w-auto shrink-0 dark:block"
        width={24}
        height={24}
        alt="Link AI Logo"
      />
    </a>
  );
};

const SidebarThemeToggle = () => {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const isDark = resolvedTheme === 'dark';

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center justify-start gap-2 group/sidebar py-2"
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {isDark ? (
        // Sun icon - currently in dark mode, click to go light
        <svg className="h-5 w-5 shrink-0 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
        </svg>
      ) : (
        // Moon icon - currently in light mode, click to go dark
        <svg className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" fill="currentColor" viewBox="0 0 24 24">
          <path fillRule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" clipRule="evenodd" />
        </svg>
      )}
    </button>
  );
};

export default function Layout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-white md:flex-row dark:bg-black">
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-10">
          <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
            {open ? <Logo /> : <LogoIcon />}
            <div className="mt-8 flex flex-col gap-2">
              {links.map((link, idx) => (
                <SidebarLink key={idx} link={link} />
              ))}
            </div>
          </div>
          <div className="space-y-2">
            {/* Social Icons */}
            <a
              href="https://www.instagram.com/getlinkai/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-start gap-2 group/sidebar py-2"
              aria-label="Follow us on Instagram"
            >
              <IconBrandInstagram className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
            </a>
            <a
              href="https://x.com/getlinkai"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-start gap-2 group/sidebar py-2"
              aria-label="Follow us on X"
            >
              <IconBrandX className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
            </a>
            
            {/* Theme Toggle */}
            <SidebarThemeToggle />
          </div>
        </SidebarBody>
      </Sidebar>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-full flex-1 rounded-tl-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-black overflow-y-auto">
          <div className="min-h-full flex flex-col">
            <div className="flex-1 pt-12 pb-8 space-y-8">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

## 🎨 Generic Usage Example (For Other Projects)

```typescript
"use client";
import React, { useState } from "react";
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";
import { 
  IconHome, 
  IconUser, 
  IconSettings, 
  IconLogout,
  IconDashboard 
} from "@tabler/icons-react";

const links = [
  { 
    label: "Dashboard", 
    href: "/dashboard", 
    icon: <IconDashboard className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" /> 
  },
  { 
    label: "Profile", 
    href: "/profile", 
    icon: <IconUser className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" /> 
  },
  { 
    label: "Settings", 
    href: "/settings", 
    icon: <IconSettings className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" /> 
  },
  { 
    label: "External Link", 
    href: "https://example.com", 
    icon: <IconHome className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" /> 
  },
];

function Logo() {
  return (
    <div className="relative z-20 flex items-center justify-start gap-2 py-2 text-sm font-normal text-black">
      <div className="h-6 w-6 bg-black dark:bg-white rounded-sm shrink-0" />
      <span className="font-medium text-black dark:text-white">Your App</span>
    </div>
  );
}

function LogoIcon() {
  return (
    <div className="relative z-20 flex items-center justify-start gap-2 py-2 text-sm font-normal text-black">
      <div className="h-6 w-6 bg-black dark:bg-white rounded-sm shrink-0" />
    </div>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-white md:flex-row dark:bg-black">
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-10">
          <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
            {open ? <Logo /> : <LogoIcon />}
            <div className="mt-8 flex flex-col gap-2">
              {links.map((link, idx) => (
                <SidebarLink key={idx} link={link} />
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <button className="flex items-center justify-start gap-2 group/sidebar py-2">
              <IconLogout className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
              <span className="text-neutral-700 dark:text-neutral-200 text-sm">Logout</span>
            </button>
          </div>
        </SidebarBody>
      </Sidebar>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-full flex-1 rounded-tl-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-black overflow-y-auto">
          <div className="p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
```

## ⚙️ Configuration Requirements

### TypeScript Config (`tsconfig.json`)
Make sure your `tsconfig.json` includes path aliases:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### Tailwind CSS Config (`tailwind.config.js`)
Ensure you have the required Tailwind classes:

```javascript
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      // Your custom theme extensions
    },
  },
  plugins: [],
}
```

## 🎯 Key Features

- **Responsive Design**: Auto-collapses on mobile with hamburger menu
- **Hover Animation**: Expands on desktop hover, collapses when mouse leaves  
- **Dark Mode Support**: Built-in dark/light theme compatibility
- **External Links**: Automatically detects and handles external URLs
- **Smooth Animations**: Uses Framer Motion for fluid transitions
- **Customizable**: Easy to modify colors, spacing, and behavior
- **TypeScript**: Full type safety and IntelliSense support

## 🔧 Customization Options

### Change Sidebar Width
```typescript
// In DesktopSidebar component, modify:
className="w-[300px]" // Change to desired width
animate={{ width: animate ? (open ? "300px" : "60px") : "300px" }}
```

### Custom Colors
```typescript
// Replace neutral colors with your brand colors:
"text-neutral-700 dark:text-neutral-200" // Text colors
"bg-white dark:bg-black" // Background colors
"border-neutral-200 dark:border-neutral-800" // Border colors
```

### Animation Speed
```typescript
// In MobileSidebar transition:
transition={{
  duration: 0.3, // Change duration
  ease: "easeInOut", // Change easing
}}
```

## 📋 Framework Requirements

- **Next.js 13+** (App Router)
- **React 18+**
- **TypeScript** (recommended)
- **Tailwind CSS**
- **Framer Motion** (motion package)

## 🚀 Quick Start

1. Install dependencies: `npm install clsx tailwind-merge motion @tabler/icons-react`
2. Create `lib/utils.ts` with the cn function
3. Create `components/ui/sidebar.tsx` with the sidebar component
4. Use the basic usage example in your layout
5. Customize colors, links, and behavior as needed

That's it! You now have a fully functional animated sidebar component identical to the one used in Link AI. 
const { fontFamily } = require("tailwindcss/defaultTheme");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./ui/**/*.{ts,tsx}",
    "./node_modules/flowbite/**/*.js", // Added Flowbite components
    "./node_modules/@tremor/react/**/*.{js,ts,jsx,tsx}"
  ],
  darkMode: ["class"], // Enable class-based dark mode
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: {
          light: "#FFFFFF", // Light theme background
          dark: "#0F123B", // Dark theme background
        },
        foreground: {
          light: "#000000", // Light theme text
          dark: "#FFFFFF", // Dark theme text
        },
        primary: {
          DEFAULT: "#0075FF", // Bright blue
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#184090", // Dark blue
          foreground: "#FFFFFF",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          light: "#FFFFFF", // Card background for light theme
          dark: "#0F123B", // Card background for dark theme
        },
      },
      borderRadius: {
        lg: "1rem", // Large radius for universal styling
        md: "0.75rem", // Medium radius
        sm: "0.5rem", // Small radius
      },
      fontFamily: {
        sans: ["var(--font-geist)", ...fontFamily.sans],
        heading: ["var(--font-heading)", ...fontFamily.sans],
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
        fadeIn: {
          "0%": { opacity: 0 },
          "100%": { opacity: 1 },
        },
        gradient: {  
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "200% 50%" },
        },
        gradientPulse: {
          "0%": { backgroundPosition: "0% 50%", transform: "scale(1)" },
          "50%": { backgroundPosition: "100% 50%", transform: "scale(1.1)" },
          "100%": { backgroundPosition: "0% 50%", transform: "scale(1)" },
        },
        orbit: {
          "0%": { boxShadow: "0 0 5px #70C1B3" },
          "50%": { boxShadow: "0 0 20px #247B9F" },
          "100%": { boxShadow: "0 0 5px #70C1B3" },
        },
        ripple: {
          "0%": { transform: "scale(1)", opacity: 1 },
          "70%": { transform: "scale(1.5)", opacity: 0 },
          "100%": { transform: "scale(1.5)", opacity: 0 },
        },
        orbitDots: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        thinkingPulse: {
          "0%": {
            transform: "scale(1)",
            opacity: 1,
            backgroundPosition: "50% 50%",
          },
          "50%": {
            transform: "scale(1.2)",
            opacity: 0.6,
            backgroundPosition: "100% 100%",
          },
          "100%": {
            transform: "scale(1)",
            opacity: 1,
            backgroundPosition: "50% 50%",
          },
        },
        lavaLamp: {
          "0%": {
            transform: "scale(1) translate(0, 0)",
            borderRadius: "50% 50% 50% 50%",
          },
          "25%": {
            transform: "scale(1.05) translate(2px, -2px)",
            borderRadius: "55% 45% 60% 40%",
          },
          "50%": {
            transform: "scale(1) translate(-2px, 2px)",
            borderRadius: "50% 60% 40% 50%",
          },
          "75%": {
            transform: "scale(1.05) translate(2px, 2px)",
            borderRadius: "60% 50% 55% 45%",
          },
          "100%": {
            transform: "scale(1) translate(0, 0)",
            borderRadius: "50% 50% 50% 50%",
          },
        },
        organicWave: {
          "0%": { backgroundPosition: "50% 50%", transform: "scale(1)" },
          "25%": { backgroundPosition: "60% 40%", transform: "scale(1.05)" },
          "50%": { backgroundPosition: "40% 60%", transform: "scale(0.95)" },
          "75%": { backgroundPosition: "60% 40%", transform: "scale(1.05)" },
          "100%": { backgroundPosition: "50% 50%", transform: "scale(1)" },
        },
        softPulse: {
          "0%": { opacity: 0.9, transform: "scale(1)" },
          "50%": { opacity: 1, transform: "scale(1.1)" },
          "100%": { opacity: 0.9, transform: "scale(1)" },
        },
        voiceRipple: {
          "0%": { transform: "scale(1)", opacity: 0.9 },
          "70%": { transform: "scale(1.3)", opacity: 0.3 },
          "100%": { transform: "scale(1.6)", opacity: 0 },
        },
        profileGradient: {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        slideUpFade: {
          '0%': {
            opacity: '0',
            transform: 'translateY(20px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        border: {
          '0%': { '--border-angle': '0deg' },
          '100%': { '--border-angle': '360deg' },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        fadeIn: "fadeIn 0.3s ease-in-out",
        gradient: "gradient 15s linear infinite",
        gradientPulse: "gradientPulse 3s ease-in-out infinite",
        orbit: "orbit 2s infinite ease-in-out",
        ripple: "ripple 2.5s infinite",
        orbitDots: "orbitDots 4s linear infinite",
        thinkingPulse: "thinkingPulse 3s infinite ease-in-out",
        lavaLamp: "lavaLamp 6s infinite ease-in-out",
        organicWave: "organicWave 6s ease-in-out infinite",
        softPulse: "softPulse 3s ease-in-out infinite",
        voiceRipple: "voiceRipple 2.5s ease-out infinite",
        profileGradient: "profileGradient 5s ease infinite",
        slideUpFade: 'slideUpFade 300ms ease-in-out backwards',
        border: 'border 4s linear infinite',
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: "100%",
          },
        },
      },
      transitionTimingFunction: {
        'custom': 'cubic-bezier(0.87, 0, 0.13, 1)',
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    require("@tailwindcss/typography"),
    require("flowbite/plugin"), // Added Flowbite plugin
    require("@tremor/react")
  ],
};



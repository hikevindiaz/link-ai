interface NavLink {
  label: string;
  href: string;
  icon?: JSX.Element;
  subLinks?: NavLink[];
}

export const siteConfig = {
  name: "Link AI",
  description: "AI-Driven Connections for Success",
  logo: "/Logo.svg",
  url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  mainNav: [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Interactions", href: "/interactions" },
    {
      label: "LinkReps",
      href: "/linkreps",
      subLinks: [
        { label: "My LinkReps", href: "/linkreps/my" },
        { label: "Orders", href: "/linkreps/orders" },
        { label: "Leads", href: "/linkreps/leads" },
        { label: "Calendar", href: "/linkreps/calendar" },
      ],
    },
    {
      label: "Voice",
      href: "/voice",
      subLinks: [
        { label: "Phone Numbers", href: "/voice/numbers" },
        { label: "Voices", href: "/voice/voices" },
      ],
    },
    {
      label: "Settings",
      href: "/settings",
      subLinks: [
        { label: "General Settings", href: "/settings/general" },
        { label: "Billing", href: "/settings/billing" },
        { label: "My Account", href: "/settings/account" },
      ],
    },
  ],
  footerNav: [
    { label: "Privacy Policy", href: "/privacy-policy" },
    { label: "Terms of Service", href: "/terms" },
  ],
};

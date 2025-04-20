'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useSession } from "next-auth/react";
import {
  RiCalendarFill,
  RiShoppingBagFill,
  RiMessengerFill,
  RiInstagramFill,
  RiWhatsappFill,
  RiStore3Fill,
  RiFileTextFill,
  RiCalendarCheckFill,
  RiCustomerService2Fill,
  RiCheckboxMultipleFill,
  RiPlugFill,
  RiSettings3Line,
  RiCloseLine,
  RiAlignJustify,
  RiSpotifyFill,
  RiMastercardFill,
  RiFlashlightFill,
  RiSearchLine,
  RiFilterLine,
  RiCheckFill,
  RiInformationLine,
  RiToggleFill,
  RiToggleLine,
  RiDriveFill,
} from '@remixicon/react';
import { toast } from "react-hot-toast";

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Divider } from '@/components/Divider';
import { Input } from '@/components/ui/input';
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoadingState } from "@/components/LoadingState";

interface IntegrationItem {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  status: 'Connected' | 'Enable' | 'Coming Soon' | 'Enabled' | 'Disabled';
  isModule: boolean;
  comingSoon?: boolean;
  iconUrl?: string;
  isEnabled?: boolean;
  href?: string;
}

const allIntegrationsData: IntegrationItem[] = [
  {
    id: 'module-orders',
    name: 'Orders',
    description: 'Process and track customer orders',
    icon: RiShoppingBagFill,
    status: 'Enabled',
    isModule: true,
    isEnabled: true,
    href: '/dashboard/orders'
  },
  {
    id: 'module-forms',
    name: 'Smart Forms',
    description: 'Create and manage custom forms',
    icon: RiCheckboxMultipleFill,
    status: 'Enabled',
    isModule: true,
    isEnabled: true,
    href: '/dashboard/forms'
  },
  {
    id: 'module-tickets',
    name: 'Customer Tickets',
    description: 'Manage support tickets and requests',
    icon: RiCustomerService2Fill,
    status: 'Enabled',
    isModule: true,
    isEnabled: true,
    href: '/dashboard/tickets'
  },
  {
    id: 'module-calendar',
    name: 'Calendar',
    description: 'Appointment booking and scheduling',
    icon: RiCalendarFill,
    status: 'Enabled',
    isModule: true,
    isEnabled: true,
    href: '/dashboard/calendar'
  },
  {
    id: 'ext-zapier',
    name: 'Zapier',
    description: 'Connect your apps and automate workflows',
    icon: RiFlashlightFill,
    status: 'Coming Soon',
    isModule: false,
    comingSoon: true,
  },
  {
    id: 'ext-monday',
    name: 'monday.com',
    description: 'Work management platform for teams',
    icon: RiAlignJustify,
    status: 'Coming Soon',
    isModule: false,
    iconUrl: 'https://www.svgrepo.com/show/354088/monday-icon.svg',
    comingSoon: true,
  },
  {
    id: 'ext-messenger',
    name: 'Facebook Messenger',
    description: 'Chat with customers directly through Facebook',
    icon: RiMessengerFill,
    status: 'Coming Soon',
    isModule: false,
    comingSoon: true,
  },
  {
    id: 'ext-instagram',
    name: 'Instagram',
    description: 'Connect with your Instagram audience',
    icon: RiInstagramFill,
    status: 'Coming Soon',
    isModule: false,
    comingSoon: true,
  },
  {
    id: 'ext-whatsapp',
    name: 'WhatsApp',
    description: 'Message customers through WhatsApp',
    icon: RiWhatsappFill,
    status: 'Coming Soon',
    isModule: false,
    comingSoon: true,
  },
  {
    id: 'ext-google-calendar',
    name: 'Google Calendar',
    description: 'Sync with your Google Calendar',
    icon: RiCalendarFill,
    status: 'Coming Soon',
    isModule: false,
    iconUrl: 'https://www.svgrepo.com/show/353803/google-calendar.svg',
    comingSoon: true,
  },
  {
    id: 'ext-stripe',
    name: 'Stripe',
    description: 'Online payment processing',
    icon: RiMastercardFill,
    status: 'Coming Soon',
    isModule: false,
    iconUrl: 'https://www.svgrepo.com/show/331592/stripe-v2.svg',
    comingSoon: true,
  },
  {
    id: 'ext-google-drive',
    name: 'Google Drive',
    description: 'Connect Google Docs & Sheets',
    icon: RiDriveFill,
    status: 'Enable',
    isModule: false,
    iconUrl: 'https://www.svgrepo.com/show/475644/drive-color.svg',
    comingSoon: false,
  },
];

const ThemedSvg = ({ src, alt, className = "size-6" }: { src: string; alt: string; className?: string }) => {
  return (
    <img 
      src={src} 
      alt={alt} 
      className={`${className} transition-colors duration-200 dark:invert dark:brightness-90 dark:hue-rotate-180`} 
    />
  );
};

interface UserIntegrationSettings {
    integrationSettings?: Record<string, boolean>;
}

export default function IntegrationsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [integrations, setIntegrations] = useState<IntegrationItem[]>([]);
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    if (sessionStatus === 'authenticated' && session?.user) {
      const userSettings = (session.user as UserIntegrationSettings).integrationSettings ?? {};
      console.log("Initializing integrations with settings:", userSettings);
      
      const initializedIntegrations = allIntegrationsData.map(item => {
        if (item.isModule) {
          const isEnabled = userSettings[item.id] ?? true; 
          const newStatus = (isEnabled ? 'Enabled' : 'Disabled') as IntegrationItem['status'];
          return { 
            ...item, 
            isEnabled: isEnabled, 
            status: newStatus
          };
        } else {
          return item;
        }
      });
      setIntegrations(initializedIntegrations);
      setIsInitializing(false);
    } else if (sessionStatus === 'unauthenticated') {
      console.warn("User is unauthenticated on integrations page.");
      setIntegrations(allIntegrationsData);
      setIsInitializing(false);
    } 
  }, [sessionStatus, session]);

  const handleModuleToggle = async (id: string, enabled: boolean) => {
    const originalIntegrations = [...integrations];
    setIntegrations(prev => 
      prev.map(item => 
        item.id === id ? { ...item, isEnabled: enabled, status: enabled ? 'Enabled' : 'Disabled' } : item
      )
    );
    setIsLoading(prev => ({ ...prev, [id]: true }));

    try {
      const response = await fetch('/api/user/module-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ integrationId: id, isEnabled: enabled }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API Error: ${response.statusText}`);
      }

      toast.success(`Module ${enabled ? 'enabled' : 'disabled'} successfully.`);

    } catch (err) {
      console.error(`Failed to toggle module ${id}:`, err);
      const message = err instanceof Error ? err.message : "Unknown error occurred";
      toast.error(`Failed to ${enabled ? 'enable' : 'disable'} module: ${message}`);
      setIntegrations(originalIntegrations);
    } finally {
      setIsLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  const filteredAndSortedData = integrations
      .filter(item => {
          if (filterStatus !== 'all' && item.isModule) {
              const isEnabledFilter = filterStatus === 'enabled';
              if (item.isEnabled !== isEnabledFilter) return false;
          }
          if (searchQuery.trim() !== '') {
              const query = searchQuery.toLowerCase();
              if (!(item.name.toLowerCase().includes(query) || item.description.toLowerCase().includes(query))) {
                  return false;
              }
          }
          return true;
      })
      .sort((a, b) => {
          if (a.isModule !== b.isModule) return a.isModule ? -1 : 1;
          return a.name.localeCompare(b.name);
      });

  if (isInitializing || sessionStatus === 'loading') {
      return <LoadingState text="Loading integration settings..." />;
  }

  // Define gradient colors (can be customized)
  const borderGradientColors = ["#4f46e5", "#7c3aed", "#db2777"]; // Using indigo/purple/pink
  const [color1, color2, color3] = borderGradientColors;
  const gradientStyle = `conic-gradient(from var(--border-angle), ${color1}, ${color2}, ${color3}, ${color2}, ${color1})`;

  return (
    <div className="p-0">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-4 md:space-y-0 px-4 md:px-8 pt-6">
        {/* Left Side: Title & Count */}
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-50">
            Integrations & Modules
          </h3>
          <span className="inline-flex size-6 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-900 dark:bg-gray-800 dark:text-gray-50">
            {filteredAndSortedData.length}
          </span>
        </div>
        {/* Right Side: Search & Filter */}
        <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Input 
              type="search"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select
            value={filterStatus}
            onValueChange={setFilterStatus}
          >
            <SelectTrigger className="w-full sm:w-40">
              <div className="flex items-center space-x-2">
                <RiFilterLine className="size-4" />
                <span>Filter: {filterStatus === 'all' ? 'All' : filterStatus === 'enabled' ? 'Enabled' : 'Disabled'}</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="enabled">Enabled</SelectItem>
              <SelectItem value="disabled">Disabled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <Divider className="my-4" />
      
      {/* Card Grid Section */}
      <div className="px-4 md:px-8 mt-4">
        <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredAndSortedData.map((item) => {
            const isItemLoading = isLoading[item.id] ?? false;

            // Define the inner content of the card first
            const cardInnerContent = (
              <>
                <div className="flex items-start gap-4">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-white p-1.5 dark:border-gray-800 dark:bg-gray-900">
                    {item.iconUrl ? (
                      <ThemedSvg src={item.iconUrl} alt={item.name} className="size-5" />
                    ) : (
                      <item.icon className="size-5 text-gray-700 dark:text-gray-300" aria-hidden={true} />
                    )}
                  </span>
                  <div className="flex-1">
                    <dt className="text-sm font-semibold text-gray-900 dark:text-gray-50">
                      {item.name}
                    </dt>
                    <dd className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                      {item.description}
                    </dd>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  {item.isModule ? (
                    <div className="flex items-center space-x-2">
                      <Switch
                        id={`module-toggle-${item.id}`}
                        checked={item.isEnabled}
                        onCheckedChange={(checked) => handleModuleToggle(item.id, checked)}
                        disabled={isItemLoading}
                      />
                      <Label htmlFor={`module-toggle-${item.id}`} className={`text-xs ${isItemLoading ? 'text-gray-400 dark:text-gray-600' : 'text-gray-600 dark:text-gray-400'} cursor-pointer`}>
                        {isItemLoading ? 'Updating...' : item.isEnabled ? 'Enabled' : 'Disabled'}
                      </Label>
                    </div>
                  ) : item.comingSoon === true ? (
                    <Badge variant="secondary" className="text-xs font-normal py-0.5">Coming Soon</Badge>
                  ) : item.status === 'Connected' ? (
                    <Badge variant="success" className="text-xs font-normal py-0.5">Connected</Badge>
                  ) : (
                    <Button variant="secondary" size="sm" className="text-xs">Connect</Button>
                  )}
                </div>
              </>
            );

            if (item.isModule) {
              // Wrap modules with the animated border
              return (
                <div
                  key={item.id} // Key on the outer wrapper
                  className="relative rounded-xl p-[1px] animate-border overflow-hidden"
                  style={{ background: gradientStyle }}
                >
                  <Card 
                    className="flex flex-col justify-between p-4 relative h-full bg-white dark:bg-gray-900 rounded-lg"
                  >
                    {cardInnerContent}
                  </Card>
                </div>
              );
            } else {
              // Render non-modules as regular cards
              return (
                <Card 
                  key={item.id} 
                  className="flex flex-col justify-between p-4 relative border hover:shadow-md transition-shadow duration-200 h-full bg-white dark:bg-gray-900 rounded-lg"
                >
                  {cardInnerContent}
                </Card>
              );
            }
          })}
        </dl>
      </div>
      <style jsx global>{`
          @property --border-angle {
              syntax: '<angle>';
              initial-value: 0deg;
              inherits: false;
          }
          @keyframes border { 
              to { --border-angle: 360deg; } 
          }
          .animate-border {
              animation: border 4s linear infinite;
          }
      `}</style>
    </div>
  );
}
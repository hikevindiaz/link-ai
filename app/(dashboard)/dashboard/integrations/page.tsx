'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
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
} from '@remixicon/react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Divider } from '@/components/Divider';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Revert to a simpler ThemedSvg component that uses CSS filters
const ThemedSvg = ({ src, alt, className = "size-6" }: { src: string; alt: string; className?: string }) => {
  return (
    <img 
      src={src} 
      alt={alt} 
      className={`${className} transition-colors duration-200 dark:invert dark:brightness-90 dark:hue-rotate-180`} 
    />
  );
};

// Original data array
const initialData = [
  {
    name: 'Zapier',
    description: 'Connect your apps and automate workflows',
    icon: RiFlashlightFill,
    status: 'Enable',
    isModule: false,
    comingSoon: true,
  },
  {
    name: 'monday.com',
    description: 'Work management platform for teams',
    icon: RiAlignJustify,
    status: 'Enable',
    isModule: false,
    iconUrl: 'https://www.svgrepo.com/show/354088/monday-icon.svg',
    comingSoon: true,
  },
  {
    name: 'Facebook Messenger',
    description: 'Chat with customers directly through Facebook',
    icon: RiMessengerFill,
    status: 'Connected',
    isModule: false,
    comingSoon: true,
  },
  {
    name: 'Instagram',
    description: 'Connect with your Instagram audience',
    icon: RiInstagramFill,
    status: 'Enable',
    isModule: false,
    comingSoon: true,
  },
  {
    name: 'WhatsApp',
    description: 'Message customers through WhatsApp',
    icon: RiWhatsappFill,
    status: 'Connected',
    isModule: false,
    comingSoon: true,
  },
  {
    name: 'Google Calendar',
    description: 'Manage appointments and schedules',
    icon: RiCalendarFill,
    status: 'Enable',
    isModule: false,
    iconUrl: 'https://www.svgrepo.com/show/353803/google-calendar.svg',
    comingSoon: true,
  },
  {
    name: 'Clover POS',
    description: 'Point of sale system integration',
    icon: RiStore3Fill,
    status: 'Enable',
    isModule: false,
    comingSoon: true,
  },
  {
    name: 'Aloha POS',
    description: 'Restaurant management system',
    icon: RiStore3Fill,
    status: 'Enable',
    isModule: false,
    comingSoon: true,
  },
  {
    name: 'Symphony POS',
    description: 'Retail point of sale solution',
    icon: RiStore3Fill,
    status: 'Enable',
    isModule: false,
    comingSoon: true,
  },
  {
    name: 'Shopify',
    description: 'E-commerce platform for online stores',
    icon: RiSpotifyFill,
    status: 'Connected',
    isModule: false,
    comingSoon: true,
  },
  {
    name: 'OpenTable',
    description: 'Restaurant reservation system',
    icon: RiCalendarCheckFill,
    status: 'Enable',
    isModule: false,
    iconUrl: 'https://www.svgrepo.com/show/443304/brand-opentable.svg',
    comingSoon: true,
  },
  {
    name: 'Stripe',
    description: 'Online payment processing',
    icon: RiMastercardFill,
    status: 'Connected',
    isModule: false,
    iconUrl: 'https://www.svgrepo.com/show/331592/stripe-v2.svg',
    comingSoon: true,
  },
  {
    name: 'Smart Forms',
    description: 'Create and manage custom forms',
    icon: RiCheckboxMultipleFill,
    status: 'Enable',
    isModule: true,
    comingSoon: true,
  },
  {
    name: 'Orders',
    description: 'Process and track customer orders',
    icon: RiShoppingBagFill,
    status: 'Connected',
    isModule: true,
    comingSoon: true,
  },
  {
    name: 'Scheduling',
    description: 'Appointment booking and scheduling',
    icon: RiCalendarFill,
    status: 'Enable',
    isModule: true,
    comingSoon: true,
  },
  {
    name: 'Customer Tickets',
    description: 'Manage support tickets and requests',
    icon: RiCustomerService2Fill,
    status: 'Enable',
    isModule: true,
    comingSoon: true,
  },
];

export default function Example() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filteredData, setFilteredData] = useState(initialData);

  // Apply filtering and searching
  useEffect(() => {
    let result = [...initialData];
    
    // Apply status filter
    if (filterStatus !== 'all') {
      const isConnected = filterStatus === 'connected';
      result = result.filter(item => 
        isConnected ? item.status === 'Connected' : item.status === 'Enable'
      );
    }
    
    // Apply search filter if search query exists
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      result = result.filter(item => 
        item.name.toLowerCase().includes(query) || 
        item.description.toLowerCase().includes(query)
      );
    }
    
    setFilteredData(result);
  }, [searchQuery, filterStatus]);

  return (
    <div className="p-0">
      <div>
        <div className="mt-6 mx-8 mb-0 rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300">
          <div className="flex items-center">
            <RiInformationLine className="mr-2 size-5" />
            <span className="font-medium">Coming Soon</span>
            <span className="ml-2">All integrations are currently in development and will be available soon. Stay tuned for updates!</span>
          </div>
        </div>
      </div>
      <div className="flex justify-between items-center px-8 pt-6">
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-50">
            Integrations
          </h3>
          <span className="inline-flex size-6 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-900 dark:bg-gray-800 dark:text-gray-50">
            {filteredData.length}
          </span>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative w-64">
            <Input 
              type="search"
              placeholder="Search integrations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select
            value={filterStatus}
            onValueChange={setFilterStatus}
          >
            <SelectTrigger className="w-40">
              <div className="flex items-center space-x-2">
                <RiFilterLine className="size-4" />
                <span>Filter: {filterStatus === 'all' ? 'All' : filterStatus === 'connected' ? 'Connected' : 'Not Connected'}</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="connected">Connected</SelectItem>
              <SelectItem value="not-connected">Not Connected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <Divider className="my-4" />
      
      {/* Module Integrations */}
      <div className="px-8 mt-8">
        <h4 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-4">
          Modules
        </h4>
        <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-8">
          {filteredData.filter(item => item.isModule).map((item) => (
            <Card key={item.name} className="flex flex-col justify-between p-4 relative">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-white p-1 dark:border-gray-800 dark:bg-[#090E1A]">
                <item.icon className="size-6 text-gray-800 dark:text-gray-200" aria-hidden={true} />
              </span>
              <div className="mt-5 flex-1">
                <dt className="text-sm font-medium text-gray-900 dark:text-gray-50 flex items-center">
                  {item.name}
                  <span className="ml-2 text-xs px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-full">Coming Soon</span>
                </dt>
                <dd className="mt-1 text-sm/6 text-gray-600 dark:text-gray-400">
                  {item.description}
                </dd>
              </div>
              <Button 
                variant="ghost" 
                className="absolute right-2 top-2 p-2 text-gray-400 hover:text-gray-500 dark:text-gray-600 hover:dark:text-gray-500 cursor-not-allowed opacity-60"
                size="sm"
                disabled={true}
              >
                <RiSettings3Line className="size-5 shrink-0" />
              </Button>
              <Button
                className="mt-8 cursor-not-allowed opacity-60"
                variant="secondary"
                disabled={true}
              >
                <span className="text-xs">Coming Soon</span>
              </Button>
            </Card>
          ))}
        </dl>
      </div>
      
      {/* External Integrations */}
      <div className="px-8 mt-4">
        <h4 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-4">
          External Integrations
        </h4>
        <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredData.filter(item => !item.isModule).map((item) => (
            <Card key={item.name} className="flex flex-col justify-between p-4 relative">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-white p-1 dark:border-gray-800 dark:bg-[#090E1A]">
                {item.iconUrl ? (
                  <ThemedSvg src={item.iconUrl} alt={item.name} />
                ) : (
                  <item.icon className="size-6 text-gray-800 dark:text-gray-200" aria-hidden={true} />
                )}
              </span>
              <div className="mt-5 flex-1">
                <dt className="text-sm font-medium text-gray-900 dark:text-gray-50 flex items-center">
                  {item.name}
                  <span className="ml-2 text-xs px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-full">Coming Soon</span>
                </dt>
                <dd className="mt-1 text-sm/6 text-gray-600 dark:text-gray-400">
                  {item.description}
                </dd>
              </div>
              <Button 
                variant="ghost" 
                className="absolute right-2 top-2 p-2 text-gray-400 hover:text-gray-500 dark:text-gray-600 hover:dark:text-gray-500 cursor-not-allowed opacity-60"
                size="sm"
                disabled={true}
              >
                <RiSettings3Line className="size-5 shrink-0" />
              </Button>
              <Button
                className="mt-8 cursor-not-allowed opacity-60"
                variant="secondary"
                disabled={true}
              >
                <span className="text-xs">Coming Soon</span>
              </Button>
            </Card>
          ))}
        </dl>
      </div>
    </div>
  );
}
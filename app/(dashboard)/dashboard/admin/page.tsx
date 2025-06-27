'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { cn } from '@/lib/utils';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/Button";
import { Badge } from "@/components/badge";
import { Divider } from "@/components/Divider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  RiUserLine,
  RiRobotLine,
  RiBarChartLine,
  RiAlertLine,
  RiHeartPulseLine,
  RiArrowUpLine,
  RiArrowDownLine,
  RiAddLine,
  RiArrowRightUpLine
} from "@remixicon/react";
import { AreaChart } from '@/components/AreaChart';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from "@/components/ui/skeleton";

// Tab definitions
const tabs = [
  { id: 'sales', label: 'Sales', icon: RiBarChartLine, disabled: false },
  { id: 'analytics', label: 'Analytics', icon: RiBarChartLine, disabled: true },
  { id: 'users', label: 'Users', icon: RiUserLine, disabled: true },
  { id: 'agents', label: 'Agents', icon: RiRobotLine, disabled: true },
  { id: 'system-health', label: 'System Health', icon: RiHeartPulseLine, disabled: true },
  { id: 'error-logs', label: 'Error Logs', icon: RiAlertLine, disabled: true },
];

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('sales');
  const [metrics, setMetrics] = useState<any>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [salesData, setSalesData] = useState<any>(null);
  const [salesLoading, setSalesLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('30D');
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsPeriod, setAnalyticsPeriod] = useState('30d');

  // Client-side admin check
  useEffect(() => {
    if (status === 'loading') return; // Still loading
    
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    // Check if user is admin
    if (status === 'authenticated' && session?.user) {
      const userRole = (session.user as any).role;
      if (userRole !== 'ADMIN') {
        router.push('/dashboard');
        return;
      }
    }
  }, [status, session, router]);

  // Simulate loading
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  // Fetch real metrics
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch('/api/admin/metrics');
        if (response.ok) {
          const data = await response.json();
          setMetrics(data);
        }
      } catch (error) {
        console.error('Error fetching metrics:', error);
      } finally {
        setMetricsLoading(false);
      }
    };

    if (status === 'authenticated' && (session?.user as any)?.role === 'ADMIN') {
      fetchMetrics();
    }
  }, [status, session]);

  // Fetch real transactions
  useEffect(() => {
    const fetchTransactions = async () => {
      setTransactionsLoading(true);
      try {
        const response = await fetch(`/api/admin/transactions?period=${selectedPeriod}`);
        if (response.ok) {
          const data = await response.json();
          setTransactions(data.transactions || []);
        }
      } catch (error) {
        console.error('Error fetching transactions:', error);
      } finally {
        setTransactionsLoading(false);
      }
    };

    if (status === 'authenticated' && (session?.user as any)?.role === 'ADMIN') {
      fetchTransactions();
    }
  }, [status, session, selectedPeriod]);

  // Fetch sales data by plan
  useEffect(() => {
    const fetchSalesData = async () => {
      setSalesLoading(true);
      try {
        const response = await fetch(`/api/admin/sales-by-plan?period=${selectedPeriod}`);
        if (response.ok) {
          const data = await response.json();
          setSalesData(data);
        }
      } catch (error) {
        console.error('Error fetching sales data:', error);
      } finally {
        setSalesLoading(false);
      }
    };

    if (status === 'authenticated' && (session?.user as any)?.role === 'ADMIN') {
      fetchSalesData();
    }
  }, [status, session, selectedPeriod]);

  // Fetch Vercel analytics data
  useEffect(() => {
    const fetchAnalyticsData = async () => {
      setAnalyticsLoading(true);
      try {
        const response = await fetch(`/api/admin/vercel-analytics?period=${analyticsPeriod}`);
        if (response.ok) {
          const data = await response.json();
          setAnalyticsData(data.data);
        }
      } catch (error) {
        console.error('Error fetching analytics data:', error);
      } finally {
        setAnalyticsLoading(false);
      }
    };

    if (status === 'authenticated' && (session?.user as any)?.role === 'ADMIN') {
      fetchAnalyticsData();
    }
  }, [status, session, analyticsPeriod]);

  // Don't render anything while checking auth
  if (status === 'loading') {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Don't render if not authenticated or not admin
  if (status !== 'authenticated' || (session?.user as any)?.role !== 'ADMIN') {
    return null;
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Mock data for different tabs
  const mockData = {
    analytics: [
      { metric: 'API Requests', value: '2.4M', change: '+12%', positive: true },
      { metric: 'Active Users', value: '1,234', change: '+8%', positive: true },
      { metric: 'Response Time', value: '145ms', change: '-5%', positive: true },
      { metric: 'Error Rate', value: '0.02%', change: '-15%', positive: true },
    ],
    users: [
      { name: 'John Doe', email: 'john@example.com', role: 'User', status: 'Active', lastActive: '2 min ago' },
      { name: 'Jane Smith', email: 'jane@example.com', role: 'Admin', status: 'Active', lastActive: '1 hour ago' },
      { name: 'Bob Johnson', email: 'bob@example.com', role: 'User', status: 'Inactive', lastActive: '2 days ago' },
    ],
    agents: [
      { name: 'Customer Support', type: 'Chat', status: 'Active', conversations: 142, successRate: '98%' },
      { name: 'Sales Assistant', type: 'Voice', status: 'Active', conversations: 89, successRate: '94%' },
      { name: 'FAQ Bot', type: 'Chat', status: 'Maintenance', conversations: 67, successRate: '91%' },
    ],
    errorLogs: [
      { timestamp: '2024-01-15 14:30:25', level: 'Error', message: 'Database connection timeout', source: 'api/users' },
      { timestamp: '2024-01-15 14:25:10', level: 'Warning', message: 'High memory usage detected', source: 'worker-1' },
      { timestamp: '2024-01-15 14:20:45', level: 'Error', message: 'Failed to process webhook', source: 'api/webhooks' },
    ],
    systemHealth: [
      { component: 'API Server', status: 'Healthy', uptime: '99.9%', lastCheck: '1 min ago' },
      { component: 'Database', status: 'Healthy', uptime: '99.8%', lastCheck: '1 min ago' },
      { component: 'File Storage', status: 'Warning', uptime: '98.5%', lastCheck: '30 sec ago' },
    ],
  };

  // Time period filter data
  const periodData = [
    { buttonText: '7D', value: '7D', tooltipText: 'Last 7 days' },
    { buttonText: '30D', value: '30D', tooltipText: 'Last 30 days' },
    { buttonText: '3M', value: '3M', tooltipText: 'Last 3 months' },
    { buttonText: '6M', value: '6M', tooltipText: 'Last 6 months' },
  ];

  const periodSelectData = [
    { value: 'week-to-date', label: 'Week to Date' },
    { value: 'month-to-date', label: 'Month to Date' },
    { value: 'year-to-date', label: 'Year to Date' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'sales':
        const planColors = {
          'Starter': 'bg-blue-500',
          'Growth': 'bg-orange-500', 
          'Scale': 'bg-sky-500',
          'Custom': 'bg-neutral-500',
        };

        return (
          <div className="w-full">
            <div className="px-4 md:px-8 py-6">
              {/* Header with Total Sales and Time Filter */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <h3 className="text-sm text-neutral-500 dark:text-neutral-500">
                    Total sales
                  </h3>
                  {salesLoading ? (
                    <Skeleton className="h-8 w-32 mt-1" />
                  ) : (
                    <p className="text-3xl font-semibold text-neutral-900 dark:text-neutral-50">
                      ${salesData?.totalRevenue?.toLocaleString() || '0'}
                    </p>
                  )}
                </div>
                
                {/* Time Period Filter */}
                <div className="flex items-center">
                  <div className="hidden items-center rounded-md text-sm font-medium shadow-sm sm:inline-flex">
                    {periodData.map((item, index) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setSelectedPeriod(item.value)}
                        className={cn(
                          index === 0 ? 'rounded-l-md' : '-ml-px',
                          'border border-neutral-300 px-4 py-2 text-neutral-900 hover:bg-neutral-50 focus:z-10 focus:outline-none dark:border-neutral-800 dark:text-neutral-50 hover:dark:bg-neutral-950/50',
                          selectedPeriod === item.value ? 'bg-neutral-100 dark:bg-neutral-800' : 'bg-white dark:bg-neutral-950'
                        )}
                        title={item.tooltipText}
                      >
                        {item.buttonText}
                      </button>
                    ))}
                    <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                      <SelectTrigger className="-ml-px w-fit rounded-none rounded-r-md border-neutral-300 shadow-none dark:border-neutral-800">
                        <SelectValue placeholder="XTD" />
                      </SelectTrigger>
                      <SelectContent className="border-neutral-200 dark:border-neutral-800">
                        {periodSelectData.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Mobile version */}
                  <div className="inline-flex items-center rounded-md text-sm font-medium shadow-sm sm:hidden">
                    {periodData.slice(0, 2).map((item, index) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setSelectedPeriod(item.value)}
                        className={cn(
                          index === 0 ? 'rounded-l-md' : '-ml-px',
                          'border border-neutral-300 px-4 py-2 text-neutral-900 hover:bg-neutral-50 focus:z-10 focus:outline-none dark:border-neutral-800 dark:text-neutral-50 hover:dark:bg-neutral-950/50',
                          selectedPeriod === item.value ? 'bg-neutral-100 dark:bg-neutral-800' : 'bg-white dark:bg-neutral-950'
                        )}
                        title={item.tooltipText}
                      >
                        {item.buttonText}
                      </button>
                    ))}
                    <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                      <SelectTrigger className="-ml-px w-fit rounded-none rounded-r-md border-neutral-300 shadow-none dark:border-neutral-800">
                        <SelectValue placeholder="XTD" />
                      </SelectTrigger>
                      <SelectContent align="end">
                        {periodSelectData.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <h4 className="mt-6 text-sm text-neutral-500 dark:text-neutral-500">
                Sales by plan
              </h4>
              
              {/* Progress bar for plan distribution */}
              {salesLoading ? (
                <Skeleton className="mt-4 h-2 w-full" />
              ) : (
                <div className="mt-4 flex h-2 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                  {salesData?.planBreakdown?.map((plan: any) => (
                    <div
                      key={plan.plan}
                      className={planColors[plan.plan as keyof typeof planColors] || 'bg-neutral-500'}
                      style={{ width: `${plan.percentage}%` }}
                    />
                  ))}
                </div>
              )}
              
              {/* Plan Cards */}
              {salesLoading ? (
                <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Card key={index} className="px-3 py-2">
                      <Skeleton className="h-4 w-16 mb-2" />
                      <Skeleton className="h-4 w-24" />
                    </Card>
                  ))}
                </div>
              ) : (
                <dl className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-4">
                  {salesData?.planBreakdown?.map((plan: any) => (
                    <Card key={plan.plan} className="group relative rounded-md px-3 py-2">
                      <div className="flex items-center space-x-2">
                        <span
                          className={cn(planColors[plan.plan as keyof typeof planColors] || 'bg-neutral-500', 'size-2.5 rounded-sm')}
                          aria-hidden={true}
                        />
                        <dt className="text-sm text-neutral-500 dark:text-neutral-500">
                          {plan.plan}
                        </dt>
                      </div>
                      <dd className="mt-1 text-sm text-neutral-900 dark:text-neutral-50">
                        <span className="font-semibold">{plan.percentage.toFixed(1)}%</span> &#8729;{' '}
                        ${plan.revenue.toLocaleString()}
                      </dd>
                      <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                        {plan.count} {plan.count === 1 ? 'sale' : 'sales'}
                      </div>
                    </Card>
                  ))}
                </dl>
              )}
              
              {/* Transactions Table */}
              <div className="mt-12">
                <h4 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50 mb-6">
                  Recent Transactions
                </h4>
                
                {transactionsLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <div key={index} className="flex items-center space-x-4 py-3">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-neutral-200 dark:border-neutral-700">
                          <th className="text-left py-3 px-4 text-sm font-medium text-neutral-500 dark:text-neutral-400">
                            Date
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-neutral-500 dark:text-neutral-400">
                            Customer
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-neutral-500 dark:text-neutral-400">
                            Description
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-neutral-500 dark:text-neutral-400">
                            Amount
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-neutral-500 dark:text-neutral-400">
                            Status
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-neutral-500 dark:text-neutral-400">
                            Type
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.slice(0, 20).map((transaction) => (
                          <tr key={transaction.id} className="border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                            <td className="py-3 px-4 text-sm text-neutral-900 dark:text-neutral-50">
                              {new Date(transaction.createdAt).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4 text-sm text-neutral-900 dark:text-neutral-50">
                              <div>
                                <div className="font-medium">
                                  {transaction.customer?.name || transaction.customer?.email || 'Unknown'}
                                </div>
                                {transaction.customer?.email && transaction.customer?.name && (
                                  <div className="text-xs text-neutral-500 dark:text-neutral-400">
                                    {transaction.customer.email}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-sm text-neutral-900 dark:text-neutral-50">
                              {transaction.description}
                              {transaction.phoneNumber && (
                                <div className="text-xs text-neutral-500 dark:text-neutral-400">
                                  {transaction.phoneNumber}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4 text-sm font-medium text-neutral-900 dark:text-neutral-50">
                              ${transaction.amount.toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-sm">
                              <Badge 
                                variant={
                                  transaction.status === 'paid' ? 'success' :
                                  transaction.status === 'pending' ? 'warning' :
                                  transaction.status === 'failed' ? 'error' :
                                  'default'
                                }
                              >
                                {transaction.status}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-sm text-neutral-500 dark:text-neutral-400">
                              <div className="flex items-center space-x-1">
                                <span>{transaction.type}</span>
                                {transaction.isStripeInvoice && (
                                  <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-1 py-0.5 rounded">
                                    Stripe
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    
                    {transactions.length === 0 && (
                      <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
                        No transactions found
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'analytics':
        // Use real analytics data or fallback to loading/empty state
        const data = analyticsData?.chartData || [];
        const summary = analyticsData ? [
          { 
            name: 'Unique visitors', 
            value: analyticsData.summary?.uniqueVisitors > 1000 
              ? `${(analyticsData.summary.uniqueVisitors / 1000).toFixed(1)}K`
              : analyticsData.summary?.uniqueVisitors?.toString() || '0'
          },
          { 
            name: 'Page views', 
            value: analyticsData.summary?.pageViews > 1000 
              ? `${(analyticsData.summary.pageViews / 1000).toFixed(1)}K`
              : analyticsData.summary?.pageViews?.toString() || '0'
          },
        ] : [
          { name: 'Unique visitors', value: '0' },
          { name: 'Page views', value: '0' },
        ];

        const valueFormatter = (number: number) =>
          `${Intl.NumberFormat('us').format(number).toString()}`;

        return (
          <div className="px-4 md:px-8 py-6">
            <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
              Web analytics
            </h1>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-500">
              Analyze and understand your web traffic.
            </p>
            <div className="mt-2 flex items-center space-x-2 text-xs text-amber-600 dark:text-amber-500">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>Simulated data - Vercel does not provide public analytics API</span>
            </div>
            <div className="mt-6 md:flex md:items-center md:justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
                  www.getlinkai.com
                </span>
                <span className="h-6 w-px bg-neutral-200 dark:bg-neutral-800" />
                <span className="flex items-center space-x-2">
                  <span
                    className="shrink-0 animate-pulse rounded-full bg-emerald-500/30 p-1"
                    aria-hidden={true}
                  >
                    <span className="block size-2 rounded-full bg-emerald-500 dark:bg-emerald-500" />
                  </span>
                  <span className="text-sm text-neutral-500 dark:text-neutral-500">
                    89 online
                  </span>
                </span>
              </div>
              <div className="mt-2 sm:flex sm:items-center sm:space-x-2 md:mt-0">
                <Select defaultValue="Production">
                  <SelectTrigger className="w-full md:w-fit">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent align="end">
                    <SelectItem value="Production">Production</SelectItem>
                    <SelectItem value="Preview">Preview</SelectItem>
                    <SelectItem value="All">All environments</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={analyticsPeriod} onValueChange={setAnalyticsPeriod}>
                  <SelectTrigger className="mt-2 w-full sm:mt-0 md:w-fit">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent align="end">
                    <SelectItem value="7d">Last 7 days</SelectItem>
                    <SelectItem value="30d">Last 30 days</SelectItem>
                    <SelectItem value="90d">Last 3 months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Card className="mt-4 overflow-hidden p-0">
              {analyticsLoading ? (
                <div className="p-6 space-y-4">
                  <div className="flex space-x-4">
                    <Skeleton className="h-16 w-48" />
                    <Skeleton className="h-16 w-48" />
                  </div>
                  <Skeleton className="h-96 w-full" />
                </div>
              ) : (
                <Tabs defaultValue={summary[0].name}>
                  <TabsList
                    defaultValue="tab1"
                    className="h-24 bg-neutral-50 dark:!bg-[#090E1A]"
                  >
                    {summary.map((tab) => (
                      <React.Fragment key={tab.name}>
                        <TabsTrigger
                          value={tab.name}
                          className="py-4 pl-5 pr-12 text-left data-[state=active]:bg-white dark:data-[state=active]:bg-[#090E1A]"
                        >
                          <span className="block font-normal text-neutral-500 dark:text-neutral-500">
                            {tab.name}
                          </span>
                          <span className="mt-1 block text-3xl font-semibold text-neutral-900 dark:text-neutral-50">
                            {tab.value}
                          </span>
                        </TabsTrigger>
                        <span
                          className="h-full border-r border-neutral-200 dark:border-neutral-800"
                          aria-hidden={true}
                        />
                      </React.Fragment>
                    ))}
                  </TabsList>
                  {summary.map((tab) => (
                    <TabsContent key={tab.name} value={tab.name} className="p-6">
                      {data.length > 0 ? (
                        <>
                          <AreaChart
                            data={data}
                            index="date"
                            categories={[tab.name]}
                            valueFormatter={valueFormatter}
                            fill="solid"
                            showLegend={false}
                            yAxisWidth={45}
                            className="hidden h-96 sm:block"
                          />
                          <AreaChart
                            data={data}
                            index="date"
                            categories={[tab.name]}
                            valueFormatter={valueFormatter}
                            fill="solid"
                            showLegend={false}
                            showYAxis={false}
                            startEndOnly={true}
                            className="h-72 sm:hidden"
                          />
                        </>
                      ) : (
                        <div className="h-96 flex items-center justify-center text-neutral-500 dark:text-neutral-400">
                          No analytics data available for the selected period
                        </div>
                      )}
                    </TabsContent>
                  ))}
                </Tabs>
              )}
            </Card>
          </div>
        );

      case 'users':
        return (
          <div className="space-y-4">
            {mockData.users.map((user, index) => (
              <div key={index} className="grid grid-cols-5 gap-4 py-3 border-b border-neutral-200 dark:border-neutral-700 last:border-b-0">
                <div>
                  <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50">{user.name}</p>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400">{user.email}</p>
                </div>
                <div className="flex items-center">
                  <Badge variant={user.role === 'Admin' ? 'default' : 'neutral'}>{user.role}</Badge>
                </div>
                <div className="flex items-center">
                  <Badge variant={user.status === 'Active' ? 'success' : 'neutral'}>{user.status}</Badge>
                </div>
                <div className="flex items-center">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">{user.lastActive}</p>
                </div>
                <div className="flex items-center justify-end">
                  <Button variant="ghost" size="sm">Edit</Button>
                </div>
              </div>
            ))}
          </div>
        );

      case 'agents':
        return (
          <div className="space-y-4">
            {mockData.agents.map((agent, index) => (
              <div key={index} className="grid grid-cols-5 gap-4 py-3 border-b border-neutral-200 dark:border-neutral-700 last:border-b-0">
                <div>
                  <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50">{agent.name}</p>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400">{agent.type}</p>
                </div>
                <div className="flex items-center">
                  <Badge variant={agent.status === 'Active' ? 'success' : 'warning'}>{agent.status}</Badge>
                </div>
                <div className="flex items-center">
                  <p className="text-sm text-neutral-900 dark:text-neutral-50">{agent.conversations}</p>
                </div>
                <div className="flex items-center">
                  <p className="text-sm text-neutral-900 dark:text-neutral-50">{agent.successRate}</p>
                </div>
                <div className="flex items-center justify-end">
                  <Button variant="ghost" size="sm">Configure</Button>
                </div>
              </div>
            ))}
          </div>
        );

      case 'error-logs':
        return (
          <div className="space-y-4">
            {mockData.errorLogs.map((log, index) => (
              <div key={index} className="grid grid-cols-4 gap-4 py-3 border-b border-neutral-200 dark:border-neutral-700 last:border-b-0">
                <div>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400">{log.timestamp}</p>
                </div>
                <div className="flex items-center">
                  <Badge variant={log.level === 'Error' ? 'error' : 'warning'}>{log.level}</Badge>
                </div>
                <div>
                  <p className="text-sm text-neutral-900 dark:text-neutral-50">{log.message}</p>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400">{log.source}</p>
                </div>
                <div className="flex items-center justify-end">
                  <Button variant="ghost" size="sm">View Details</Button>
                </div>
              </div>
            ))}
          </div>
        );

      case 'system-health':
        return (
          <div className="space-y-4">
            {mockData.systemHealth.map((system, index) => (
              <div key={index} className="grid grid-cols-4 gap-4 py-3 border-b border-neutral-200 dark:border-neutral-700 last:border-b-0">
                <div>
                  <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50">{system.component}</p>
                </div>
                <div className="flex items-center">
                  <Badge variant={system.status === 'Healthy' ? 'success' : 'warning'}>{system.status}</Badge>
                </div>
                <div className="flex items-center">
                  <p className="text-sm text-neutral-900 dark:text-neutral-50">{system.uptime}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400">{system.lastCheck}</p>
                </div>
              </div>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-0">
      {/* Page Header */}
      <div className="px-4 md:px-8 py-4">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-2 md:space-y-0">
          <h1 className="text-lg font-medium text-neutral-900 dark:text-neutral-50">
            Dashboard
          </h1>
          <div className="flex items-center space-x-2">
            <Button variant="secondary" size="sm">
              <RiAddLine className="size-4 mr-2" />
              Invite User
            </Button>
            <Button variant="primary" size="sm">
              <RiAddLine className="size-4 mr-2" />
              Create Subscription
            </Button>
          </div>
        </div>
      </div>

      <Divider className="my-0" />

      {/* Header Section with Key Metrics Cards */}
      <div className="px-4 md:px-8 pt-6 pb-4">
        <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          {metricsLoading ? (
            // Loading skeleton
            Array.from({ length: 4 }).map((_, index) => (
              <Card key={index}>
                <dd className="flex items-start justify-between">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-4 w-8" />
                </dd>
                <dt className="mt-1">
                  <Skeleton className="h-4 w-20" />
                </dt>
              </Card>
            ))
          ) : (
            <>
              <Card>
                <dd className="flex items-start justify-between">
                  <span className="text-3xl font-semibold text-neutral-900 dark:text-neutral-50">
                    {metrics?.totalUsers?.value || '0'}
                  </span>
                  <span className={cn(
                    metrics?.totalUsers?.changeType === 'positive'
                      ? 'text-emerald-700 dark:text-emerald-500'
                      : 'text-red-700 dark:text-red-500',
                    'text-sm font-medium'
                  )}>
                    {metrics?.totalUsers?.change || '+0%'}
                  </span>
                </dd>
                <dt className="mt-1 text-sm text-neutral-500 dark:text-neutral-500">
                  Total Users
                </dt>
              </Card>

              <Card>
                <dd className="flex items-start justify-between">
                  <span className="text-3xl font-semibold text-neutral-900 dark:text-neutral-50">
                    {metrics?.totalChatbots?.value || '0'}
                  </span>
                  <span className={cn(
                    metrics?.totalChatbots?.changeType === 'positive'
                      ? 'text-emerald-700 dark:text-emerald-500'
                      : 'text-red-700 dark:text-red-500',
                    'text-sm font-medium'
                  )}>
                    {metrics?.totalChatbots?.change || '+0%'}
                  </span>
                </dd>
                <dt className="mt-1 text-sm text-neutral-500 dark:text-neutral-500">
                  Total Agents
                </dt>
              </Card>

              <Card>
                <dd className="flex items-start justify-between">
                  <span className="text-3xl font-semibold text-neutral-900 dark:text-neutral-50">
                    {metrics?.monthlyRevenue?.value || '$0'}
                  </span>
                  <span className={cn(
                    metrics?.monthlyRevenue?.changeType === 'positive'
                      ? 'text-emerald-700 dark:text-emerald-500'
                      : 'text-red-700 dark:text-red-500',
                    'text-sm font-medium'
                  )}>
                    {metrics?.monthlyRevenue?.change || '+0%'}
                  </span>
                </dd>
                <dt className="mt-1 text-sm text-neutral-500 dark:text-neutral-500">
                  MRR
                </dt>
              </Card>

              <Card>
                <dd className="flex items-start justify-between">
                  <span className="text-3xl font-semibold text-neutral-900 dark:text-neutral-50">
                    {metrics?.totalKnowledgeSources?.value || '0'}
                  </span>
                  <span className={cn(
                    metrics?.totalKnowledgeSources?.changeType === 'positive'
                      ? 'text-emerald-700 dark:text-emerald-500'
                      : 'text-red-700 dark:text-red-500',
                    'text-sm font-medium'
                  )}>
                    {metrics?.totalKnowledgeSources?.change || '+0%'}
                  </span>
                </dd>
                <dt className="mt-1 text-sm text-neutral-500 dark:text-neutral-500">
                  Knowledge Sources
                </dt>
              </Card>
            </>
          )}
        </dl>
      </div>

      {/* Tab Navigation */}
      <div className="w-full">
        <div className="flex space-x-0 border-b border-neutral-200 dark:border-neutral-700">
          <div className="px-4 md:px-8 flex space-x-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => !tab.disabled && setActiveTab(tab.id)}
                disabled={tab.disabled}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  tab.disabled
                    ? 'border-transparent text-neutral-400 dark:text-neutral-600 cursor-not-allowed opacity-50'
                    : activeTab === tab.id
                    ? 'border-neutral-500 text-neutral-600 dark:text-neutral-400'
                    : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>



      {/* Content Area */}
      <div className="pb-8">
        {renderTabContent()}
      </div>
    </div>
  );
} 
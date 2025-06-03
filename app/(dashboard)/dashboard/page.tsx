'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from "next-auth/react";
import { Select, SelectItem, DateRangePickerValue } from "@tremor/react";
import { DashboardHeader } from "@/components/dashboard/header";
import { DashboardStats } from "@/components/dashboard/stats";
import { MessagesChart } from "@/components/dashboard/messages-chart";
import { DashboardOverview } from '@/components/dashboard/overview-header';
import WelcomeBanner from '@/components/WelcomeBanner';

interface KpiData {
  name: string;
  stat: string;
  change: string;
  changeType: 'positive' | 'negative';
}

interface MessageData {
  name: string;
  channels: {
    [channel: string]: number;
  };
}

interface IntegrationSettingsMap {
  [integrationId: string]: {
    isEnabled: boolean;
  };
}

interface DashboardData {
  kpiData: KpiData[];
  messageData: MessageData[];
  totalMessages: number;
  integrationSettings: IntegrationSettingsMap;
  appointmentsCount: number;
  formsCount: number;
  formSubmissionsCount: number;
  messageCountToday: number;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [isClient, setIsClient] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [loading, setLoading] = useState(true);

  // ADDED: State for selected period (default '30d')
  const [selectedPeriod, setSelectedPeriod] = useState<string>('30d');

  const [dashboardData, setDashboardData] = useState<DashboardData>({
    kpiData: [],
    messageData: [],
    totalMessages: 0,
    integrationSettings: {},
    appointmentsCount: 0,
    formsCount: 0,
    formSubmissionsCount: 0,
    messageCountToday: 0,
  });

  // Set isClient to true when component mounts
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Fetch dashboard data - keep as a separate effect
  useEffect(() => {
    const fetchData = async () => {
      if (session?.user?.id) {
        // ADDED: Calculate start and end dates based on selectedPeriod
        let startDate = new Date();
        const endDate = new Date(); // Today
        endDate.setHours(23, 59, 59, 999); // End of today

        switch (selectedPeriod) {
          case '7d':
            startDate.setDate(endDate.getDate() - 6);
            break;
          case '90d':
            startDate.setDate(endDate.getDate() - 89);
            break;
          case '30d':
          default:
            startDate.setDate(endDate.getDate() - 29);
            break;
        }
        startDate.setHours(0, 0, 0, 0); // Start of the day

        // Format dates for query parameters
        const fromDate = startDate.toISOString().split('T')[0];
        const toDate = endDate.toISOString().split('T')[0];
        
        const apiUrl = `/api/dashboard/stats?from=${fromDate}&to=${toDate}`;

        try {
          const response = await fetch(apiUrl);
          const data = await response.json();

          // REMOVED: Manual KPI data construction and conditional logic
          // The API now returns the final kpiData array directly

          setDashboardData({
            // UPDATE: Use kpiData directly from API response
            kpiData: data.kpiData || [],
            // UPDATE: No need to transform messagesPerDay anymore - pass it directly
            messageData: data.messagesPerDay || [],
            // UPDATE: Use totalMessages directly from API response
            totalMessages: data.totalMessages || 0,
            // Keep other state properties if they are still needed elsewhere,
            // otherwise they can be removed if only used for KPI construction previously.
            // For now, we'll keep them assuming they might be used later, but they are not used
            // to build the kpiData array anymore.
            integrationSettings: {}, // API no longer returns this separately
            appointmentsCount: 0,   // API no longer returns this separately
            formsCount: 0,          // API no longer returns this separately
            formSubmissionsCount: 0,// API no longer returns this separately
            messageCountToday: 0,   // API no longer returns this separately
          });
          setLoading(false);
        } catch (error) {
          console.error('Failed to fetch dashboard stats:', error);
          setLoading(false);
        }
      }
    };

    if (session) {
      fetchData();
    }
  }, [session, selectedPeriod]);

  if (!isClient) {
    return null;
  }

  // Split KPI data for rendering order
  // UPDATE: Add 'Phone Numbers' to top KPIs
  const topKpiKeys = ['Agents', 'Knowledge Sources', 'Phone Numbers', 'Messages'];
  const topKpiData = dashboardData.kpiData.filter(kpi => topKpiKeys.includes(kpi.name));
  const conditionalKpiData = dashboardData.kpiData.filter(kpi => !topKpiKeys.includes(kpi.name));

  const userFirstName = session?.user?.name?.split(' ')[0] || '';

  return (
    <div className="flex flex-col p-0">
      <DashboardHeader 
        loading={loading}
        userFirstName={userFirstName}
      />
      <div className="p-4 sm:p-6 lg:p-8">
        <WelcomeBanner />
        <DashboardOverview 
          selectedPeriod={selectedPeriod}
          onPeriodChange={setSelectedPeriod}
        />
        <DashboardStats data={topKpiData} />
        <MessagesChart 
          data={dashboardData.messageData}
          totalMessages={dashboardData.totalMessages}
        />
        {conditionalKpiData.length > 0 && (
          <DashboardStats data={conditionalKpiData} />
        )}
      </div>
    </div>
  );
}

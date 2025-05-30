'use client';

import { useEffect, useState } from 'react';
import { useSession } from "next-auth/react";
import { Select, SelectItem, DateRangePickerValue } from "@tremor/react";
import { DashboardHeader } from "@/components/dashboard/header";
import { DashboardStats } from "@/components/dashboard/stats";
import { MessagesChart } from "@/components/dashboard/messages-chart";
import { DashboardOverview } from '@/components/dashboard/overview-header';
import WelcomeBanner from '@/components/WelcomeBanner';
import { WelcomeModal } from '@/components/WelcomeModal';

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
  const [loading, setLoading] = useState(true);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);

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

  // Check if user is a first-time visitor - only run once when session is available
  useEffect(() => {
    if (session?.user?.id && !onboardingChecked) {
      // Set flag to prevent multiple checks
      setOnboardingChecked(true);
      
      // Check if should show the welcome modal
      const checkWelcomeStatus = () => {
        const hasCompletedOnboarding = localStorage.getItem('hasCompletedOnboarding') === 'true';
        const welcomeModalPreviouslyShown = localStorage.getItem('welcomeModalShown') === 'true';
        const onboardingInProgress = localStorage.getItem('onboardingInProgress') === 'true';
        
        // If onboarding is already completed, don't show modal
        if (hasCompletedOnboarding) {
          return;
        }
        
        // Check onboarding status from the server
        const checkOnboardingStatus = async () => {
          try {
            const response = await fetch('/api/user/welcome-status');
            const data = await response.json();
            
            if (data.success) {
              // Server says onboarding is not completed and (modal hasn't been shown or is in progress)
              if (!data.onboardingCompleted && (!welcomeModalPreviouslyShown || onboardingInProgress)) {
                // Set modal to show after a slight delay
                setTimeout(() => {
                  setShowWelcomeModal(true);
                  localStorage.setItem('welcomeModalShown', 'true');
                  
                  // Mark onboarding as in progress
                  if (!onboardingInProgress) {
                    localStorage.setItem('onboardingInProgress', 'true');
                  }
                }, 800);
              } else if (data.onboardingCompleted) {
                // Server says onboarding is complete
                localStorage.setItem('hasCompletedOnboarding', 'true');
                localStorage.setItem('onboardingInProgress', 'false');
              }
            }
          } catch (error) {
            console.error('Failed to check onboarding status:', error);
          }
        };
        
        checkOnboardingStatus();
      };
      
      checkWelcomeStatus();
    }
  }, [session, onboardingChecked]);

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

  // Handle modal state change
  const handleModalStateChange = (open: boolean) => {
    setShowWelcomeModal(open);
    
    if (!open) {
      localStorage.setItem('welcomeModalShown', 'true');
    }
  };

  const userFirstName = session?.user?.name?.split(' ')[0] || '';

  // Split KPI data for rendering order
  // UPDATE: Add 'Phone Numbers' to top KPIs
  const topKpiKeys = ['Agents', 'Knowledge Sources', 'Phone Numbers', 'Messages'];
  const topKpiData = dashboardData.kpiData.filter(kpi => topKpiKeys.includes(kpi.name));
  const conditionalKpiData = dashboardData.kpiData.filter(kpi => !topKpiKeys.includes(kpi.name));

  return (
    <div className="flex flex-col p-0">
      {/* Welcome Modal for first-time users */}
      <WelcomeModal 
        isOpen={showWelcomeModal} 
        onOpenChange={handleModalStateChange}
      />

      <DashboardHeader 
        loading={loading}
        userFirstName={userFirstName}
      />
      <div className="p-4 sm:p-6 lg:p-8">
        <WelcomeBanner />
        {/* UPDATE: Pass props to DashboardOverview */}
        <DashboardOverview 
          selectedPeriod={selectedPeriod}
          onPeriodChange={setSelectedPeriod}
        />
        {/* UPDATE: Render top KPIs first */}
        <DashboardStats data={topKpiData} />
        {/* UPDATE: Render chart next */}
        <MessagesChart 
          data={dashboardData.messageData}
          totalMessages={dashboardData.totalMessages}
        />
        {/* UPDATE: Render conditional KPIs last (if any) */}
        {conditionalKpiData.length > 0 && (
          <DashboardStats data={conditionalKpiData} />
        )}
      </div>
    </div>
  );
}

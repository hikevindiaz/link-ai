'use client';

import { useEffect, useState } from 'react';
import { useSession } from "next-auth/react";
import { DashboardHeader } from "@/components/dashboard/header";
import { DashboardStats } from "@/components/dashboard/stats";
import { MessagesChart } from "@/components/dashboard/messages-chart";
import { UserInquiriesGrid } from "@/components/dashboard/user-inquiries";
import { ErrorsTable } from "@/components/dashboard/errors-table";
import { DashboardOverview } from '@/components/dashboard/overview-header';
import WelcomeBanner from '@/components/WelcomeBanner';
import { WelcomeModal } from '@/components/WelcomeModal';

interface UserInquiry {
  id: string;
  name: string;
  initial: string;
  textColor: string;
  bgColor: string;
  email: string;
  href: string;
  details: {
    type: string;
    value: string;
  }[];
}

interface KpiData {
  name: string;
  stat: string;
  change: string;
  changeType: 'positive' | 'negative';
}

interface MessageData {
  date: string;
  Messages: number;
}

interface ErrorData {
  agent: string;
  chatbotId: string;
  threadId: string;
  error: string;
  date: string;
}

interface DashboardData {
  kpiData: KpiData[];
  messageData: MessageData[];
  totalMessages: number;
  userInquiries: UserInquiry[];
  errorData: ErrorData[];
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    kpiData: [],
    messageData: [],
    totalMessages: 0,
    userInquiries: [],
    errorData: []
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
        try {
          const response = await fetch('/api/dashboard/stats');
          const data = await response.json();
          
          setDashboardData({
            kpiData: [
              {
                name: 'Total Agents',
                stat: data.totalAgents.toString(),
                change: '12.1%',
                changeType: 'positive',
              },
              {
                name: 'Total Files',
                stat: data.totalFiles.toString(),
                change: '9.8%',
                changeType: 'negative',
              },
              {
                name: 'Total Messages in 30 Days',
                stat: data.messageCountLast30Days.toString(),
                change: '7.7%',
                changeType: 'positive',
              }
            ],
            messageData: data.messagesPerDay.map((item: { name: string; total: number }) => ({
              date: item.name,
              Messages: item.total
            })),
            totalMessages: data.messagesPerDay[data.messagesPerDay.length - 1]?.total || 0,
            userInquiries: data.userInquiries,
            errorData: data.chatbotErrors
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
  }, [session]);

  // Handle modal state change
  const handleModalStateChange = (open: boolean) => {
    setShowWelcomeModal(open);
    
    // No need for complex logic here - just update localStorage
    // The rest will be handled by the WelcomeModal component
    if (!open) {
      localStorage.setItem('welcomeModalShown', 'true');
    }
  };

  const userFirstName = session?.user?.name?.split(' ')[0] || '';

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
        <DashboardOverview />
        <DashboardStats data={dashboardData.kpiData} />
        <MessagesChart 
          data={dashboardData.messageData}
          totalMessages={dashboardData.totalMessages}
        />
        <UserInquiriesGrid inquiries={dashboardData.userInquiries} />
        <ErrorsTable errors={dashboardData.errorData} />
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from "next-auth/react";
import { DashboardHeader } from "@/components/dashboard/header";
import { DashboardStats } from "@/components/dashboard/stats";
import { MessagesChart } from "@/components/dashboard/messages-chart";

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

interface DashboardData {
  kpiData: KpiData[];
  messageData: MessageData[];
  totalMessages: number;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [isClient, setIsClient] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [selectedAgent, setSelectedAgent] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('30d');

  const [dashboardData, setDashboardData] = useState<DashboardData>({
    kpiData: [],
    messageData: [],
    totalMessages: 0,
  });

  // Set isClient to true when component mounts
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Fetch dashboard data
  useEffect(() => {
    const fetchData = async () => {
      if (session?.user?.id) {
        // Calculate current period dates
        let currentStartDate = new Date();
        const currentEndDate = new Date();
        currentEndDate.setHours(23, 59, 59, 999);

        let periodDays = 30; // Default to 30 days
        switch (selectedPeriod) {
          case '7d':
            periodDays = 7;
            currentStartDate.setDate(currentEndDate.getDate() - 6);
            break;
          case '90d':
            periodDays = 90;
            currentStartDate.setDate(currentEndDate.getDate() - 89);
            break;
          case '30d':
          default:
            periodDays = 30;
            currentStartDate.setDate(currentEndDate.getDate() - 29);
            break;
        }
        currentStartDate.setHours(0, 0, 0, 0);

        // Calculate previous period dates for comparison
        const previousEndDate = new Date(currentStartDate);
        previousEndDate.setDate(previousEndDate.getDate() - 1); // Day before current period starts
        const previousStartDate = new Date(previousEndDate);
        previousStartDate.setDate(previousStartDate.getDate() - (periodDays - 1));
        previousStartDate.setHours(0, 0, 0, 0);

        const currentFromDate = currentStartDate.toISOString().split('T')[0];
        const currentToDate = currentEndDate.toISOString().split('T')[0];
        const previousFromDate = previousStartDate.toISOString().split('T')[0];
        const previousToDate = previousEndDate.toISOString().split('T')[0];
        
        // Build API URLs with filters
        let currentApiUrl = `/api/dashboard/stats?from=${currentFromDate}&to=${currentToDate}`;
        let previousApiUrl = `/api/dashboard/stats?from=${previousFromDate}&to=${previousToDate}`;
        
        if (selectedAgent !== 'all') {
          currentApiUrl += `&agentId=${selectedAgent}`;
          previousApiUrl += `&agentId=${selectedAgent}`;
        }

        try {
          // Fetch both current and previous period data
          const [currentResponse, previousResponse] = await Promise.all([
            fetch(currentApiUrl),
            fetch(previousApiUrl)
          ]);

          const currentData = await currentResponse.json();
          const previousData = await previousResponse.json();

          // Helper function to safely convert stat values to numbers
          const statToNumber = (stat: any): number => {
            const num = Number(stat);
            return isNaN(num) ? 0 : num;
          };

          // Calculate percentage changes
          const calculatePercentageChange = (current: number, previous: number): string => {
            if (previous === 0) {
              return current > 0 ? '100%' : '0%';
            }
            const change = ((current - previous) / previous) * 100;
            return `${Number(change.toFixed(1))}%`;
          };

          // Create a map of current and previous data
          const currentStatsMap = new Map((currentData.kpiData || []).map((item: any) => [item.name, statToNumber(item.stat)]));
          const previousStatsMap = new Map((previousData.kpiData || []).map((item: any) => [item.name, statToNumber(item.stat)]));

          // Ensure we prioritize the 5 main stats: Messages, Appointments, Calls, Call Minutes, Orders
          const priorityStats = ['Messages', 'Appointments', 'Calls', 'Call Minutes', 'Orders'];
          
          // Build the complete KPI data with calculated percentages
          const calculatedKpiData = priorityStats.map(statName => {
            const currentValue = currentStatsMap.get(statName) || 0;
            const previousValue = previousStatsMap.get(statName) || 0;
            const percentageChange = calculatePercentageChange(currentValue, previousValue);
            
            return {
              name: statName,
              stat: currentValue.toString(),
              change: percentageChange,
              changeType: currentValue >= previousValue ? 'positive' as const : 'negative' as const
            };
          });

          setDashboardData({
            kpiData: calculatedKpiData,
            messageData: currentData.messagesPerDay || [],
            totalMessages: currentData.totalMessages || 0,
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
  }, [session, selectedPeriod, selectedAgent]);

  if (!isClient) {
    return null;
  }

  const userFirstName = session?.user?.name?.split(' ')[0] || '';

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-black">
      <DashboardHeader 
        loading={loading}
        userFirstName={userFirstName}
        selectedAgent={selectedAgent}
        onAgentChange={setSelectedAgent}
        selectedPeriod={selectedPeriod}
        onPeriodChange={setSelectedPeriod}
      />
      <div className="flex-1 p-3 sm:p-4 lg:p-6">
        <DashboardStats data={dashboardData.kpiData} />
        <MessagesChart 
          data={dashboardData.messageData}
          totalMessages={dashboardData.totalMessages}
        />
      </div>
    </div>
  );
}

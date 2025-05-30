import { getCurrentUser } from "@/lib/session";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

interface MessageData {
  createdAt: Date;
}

// ADDED: Type for channel breakdown
interface ChannelData {
  [channel: string]: number;
}

// UPDATE: DailyData now includes channel breakdown
interface DailyData {
  name: string; // Date string YYYY-MM-DD
  channels: ChannelData;
}

// ADDED: Interface for integration settings map
interface IntegrationSettingsMap {
  [integrationId: string]: {
    isEnabled: boolean;
  };
}

interface KpiDataFromApi {
  name: string;
  stat: string;
  change: string;
  changeType: 'positive' | 'negative';
}

// ADDED: Helper function to calculate percentage change
function calculateChange(current: number, previous: number): { change: string; changeType: 'positive' | 'negative' } {
  if (previous === 0) {
    // Handle case where previous value was 0
    if (current > 0) {
      return { change: '+Inf%', changeType: 'positive' }; // Or some other indicator like '+100%' or 'New'
    } else {
      return { change: '0.0%', changeType: 'positive' }; // No change from zero
    }
  }

  const changePercent = ((current - previous) / previous) * 100;
  const changeType = changePercent >= 0 ? 'positive' : 'negative';
  const changeString = `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(1)}%`;

  return { change: changeString, changeType };
}

// Mark this route as dynamic to avoid static generation errors
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return new NextResponse(
        JSON.stringify({
          error: "Unauthorized",
        }),
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');

    let startDate = new Date();
    startDate.setDate(startDate.getDate() - 29);
    let endDate = new Date();

    if (fromParam && !isNaN(Date.parse(fromParam))) {
        startDate = new Date(fromParam);
        startDate.setHours(0, 0, 0, 0);
    }
    if (toParam && !isNaN(Date.parse(toParam))) {
        endDate = new Date(toParam);
        endDate.setHours(23, 59, 59, 999);
    }

    if (endDate < startDate) {
        endDate = new Date(startDate);
        endDate.setHours(23, 59, 59, 999);
    }

    const periodDuration = endDate.getTime() - startDate.getTime();
    const prevEndDate = new Date(startDate.getTime() - 1);
    const prevStartDate = new Date(prevEndDate.getTime() - periodDuration);
    prevEndDate.setHours(23, 59, 59, 999);
    prevStartDate.setHours(0, 0, 0, 0);

    // ADDED BACK: Define todayStart and todayEnd
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // --- Fetch Counts --- 
    let totalAgents = 0;
    let totalKnowledgeSources = 0;
    let messageCountPeriod = 0;
    let messageCountToday = 0;
    let messages: MessageData[] = [];
    let appointmentsCount = 0;
    let formsCount = 0;
    let formSubmissionsCount = 0;
    let integrationSettings: IntegrationSettingsMap = {};

    // ADDED: Variables for previous period counts
    let prevMessageCountPeriod = 0;
    let prevAppointmentsCount = 0;
    let prevFormsCount = 0; // Assuming forms are not time-sensitive for change calc
    let prevFormSubmissionsCount = 0;
    // ADDED: Variables for phone number counts
    let phoneNumberCount = 0;
    let prevPhoneNumberCount = 0;

    // Use Promise.all for concurrent fetching
    await Promise.all([
      // Fetch agent count (total)
      db.chatbot.count({
        where: { userId: session.user.id },
      }).then(count => totalAgents = count).catch(err => console.error('Error counting chatbots:', err)),
      
      // Fetch knowledge source count (total)
      db.knowledgeSource.count({
        where: { userId: session.user.id },
      }).then(count => totalKnowledgeSources = count).catch(err => console.error('Error counting knowledge sources:', err)),

      // Fetch message counts (current period, previous period, today)
      db.message.count({
        where: {
          userId: session.user.id,
          createdAt: { gte: startDate, lte: endDate },
        },
      }).then(count => messageCountPeriod = count).catch(err => console.error('Error counting current messages:', err)),

      db.message.count({
        where: {
          userId: session.user.id,
          createdAt: { gte: prevStartDate, lte: prevEndDate },
        },
      }).then(count => prevMessageCountPeriod = count).catch(err => console.error('Error counting previous messages:', err)),
      
      db.message.count({
        where: {
          userId: session.user.id,
          createdAt: { gte: todayStart, lte: todayEnd },
        },
      }).then(count => messageCountToday = count).catch(err => console.error('Error counting today messages:', err)),

      // Fetch detailed messages for chart
      db.message.findMany({
        where: {
          userId: session.user.id,
          createdAt: { gte: startDate, lte: endDate },
        },
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' }
      }).then(data => messages = data).catch(err => console.error('Error fetching message details:', err)),

      // Fetch integration settings
      db.userIntegrationSetting.findMany({
        where: { userId: session.user.id },
        select: { integrationId: true, isEnabled: true },
      }).then(settings => {
        integrationSettings = settings.reduce((acc, setting) => {
          acc[setting.integrationId] = { isEnabled: setting.isEnabled };
          return acc;
        }, {} as IntegrationSettingsMap);
      }).catch(err => console.error('Error fetching integration settings:', err)),

      // ADDED: Fetch phone number counts (current and previous period - assuming registration date matters)
      // Note: Adjust the `where` clause if change should be based on active status changes rather than purchase date.
      db.twilioPhoneNumber.count({
        where: { userId: session.user.id, status: 'active', purchasedAt: { gte: startDate, lte: endDate } },
      }).then(count => phoneNumberCount = count).catch(err => console.error('Error counting current phone numbers:', err)),

      db.twilioPhoneNumber.count({
        where: { userId: session.user.id, status: 'active', purchasedAt: { gte: prevStartDate, lte: prevEndDate } },
      }).then(count => prevPhoneNumberCount = count).catch(err => console.error('Error counting previous phone numbers:', err)),
    ]);

    // --- Fetch Conditional Counts (based on integration settings) --- 
    const conditionalFetchPromises: Promise<number | void>[] = [];

    if (integrationSettings['module-calendar']?.isEnabled) {
      conditionalFetchPromises.push(
        db.appointment.count({
          where: { calendar: { userId: session.user.id }, createdAt: { gte: startDate, lte: endDate } },
        }).then(count => appointmentsCount = count).catch(err => console.error('Error counting current appointments:', err)),
        db.appointment.count({
          where: { calendar: { userId: session.user.id }, createdAt: { gte: prevStartDate, lte: prevEndDate } },
        }).then(count => prevAppointmentsCount = count).catch(err => console.error('Error counting previous appointments:', err))
      );
    }

    if (integrationSettings['module-forms']?.isEnabled) {
      conditionalFetchPromises.push(
        db.form.count({ where: { userId: session.user.id } })
          .then(count => formsCount = count).catch(err => console.error('Error counting forms:', err)),
        
        db.formSubmission.count({
          where: { chatbot: { userId: session.user.id }, createdAt: { gte: startDate, lte: endDate } },
        }).then(count => formSubmissionsCount = count).catch(err => console.error('Error counting current submissions:', err)),
        db.formSubmission.count({
          where: { chatbot: { userId: session.user.id }, createdAt: { gte: prevStartDate, lte: prevEndDate } },
        }).then(count => prevFormSubmissionsCount = count).catch(err => console.error('Error counting previous submissions:', err))
      );
    }

    await Promise.all<number | void>(conditionalFetchPromises);

    // --- Prepare Chart Data (with Channel Breakdown) --- 
    // Fetch all messages within the period with their channel
    const messagesWithChannel = await db.message.findMany({
      where: {
        userId: session.user.id,
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        createdAt: true,
        from: true, // Include the channel
      },
      orderBy: { createdAt: 'asc' }
    });

    // Initialize messagesPerDay map with all dates in the range
    const messagesPerDayMap: Map<string, ChannelData> = new Map();
    let tempCurrentDate = new Date(startDate);
    tempCurrentDate.setHours(0, 0, 0, 0);
    while (tempCurrentDate <= endDate) {
      const formattedDate = tempCurrentDate.toISOString().split("T")[0];
      messagesPerDayMap.set(formattedDate, {}); // Initialize channels object
      tempCurrentDate.setDate(tempCurrentDate.getDate() + 1);
    }

    // Aggregate counts per channel per day
    messagesWithChannel.forEach((message) => {
      const messageDate = message.createdAt.toISOString().split("T")[0];
      const channel = message.from || 'unknown'; // Use 'unknown' if from is null/empty
      const dayData = messagesPerDayMap.get(messageDate);
      if (dayData) {
        dayData[channel] = (dayData[channel] || 0) + 1;
      }
    });

    // Convert map to the final array structure
    const messagesPerDay: DailyData[] = Array.from(messagesPerDayMap.entries()).map(([date, channels]) => ({
      name: date,
      channels: channels,
    }));
    
    // --- Prepare KPI Data with Change Calculation --- 
    const kpiDataResult: KpiDataFromApi[] = [];

    // Agents (Total - Placeholder Change)
    kpiDataResult.push({ 
      name: 'Agents', 
      stat: totalAgents.toString(), 
      change: '', // Or some other indicator if needed
      changeType: 'positive' 
    });

    // Knowledge Sources (Total - Placeholder Change)
    kpiDataResult.push({ 
      name: 'Knowledge Sources', 
      stat: totalKnowledgeSources.toString(), 
      change: '', 
      changeType: 'positive' 
    });

    // Messages (Today vs Yesterday)
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(todayStart.getDate() - 1);
    const yesterdayEnd = new Date(todayEnd);
    yesterdayEnd.setDate(todayEnd.getDate() - 1);
    const messagesYesterday = await db.message.count({ 
      where: { userId: session.user.id, createdAt: { gte: yesterdayStart, lte: yesterdayEnd } } 
    });
    const messagesTodayChange = calculateChange(messageCountToday, messagesYesterday);
    kpiDataResult.push({ 
      name: 'Messages', 
      stat: messageCountToday.toString(), 
      change: messagesTodayChange.change, 
      changeType: messagesTodayChange.changeType 
    });

    // Conditional KPIs
    if (integrationSettings['module-calendar']?.isEnabled) {
      const appointmentsChange = calculateChange(appointmentsCount, prevAppointmentsCount);
      kpiDataResult.push({ 
        name: 'Appointments', 
        stat: appointmentsCount.toString(), 
        change: appointmentsChange.change, 
        changeType: appointmentsChange.changeType 
      });
    }
    if (integrationSettings['module-forms']?.isEnabled) {
      // Forms (Total - Placeholder Change)
      kpiDataResult.push({ 
        name: 'Forms', 
        stat: formsCount.toString(), 
        change: '', 
        changeType: 'positive' 
      });
      // Form Submissions (Period vs Previous Period)
      const submissionsChange = calculateChange(formSubmissionsCount, prevFormSubmissionsCount);
      kpiDataResult.push({ 
        name: 'Form Submissions', 
        stat: formSubmissionsCount.toString(), 
        change: submissionsChange.change, 
        changeType: submissionsChange.changeType 
      });
    }

    // ADDED: Phone Numbers KPI
    const phoneNumbersChange = calculateChange(phoneNumberCount, prevPhoneNumberCount);
    kpiDataResult.push({ 
      name: 'Phone Numbers', 
      stat: phoneNumberCount.toString(), 
      change: phoneNumbersChange.change, 
      changeType: phoneNumbersChange.changeType 
    });

    return NextResponse.json({
      kpiData: kpiDataResult,
      messagesPerDay: messagesPerDay,
      totalMessages: messageCountPeriod,
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return new NextResponse(
      JSON.stringify({
        error: "Failed to fetch dashboard statistics",
      }),
      { status: 500 }
    );
  }
}
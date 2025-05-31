import { db as prisma } from '@/lib/db';
import { startOfMonth, endOfMonth } from 'date-fns';
import { getUserSubscriptionPlan } from './subscription';
import { getPlanByName } from '@/config/subscriptions';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2023-10-16',
});

// Plan limits (from your pricing configuration)
const PLAN_LIMITS = {
  starter: {
    agents: 1,
    messages: 2000,
    smsMessages: 50,
    webSearches: 100,
    documents: 1,
    conversationSummaries: 50,
    whatsappConversations: 50,
    voiceMinutes: 0,
  },
  growth: {
    agents: 3,
    messages: 12000,
    smsMessages: 150,
    webSearches: 500,
    documents: 3,
    conversationSummaries: 400,
    whatsappConversations: 200,
    voiceMinutes: 50,
  },
  scale: {
    agents: 10,
    messages: 25000,
    smsMessages: 400,
    webSearches: 1000,
    documents: 10,
    conversationSummaries: 1000,
    whatsappConversations: 500,
    voiceMinutes: 150,
  },
};

// Overage rates per plan
const OVERAGE_RATES = {
  starter: {
    messages: 0.03,
    smsMessages: 0.15,
    webSearches: 0.10,
    conversationSummaries: 0.05,
    whatsappConversations: 0.07,
    voiceMinutes: 0.15,
  },
  growth: {
    messages: 0.03,
    smsMessages: 0.12,
    webSearches: 0.08,
    conversationSummaries: 0.04,
    whatsappConversations: 0.06,
    voiceMinutes: 0.12,
  },
  scale: {
    messages: 0.02,
    smsMessages: 0.10,
    webSearches: 0.06,
    conversationSummaries: 0.03,
    whatsappConversations: 0.05,
    voiceMinutes: 0.10,
  },
};

export interface UsageMetrics {
  messages: number;
  smsMessages: number;
  webSearches: number;
  documents: number;
  conversationSummaries: number;
  whatsappConversations: number;
  voiceMinutes: number;
  agents: number;
}

export interface UsageWithLimits extends UsageMetrics {
  limits: UsageMetrics;
  overages: UsageMetrics;
  overageCosts: {
    messages: number;
    smsMessages: number;
    webSearches: number;
    conversationSummaries: number;
    whatsappConversations: number;
    voiceMinutes: number;
    total: number;
  };
}

export async function getUserPlan(userId: string): Promise<'starter' | 'growth' | 'scale'> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripePriceId: true },
  });

  if (!user?.stripePriceId) return 'starter';

  // Direct mapping to new plans only
  if (user.stripePriceId === process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID) return 'starter';
  if (user.stripePriceId === process.env.NEXT_PUBLIC_STRIPE_GROWTH_PRICE_ID) return 'growth';
  if (user.stripePriceId === process.env.NEXT_PUBLIC_STRIPE_SCALE_PRICE_ID) return 'scale';

  return 'starter';
}

export async function getUserUsageForMonth(
  userId: string,
  date: Date = new Date()
): Promise<UsageMetrics> {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);

  // Get message count
  const messageCount = await prisma.message.count({
    where: {
      userId,
      createdAt: {
        gte: monthStart,
        lte: monthEnd,
      },
    },
  });

  // Get conversation summaries count
  const summariesCount = await prisma.conversationSummary.count({
    where: {
      userId,
      createdAt: {
        gte: monthStart,
        lte: monthEnd,
      },
    },
  });

  // Get agent count
  const agentCount = await prisma.chatbot.count({
    where: { userId },
  });

  // Get document count (files)
  const documentCount = await prisma.file.count({
    where: { userId },
  });

  // TODO: Implement tracking for these metrics when you have the relevant tables/logic
  const smsMessages = 0; // Track SMS sent
  const webSearches = 0; // Track web searches performed
  const whatsappConversations = 0; // Track WhatsApp conversations
  const voiceMinutes = 0; // Track voice minutes used

  return {
    messages: messageCount,
    smsMessages,
    webSearches,
    documents: documentCount,
    conversationSummaries: summariesCount,
    whatsappConversations,
    voiceMinutes,
    agents: agentCount,
  };
}

export async function calculateUsageWithOverages(
  userId: string,
  date: Date = new Date()
): Promise<UsageWithLimits> {
  const [usage, plan] = await Promise.all([
    getUserUsageForMonth(userId, date),
    getUserPlan(userId),
  ]);

  const limits = PLAN_LIMITS[plan];
  const rates = OVERAGE_RATES[plan];

  // Calculate overages
  const overages: UsageMetrics = {
    messages: Math.max(0, usage.messages - limits.messages),
    smsMessages: Math.max(0, usage.smsMessages - limits.smsMessages),
    webSearches: Math.max(0, usage.webSearches - limits.webSearches),
    documents: Math.max(0, usage.documents - limits.documents),
    conversationSummaries: Math.max(0, usage.conversationSummaries - limits.conversationSummaries),
    whatsappConversations: Math.max(0, usage.whatsappConversations - limits.whatsappConversations),
    voiceMinutes: Math.max(0, usage.voiceMinutes - limits.voiceMinutes),
    agents: Math.max(0, usage.agents - limits.agents),
  };

  // Calculate overage costs
  const overageCosts = {
    messages: overages.messages * rates.messages,
    smsMessages: overages.smsMessages * rates.smsMessages,
    webSearches: overages.webSearches * rates.webSearches,
    conversationSummaries: overages.conversationSummaries * rates.conversationSummaries,
    whatsappConversations: overages.whatsappConversations * rates.whatsappConversations,
    voiceMinutes: overages.voiceMinutes * rates.voiceMinutes,
    total: 0,
  };

  overageCosts.total = Object.values(overageCosts).reduce((sum, cost) => {
    if (typeof cost === 'number' && cost !== overageCosts.total) {
      return sum + cost;
    }
    return sum;
  }, 0);

  return {
    ...usage,
    limits,
    overages,
    overageCosts,
  };
}

export async function getUsagePercentages(userId: string): Promise<Array<{
  resource: string;
  usage: string;
  maximum: string;
  percentage: number;
}>> {
  const usageData = await calculateUsageWithOverages(userId);

  return [
    {
      resource: 'Messages',
      usage: usageData.messages.toLocaleString(),
      maximum: usageData.limits.messages.toLocaleString(),
      percentage: Math.min(100, Math.round((usageData.messages / usageData.limits.messages) * 100)),
    },
    {
      resource: 'SMS Messages',
      usage: usageData.smsMessages.toLocaleString(),
      maximum: usageData.limits.smsMessages.toLocaleString(),
      percentage: Math.min(100, Math.round((usageData.smsMessages / usageData.limits.smsMessages) * 100)),
    },
    {
      resource: 'Web Searches',
      usage: usageData.webSearches.toLocaleString(),
      maximum: usageData.limits.webSearches.toLocaleString(),
      percentage: Math.min(100, Math.round((usageData.webSearches / usageData.limits.webSearches) * 100)),
    },
    {
      resource: 'Documents',
      usage: usageData.documents.toLocaleString(),
      maximum: usageData.limits.documents.toLocaleString(),
      percentage: Math.min(100, Math.round((usageData.documents / usageData.limits.documents) * 100)),
    },
    {
      resource: 'Conversation Summaries',
      usage: usageData.conversationSummaries.toLocaleString(),
      maximum: usageData.limits.conversationSummaries.toLocaleString(),
      percentage: Math.min(100, Math.round((usageData.conversationSummaries / usageData.limits.conversationSummaries) * 100)),
    },
  ];
}

export type UsageType = 
  | 'message' 
  | 'sms' 
  | 'web_search' 
  | 'conversation_summary' 
  | 'whatsapp_conversation' 
  | 'voice_minute';

export interface UsageRecord {
  id: string;
  userId: string;
  usageType: UsageType;
  quantity: number;
  metadata?: Record<string, any>;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
  createdAt: Date;
}

export interface UsageSummary {
  userId: string;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
  planLimits: {
    messages: number | null; // null = unlimited
    sms: number | null;
    webSearches: number | null;
    summaries: number | null;
    whatsappConversations: number | null;
    voiceMinutes: number | null;
  };
  usage: {
    messages: number;
    sms: number;
    webSearches: number;
    summaries: number;
    whatsappConversations: number;
    voiceMinutes: number;
  };
  overages: {
    messages: number;
    sms: number;
    webSearches: number;
    summaries: number;
    whatsappConversations: number;
    voiceMinutes: number;
  };
  overageCosts: {
    messages: number;
    sms: number;
    webSearches: number;
    summaries: number;
    whatsappConversations: number;
    voiceMinutes: number;
    total: number;
  };
}

/**
 * Track usage for a specific user and usage type
 */
export async function trackUsage(
  userId: string,
  usageType: UsageType,
  quantity: number = 1,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    console.log(`[Usage Tracking] ${userId}: ${usageType} +${quantity}`);

    // Get current billing period
    const { billingPeriodStart, billingPeriodEnd } = await getCurrentBillingPeriod(userId);

    // Record the usage
    await prisma.usageRecord.create({
      data: {
        userId,
        usageType,
        quantity,
        metadata: metadata || {},
        billingPeriodStart,
        billingPeriodEnd,
      }
    });

    console.log(`[Usage Tracking] Recorded ${quantity} ${usageType}(s) for user ${userId}`);
  } catch (error) {
    console.error(`[Usage Tracking] Error tracking usage for ${userId}:`, error);
    // Don't throw - usage tracking shouldn't break the main flow
  }
}

/**
 * Get usage summary for a user's current billing period
 */
export async function getUsageSummary(userId: string): Promise<UsageSummary> {
  try {
    const { billingPeriodStart, billingPeriodEnd } = await getCurrentBillingPeriod(userId);
    
    // Get user's plan limits
    const subscriptionPlan = await getUserSubscriptionPlan(userId);
    console.log('[getUsageSummary] Subscription plan:', subscriptionPlan.name);
    
    let plan = getPlanByName(subscriptionPlan.name);
    
    if (!plan) {
      console.error(`[getUsageSummary] Unknown plan: ${subscriptionPlan.name}`);
      // Fallback to free plan instead of throwing
      const freePlan = getPlanByName('FREE');
      if (!freePlan) {
        console.error('[getUsageSummary] Could not load free plan fallback, using minimal defaults');
        // If even free plan fails, create a minimal plan
        plan = {
          name: 'FREE',
          description: 'Fallback plan',
          stripePriceId: '',
          maxChatbots: 1,
          maxCrawlers: 1,
          maxFiles: 3,
          unlimitedMessages: false,
          maxMessagesPerMonth: 500,
          basicCustomization: false,
          userInquiries: false,
          brandingCustomization: false,
          chatFileAttachments: false,
          price: 0,
          // Add required new fields with defaults
          maxSMSPerMonth: 0,
          maxWebSearchesPerMonth: 0,
          maxConversationSummariesPerMonth: 0,
          maxWhatsAppConversationsPerMonth: 0,
          maxVoiceMinutesPerMonth: 0,
          overagePricing: {
            messagesPerUnit: 0,
            smsPerUnit: 0,
            webSearchesPerUnit: 0,
            summariesPerUnit: 0,
            whatsAppConversationsPerUnit: 0,
            voiceMinutesPerUnit: 0,
          }
        };
      } else {
        console.log('[getUsageSummary] Using free plan as fallback');
        plan = freePlan;
      }
    }

    console.log('[getUsageSummary] Using plan:', plan?.name);

    // Get usage records for this billing period
    const usageRecords = await prisma.usageRecord.findMany({
      where: {
        userId,
        billingPeriodStart: {
          gte: billingPeriodStart,
          lte: billingPeriodEnd
        }
      }
    });

    // Aggregate usage by type
    const usage = {
      messages: 0,
      sms: 0,
      webSearches: 0,
      summaries: 0,
      whatsappConversations: 0,
      voiceMinutes: 0,
    };

    usageRecords.forEach(record => {
      switch (record.usageType) {
        case 'message':
          usage.messages += record.quantity;
          break;
        case 'sms':
          usage.sms += record.quantity;
          break;
        case 'web_search':
          usage.webSearches += record.quantity;
          break;
        case 'conversation_summary':
          usage.summaries += record.quantity;
          break;
        case 'whatsapp_conversation':
          usage.whatsappConversations += record.quantity;
          break;
        case 'voice_minute':
          usage.voiceMinutes += record.quantity;
          break;
      }
    });

    // Plan limits (convert undefined to null for unlimited, with safe defaults)
    const planLimits = {
      messages: plan.maxMessagesPerMonth || null,
      sms: plan.maxSMSPerMonth || null,
      webSearches: plan.maxWebSearchesPerMonth || null,
      summaries: plan.maxConversationSummariesPerMonth || null,
      whatsappConversations: plan.maxWhatsAppConversationsPerMonth || null,
      voiceMinutes: plan.maxVoiceMinutesPerMonth || null,
    };

    // Calculate overages
    const overages = {
      messages: planLimits.messages ? Math.max(0, usage.messages - planLimits.messages) : 0,
      sms: planLimits.sms ? Math.max(0, usage.sms - planLimits.sms) : 0,
      webSearches: planLimits.webSearches ? Math.max(0, usage.webSearches - planLimits.webSearches) : 0,
      summaries: planLimits.summaries ? Math.max(0, usage.summaries - planLimits.summaries) : 0,
      whatsappConversations: planLimits.whatsappConversations ? Math.max(0, usage.whatsappConversations - planLimits.whatsappConversations) : 0,
      voiceMinutes: planLimits.voiceMinutes ? Math.max(0, usage.voiceMinutes - planLimits.voiceMinutes) : 0,
    };

    // Calculate overage costs using plan-specific pricing with safe defaults
    const overagePricing = plan.overagePricing || {};
    const overageCosts = {
      messages: overages.messages * (overagePricing.messagesPerUnit || 0),
      sms: overages.sms * (overagePricing.smsPerUnit || 0),
      webSearches: overages.webSearches * (overagePricing.webSearchesPerUnit || 0),
      summaries: overages.summaries * (overagePricing.summariesPerUnit || 0),
      whatsappConversations: overages.whatsappConversations * (overagePricing.whatsAppConversationsPerUnit || 0),
      voiceMinutes: overages.voiceMinutes * (overagePricing.voiceMinutesPerUnit || 0),
      total: 0
    };

    overageCosts.total = Object.values(overageCosts).reduce((sum, cost) => {
      if (typeof cost === 'number') return sum + cost;
      return sum;
    }, 0);

    return {
      userId,
      billingPeriodStart,
      billingPeriodEnd,
      planLimits,
      usage,
      overages,
      overageCosts
    };
  } catch (error) {
    console.error('[getUsageSummary] Fatal error:', error);
    throw error;
  }
}

/**
 * Get current billing period for a user based on their subscription
 */
export async function getCurrentBillingPeriod(userId: string): Promise<{
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { 
      stripeSubscriptionId: true,
      stripeCurrentPeriodEnd: true
    }
  });

  if (!user) {
    throw new Error('User not found');
  }

  // If user has active subscription, use Stripe billing cycle
  if (user.stripeSubscriptionId && user.stripeCurrentPeriodEnd) {
    const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
    const billingPeriodStart = new Date(subscription.current_period_start * 1000);
    const billingPeriodEnd = new Date(subscription.current_period_end * 1000);
    
    return { billingPeriodStart, billingPeriodEnd };
  }

  // Fallback: Use calendar month for users without subscriptions
  const now = new Date();
  const billingPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const billingPeriodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  return { billingPeriodStart, billingPeriodEnd };
}

/**
 * Process overage charges for all users at the end of billing period
 * This should be called by a cron job or webhook
 */
export async function processOverageCharges(): Promise<{
  processed: number;
  errors: string[];
}> {
  console.log('[Overage Processing] Starting overage charge processing...');

  let processed = 0;
  const errors: string[] = [];

  try {
    // Get all users with active subscriptions
    const usersWithSubscriptions = await prisma.user.findMany({
      where: {
        stripeSubscriptionId: { not: null },
        stripeSubscriptionStatus: 'active'
      },
      select: { 
        id: true, 
        email: true,
        stripeSubscriptionId: true,
        stripeCustomerId: true
      }
    });

    console.log(`[Overage Processing] Found ${usersWithSubscriptions.length} users with active subscriptions`);

    for (const user of usersWithSubscriptions) {
      try {
        const summary = await getUsageSummary(user.id);
        
        // Only process if there are overages
        if (summary.overageCosts.total > 0) {
          console.log(`[Overage Processing] User ${user.email} has $${summary.overageCosts.total.toFixed(2)} in overages`);
          
          // Create invoice item for overages
          await stripe.invoiceItems.create({
            customer: user.stripeCustomerId!,
            amount: Math.round(summary.overageCosts.total * 100), // Convert to cents
            currency: 'usd',
            description: `Usage overages for ${summary.billingPeriodStart.toLocaleDateString()} - ${summary.billingPeriodEnd.toLocaleDateString()}`,
            metadata: {
              userId: user.id,
              billingPeriodStart: summary.billingPeriodStart.toISOString(),
              billingPeriodEnd: summary.billingPeriodEnd.toISOString(),
              messageOverages: summary.overages.messages.toString(),
              smsOverages: summary.overages.sms.toString(),
              webSearchOverages: summary.overages.webSearches.toString(),
              summaryOverages: summary.overages.summaries.toString(),
              whatsappOverages: summary.overages.whatsappConversations.toString(),
              voiceOverages: summary.overages.voiceMinutes.toString(),
            }
          });

          processed++;
        }
      } catch (userError) {
        const errorMsg = `Error processing overages for user ${user.email}: ${userError}`;
        console.error(`[Overage Processing] ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    console.log(`[Overage Processing] Completed. Processed: ${processed}, Errors: ${errors.length}`);
    return { processed, errors };

  } catch (error) {
    console.error('[Overage Processing] Fatal error:', error);
    throw error;
  }
}

/**
 * Helper functions for specific usage types
 */
export const trackMessage = (userId: string, chatbotId?: string) => 
  trackUsage(userId, 'message', 1, { chatbotId });

export const trackSMS = (userId: string, phoneNumber?: string, direction?: 'inbound' | 'outbound') =>
  trackUsage(userId, 'sms', 1, { phoneNumber, direction });

export const trackWebSearch = (userId: string, query?: string, chatbotId?: string) =>
  trackUsage(userId, 'web_search', 1, { query, chatbotId });

export const trackConversationSummary = (userId: string, conversationId?: string) =>
  trackUsage(userId, 'conversation_summary', 1, { conversationId });

export const trackWhatsAppConversation = (userId: string, phoneNumber?: string) =>
  trackUsage(userId, 'whatsapp_conversation', 1, { phoneNumber });

export const trackVoiceMinutes = (userId: string, minutes: number, callId?: string) =>
  trackUsage(userId, 'voice_minute', minutes, { callId });

/**
 * Check if user has exceeded limits for a usage type
 */
export async function checkUsageLimit(userId: string, usageType: UsageType): Promise<{
  withinLimit: boolean;
  usage: number;
  limit: number | null;
  remaining: number | null;
}> {
  const summary = await getUsageSummary(userId);
  
  let usage: number;
  let limit: number | null;
  
  switch (usageType) {
    case 'message':
      usage = summary.usage.messages;
      limit = summary.planLimits.messages;
      break;
    case 'sms':
      usage = summary.usage.sms;
      limit = summary.planLimits.sms;
      break;
    case 'web_search':
      usage = summary.usage.webSearches;
      limit = summary.planLimits.webSearches;
      break;
    case 'conversation_summary':
      usage = summary.usage.summaries;
      limit = summary.planLimits.summaries;
      break;
    case 'whatsapp_conversation':
      usage = summary.usage.whatsappConversations;
      limit = summary.planLimits.whatsappConversations;
      break;
    case 'voice_minute':
      usage = summary.usage.voiceMinutes;
      limit = summary.planLimits.voiceMinutes;
      break;
    default:
      throw new Error(`Unknown usage type: ${usageType}`);
  }
  
  const withinLimit = limit === null || usage < limit;
  const remaining = limit === null ? null : Math.max(0, limit - usage);
  
  return {
    withinLimit,
    usage,
    limit,
    remaining
  };
} 
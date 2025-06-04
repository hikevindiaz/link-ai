import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';
import { ChannelType, AgentMessage, ChannelContext } from './types';

export interface ConversationMetrics {
  conversationId: string;
  channelType: ChannelType;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  messageCount: number;
  userMessageCount: number;
  assistantMessageCount: number;
  averageResponseTime?: number;
  toolsUsed: string[];
  sentiment?: 'positive' | 'neutral' | 'negative';
  resolved?: boolean;
  errorCount: number;
}

export interface ChannelMetrics {
  channel: ChannelType;
  totalConversations: number;
  activeConversations: number;
  averageDuration: number;
  averageMessagesPerConversation: number;
  successRate: number;
  errorRate: number;
  peakHours: { hour: number; count: number }[];
}

export class AnalyticsService {
  private static instance: AnalyticsService;
  private conversationMetrics: Map<string, ConversationMetrics> = new Map();
  
  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }
  
  /**
   * Track conversation start
   */
  startConversation(sessionId: string, context: ChannelContext): void {
    const metrics: ConversationMetrics = {
      conversationId: sessionId,
      channelType: context.type,
      startTime: new Date(),
      messageCount: 0,
      userMessageCount: 0,
      assistantMessageCount: 0,
      toolsUsed: [],
      errorCount: 0
    };
    
    this.conversationMetrics.set(sessionId, metrics);
    
    logger.debug('Conversation started', { 
      sessionId,
      channel: context.type 
    }, 'analytics');
  }
  
  /**
   * Track message in conversation
   */
  trackMessage(sessionId: string, message: AgentMessage, responseTime?: number): void {
    const metrics = this.conversationMetrics.get(sessionId);
    if (!metrics) return;
    
    metrics.messageCount++;
    
    if (message.role === 'user') {
      metrics.userMessageCount++;
    } else if (message.role === 'assistant') {
      metrics.assistantMessageCount++;
      
      if (responseTime) {
        // Calculate running average
        const currentAvg = metrics.averageResponseTime || 0;
        const count = metrics.assistantMessageCount;
        metrics.averageResponseTime = (currentAvg * (count - 1) + responseTime) / count;
      }
    }
    
    // Track tool usage
    if (message.type === 'function_call' && message.metadata?.functionName) {
      if (!metrics.toolsUsed.includes(message.metadata.functionName)) {
        metrics.toolsUsed.push(message.metadata.functionName);
      }
    }
  }
  
  /**
   * Track error in conversation
   */
  trackError(sessionId: string, error: Error): void {
    const metrics = this.conversationMetrics.get(sessionId);
    if (!metrics) return;
    
    metrics.errorCount++;
    
    logger.error('Conversation error tracked', { 
      sessionId,
      error: error.message,
      errorCount: metrics.errorCount 
    }, 'analytics');
  }
  
  /**
   * End conversation and save metrics
   */
  async endConversation(sessionId: string, resolved: boolean = true): Promise<void> {
    const metrics = this.conversationMetrics.get(sessionId);
    if (!metrics) return;
    
    metrics.endTime = new Date();
    metrics.duration = metrics.endTime.getTime() - metrics.startTime.getTime();
    metrics.resolved = resolved;
    
    // Save metrics as a special message in the conversation
    try {
      const [chatbotId, threadId] = sessionId.split('_').slice(-2);
      
      await prisma.message.create({
        data: {
          threadId: threadId || sessionId,
          message: 'ANALYTICS_METRICS',
          response: JSON.stringify({
            type: 'conversation_metrics',
            metrics: {
              channelType: metrics.channelType,
              startTime: metrics.startTime,
              endTime: metrics.endTime,
              duration: metrics.duration,
              messageCount: metrics.messageCount,
              userMessageCount: metrics.userMessageCount,
              assistantMessageCount: metrics.assistantMessageCount,
              averageResponseTime: metrics.averageResponseTime,
              toolsUsed: metrics.toolsUsed,
              resolved: metrics.resolved,
              errorCount: metrics.errorCount
            }
          }),
          from: 'system',
          userId: '', // Will be set by the conversation context
          chatbotId: chatbotId || ''
        }
      });
      
      logger.info('Conversation metrics saved', { 
        sessionId,
        duration: metrics.duration,
        messageCount: metrics.messageCount 
      }, 'analytics');
      
    } catch (error) {
      logger.error('Failed to save conversation metrics', { 
        error: error.message,
        sessionId 
      }, 'analytics');
    }
    
    // Remove from memory
    this.conversationMetrics.delete(sessionId);
  }
  
  /**
   * Get channel performance metrics
   */
  async getChannelMetrics(
    chatbotId: string,
    channel: ChannelType,
    startDate: Date,
    endDate: Date
  ): Promise<ChannelMetrics> {
    try {
      // Fetch analytics messages
      const analyticsMessages = await prisma.message.findMany({
        where: {
          chatbotId,
          message: 'ANALYTICS_METRICS',
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        }
      });
      
      // Parse metrics from messages
      const analytics = analyticsMessages
        .map(msg => {
          try {
            const data = JSON.parse(msg.response);
            return data.metrics;
          } catch {
            return null;
          }
        })
        .filter(m => m && m.channelType === channel);
      
      if (analytics.length === 0) {
        return {
          channel,
          totalConversations: 0,
          activeConversations: 0,
          averageDuration: 0,
          averageMessagesPerConversation: 0,
          successRate: 0,
          errorRate: 0,
          peakHours: []
        };
      }
      
      // Calculate metrics
      const totalConversations = analytics.length;
      const activeConversations = Array.from(this.conversationMetrics.values())
        .filter(m => m.channelType === channel).length;
      
      const totalDuration = analytics.reduce((sum, a) => sum + (a.duration || 0), 0);
      const averageDuration = totalDuration / totalConversations;
      
      const totalMessages = analytics.reduce((sum, a) => sum + a.messageCount, 0);
      const averageMessagesPerConversation = totalMessages / totalConversations;
      
      const resolvedCount = analytics.filter(a => a.resolved).length;
      const successRate = (resolvedCount / totalConversations) * 100;
      
      const errorConversations = analytics.filter(a => a.errorCount > 0).length;
      const errorRate = (errorConversations / totalConversations) * 100;
      
      // Calculate peak hours
      const hourCounts = new Map<number, number>();
      analytics.forEach(a => {
        const hour = new Date(a.startTime).getHours();
        hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
      });
      
      const peakHours = Array.from(hourCounts.entries())
        .map(([hour, count]) => ({ hour, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      
      return {
        channel,
        totalConversations,
        activeConversations,
        averageDuration,
        averageMessagesPerConversation,
        successRate,
        errorRate,
        peakHours
      };
      
    } catch (error) {
      logger.error('Failed to get channel metrics', { 
        error: error.message,
        chatbotId,
        channel 
      }, 'analytics');
      
      throw error;
    }
  }
  
  /**
   * Get agent performance summary
   */
  async getAgentPerformance(
    chatbotId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalConversations: number;
    channelBreakdown: Record<ChannelType, number>;
    averageResponseTime: number;
    toolUsage: { tool: string; count: number }[];
    satisfactionRate: number;
    peakDays: { date: string; count: number }[];
  }> {
    try {
      // Fetch analytics messages
      const analyticsMessages = await prisma.message.findMany({
        where: {
          chatbotId,
          message: 'ANALYTICS_METRICS',
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        }
      });
      
      // Parse metrics from messages
      const analytics = analyticsMessages
        .map(msg => {
          try {
            const data = JSON.parse(msg.response);
            return data.metrics;
          } catch {
            return null;
          }
        })
        .filter(m => m !== null);
      
      // Channel breakdown
      const channelBreakdown: Record<string, number> = {};
      analytics.forEach(a => {
        channelBreakdown[a.channelType] = (channelBreakdown[a.channelType] || 0) + 1;
      });
      
      // Average response time
      const responseTimes = analytics
        .map(a => a.averageResponseTime)
        .filter(t => t !== null && t !== undefined) as number[];
      const averageResponseTime = responseTimes.length > 0
        ? responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length
        : 0;
      
      // Tool usage
      const toolCounts = new Map<string, number>();
      analytics.forEach(a => {
        if (a.toolsUsed && Array.isArray(a.toolsUsed)) {
          a.toolsUsed.forEach(tool => {
            toolCounts.set(tool, (toolCounts.get(tool) || 0) + 1);
          });
        }
      });
      
      const toolUsage = Array.from(toolCounts.entries())
        .map(([tool, count]) => ({ tool, count }))
        .sort((a, b) => b.count - a.count);
      
      // Satisfaction rate (based on resolution and errors)
      const satisfiedConversations = analytics.filter(a => 
        a.resolved && a.errorCount === 0
      ).length;
      const satisfactionRate = analytics.length > 0
        ? (satisfiedConversations / analytics.length) * 100
        : 0;
      
      // Peak days
      const dayCounts = new Map<string, number>();
      analytics.forEach(a => {
        const date = new Date(a.startTime).toISOString().split('T')[0];
        dayCounts.set(date, (dayCounts.get(date) || 0) + 1);
      });
      
      const peakDays = Array.from(dayCounts.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 7);
      
      return {
        totalConversations: analytics.length,
        channelBreakdown: channelBreakdown as Record<ChannelType, number>,
        averageResponseTime,
        toolUsage,
        satisfactionRate,
        peakDays
      };
      
    } catch (error) {
      logger.error('Failed to get agent performance', { 
        error: error.message,
        chatbotId 
      }, 'analytics');
      
      throw error;
    }
  }
} 
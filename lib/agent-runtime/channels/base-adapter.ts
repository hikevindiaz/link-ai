import { AgentConfig, ChannelAdapter, ChannelContext, AgentMessage } from '../types';
import { logger } from '@/lib/logger';

export abstract class BaseChannelAdapter implements ChannelAdapter {
  protected agent: AgentConfig | null = null;
  protected initialized = false;
  
  abstract type: ChannelContext['type'];
  
  async initialize(agent: AgentConfig): Promise<void> {
    this.agent = agent;
    this.initialized = true;
    logger.info(`${this.type} channel adapter initialized`, { 
      agentId: agent.id 
    }, 'channel-adapter');
  }
  
  protected validateInitialized(): void {
    if (!this.initialized || !this.agent) {
      throw new Error(`${this.type} adapter not initialized`);
    }
  }
  
  abstract handleIncoming(data: any, context: ChannelContext): Promise<AgentMessage>;
  abstract sendOutgoing(message: AgentMessage, context: ChannelContext): Promise<void>;
  
  async handleEvent?(event: any, context: ChannelContext): Promise<void> {
    logger.debug('Channel event received', { 
      type: this.type, 
      event 
    }, 'channel-adapter');
  }
  
  async cleanup?(): Promise<void> {
    this.agent = null;
    this.initialized = false;
    logger.info(`${this.type} channel adapter cleaned up`, {}, 'channel-adapter');
  }
} 
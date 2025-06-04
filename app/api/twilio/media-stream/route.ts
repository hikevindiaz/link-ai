import { NextRequest } from 'next/server';
import { WebSocketServer } from 'ws';
import { logger } from '@/lib/logger';
import { RealtimeClient } from '@/lib/agent-runtime/realtime/realtime-client';
import { AgentRuntime } from '@/lib/agent-runtime';
import prisma from '@/lib/prisma';

// Store active connections
const activeConnections = new Map<string, RealtimeClient>();

export async function GET(req: NextRequest) {
  logger.info('Media stream WebSocket connection requested', {}, 'media-stream');
  
  try {
    // Extract agent ID from query parameters
    const url = new URL(req.url);
    const agentId = url.searchParams.get('agentId');
    
    if (!agentId) {
      return new Response('Missing agentId parameter', { status: 400 });
    }
    
    // Verify the agent exists and get phone configuration
    const agent = await prisma.chatbot.findUnique({
      where: { id: agentId },
      include: {
        model: true,
        twilioPhoneNumber: true
      }
    });
    
    if (!agent) {
      return new Response('Agent not found', { status: 404 });
    }
    
    // Create agent runtime
    const runtime = await AgentRuntime.fromChatbotId(agentId);
    
    // Upgrade to WebSocket
    const { socket, response } = upgradeWebSocket(req);
    
    if (!socket) {
      return new Response('Failed to upgrade to WebSocket', { status: 500 });
    }
    
    // Create realtime client for this connection
    const realtimeClient = new RealtimeClient(runtime, agent);
    const connectionId = `${agentId}-${Date.now()}`;
    activeConnections.set(connectionId, realtimeClient);
    
    // Handle WebSocket events
    socket.on('open', () => {
      logger.info('WebSocket connection opened', { connectionId }, 'media-stream');
    });
    
    socket.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        await realtimeClient.handleTwilioMessage(message, socket);
      } catch (error) {
        logger.error('Error handling WebSocket message', { 
          error: error.message,
          connectionId 
        }, 'media-stream');
      }
    });
    
    socket.on('close', () => {
      logger.info('WebSocket connection closed', { connectionId }, 'media-stream');
      realtimeClient.disconnect();
      activeConnections.delete(connectionId);
    });
    
    socket.on('error', (error) => {
      logger.error('WebSocket error', { 
        error: error.message,
        connectionId 
      }, 'media-stream');
      realtimeClient.disconnect();
      activeConnections.delete(connectionId);
    });
    
    return response;
    
  } catch (error) {
    logger.error('Error setting up media stream', { 
      error: error.message 
    }, 'media-stream');
    return new Response('Internal server error', { status: 500 });
  }
}

// Helper function to upgrade HTTP connection to WebSocket
function upgradeWebSocket(req: NextRequest) {
  // This is a simplified version - in production, you'd use a proper WebSocket server
  // For Next.js App Router, you might need to use a separate WebSocket server
  // or use a service like Pusher/Ably for real-time communication
  
  // For now, we'll return a placeholder
  // In production, integrate with your WebSocket solution
  return {
    socket: null,
    response: new Response('WebSocket upgrade not implemented in this environment', { 
      status: 501 
    })
  };
} 
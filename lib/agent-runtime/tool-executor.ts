import { logger } from '@/lib/logger';
import { AgentTool, AgentContext } from './types';
import { googleSearchTool } from './tools/google-search-tool';
import { aviationStackTool } from './tools/aviationstack-tool';
import { weatherTool } from './tools/weather-tool';

export class ToolExecutor {
  private tools: Map<string, AgentTool> = new Map();
  
  /**
   * Register a tool for use by agents
   */
  registerTool(tool: AgentTool): void {
    this.tools.set(tool.name, tool);
    console.log('🔧 Registered tool', { 
      toolName: tool.name,
      toolId: tool.id,
      totalTools: this.tools.size,
      allToolNames: Array.from(this.tools.keys())
    });
  }
  
  /**
   * Unregister a tool
   */
  unregisterTool(toolName: string): void {
    this.tools.delete(toolName);
    console.log('Unregistered tool', { toolName });
  }
  
  /**
   * Get all registered tools
   */
  getTools(): Map<string, AgentTool> {
    return this.tools;
  }
  
  /**
   * Get tools as OpenAI function definitions
   */
  getToolDefinitions(): any[] {
    const definitions: any[] = [];
    
    for (const [name, tool] of this.tools) {
      definitions.push({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters
        }
      });
    }
    
    // DEBUG: Log tool definitions being sent to AI
    console.log('🔧 Tool Definitions for AI', {
      toolCount: definitions.length,
      toolNames: definitions.map(def => def.function.name),
      hasGoogleSearch: definitions.some(def => def.function.name === 'google_search')
    });
    
    return definitions;
  }
  
  /**
   * Execute a tool by name with given arguments
   */
  async executeTool(
    toolName: string, 
    args: any, 
    context: AgentContext
  ): Promise<any> {
    const tool = this.tools.get(toolName);
    
    if (!tool) {
      console.error('Tool not found', { toolName });
      throw new Error(`Tool '${toolName}' not found`);
    }
    
    try {
      console.log('🔨 Executing tool from ToolExecutor', { 
        toolName, 
        args,
        chatbotId: context.agent.id 
      });
      
      // Validate arguments against schema if needed
      const validatedArgs = this.validateArguments(tool, args);
      
      // Execute the tool
      const result = await tool.handler(validatedArgs, context);
      
      console.log('✅ Tool executed successfully in ToolExecutor', { 
        toolName,
        resultType: typeof result 
      });
      
      return result;
      
    } catch (error) {
      console.error('❌ Error executing tool in ToolExecutor', { 
        toolName,
        error: error.message,
        args 
      });
      throw error;
    }
  }
  
  /**
   * Execute multiple tools in parallel
   */
  async executeTools(
    toolCalls: Array<{ name: string; arguments: any }>,
    context: AgentContext
  ): Promise<Array<{ name: string; result: any; error?: string }>> {
    const results = await Promise.allSettled(
      toolCalls.map(call => 
        this.executeTool(call.name, call.arguments, context)
          .then(result => ({ name: call.name, result }))
          .catch(error => ({ name: call.name, result: null, error: error.message }))
      )
    );
    
    return results.map(result => 
      result.status === 'fulfilled' ? result.value : result.reason
    );
  }
  
  /**
   * Validate tool arguments against schema
   */
  private validateArguments(tool: AgentTool, args: any): any {
    // Simple validation - can be enhanced with JSON schema validation
    const params = tool.parameters;
    
    if (params.type === 'object' && params.properties) {
      const validated: any = {};
      
      // Check required fields
      if (params.required) {
        for (const field of params.required) {
          if (!(field in args)) {
            throw new Error(`Missing required field: ${field}`);
          }
        }
      }
      
      // Copy and validate fields
      for (const [key, schema] of Object.entries(params.properties as Record<string, any>)) {
        if (key in args) {
          // Basic type checking
          const value = args[key];
          const expectedType = schema.type;
          
          if (expectedType && !this.checkType(value, expectedType)) {
            throw new Error(`Invalid type for field '${key}': expected ${expectedType}, got ${typeof value}`);
          }
          
          validated[key] = value;
        }
      }
      
      return validated;
    }
    
    return args;
  }
  
  /**
   * Check if a value matches the expected type
   */
  private checkType(value: any, expectedType: string): boolean {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
      case 'integer':
        return typeof value === 'number';
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      default:
        return true;
    }
  }
}

// Pre-built tools that can be registered
export const builtInTools = {
  /**
   * Get current date and time
   */
  getCurrentDateTime: {
    id: 'get_current_datetime',
    name: 'get_current_datetime',
    description: 'Get the current date and time in a specific timezone',
    parameters: {
      type: 'object',
      properties: {
        timezone: {
          type: 'string',
          description: 'Timezone name (e.g., "America/New_York", "UTC")',
          default: 'UTC'
        }
      },
      required: []
    },
    handler: async (args: { timezone?: string }) => {
      const timezone = args.timezone || 'UTC';
      const now = new Date();
      
      try {
        const formatted = now.toLocaleString('en-US', {
          timeZone: timezone,
          dateStyle: 'full',
          timeStyle: 'long'
        });
        
        return {
          datetime: formatted,
          timestamp: now.toISOString(),
          timezone
        };
      } catch (error) {
        throw new Error(`Invalid timezone: ${timezone}`);
      }
    }
  },
  
  /**
   * Simple calculator
   */
  calculate: {
    id: 'calculate',
    name: 'calculate',
    description: 'Perform basic mathematical calculations',
    parameters: {
      type: 'object',
      properties: {
        expression: {
          type: 'string',
          description: 'Mathematical expression to evaluate (e.g., "2 + 2", "10 * 5")'
        }
      },
      required: ['expression']
    },
    handler: async (args: { expression: string }) => {
      // Simple safe math evaluation (in production, use a proper math parser)
      const { expression } = args;
      
      // Only allow basic math operations and numbers
      if (!/^[\d\s+\-*/().]+$/.test(expression)) {
        throw new Error('Invalid expression: only numbers and basic operators allowed');
      }
      
      try {
        // Note: In production, use a proper math expression parser like mathjs
        const result = Function(`"use strict"; return (${expression})`)();
        
        return {
          expression,
          result,
          type: typeof result
        };
      } catch (error) {
        throw new Error(`Failed to evaluate expression: ${error.message}`);
      }
    }
  },

  /**
   * Google Programmable Search JSON API
   */
  googleSearch: googleSearchTool,

  /**
   * AviationStack API for flight tracking and aviation data
   */
  aviationStack: aviationStackTool,

  /**
   * Weather API for current weather information
   */
  weather: weatherTool
} as const; 
# Agent Runtime Unification Plan

## Goal
Create a single, unified Agent Runtime that handles ALL agent intelligence, eliminating duplication across different channels (web chat, voice, SMS, WhatsApp).

## Current Issues
1. **Chat Interface Route** duplicates logic that should be in Agent Runtime
2. **Multiple model selection** implementations across different files
3. **Knowledge source processing** scattered across routes
4. **System prompt building** duplicated in multiple places

## Refactor Steps

### Phase 1: Enhance Agent Runtime Core
**File**: `lib/agent-runtime/index.ts`

#### 1.1 Enhanced Constructor
```typescript
static async fromChatbotId(chatbotId: string, channelContext?: ChannelContext): Promise<AgentRuntime> {
  // Fetch chatbot with ALL relations (model, knowledge sources, calendar, etc.)
  const chatbot = await prisma.chatbot.findUnique({
    where: { id: chatbotId },
    include: {
      model: true,
      knowledgeSources: {
        include: {
          textContents: true,
          websiteContents: true,
          qaContents: true
        }
      },
      calendar: true,
      user: { select: { companyName: true } }
    }
  });
  
  // Build complete AgentConfig with all settings
  const config = await this.buildAgentConfig(chatbot, channelContext);
  
  return new AgentRuntime(config);
}
```

#### 1.2 Unified Model Selection
```typescript
private static async buildAgentConfig(chatbot: Chatbot, channelContext?: ChannelContext): Promise<AgentConfig> {
  // Single source of truth for model selection
  const modelName = chatbot.model?.name || 'gpt-4o-mini';
  
  // Process knowledge sources once
  const knowledgeConfig = await this.processKnowledgeSources(chatbot.knowledgeSources);
  
  // Build system prompt once
  const systemPrompt = await this.buildSystemPrompt(chatbot, channelContext);
  
  return {
    id: chatbot.id,
    modelName,
    systemPrompt,
    knowledgeConfig,
    // ... all other settings
  };
}
```

### Phase 2: Simplify Route Handlers

#### 2.1 New Chat Interface Route
**File**: `app/api/chat-interface/route.ts`

```typescript
export async function POST(req: Request) {
  try {
    const { chatbotId, messages, threadId, userLocation } = await req.json();
    
    // Create unified runtime (handles everything internally)
    const runtime = await AgentRuntime.fromChatbotId(chatbotId, {
      channel: 'web',
      userLocation,
      capabilities: ['file_upload', 'web_search']
    });
    
    // Process message (all intelligence in runtime)
    const response = await runtime.processMessage({
      messages,
      threadId,
      stream: true
    });
    
    // Just return the stream
    return new StreamingTextResponse(response);
    
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

#### 2.2 Voice Handler Simplification
**File**: `voice-server/lib/llm-agnostic-voice-handler.js`

```typescript
// Instead of custom model mapping and prompt building
const runtime = await AgentRuntime.fromChatbotId(config.agentId, {
  channel: 'voice',
  capabilities: ['voice_synthesis', 'voice_recognition']
});

const response = await runtime.processMessage({
  messages: [{ role: 'user', content: transcription }],
  threadId: `voice_${callSid}`
});
```

### Phase 3: Benefits After Refactor

#### 3.1 Single Point of Control
- **One file to modify**: `lib/agent-runtime/index.ts`
- **Consistent behavior**: All channels use same logic
- **Easier testing**: Test once, works everywhere

#### 3.2 Eliminated Duplication
- ❌ **Before**: 4 different model selection implementations
- ✅ **After**: 1 model selection in Agent Runtime

- ❌ **Before**: 3 different prompt building functions  
- ✅ **After**: 1 prompt builder in Agent Runtime

- ❌ **Before**: Multiple knowledge source processors
- ✅ **After**: 1 knowledge processor in Agent Runtime

#### 3.3 Enhanced Capabilities
```typescript
// Want to add new intelligence? Just modify Agent Runtime:
class AgentRuntime {
  async processMessage(input: MessageInput): Promise<StreamingResponse> {
    // 🧠 Add new reasoning capabilities here
    // 🔧 Add new tools here  
    // 📚 Add new knowledge processing here
    // 🎯 Add new personalization here
    
    // All channels automatically get the improvements!
  }
}
```

## Implementation Priority

1. **High Priority**: Move model selection to Agent Runtime
2. **High Priority**: Move knowledge source processing to Agent Runtime  
3. **Medium Priority**: Move system prompt building to Agent Runtime
4. **Low Priority**: Refactor route handlers to be thin wrappers

## Files to Modify

### Core Changes
- `lib/agent-runtime/index.ts` - Main runtime enhancement
- `lib/agent-runtime/types.ts` - Add channel context types
- `lib/agent-runtime/knowledge-processor.ts` - New unified knowledge handler

### Route Simplifications  
- `app/api/chat-interface/route.ts` - Remove duplicated logic
- `voice-server/lib/llm-agnostic-voice-handler.js` - Use unified runtime
- `app/api/twilio/webhook/route.ts` - Use unified runtime

### Remove Duplicated Files
- `lib/chat-interface/ai/providers.ts` - Move to Agent Runtime
- `lib/buildSystemPrompt.ts` - Move to Agent Runtime

## Result
After this refactor, you'll have **one unified Agent Runtime** that handles all intelligence. To make agents smarter, you'll only need to modify `lib/agent-runtime/index.ts` and all channels (web, voice, SMS, WhatsApp) will automatically benefit from the improvements. 
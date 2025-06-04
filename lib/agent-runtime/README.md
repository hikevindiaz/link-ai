# Unified Agent Runtime

## Overview

The Unified Agent Runtime is a centralized system that powers all agent/chatbot interactions across multiple channels (web, voice, phone, WhatsApp, Instagram, etc.) with a single, consistent implementation.

## Phase 1 Features ✅

### Core Components

1. **AgentRuntime** (`index.ts`)
   - Main orchestrator for all agent interactions
   - Loads agent configuration from database
   - Manages conversation flow
   - Handles streaming responses
   - Channel-agnostic processing

2. **ConversationManager** (`conversation-manager.ts`)
   - Manages conversation state and history
   - Loads/saves messages to database
   - Maintains in-memory conversation cache
   - Handles conversation summaries

3. **AIProvider** (`providers/openai-provider.ts`)
   - Abstracted AI provider interface
   - OpenAI implementation with streaming support
   - Interrupt handling for voice channels
   - Model name resolution

4. **ToolExecutor** (`tool-executor.ts`)
   - Function calling support
   - Built-in tools (datetime, calculator)
   - Custom tool registration
   - Parallel tool execution

## Architecture

```
┌─────────────────────────────────────────────────┐
│              Channel Request                     │
│  (Web Chat, Voice, Phone, WhatsApp, etc.)      │
└─────────────────────┬───────────────────────────┘
                      │
                      ▼
            ┌─────────────────┐
            │ Channel Context │
            │    Creation     │
            └────────┬────────┘
                     │
                     ▼
            ┌─────────────────┐
            │ Agent Runtime   │
            │   - Load Config │
            │   - Process Msg │
            └────────┬────────┘
                     │
       ┌─────────────┼─────────────┐
       ▼             ▼             ▼
┌──────────┐  ┌──────────┐  ┌──────────┐
│Conversa- │  │    AI    │  │   Tool   │
│   tion   │  │ Provider │  │ Executor │
│ Manager  │  │          │  │          │
└──────────┘  └──────────┘  └──────────┘
```

## Configuration

The agent configuration is loaded from the database `Chatbot` model and includes:

- **System Prompt**: Stored in `chatbot.prompt` field
- **Model Settings**: Temperature, max tokens, model selection
- **Channel Settings**: Which channels are enabled
- **Voice Settings**: Voice ID, language, response rate
- **Call Settings**: Timeouts, presence checks, hang-up messages

## Usage Example

```typescript
// Create runtime from chatbot ID
const runtime = await AgentRuntime.fromChatbotId(chatbotId);

// Define channel context
const channelContext: ChannelContext = {
  type: 'web',
  sessionId: `web-${threadId}`,
  userId: session.user.id,
  chatbotId,
  threadId,
  capabilities: {
    supportsAudio: false,
    supportsImages: true,
    supportsRichText: true,
    // ... other capabilities
  }
};

// Create user message
const userMessage: AgentMessage = {
  id: generateId(),
  role: 'user',
  content: 'Hello, how can you help me?',
  type: 'text',
  timestamp: new Date()
};

// Process message
const response = await runtime.processMessage(
  userMessage,
  channelContext
);

console.log(response.content); // AI response
```

## Testing Phase 1

### 1. Test via API Endpoint

Send a POST request to `/api/agent-runtime/test`:

```bash
curl -X POST http://localhost:3000/api/agent-runtime/test \
  -H "Content-Type: application/json" \
  -H "Cookie: [your-session-cookie]" \
  -d '{
    "message": "What is 2+2?",
    "chatbotId": "[your-chatbot-id]",
    "threadId": "test-thread-123",
    "channelType": "web"
  }'
```

Expected response:
```json
{
  "success": true,
  "response": {
    "content": "2 + 2 equals 4.",
    "type": "text",
    "timestamp": "2024-01-01T00:00:00.000Z"
  },
  "debug": {
    "channelType": "web",
    "sessionId": "web-test-thread-123",
    "messageCount": 2,
    "capabilities": {
      "supportsAudio": false,
      "supportsImages": true,
      "supportsRichText": true,
      // ...
    }
  }
}
```

### 2. Test Different Channels

Change the `channelType` parameter to test different channel behaviors:
- `"web"` - Standard web chat
- `"voice"` - Voice interface (audio capabilities)
- `"phone"` - Phone calls (audio + interruption)
- `"whatsapp"` - WhatsApp (multimedia support)

### 3. Test Built-in Tools

Try these messages to test function calling:
- "What time is it in New York?"
- "Calculate 15 * 7 + 3"
- "What's the date today?"

### 4. Test Conversation History

Send multiple messages with the same `threadId` to test conversation continuity:
1. "My name is John"
2. "What's my name?"
3. "Tell me a joke about my name"

## Channel Capabilities

Each channel has different capabilities that affect agent behavior:

| Channel   | Audio | Images | Rich Text | Interruption | Max Length |
|-----------|-------|--------|-----------|--------------|------------|
| Web       | ❌    | ✅     | ✅        | ❌          | 4000       |
| Voice     | ✅    | ❌     | ❌        | ✅          | N/A        |
| Phone     | ✅    | ❌     | ❌        | ✅          | N/A        |
| WhatsApp  | ✅    | ✅     | ✅        | ❌          | 4096       |
| SMS       | ❌    | ❌     | ❌        | ❌          | 160        |

## Database Integration

The runtime integrates with your existing database schema:

- **Chatbot**: Agent configuration and settings
- **Message**: Conversation history storage
- **ConversationSummary**: Thread summaries
- **ChatbotModel**: AI model selection
- **KnowledgeSource**: Knowledge base (Phase 3)

## Next Steps

### Phase 2: Real-time Phone Integration
- Implement WebSocket bridge for Twilio
- Add OpenAI Realtime API support
- Improve turn dynamics
- Add audio streaming

### Phase 3: Channel Migration
- Refactor existing chat endpoints
- Update voice chat to use runtime
- Create channel adapters
- Maintain backward compatibility

### Phase 4: New Channels
- WhatsApp integration
- Instagram/Messenger support
- SMS handling
- Email integration

## Troubleshooting

### Common Issues

1. **"Chatbot not found"**
   - Ensure the chatbotId exists in the database
   - Check user permissions

2. **"Channel not enabled"**
   - Verify channel flags in chatbot settings
   - Check `websiteEnabled`, `whatsappEnabled`, etc.

3. **Empty responses**
   - Check the system prompt configuration
   - Verify OpenAI API key is set
   - Check model token limits

### Debug Logging

Enable debug logging by configuring the logger:
```typescript
import { logger } from '@/lib/logger';

logger.configure({
  verbosity: 'high',
  enabledModules: ['agent-runtime', 'conversation-manager', 'openai-provider']
});
```

## Contributing

When adding new features:
1. Maintain channel abstraction
2. Update types in `types.ts`
3. Add appropriate logging
4. Update this documentation
5. Add tests for new functionality 
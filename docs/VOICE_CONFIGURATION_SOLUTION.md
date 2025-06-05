# Voice Configuration Solution

## Problem
1. Voice IDs were being passed as database IDs (e.g., `cmbe8bjjj000c14ta96icq2hx`) instead of OpenAI voice names
2. This caused OpenAI to reject the session update with an error
3. We needed a way to pass full agent configuration (tools, knowledge, voice settings) to the voice server

## Solution Architecture

### 1. Call Configuration Storage
- Created `lib/twilio/call-config.ts` to handle configuration storage
- Uses existing Message model with special threadId format: `call-config-{callSid}`
- Automatically cleaned up after 5 minutes
- No need for Redis or new database models

### 2. Voice Mapping
- `getVoiceSettings()` function maps voice IDs to OpenAI voices
- Supports both OpenAI voice names and database IDs
- Extracts personality/accent settings from voice description field
- Falls back to 'alloy' as default voice

### 3. Data Flow
```
1. Twilio webhook receives call
2. Look up agent by phone number
3. Get voice settings (map DB ID to OpenAI voice)
4. Store full configuration in database
5. Pass minimal params to voice server via TwiML
6. Voice server receives connection
7. Extract parameters and fetch full config
8. Map voice ID to valid OpenAI voice
9. Initialize OpenAI session with proper voice
```

### 4. Voice Settings Format
Voice personalities and settings can be stored in the UserVoice description field:
```
personality: friendly, accent: british, speed: 1.2, pitch: 0.8
```

## Configuration Passed

### Minimal Parameters (via TwiML)
- callSid (for config lookup)
- agentId
- openAIKey
- voice (OpenAI voice name)
- prompt (truncated backup)
- temperature
- from

### Full Configuration (stored in DB)
```typescript
{
  agentId: string,
  openAIKey: string,
  model: string,
  voice: {
    openAIVoice: string,
    personality?: string,
    accent?: string,
    speed?: number,
    pitch?: number
  },
  instructions: string,
  temperature: number,
  maxTokens?: number,
  tools: any[],
  knowledge: any[],
  callSid: string,
  from: string,
  to: string
}
```

## Future Enhancements

1. **Add Tools Support**
   - Query agent tools from database
   - Format for OpenAI function calling
   - Pass in configuration

2. **Add Knowledge Support**
   - Query knowledge sources
   - Include relevant documents
   - Pass context to OpenAI

3. **Voice Settings UI**
   - Create UI for voice personality settings
   - Allow accent, speed, pitch configuration
   - Store in dedicated fields instead of description

4. **Redis Integration**
   - Add Redis for faster config storage/retrieval
   - Reduce database load
   - Better scalability

## Testing

1. Make a call to a configured phone number
2. Check voice server logs: `fly logs -a voice-server`
3. Verify:
   - Voice is mapped correctly (not a DB ID)
   - Session update succeeds
   - No OpenAI errors
   - Voice matches expected setting 
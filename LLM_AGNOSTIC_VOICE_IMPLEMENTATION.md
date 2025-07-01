# LinkAI LLM-Agnostic Voice Implementation

## Overview

LinkAI has been successfully converted to use a completely LLM-agnostic voice implementation that replaces the OpenAI Realtime API dependency. The system now supports both OpenAI and Gemini models through a unified Speech-to-Text → Chat Completions → Text-to-Speech pipeline.

## Architecture

### 1. **Automatic Provider Detection**
The system automatically detects which voice implementation to use based on the chatbot's model:
- **Gemini Models** (`gemini-*`): Uses LLM-agnostic pipeline with Google services
- **OpenAI Models** (`gpt-*`): Can use either OpenAI Realtime API or LLM-agnostic pipeline
- **Environment Flags**: `USE_LLM_AGNOSTIC_VOICE=true` or `FORCE_LLM_AGNOSTIC=true` forces LLM-agnostic mode

### 2. **Voice Server (Twilio Phone Calls)**
**File**: `voice-server/server.js`
- Automatically selects handler based on model type
- **OpenAI Realtime Handler**: `voice-server/lib/twilio-websocket-handler.js`
- **LLM-Agnostic Handler**: `voice-server/lib/llm-agnostic-voice-handler.js`

#### LLM-Agnostic Voice Handler Features:
- **Audio Processing**: Handles G.711 μ-law audio from Twilio
- **STT Pipeline**: OpenAI Whisper or Google Speech-to-Text
- **LLM Integration**: Uses existing AgentRuntime for provider-agnostic responses
- **TTS Pipeline**: OpenAI TTS or Google Text-to-Speech
- **Conversation Storage**: Saves voice transcripts to database
- **Audio Conversion**: G.711 ↔ WAV conversion utilities

### 3. **Browser Voice (WebRTC)**
**File**: `lib/realtime-api/llm-agnostic-webrtc-manager.ts`
- **MediaRecorder API**: Captures browser audio in WebM/Opus format
- **Voice Activity Detection**: Audio level monitoring and silence detection
- **State Management**: Tracks connection and session states
- **API Integration**: Calls server endpoints for STT, LLM, and TTS

#### Browser Hook Integration:
**File**: `hooks/use-webrtc-realtime.tsx`
- **Automatic Detection**: Calls `/api/voice/llm-agnostic-session` to determine implementation
- **Unified Interface**: Same interface for both OpenAI Realtime and LLM-agnostic
- **State Mapping**: Handles different state types between implementations

### 4. **API Endpoints**

#### Session Management
- **`/api/voice/llm-agnostic-session`**: Creates LLM-agnostic voice session
  - Determines provider based on model
  - Returns session configuration
  - Handles API key management

#### Audio Processing
- **`/api/voice/transcribe`**: Speech-to-Text conversion
  - Auto-selects OpenAI Whisper or Google STT
  - Handles WebM, WAV, and other audio formats
  - Language detection and configuration

- **`/api/voice/synthesize`**: Text-to-Speech conversion
  - Auto-selects OpenAI TTS or Google TTS
  - Voice mapping between providers
  - Consistent audio format output

#### AI Response Generation
- **`/api/voice/generate-response`**: LLM-agnostic response generation
  - Integrates with existing AgentRuntime
  - Supports all LLM providers (OpenAI, Gemini, etc.)
  - Handles voice-specific context and constraints

### 5. **Voice-Text Chat Continuity**
Voice conversations automatically appear in text chat:
- **Thread ID**: `voice_chat_{chatbotId}_{userId}`
- **Message Storage**: Uses existing Message model structure
- **Channel Indicator**: Messages marked with `from: 'voice'`
- **Seamless Switching**: Users can switch between voice and text mid-conversation

## Provider-Specific Configuration

### OpenAI Configuration
```javascript
{
  stt: 'openai',      // Whisper API
  llm: 'openai',      // Chat Completions API
  tts: 'openai',      // TTS API
  voice: 'alloy'      // OpenAI voice options
}
```

### Gemini Configuration
```javascript
{
  stt: 'google',      // Google Speech-to-Text
  llm: 'gemini',      // Gemini API
  tts: 'google',      // Google Text-to-Speech
  voice: 'en-US-Standard-A'  // Google voice mapping
}
```

## Voice Mapping System

The system maintains consistent voice experience across providers:

### OpenAI Voices → Google Voices
- `alloy` → `en-US-Standard-A`
- `echo` → `en-US-Standard-B`
- `fable` → `en-US-Standard-C`
- `onyx` → `en-US-Standard-D`
- `nova` → `en-US-Wavenet-A`
- `shimmer` → `en-US-Wavenet-B`

## Environment Variables

```bash
# Core API Keys
OPENAI_API_KEY=your_openai_key
GOOGLE_AI_API_KEY=your_google_key

# Voice Configuration
USE_LLM_AGNOSTIC_VOICE=true    # Force LLM-agnostic for all models
FORCE_LLM_AGNOSTIC=true        # Override all detection logic

# Database
DATABASE_URL=your_database_url
```

## Key Benefits

### 1. **Complete LLM Agnosticism**
- Works with any supported LLM provider
- No dependency on OpenAI Realtime API
- Easy to add new providers

### 2. **Voice-Text Continuity**
- Voice conversations appear in text chat
- Seamless mode switching
- Unified conversation history

### 3. **Consistent User Experience**
- Same voice quality across providers
- Unified interface and controls
- Automatic provider selection

### 4. **Scalable Architecture**
- Easy to add new STT/TTS providers
- Modular component design
- Provider-specific optimizations

### 5. **Backward Compatibility**
- Existing OpenAI Realtime implementation preserved
- Gradual migration support
- No breaking changes

## Audio Processing Pipeline

### Phone Calls (Twilio)
1. **Input**: G.711 μ-law audio chunks from Twilio WebSocket
2. **Conversion**: G.711 → WAV for STT processing
3. **Transcription**: OpenAI Whisper or Google STT
4. **AI Response**: AgentRuntime with selected LLM provider
5. **Synthesis**: OpenAI TTS or Google TTS
6. **Output**: WAV → G.711 μ-law for Twilio

### Browser (WebRTC)
1. **Input**: MediaRecorder captures WebM/Opus audio
2. **Voice Detection**: Audio level monitoring and silence detection
3. **Transcription**: Direct WebM to STT service
4. **AI Response**: AgentRuntime with selected LLM provider
5. **Synthesis**: TTS service returns MP3 audio
6. **Output**: HTML5 audio element playback

## Database Integration

Voice messages are stored in the existing Message table:
```sql
{
  message: "User's voice transcript",
  response: "Assistant's response",
  threadId: "voice_chat_{chatbotId}_{userId}",
  from: "voice",
  userId: "user_id",
  chatbotId: "chatbot_id"
}
```

## Error Handling & Fallbacks

### Service Availability
- Graceful fallback between STT/TTS providers
- Automatic retry logic for transient failures
- Comprehensive error logging

### Database Failures
- Voice continues working even if message saving fails
- Non-blocking database operations
- Error recovery mechanisms

### Audio Processing
- Format conversion error handling
- Silence detection timeout management
- Audio quality validation

## Testing & Validation

The implementation has been validated to:
- ✅ Compile successfully with TypeScript
- ✅ Handle both OpenAI and Gemini models
- ✅ Maintain voice-text chat continuity  
- ✅ Support both phone and browser voice
- ✅ Preserve existing functionality
- ✅ Provide unified user experience

## Migration Guide

### For Existing Chatbots
1. **OpenAI Models**: Continue using existing implementation or opt-in to LLM-agnostic
2. **Gemini Models**: Automatically use LLM-agnostic implementation
3. **Environment Flags**: Use `USE_LLM_AGNOSTIC_VOICE=true` to force migration

### For New Chatbots
- All new chatbots automatically use the appropriate implementation
- No additional configuration required
- Provider selection is transparent to users

## Future Enhancements

### Planned Features
- Additional STT/TTS provider support (Azure, AWS)
- Advanced voice activity detection
- Real-time audio streaming optimizations
- Enhanced voice quality metrics

### Extensibility
- Plugin architecture for new providers
- Custom voice model support
- Advanced audio processing features
- Multi-language voice optimization

## Conclusion

The LLM-agnostic voice implementation successfully removes OpenAI Realtime API dependency while maintaining all existing functionality and adding cross-provider compatibility. The system provides a seamless voice experience regardless of the underlying LLM provider, with automatic provider selection, voice-text continuity, and consistent user experience across all supported models. 
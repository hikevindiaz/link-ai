# LinkAI Voice Testing Guide

## Quick Validation Checklist

### ✅ Environment Setup
1. **API Keys Configured**:
   ```bash
   OPENAI_API_KEY=your_key
   GOOGLE_AI_API_KEY=your_key
   ```

2. **Voice Server Running**:
   ```bash
   cd voice-server
   npm start
   # Should show: "Voice server listening on port 3001"
   ```

3. **Main App Running**:
   ```bash
   npm run dev
   # Should compile without TypeScript errors
   ```

### ✅ Browser Voice Testing

#### Test OpenAI Models
1. Create/edit chatbot with OpenAI model (e.g., `gpt-4o-mini`)
2. Open voice chat interface
3. Check browser console for: `"Using OpenAI Realtime API implementation"`
4. Test voice conversation
5. Verify voice appears in text chat history

#### Test Gemini Models
1. Create/edit chatbot with Gemini model (e.g., `gemini-1.5-flash`)
2. Open voice chat interface  
3. Check browser console for: `"Using LLM-agnostic voice implementation"`
4. Test voice conversation
5. Verify voice appears in text chat history

#### Test Force LLM-Agnostic Mode
1. Set environment variable: `USE_LLM_AGNOSTIC_VOICE=true`
2. Test OpenAI model chatbot
3. Should use LLM-agnostic implementation despite being OpenAI model

### ✅ Phone Voice Testing (Twilio)

#### Test Call Routing
1. Make test call to Twilio number
2. Check voice server logs for handler selection:
   - Gemini models: `"Starting LLM-agnostic voice handler"`
   - OpenAI models: `"Starting Twilio WebSocket handler"` (default)
   - Force mode: `"Starting LLM-agnostic voice handler"` (all models)

#### Test Call Quality
1. **Audio Processing**: Clear audio input/output
2. **Response Time**: Reasonable latency for STT → LLM → TTS pipeline
3. **Conversation Flow**: Natural back-and-forth dialogue
4. **Error Handling**: Graceful handling of audio issues

### ✅ API Endpoint Testing

#### Session Creation
```bash
curl -X POST http://localhost:3000/api/voice/llm-agnostic-session \
  -H "Content-Type: application/json" \
  -d '{"chatbotId": "your_chatbot_id"}'
```
**Expected**: Session config with provider info

#### Transcription
```bash
curl -X POST http://localhost:3000/api/voice/transcribe \
  -F "audio=@test_audio.webm" \
  -F "chatbotId=your_chatbot_id"
```
**Expected**: `{"transcript": "transcribed text"}`

#### Response Generation
```bash
curl -X POST http://localhost:3000/api/voice/generate-response \
  -H "Content-Type: application/json" \
  -d '{"chatbotId": "your_chatbot_id", "message": "Hello"}'
```
**Expected**: `{"response": "AI response text"}`

#### Speech Synthesis
```bash
curl -X POST http://localhost:3000/api/voice/synthesize \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello world", "chatbotId": "your_chatbot_id"}' \
  --output test_audio.mp3
```
**Expected**: MP3 audio file

### ✅ Database Integration Testing

#### Voice Message Storage
1. Have voice conversation
2. Check database for messages:
   ```sql
   SELECT * FROM "Message" 
   WHERE "from" = 'voice' 
   AND "threadId" LIKE 'voice_chat_%'
   ORDER BY "createdAt" DESC;
   ```
3. Verify both user transcript and AI response are stored

#### Text Chat Continuity
1. Start voice conversation
2. Switch to text chat
3. Verify voice messages appear in chat history
4. Continue conversation in text
5. Switch back to voice - should maintain context

### ✅ Provider-Specific Testing

#### OpenAI Provider
- **STT**: Uses Whisper API
- **LLM**: Uses Chat Completions API  
- **TTS**: Uses OpenAI TTS API
- **Voice**: Maps to OpenAI voices (alloy, echo, etc.)

#### Gemini Provider
- **STT**: Uses Google Speech-to-Text
- **LLM**: Uses Gemini API
- **TTS**: Uses Google Text-to-Speech
- **Voice**: Maps to Google voices (en-US-Standard-A, etc.)

### ✅ Error Handling Testing

#### Network Issues
1. Temporarily disable internet
2. Test voice conversation
3. Verify graceful error handling
4. Check error messages in UI

#### API Key Issues
1. Set invalid API key
2. Test voice conversation
3. Verify fallback behavior
4. Check error logging

#### Audio Issues
1. Test with no microphone permission
2. Test with poor audio quality
3. Verify error handling and user feedback

## Common Issues & Solutions

### Issue: "No STT service available"
**Solution**: Check API keys are set correctly
```bash
echo $OPENAI_API_KEY
echo $GOOGLE_AI_API_KEY
```

### Issue: Voice not appearing in text chat
**Solution**: Check database connection and Message table structure

### Issue: Audio quality problems
**Solution**: 
- Check microphone permissions
- Verify audio format compatibility
- Test with different browsers

### Issue: High latency in voice responses
**Solution**:
- Check network connection
- Verify API endpoint response times
- Consider regional API endpoints

## Performance Benchmarks

### Expected Response Times
- **STT Processing**: < 2 seconds for 10-second audio
- **LLM Response**: < 3 seconds for typical queries  
- **TTS Synthesis**: < 2 seconds for 100-word response
- **Total Pipeline**: < 7 seconds end-to-end

### Audio Quality Metrics
- **Phone Calls**: G.711 μ-law, 8kHz sample rate
- **Browser**: WebM/Opus, 16kHz sample rate
- **TTS Output**: MP3, 24kHz sample rate

## Debugging Tips

### Browser Console Logs
Look for these key log messages:
- `"Determining voice implementation..."`
- `"Using [OpenAI Realtime API|LLM-agnostic] implementation"`
- `"[LLM-Agnostic WebRTC] Connection established"`
- `"[Voice STT] Transcribed audio"`
- `"[Voice AI] Generated response"`
- `"[Voice TTS] Synthesized audio"`

### Voice Server Logs
Monitor for:
- Handler selection logic
- Audio processing pipeline
- API call success/failure
- Database save operations

### Network Tab
Check API calls to:
- `/api/voice/llm-agnostic-session`
- `/api/voice/transcribe`
- `/api/voice/generate-response`
- `/api/voice/synthesize`

## Success Criteria

The implementation is working correctly when:

1. ✅ **Automatic Detection**: System automatically chooses correct implementation
2. ✅ **Cross-Provider Support**: Works with both OpenAI and Gemini models
3. ✅ **Voice Quality**: Clear audio input/output with reasonable latency
4. ✅ **Chat Continuity**: Voice conversations appear in text chat
5. ✅ **Error Handling**: Graceful handling of failures and edge cases
6. ✅ **Backward Compatibility**: Existing OpenAI voice functionality preserved
7. ✅ **Database Integration**: Voice messages properly stored and retrievable
8. ✅ **Multi-Channel**: Works for both browser and phone voice

## Next Steps

After successful testing:

1. **Production Deployment**: Deploy to production environment
2. **User Training**: Update documentation for end users
3. **Monitoring**: Set up monitoring for voice service health
4. **Optimization**: Fine-tune response times and audio quality
5. **Feature Enhancement**: Consider additional STT/TTS providers 
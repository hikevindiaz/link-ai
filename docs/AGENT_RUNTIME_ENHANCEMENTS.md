# Agent Runtime Enhancements: Improved Fallback Behavior

## Overview

The agent runtime has been enhanced to provide better fallback behavior when no knowledge base results are found. The goal is to ensure agents always provide helpful responses by using general knowledge, live search tools, or other available resources when the knowledge base doesn't contain relevant information.

## Key Changes

### 1. Enhanced System Prompt with Response Strategy Guidelines

**File**: `lib/agent-runtime/index.ts` - `buildSystemPrompt` method

Added comprehensive response strategy guidelines that instruct the agent on:
- **Knowledge Priority**: Clear hierarchy of knowledge sources (knowledge base → live search → general knowledge)
- **Response Approach**: Always provide helpful answers, never leave users without a response
- **Fallback Behavior**: Use general knowledge when knowledge base has no relevant content

```typescript
# Response Strategy Guidelines

## Knowledge Priority (in order):
1. **FIRST PRIORITY**: Use your knowledge base content (documents, Q&A, files, etc.) when available
2. **SECOND PRIORITY**: Use live search tools when configured and appropriate
3. **THIRD PRIORITY**: Use general knowledge for non-business questions or when no specific knowledge is available

## Response Approach:
- **ALWAYS provide a helpful answer** - never say "I don't know" without offering alternatives
- If knowledge base has no match: Use general knowledge and mention you can help with business-specific questions
- If live search is configured: Use it for current information when relevant
- Be natural and conversational while maintaining accuracy
```

### 2. Improved Vector Search Fallback Instructions

**File**: `lib/agent-runtime/supabase-vector-search.ts` - `formatVectorResultsForPrompt` function

Enhanced the formatting function to include explicit fallback instructions:

```typescript
- FALLBACK: If this knowledge base content doesn't answer the user's question, still provide a helpful response using general knowledge, and mention you can help with business-specific questions
```

### 3. Enhanced Processing Logic for No Vector Results

**File**: `lib/agent-runtime/index.ts` - `processMessages` method

Added explicit fallback instructions when no vector search results are found:

```typescript
if (vectorContext) {
  enhancedSystemPrompt = `${vectorContext}\n\n--- ORIGINAL SYSTEM PROMPT ---\n${this.config.prompt}`;
} else {
  // No vector context found - enhance with fallback instructions
  enhancedSystemPrompt = `${this.config.prompt}\n\n--- FALLBACK INSTRUCTIONS ---
  Since no specific knowledge base content was found for this query:
  1. Provide a helpful answer using general knowledge if appropriate
  2. For business-specific questions, mention what you can help with based on your knowledge base
  3. Use live search tools if configured and relevant to get current information
  4. Always be helpful and never leave the user without a response
  5. Maintain your personality and conversational style`;
}
```

### 4. Enhanced Google Search Tool Integration

**File**: `lib/agent-runtime/index.ts` - `buildSystemPrompt` method

Updated Google search tool instructions to:
- Emphasize its role as a fallback option
- Encourage proactive use when helpful
- Provide clear search strategy priorities

```typescript
## When to Search
- Users ask questions that match the configured website instructions
- Information might be time-sensitive or frequently updated
- The knowledge base doesn't contain the specific information needed
- Users explicitly ask for current/recent information
- **As a fallback when knowledge base has no relevant content**

## Search Strategy
- **Primary**: Use knowledge base content if available
- **Secondary**: Use google_search for current information when configured
- **Fallback**: Combine search results with general knowledge for comprehensive answers
```

### 5. User-Friendly Error Messages

**File**: `lib/agent-runtime/tools/google-search-tool.ts`

Made error messages more user-friendly and helpful:

```typescript
// Old error message
error: 'Web search is not configured for this agent. Please configure live search URLs first.'

// New error message
error: 'I don\'t have live search configured yet, but I can help you with general information or any business-specific questions from my knowledge base.'
fallback_suggestion: 'You can still ask me questions and I\'ll do my best to help with general knowledge or information from my knowledge base.'
```

## Benefits

1. **Always Helpful**: Agents never leave users without a response
2. **Intelligent Fallback**: Clear hierarchy of knowledge sources ensures optimal responses
3. **Proactive Search**: Agents are encouraged to use live search when appropriate
4. **Better User Experience**: User-friendly error messages that offer alternatives
5. **Flexible Response Strategy**: Agents can combine multiple knowledge sources appropriately

## Usage Examples

### Scenario 1: No Knowledge Base Match for General Question
**User**: "What's the weather like today?"
**Agent Response**: Uses general knowledge to explain they can't access current weather data, but offers to help with business-specific questions or suggests using live search if configured.

### Scenario 2: Business Question with No Knowledge Base Match
**User**: "What are your business hours?"
**Agent Response**: Uses general knowledge to provide a helpful response about typical business hours, mentions they can help with other business-specific questions, and suggests using live search if configured.

### Scenario 3: Current Information Request
**User**: "What's your latest news?"
**Agent Response**: Proactively uses Google search tool (if configured) to find current information, or falls back to general knowledge while mentioning available resources.

## Configuration Requirements

To take full advantage of these enhancements:

1. **Knowledge Base**: Ensure your knowledge base is populated with relevant content
2. **Live Search**: Configure live search URLs with proper instructions
3. **Google Search API**: Set up Google Programmable Search API credentials
4. **System Prompts**: Customize base prompts to align with your business needs

## Testing

The enhanced fallback behavior can be tested by:
1. Asking questions not covered by the knowledge base
2. Requesting current information when live search is configured
3. Testing with various question types (general, business-specific, current events)
4. Verifying user-friendly error messages when tools are not configured

## Future Enhancements

Potential future improvements could include:
- Intent classification for better routing to appropriate knowledge sources
- Confidence scoring for knowledge base matches
- Learning from user feedback to improve fallback responses
- Integration with additional external knowledge sources 
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AgentRuntime, ChannelContext, AgentMessage, MessageProcessingInput } from '@/lib/agent-runtime';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type, agentName, businessName, industry, currentPrompt, template } = await request.json();

    if (!type || !agentName) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Create a basic agent runtime - we'll use a default chatbot for prompt generation
    // In a real implementation, you might want to create a dedicated prompt generation agent
    let systemMessage = '';
    let userMessage = '';

    if (type === 'new') {
      // Generate a new prompt using business data
      systemMessage = `You are an expert prompt engineer. Create a comprehensive system prompt for an AI assistant.

Requirements:
- Use the provided template structure
- Be specific and actionable
- Avoid repetitive language
- Prevent thinking loops
- Make it direct and clear
- Focus on the business context provided

Template Structure:
# Identity
You are a {role}, an expert in {domain}.

# Goal
Your objective is to {what you want the model to achieve}.

# Context
Provide any background, previous conversation, or data the model needs.

# Task
Describe precisely what you want the model to do:
- Step 1: …
- Step 2: …
- …

# Constraints
- Must be no more than {X} words.
- Only use {style/tone}.
- Avoid {forbidden content}.

# Examples (optional)
Input: …
Output: …

# Output Format
Specify JSON schema, bullet list, prose, code block, etc.`;

      userMessage = `Create a system prompt for an AI assistant named "${agentName}" that works for a business in the ${industry} industry. 

Business Context:
- Business Name: ${businessName}
- Industry: ${industry}
- Agent Name: ${agentName}

Make it professional, helpful, and tailored to this specific business context. The prompt should guide the AI to be an expert assistant for this business type.`;

    } else if (type === 'improve') {
      // Improve existing prompt using the template
      systemMessage = `You are an expert prompt engineer. Improve the provided prompt by restructuring it using the template format.

Requirements:
- Maintain the original intent and context
- Apply the structured template format
- Make it more clear and actionable
- Remove any repetitive language
- Prevent thinking loops
- Ensure it's direct and specific

Target Template Format:
${template}`;

      userMessage = `Please improve this existing prompt by restructuring it using the template format:

Current Prompt:
${currentPrompt}

Restructure this prompt to be clearer, more organized, and follow the template structure while maintaining the original intent.`;
    }

    // Create messages for processing
    const messages: AgentMessage[] = [
      {
        id: 'system',
        role: 'system',
        content: systemMessage,
        type: 'text',
        timestamp: new Date()
      },
      {
        id: 'user',
        role: 'user',
        content: userMessage,
        type: 'text',
        timestamp: new Date()
      }
    ];

    // For prompt generation, we'll create a temporary runtime with a simple config
    // Since we don't have a specific chatbot for this, we'll use a basic implementation
    
    // Create a simple prompt generation response using OpenAI directly
    const openai = new (await import('openai')).OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const generatedPrompt = completion.choices[0]?.message?.content || 'Failed to generate prompt';

    return NextResponse.json({
      prompt: generatedPrompt,
      success: true
    });

  } catch (error) {
    console.error('Error generating prompt:', error);
    return NextResponse.json(
      { error: 'Failed to generate prompt' },
      { status: 500 }
    );
  }
} 
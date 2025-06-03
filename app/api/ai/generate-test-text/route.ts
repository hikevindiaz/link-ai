import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db as prisma } from '@/lib/db';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { voiceName, openaiVoice, language, description } = await request.json();
    
    // Fetch user's business information
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        companyName: true,
      }
    });
    
    // Determine business name to use
    const businessName = user?.companyName || null;
    
    const languageInstruction = language 
      ? `Write the text in ${language}. Use natural, native-speaker level ${language}.`
      : 'Write the text in English.';
    
    const businessContext = businessName 
      ? `The business name is "${businessName}". Include this business name naturally in the test text when appropriate (e.g., "Thank you for calling ${businessName}" or "Welcome to ${businessName}").`
      : 'No business name is available, so focus on general assistant greetings.';
    
    const prompt = `Generate test text for a custom voice called "${voiceName}" that uses OpenAI's "${openaiVoice}" voice${description ? ` with this personality: ${description}` : ''}. 

${languageInstruction}

${businessContext}

The test text should:
- Be 2-3 sentences long
- Showcase how the voice sounds in conversation
- Be natural and engaging
- Include a greeting and a helpful statement
- Match the voice's personality (if provided)
- Be appropriate for testing voice quality and characteristics
${businessName ? `- Naturally incorporate the business name "${businessName}" when relevant` : ''}

Examples of good test text:
${businessName ? `- "Thank you for calling ${businessName}! I'm your virtual assistant, ready to help you with any questions you might have. How can I make your day better?"` : ''}
- "Hello! I'm your virtual assistant, ready to help you with any questions you might have. How can I make your day better?"
- "Greetings! I'm here to assist you with professional expertise and friendly guidance. What would you like to accomplish today?"
- "Hi there! I'm excited to help you discover new possibilities and find the answers you're looking for. Let's get started!"

Generate something unique and fitting for this specific voice${businessName ? ` that includes the business name "${businessName}"` : ''}.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that generates appropriate test text for voice testing. The text should be natural, engaging, and showcase the voice characteristics well.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 200,
    });
    
    const testText = response.choices[0]?.message?.content?.trim();
    
    if (!testText) {
      throw new Error('Failed to generate test text');
    }
    
    // Remove quotes if the AI wrapped the text in them
    const cleanedText = testText.replace(/^["']|["']$/g, '');
    
    return NextResponse.json({ testText: cleanedText });
    
  } catch (error) {
    console.error('Error generating test text:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ 
      error: 'Failed to generate test text',
      details: errorMessage 
    }, { status: 500 });
  }
} 
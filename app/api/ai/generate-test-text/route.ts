import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { voiceName, voiceDescription, language, gender } = await request.json();

    if (!voiceName) {
      return NextResponse.json({ error: 'Voice name is required' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    // Create a prompt based on voice characteristics
    const languageText = language?.includes('Spanish') ? 'Spanish' : 'English';
    const genderContext = gender === 'male' ? 'masculine' : gender === 'female' ? 'feminine' : 'neutral';
    
    const prompt = `Generate a brief, professional customer service opening text (1-2 sentences) for a voice assistant named "${voiceName}". 

Voice characteristics:
- Description: ${voiceDescription || 'Professional voice'}
- Language: ${languageText}
- Gender: ${genderContext}

The text should be:
- Warm and welcoming
- Professional but friendly
- Suitable for customer service
- ${languageText === 'Spanish' ? 'Written in Spanish' : 'Written in English'}
- Brief (maximum 20 words)

Examples of good openings:
- "Hello! I'm Sarah, your AI assistant. How can I help you today?"
- "Hi there! This is Alex from customer support. What can I do for you?"

Just return the opening text, nothing else.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that generates professional customer service opening texts. Always respond with just the opening text, no quotes or additional formatting."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 50,
      temperature: 0.7,
    });

    const generatedText = completion.choices[0]?.message?.content?.trim();

    if (!generatedText) {
      return NextResponse.json({ error: 'Failed to generate text' }, { status: 500 });
    }

    return NextResponse.json({ 
      text: generatedText,
      voiceName,
      language: languageText
    });

  } catch (error) {
    console.error('Error generating test text:', error);
    return NextResponse.json({ 
      error: 'Failed to generate text',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
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
    
    const { voiceName, openaiVoice, language, template } = await request.json();
    
    let prompt = `Generate a professional voice description for a custom voice named "${voiceName}" using the OpenAI ${openaiVoice} base voice.`;
    
    if (language) {
      prompt += ` The voice should be optimized for ${language} language.`;
    }
    
    if (template) {
      prompt += `\n\nUse this template as inspiration but create something unique and different:\n`;
      prompt += `Template: ${template.name}\n`;
      prompt += `${template.description}\n`;
      prompt += `\nCreate a similar but unique voice description that follows this exact format structure.`;
    }
    
    prompt += `\n\nGenerate the description using this exact format:

Voice: [Base voice characteristics and primary qualities]
Tone: [Emotional quality, attitude, and overall feeling]
Dialect: [Accent, regional speech patterns, or linguistic style]  
Pronunciation: [Clarity, emphasis, articulation, and rhythm]
Features: [Unique characteristics, personality traits, and special qualities]

Make each line specific and descriptive. Keep each section concise but informative.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a voice design expert who creates detailed, professional voice descriptions for text-to-speech systems. Always follow the exact format requested: Voice, Tone, Dialect, Pronunciation, Features. Be specific and creative while maintaining professionalism.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const description = completion.choices[0]?.message?.content?.trim();
    
    if (!description) {
      throw new Error('Failed to generate voice description');
    }

    return NextResponse.json({ description });
  } catch (error) {
    console.error('Error generating voice description:', error);
    return NextResponse.json(
      { error: 'Failed to generate voice description' },
      { status: 500 }
    );
  }
} 
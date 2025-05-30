import ChatbotButton from '@/components/chatbot-button';
import { db } from '@/lib/db';
import { notFound } from 'next/navigation';

export interface ChatComponentProps {
  params: { id: string };
}

export default async function Button({ params }: ChatComponentProps) {
  /*
    <iframe src="http://localhost:3000/embed/cm3g1y5sr0001ctepual1zhpv/window"
  style="overflow: hidden; height: 80vh; border: 0 none; width: 480px; bottom: -30px;" allowfullscreen
  ></iframe>
   */

  const chatbot = await db.chatbot.findUnique({
    where: {
      id: params.id
    }
  });

  if (!chatbot) {
    return notFound();
  }

  // Get border gradient colors from the chatbot or use default
  const borderGradientColors = (chatbot as any).borderGradientColors || 
    ["#4F46E5", "#4338CA", "#6366F1"]; // Default to Indigo
    
  return (
    <ChatbotButton 
      textColor={chatbot?.bubbleTextColor} 
      backgroundColor={chatbot?.bubbleColor}
      borderGradientColors={borderGradientColors}
      useRiveOrb={true}
      riveOrbColor={(chatbot as any)?.riveOrbColor ?? 0} // Default to black (0)
    />
  )
}
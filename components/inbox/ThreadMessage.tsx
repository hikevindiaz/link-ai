import { User as UserIcon } from "lucide-react";
import Image from 'next/image';

interface ThreadMessageProps {
  isUser: boolean;
  content: string;
  avatar?: string;
}

// Regex to find image URLs
const imageUrlRegex = /(https?:\/\/\S+\.(?:png|jpe?g|gif|webp|bmp))/gi;

// Helper function to render content with images
const renderContentWithImages = (text: string) => {
  if (!text) return null;
  
  const parts = text.split(imageUrlRegex);
  
  return parts.map((part, index) => {
    // Check if the part is an image URL
    if (imageUrlRegex.test(part)) {
      // It's an image URL
      return (
        <Image 
          key={index} 
          src={part} 
          alt="Inline image content" 
          width={300} // Provide initial width
          height={200} // Provide initial height
          className="rounded-md my-2 max-w-xs h-auto object-contain block" // Added block display
        />
      );
    } else {
      // It's a text part, replace potential markdown link syntax around the already split URL
      const cleanedPart = part.replace(/!\\\[.*?\\\]\\(|\\)/g, '');
      // Render text part (only if it's not just whitespace from splitting)
      return cleanedPart.trim() ? <span key={index}>{cleanedPart}</span> : null; 
    }
  }).filter(Boolean); // Filter out any null parts (like empty strings)
};

export function ThreadMessage({ isUser, content, avatar }: ThreadMessageProps) {
  if (isUser) {
    // User message bubble (can also render images if needed, though unlikely)
    return (
      <div className="flex items-end justify-end space-x-2">
        <div className="bg-black dark:bg-gray-800 text-white px-4 py-2 text-sm rounded-tl-lg rounded-tr-lg rounded-bl-lg rounded-br-none max-w-md break-words">
          {renderContentWithImages(content)}
        </div>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black dark:bg-gray-800 text-white text-xs">
          <UserIcon className="h-4 w-4" />
        </span>
      </div>
    );
  }
  
  // Agent message bubble
  return (
    <div className="flex items-start justify-start space-x-2">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-200 text-gray-800 dark:text-gray-800 text-xs font-medium">
        {avatar}
      </span>
      <div className="bg-gray-100 dark:bg-gray-100 text-gray-900 dark:text-gray-900 px-4 py-2 text-sm rounded-tl-none rounded-tr-lg rounded-br-lg rounded-bl-lg max-w-md break-words">
        {renderContentWithImages(content)}
      </div>
    </div>
  );
} 
import { User as UserIcon } from "lucide-react";
import Image from 'next/image';

interface ThreadMessageProps {
  isUser: boolean;
  content: string;
  avatar?: string;
}

// Regex to find direct image URLs
const imageUrlRegex = /(https?:\/\/\S+\.(?:png|jpe?g|gif|webp|bmp))/gi;

// Regex to find markdown-style image syntax: ![alt text](image-url)
// Updated to handle cases where there's content between the URL and closing parenthesis
const markdownImageRegex = /!\[(.*?)\]\((https?:\/\/\S+\.(?:png|jpe?g|gif|webp|bmp))(.*?)\)/gi;

// Regex to find URLs that should be converted to links
const urlRegex = /(?<![![])(https?:\/\/[^\s)]+)/g;

// Regex to find bold text (** or __ delimited)
const boldRegex = /(\*\*|__)(.*?)\1/g;

// Regex to find italic text (* or _ delimited, but not ** or __)
const italicRegex = /(?<!\*)(\*|_)(?!\*)([^*_]+?)\1(?!\*)/g;

// Helper function to render content with formatting
const renderContentWithFormatting = (text: string) => {
  if (!text) return null;
  
  // Extract and process markdown-style images
  let processedText = text;
  const markdownImages: {alt: string; url: string; fullMatch: string; index: number}[] = [];
  
  // Find all markdown image patterns
  let markdownMatch;
  markdownImageRegex.lastIndex = 0; // Reset regex state
  while ((markdownMatch = markdownImageRegex.exec(text)) !== null) {
    markdownImages.push({
      alt: markdownMatch[1],
      url: markdownMatch[2],
      fullMatch: markdownMatch[0],
      index: markdownMatch.index
    });
  }
  
  // Sort markdown images by their position in the text
  markdownImages.sort((a, b) => a.index - b.index);
  
  // Replace markdown images with placeholders
  markdownImages.forEach((image, idx) => {
    processedText = processedText.replace(image.fullMatch, `⚡IMAGE_${idx}_PLACEHOLDER⚡`);
  });
  
  // Clean up any stray closing parentheses that might appear after placeholders
  processedText = processedText.replace(/⚡IMAGE_\d+_PLACEHOLDER⚡\s*\)/g, match => match.replace(')', ''));
  
  // Now split by remaining direct image URLs
  const parts = processedText.split(imageUrlRegex);
  
  // Process each part
  const renderedContent = parts.map((part, index) => {
    // Check if this part is a direct image URL
    if (imageUrlRegex.test(part)) {
      // It's a direct image URL
      return (
        <Image 
          key={`img-${index}`} 
          src={part} 
          alt="Inline image content" 
          width={300}
          height={200}
          className="rounded-xl my-2 max-w-xs h-auto object-contain block"
        />
      );
    } else {
      // It's a text part - process for markdown images and other formatting
      let textContent = part;
      
      // Process line breaks, bold text, and hyperlinks in the text content
      if (!textContent.trim()) return null;
      
      // Look for placeholders and split text accordingly
      const segments: React.ReactNode[] = [];
      const placeholderRegex = /⚡IMAGE_(\d+)_PLACEHOLDER⚡/g;
      let lastIndex = 0;
      let placeholderMatch;
      
      placeholderRegex.lastIndex = 0;
      while ((placeholderMatch = placeholderRegex.exec(textContent)) !== null) {
        // Add text before the placeholder
        if (placeholderMatch.index > lastIndex) {
          const textSegment = textContent.substring(lastIndex, placeholderMatch.index);
          segments.push(formatTextSegment(textSegment));
        }
        
        // Add the image that corresponds to this placeholder
        const imageIndex = parseInt(placeholderMatch[1], 10);
        if (markdownImages[imageIndex]) {
          segments.push(
            <Image 
              key={`mdimg-${imageIndex}`} 
              src={markdownImages[imageIndex].url} 
              alt={markdownImages[imageIndex].alt || "Image"} 
              width={300}
              height={200}
              className="rounded-xl my-2 max-w-xs h-auto object-contain block"
            />
          );
        }
        
        lastIndex = placeholderMatch.index + placeholderMatch[0].length;
      }
      
      // Add any remaining text after the last placeholder
      if (lastIndex < textContent.length) {
        const textSegment = textContent.substring(lastIndex);
        segments.push(formatTextSegment(textSegment));
      }
      
      // If no placeholders were found, format the entire text content
      if (segments.length === 0) {
        segments.push(formatTextSegment(textContent));
      }
      
      return <span key={`part-${index}`}>{segments}</span>;
    }
  }).filter(Boolean); // Filter out any null parts
  
  return renderedContent;
};

// Helper function to format a segment of text with bold, line breaks, and links
const formatTextSegment = (text: string) => {
  // First handle hyperlinks
  const processedText = text.replace(urlRegex, (url) => `⚡LINK_${url}_LINK⚡`);
  
  // Process line breaks and styled text
  const formattedSegment = processedText
    // Split by newlines
    .split('\n')
    .map((line, i) => {
      // Process bold and italic text
      const segments: React.ReactNode[] = [];
      let lastIndex = 0;
      
      // Find all formatting segments (bold and italic) in the line
      const allMatches: Array<{type: 'bold' | 'italic', match: RegExpExecArray}> = [];
      
      // Reset regex states
      boldRegex.lastIndex = 0;
      italicRegex.lastIndex = 0;
      
      // Find all bold segments
      let boldMatch;
      while ((boldMatch = boldRegex.exec(line)) !== null) {
        allMatches.push({type: 'bold', match: boldMatch});
      }
      
      // Find all italic segments
      let italicMatch;
      while ((italicMatch = italicRegex.exec(line)) !== null) {
        allMatches.push({type: 'italic', match: italicMatch});
      }
      
      // Sort matches by position
      allMatches.sort((a, b) => a.match.index - b.match.index);
      
      // Process each match
      allMatches.forEach((matchObj, idx) => {
        const match = matchObj.match;
        
        // Add text before this segment
        if (match.index > lastIndex) {
          segments.push(
            <span key={`${i}-${lastIndex}`}>
              {processLinks(line.substring(lastIndex, match.index))}
            </span>
          );
        }
        
        // Add the formatted segment
        if (matchObj.type === 'bold') {
        segments.push(
          <strong key={`${i}-bold-${match.index}`}>
            {processLinks(match[2])}
          </strong>
        );
        } else {
          segments.push(
            <em key={`${i}-italic-${match.index}`}>
              {processLinks(match[2])}
            </em>
          );
        }
        
        // Update lastIndex to after this match
        lastIndex = match.index + match[0].length;
      });
      
      // Add any remaining text after the last formatted segment
      if (lastIndex < line.length) {
        segments.push(
          <span key={`${i}-${lastIndex}`}>
            {processLinks(line.substring(lastIndex))}
          </span>
        );
      }
      
      // If no formatted segments were found, just return the line with links processed
      return segments.length > 0 ? segments : processLinks(line);
    })
    // Join lines with <br> tags
    .reduce((result: React.ReactNode[], line, i, array) => {
      result.push(line);
      if (i < array.length - 1) {
        result.push(<br key={`br-${i}`} />);
      }
      return result;
    }, [] as React.ReactNode[]);
  
  return <span>{formattedSegment}</span>;
};

// Helper function to convert URL placeholders to actual link elements
const processLinks = (text: string) => {
  const linkRegex = /⚡LINK_(.*?)_LINK⚡/g;
  const parts = text.split(linkRegex);
  
  if (parts.length === 1) return text;
  
  return parts.map((part, i) => {
    // Every odd index is a URL
    if (i % 2 === 1) {
      return (
        <a 
          key={`link-${i}`} 
          href={part} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-neutral-600 dark:text-neutral-400 underline"
        >
          {part}
        </a>
      );
    }
    return part;
  });
};

export function ThreadMessage({ isUser, content, avatar }: ThreadMessageProps) {
  if (isUser) {
    // User message bubble (can also render images if needed, though unlikely)
    return (
      <div className="flex items-end justify-end space-x-2">
        <div className="bg-black dark:bg-white text-white dark:text-black px-4 py-2 text-sm rounded-tl-lg rounded-tr-lg rounded-bl-lg rounded-br-none max-w-md break-words">
          {renderContentWithFormatting(content)}
        </div>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black dark:bg-white text-white dark:text-black text-xs">
          <UserIcon className="h-4 w-4" />
        </span>
      </div>
    );
  }
  
  // Agent message bubble
  return (
    <div className="flex items-start justify-start space-x-2">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-medium">
        {avatar}
      </span>
      <div className="bg-card-light dark:bg-card-dark text-neutral-700 dark:text-neutral-200 px-4 py-2 text-sm rounded-tl-none rounded-tr-lg rounded-br-lg rounded-bl-lg max-w-md break-words">
        {renderContentWithFormatting(content)}
      </div>
    </div>
  );
} 
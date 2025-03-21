import OpenAI from "openai";
import { processTextToFile } from "./openai";

/**
 * Processes text content with chunking for better retrieval
 * This helps with handling large documents by breaking them into
 * smaller, semantically meaningful chunks
 */
export async function processTextWithChunking(
  openai: OpenAI,
  content: string,
  fileName: string,
  chunkSize: number = 1500,
  overlap: number = 200
): Promise<string[]> {
  try {
    // Split the content into paragraphs
    const paragraphs = content.split(/\n\s*\n/);
    
    // Initialize chunks
    const chunks: string[] = [];
    let currentChunk = "";
    
    // Process paragraphs into chunks
    for (const paragraph of paragraphs) {
      // If adding this paragraph would exceed the chunk size,
      // save the current chunk and start a new one
      if (currentChunk.length + paragraph.length > chunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk);
        
        // Start a new chunk with overlap from the previous chunk
        const words = currentChunk.split(/\s+/);
        const overlapText = words.slice(-Math.floor(overlap / 5)).join(" ");
        currentChunk = overlapText + "\n\n" + paragraph;
      } else {
        // Add the paragraph to the current chunk
        if (currentChunk.length > 0) {
          currentChunk += "\n\n";
        }
        currentChunk += paragraph;
      }
    }
    
    // Add the last chunk if it's not empty
    if (currentChunk.length > 0) {
      chunks.push(currentChunk);
    }
    
    // Upload each chunk as a separate file
    const fileIds: string[] = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const chunkFileName = `${fileName.replace(/\.[^/.]+$/, "")}_chunk_${i + 1}.txt`;
      const fileId = await processTextToFile(openai, chunks[i], chunkFileName);
      fileIds.push(fileId);
    }
    
    return fileIds;
  } catch (error) {
    console.error("Error processing text with chunking:", error);
    throw error;
  }
}

/**
 * Creates a table of contents for a knowledge source
 * This helps with navigation and provides a high-level overview
 */
export async function createTableOfContents(
  openai: OpenAI,
  sections: Array<{
    title: string;
    content: string;
  }>,
  fileName: string
): Promise<string> {
  try {
    let tocContent = "# Table of Contents\n\n";
    
    // Add each section to the TOC
    sections.forEach((section, index) => {
      tocContent += `${index + 1}. ${section.title}\n`;
      
      // Extract subsections (assuming they start with ##)
      const subsections = section.content.match(/##\s+(.+)/g);
      
      if (subsections) {
        subsections.forEach((subsection, subIndex) => {
          const title = subsection.replace(/##\s+/, "").trim();
          tocContent += `   ${index + 1}.${subIndex + 1}. ${title}\n`;
        });
      }
      
      tocContent += "\n";
    });
    
    // Add a summary of the content
    tocContent += "\n## Content Summary\n\n";
    tocContent += "This knowledge source contains information about:\n\n";
    
    sections.forEach((section) => {
      tocContent += `- ${section.title}\n`;
    });
    
    // Upload the TOC as a file
    return await processTextToFile(openai, tocContent, fileName);
  } catch (error) {
    console.error("Error creating table of contents:", error);
    throw error;
  }
}

/**
 * Optimizes content for retrieval by adding metadata and keywords
 */
export async function optimizeForRetrieval(
  openai: OpenAI,
  content: string,
  fileName: string
): Promise<string> {
  try {
    // Extract potential keywords from the content
    const keywords = extractKeywords(content);
    
    // Add metadata to the content
    let optimizedContent = "---\n";
    optimizedContent += `title: ${fileName}\n`;
    optimizedContent += `keywords: ${keywords.join(", ")}\n`;
    optimizedContent += `date: ${new Date().toISOString()}\n`;
    optimizedContent += "---\n\n";
    
    // Add the original content
    optimizedContent += content;
    
    // Add a keyword section at the end for better retrieval
    optimizedContent += "\n\n## Keywords\n\n";
    optimizedContent += keywords.join(", ");
    
    // Upload the optimized content as a file
    return await processTextToFile(openai, optimizedContent, fileName);
  } catch (error) {
    console.error("Error optimizing content for retrieval:", error);
    throw error;
  }
}

/**
 * Extract potential keywords from content
 * This is a simple implementation that could be improved with NLP
 */
function extractKeywords(content: string): string[] {
  // Remove common words and punctuation
  const cleanedContent = content
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ");
  
  // Split into words
  const words = cleanedContent.split(" ");
  
  // Count word frequency
  const wordCounts = new Map<string, number>();
  
  for (const word of words) {
    if (word.length < 3) continue; // Skip short words
    
    const count = wordCounts.get(word) || 0;
    wordCounts.set(word, count + 1);
  }
  
  // Sort by frequency
  const sortedWords = Array.from(wordCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word);
  
  // Return top 20 keywords
  return sortedWords.slice(0, 20);
}

/**
 * Creates a cross-reference index for multiple knowledge sources
 */
export async function createCrossReferenceIndex(
  openai: OpenAI,
  sources: Array<{
    id: string;
    name: string;
    content: string;
  }>,
  fileName: string
): Promise<string> {
  try {
    let indexContent = "# Cross-Reference Index\n\n";
    
    // Extract keywords from each source
    const sourceKeywords = sources.map(source => ({
      id: source.id,
      name: source.name,
      keywords: extractKeywords(source.content),
    }));
    
    // Create a map of keywords to sources
    const keywordMap = new Map<string, Array<{ id: string; name: string }>>();
    
    for (const source of sourceKeywords) {
      for (const keyword of source.keywords) {
        const sources = keywordMap.get(keyword) || [];
        sources.push({ id: source.id, name: source.name });
        keywordMap.set(keyword, sources);
      }
    }
    
    // Sort keywords by the number of sources they appear in
    const sortedKeywords = Array.from(keywordMap.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .map(([keyword, sources]) => ({
        keyword,
        sources,
      }));
    
    // Add each keyword and its sources to the index
    for (const { keyword, sources } of sortedKeywords) {
      indexContent += `## ${keyword}\n\n`;
      
      for (const source of sources) {
        indexContent += `- ${source.name}\n`;
      }
      
      indexContent += "\n";
    }
    
    // Upload the index as a file
    return await processTextToFile(openai, indexContent, fileName);
  } catch (error) {
    console.error("Error creating cross-reference index:", error);
    throw error;
  }
} 
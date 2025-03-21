import OpenAI from "openai";
import { processTextToFile, uploadFileToOpenAI } from "./openai";

/**
 * Processes a text content item into a format suitable for OpenAI
 */
export async function processTextContent(
  openai: OpenAI,
  content: string,
  fileName: string
): Promise<string> {
  return await processTextToFile(openai, content, fileName);
}

/**
 * Processes a QA pair into a markdown format
 */
export function formatQAPair(question: string, answer: string): string {
  return `## Question\n${question}\n\n### Answer\n${answer}\n\n---\n\n`;
}

/**
 * Processes multiple QA pairs into a single markdown document
 */
export async function processQAPairs(
  openai: OpenAI,
  qaPairs: Array<{ question: string; answer: string }>,
  fileName: string
): Promise<string> {
  let content = "# Knowledge Base Q&A\n\n";
  
  qaPairs.forEach((qa) => {
    content += formatQAPair(qa.question, qa.answer);
  });
  
  return await processTextToFile(openai, content, fileName);
}

/**
 * Processes a website URL into a format suitable for OpenAI
 * In a real implementation, this would scrape the website content
 */
export async function processWebsiteUrl(
  openai: OpenAI,
  url: string,
  fileName: string
): Promise<string> {
  const content = `# Website Content\n\nURL: ${url}\n\nPlease refer to this website for information.`;
  return await processTextToFile(openai, content, fileName);
}

/**
 * Processes a catalog of products into a markdown format
 */
export async function processCatalog(
  openai: OpenAI,
  catalog: {
    instructions?: string;
    products: Array<{
      title: string;
      description?: string;
      price: number;
      taxRate: number;
      categories?: string[];
    }>;
  },
  fileName: string
): Promise<string> {
  let content = `# Product Catalog\n\n`;
  
  if (catalog.instructions) {
    content += `## Instructions\n${catalog.instructions}\n\n`;
  }
  
  content += `## Products\n\n`;
  
  catalog.products.forEach((product) => {
    content += `### ${product.title}\n`;
    if (product.description) {
      content += `${product.description}\n\n`;
    }
    content += `- Price: $${product.price.toFixed(2)}\n`;
    content += `- Tax Rate: ${(product.taxRate * 100).toFixed(2)}%\n`;
    
    if (product.categories && product.categories.length > 0) {
      content += `- Categories: ${product.categories.join(', ')}\n`;
    }
    
    content += `\n`;
  });
  
  return await processTextToFile(openai, content, fileName);
}

/**
 * Combines multiple knowledge sources into a single context document
 */
export async function combineKnowledgeSources(
  openai: OpenAI,
  sources: Array<{
    type: 'text' | 'qa' | 'website' | 'catalog';
    content: any;
  }>,
  fileName: string
): Promise<string> {
  let combinedContent = `# Combined Knowledge Base\n\n`;
  
  for (const source of sources) {
    switch (source.type) {
      case 'text':
        combinedContent += `## Text Content\n\n${source.content}\n\n---\n\n`;
        break;
      case 'qa':
        combinedContent += `## Q&A Content\n\n`;
        source.content.forEach((qa: { question: string; answer: string }) => {
          combinedContent += formatQAPair(qa.question, qa.answer);
        });
        combinedContent += `\n---\n\n`;
        break;
      case 'website':
        combinedContent += `## Website Content\n\nURL: ${source.content.url}\n\n---\n\n`;
        break;
      case 'catalog':
        combinedContent += `## Catalog Content\n\n`;
        if (source.content.instructions) {
          combinedContent += `### Instructions\n${source.content.instructions}\n\n`;
        }
        source.content.products.forEach((product: any) => {
          combinedContent += `### ${product.title}\n`;
          if (product.description) {
            combinedContent += `${product.description}\n\n`;
          }
          combinedContent += `- Price: $${product.price.toFixed(2)}\n`;
          combinedContent += `- Tax Rate: ${(product.taxRate * 100).toFixed(2)}%\n`;
          
          if (product.categories && product.categories.length > 0) {
            combinedContent += `- Categories: ${product.categories.join(', ')}\n`;
          }
          
          combinedContent += `\n`;
        });
        combinedContent += `\n---\n\n`;
        break;
    }
  }
  
  return await processTextToFile(openai, combinedContent, fileName);
} 
/**
 * ContentLayer Proxy Module
 * 
 * This module provides a proxy for ContentLayer exports to prevent build failures
 * when ContentLayer isn't properly available. It attempts to import the real
 * ContentLayer data but falls back to empty arrays if that fails.
 */

// Define the fallback content structure
export interface ContentDocument {
  _id: string;
  _raw: {
    sourceFilePath: string;
    sourceFileName: string;
    sourceFileDir: string;
    contentType: string;
    flattenedPath: string;
  };
  type: string;
  slug: string;
  slugAsParams: string;
  title: string;
  description?: string;
  date?: string;
  published?: boolean;
  [key: string]: any;
}

// Create minimal fallback data
const fallbackDocuments = {
  allPosts: [] as ContentDocument[],
  allDocs: [] as ContentDocument[],
  allGuides: [] as ContentDocument[],
  allPages: [] as ContentDocument[],
  allAuthors: [] as ContentDocument[]
};

// Try to import the real ContentLayer data
let contentLayerImported = false;
let contentLayerData = { ...fallbackDocuments };

// Only attempt to import in client-side code
if (typeof window !== 'undefined') {
  try {
    // Using dynamic import to avoid build-time errors
    import('contentlayer/generated')
      .then((imported) => {
        // Safely extract only the array collections
        if (imported) {
          if (Array.isArray(imported.allDocs)) contentLayerData.allDocs = imported.allDocs;
          if (Array.isArray(imported.allPosts)) contentLayerData.allPosts = imported.allPosts;
          if (Array.isArray(imported.allGuides)) contentLayerData.allGuides = imported.allGuides;
          if (Array.isArray(imported.allPages)) contentLayerData.allPages = imported.allPages;
          if (Array.isArray(imported.allAuthors)) contentLayerData.allAuthors = imported.allAuthors;
        }
        contentLayerImported = true;
        console.log('ContentLayer data imported successfully');
      })
      .catch((error) => {
        console.warn('Failed to import ContentLayer data:', error);
      });
  } catch (error) {
    console.warn('Error setting up ContentLayer import:', error);
  }
}

// Helper functions to get specific content by slug
export function getDoc(slug: string): ContentDocument | null {
  const docs = contentLayerData.allDocs || fallbackDocuments.allDocs;
  return docs.find((doc) => doc.slug === slug || doc.slugAsParams === slug) || null;
}

export function getPost(slug: string): ContentDocument | null {
  const posts = contentLayerData.allPosts || fallbackDocuments.allPosts;
  return posts.find((post) => post.slug === slug || post.slugAsParams === slug) || null;
}

export function getGuide(slug: string): ContentDocument | null {
  const guides = contentLayerData.allGuides || fallbackDocuments.allGuides;
  return guides.find((guide) => guide.slug === slug || guide.slugAsParams === slug) || null;
}

export function getPage(slug: string): ContentDocument | null {
  const pages = contentLayerData.allPages || fallbackDocuments.allPages;
  return pages.find((page) => page.slug === slug || page.slugAsParams === slug) || null;
}

export function getAuthor(slug: string): ContentDocument | null {
  const authors = contentLayerData.allAuthors || fallbackDocuments.allAuthors;
  return authors.find((author) => author.slug === slug || author.slugAsParams === slug) || null;
}

// Export the content collections
export const allDocs = contentLayerData.allDocs;
export const allPosts = contentLayerData.allPosts;
export const allGuides = contentLayerData.allGuides;
export const allPages = contentLayerData.allPages;
export const allAuthors = contentLayerData.allAuthors; 
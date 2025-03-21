/**
 * ContentLayer Compatibility Layer
 * 
 * This file provides fallback exports for ContentLayer's generated content
 * in case ContentLayer fails to build or import properly in production.
 */

// Check if we should use the real ContentLayer or fallbacks
const useRealContentLayer = !process.env.NEXT_PUBLIC_DISABLE_CONTENTLAYER;

// Try to import from ContentLayer, fall back to empty arrays if it fails
let allPosts: any[] = [];
let allPages: any[] = [];
let allDocs: any[] = [];

// Only try to import from ContentLayer if we're using it
if (useRealContentLayer) {
  try {
    // Dynamic import to prevent build-time errors
    import('contentlayer/generated')
      .then((imported) => {
        allPosts = imported.allPosts || [];
        allPages = imported.allPages || [];
        allDocs = imported.allDocs || [];
      })
      .catch(() => {
        console.warn('Failed to import from ContentLayer, using fallbacks');
      });
  } catch (error) {
    console.warn('Failed to import from ContentLayer, using fallbacks', error);
  }
}

// Export the ContentLayer data (either real or fallback)
export { allPosts, allPages, allDocs };

// Helper functions
export function getPost(slug: string) {
  return allPosts.find((post) => post.slug === slug) || null;
}

export function getPage(slug: string) {
  return allPages.find((page) => page.slug === slug) || null;
}

export function getDoc(slug: string) {
  return allDocs.find((doc) => doc.slug === slug) || null;
} 
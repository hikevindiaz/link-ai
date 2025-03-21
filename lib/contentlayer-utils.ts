// This file provides utility functions for ContentLayer data

// Set up exports
export let allDocs = [];
export let allGuides = [];

// Import the real data
try {
  const contentlayer = require('contentlayer/generated');
  
  // Update the exports with real data
  Object.assign(exports, {
    allDocs: contentlayer.allDocs,
    allGuides: contentlayer.allGuides,
  });
} catch (error) {
  console.warn('ContentLayer data not available:', error);
}

// Helper function to get doc by slug
export function getDocBySlug(slug: string[]) {
  if (!allDocs.length) return null;
  // Implementation would go here
  return null;
}

// Helper function to get guide by slug
export function getGuideBySlug(slug: string[]) {
  if (!allGuides.length) return null;
  // Implementation would go here
  return null;
} 
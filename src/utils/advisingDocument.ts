import { ADVISING_CONFIG } from '../config/advisingConfig';

/**
 * Cache for the advising document content to avoid repeated file reads
 */
let advisingDocumentCache: string | null = null;

/**
 * Loads the content of the most recent advising document
 * @returns Promise<string> - The content of the advising document
 */
export async function loadAdvisingDocument(): Promise<string> {
  // Return cached content if available
  if (advisingDocumentCache !== null) {
    return advisingDocumentCache;
  }

  try {
    // Fetch the advising document as a static asset
    const response = await fetch(ADVISING_CONFIG.ADVISING_DOC_PATH);
    if (!response.ok) {
      throw new Error(`Failed to fetch advising document: ${response.status}`);
    }
    
    const content = await response.text();
    
    // Cache the content for future use
    advisingDocumentCache = content;
    
    return content;
  } catch (error) {
    console.error('Error loading advising document:', error);
    // Return empty string if document cannot be loaded
    return '';
  }
}

/**
 * Clears the advising document cache (useful for testing or when document is updated)
 */
export function clearAdvisingDocumentCache(): void {
  advisingDocumentCache = null;
}

/**
 * Formats the advising document content for inclusion in prompts
 * @param content - The raw content of the advising document
 * @returns Formatted string ready for prompt inclusion
 */
export function formatAdvisingDocumentForPrompt(content: string): string {
  if (!content.trim()) {
    return '';
  }

  return `\n\n=== OFFICIAL PHILOSOPHY DEPARTMENT ADVISING DOCUMENT (Ground Truth) ===\n` +
         `The following is the official Cal Poly Philosophy Department advising document. ` +
         `This document contains authoritative information about program requirements, policies, ` +
         `and procedures. Use this as the primary source of truth for Philosophy department questions.\n\n` +
         `${content}\n` +
         `=== END ADVISING DOCUMENT ===\n\n`;
}
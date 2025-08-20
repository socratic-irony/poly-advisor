import { decodeBase64 } from './decodeBase64';

/**
 * Maximum size of email content to parse (in bytes).
 * Large payloads are returned unmodified to avoid memory issues.
 */
const MAX_PAYLOAD_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * Parse .eml file content and extract readable text.
 * Decodes base64 sections and removes MIME artifacts.
 */

export function parseEmlFile(content: string): { content: string; tooLarge: boolean } {
  if (content.length > MAX_PAYLOAD_SIZE) {
    console.warn('EML payload too large, skipping parse');
    return { content, tooLarge: true };
  }
  try {
    // Work with a copy of the original content
    let cleanContent = content;

    // Extract headers (From, To, Subject, Date)
    const headerRegex = /^(From|To|Subject|Date|CC|BCC):\s*(.*)$/gim;
    const headers: string[] = [];
    let match;

    while ((match = headerRegex.exec(content)) !== null) {
      headers.push(`${match[1]}: ${match[2].trim()}`);
    }

    // Decode base64 sections if present
    const base64Regex =
      /Content-Transfer-Encoding:\s*base64\s*(?:\r?\n)+([A-Za-z0-9+/=\r\n]{8,})(?=\r?\n(?:--|[A-Za-z0-9-]+:)|$)/gi;
    const replaced = cleanContent.replace(base64Regex, (_m, b64, offset) => {
      const decoded = decodeBase64(b64);
      if (decoded === b64) {
        console.warn(`Failed to decode base64 section near index ${offset}`);
      }
      return decoded;
    });
    cleanContent = replaced;

    // Find the main content after decoding headers
    const bodyStart = cleanContent.search(/\n\r?\n/);
    if (bodyStart !== -1) {
      cleanContent = cleanContent.substring(bodyStart);
    }

    // Fallback: entire content might be base64 without headers
    const stripped = cleanContent.trim();
    if (
      /^[A-Za-z0-9+/=\r\n]+$/.test(stripped) &&
      stripped.length % 4 === 0 &&
      stripped.length >= 12
    ) {
      const decoded = decodeBase64(stripped);
      const printableRatio = decoded.replace(/[^\x20-\x7E]/g, '').length / decoded.length;
      if (decoded !== stripped && printableRatio > 0.8) {
        cleanContent = decoded;
      }
    }

    // Remove MIME boundaries
    cleanContent = cleanContent.replace(/--[A-Za-z0-9_-]+/g, '');

    // Remove Content-Type and other MIME headers
    cleanContent = cleanContent.replace(/^Content-Type:.*$/gim, '');
    cleanContent = cleanContent.replace(
      /^Content-Transfer-Encoding:.*$/gim,
      '',
    );
    cleanContent = cleanContent.replace(/^Content-Disposition:.*$/gim, '');

    // Remove quoted-printable encoding artifacts
    cleanContent = cleanContent.replace(/=\r?\n/g, '');
    cleanContent = cleanContent.replace(/=[0-9A-F]{2}/g, (match) => {
      const hex = match.substring(1);
      return String.fromCharCode(parseInt(hex, 16));
    });

    // Clean up whitespace
    cleanContent = cleanContent.replace(/\r\n/g, '\n');
    cleanContent = cleanContent.replace(/\n\s*\n\s*\n+/g, '\n\n');
    cleanContent = cleanContent.trim();

    // Combine headers with content
    const result =
      headers.length > 0
        ? headers.join('\n') + '\n\n' + cleanContent
        : cleanContent;

    return { content: result || content, tooLarge: false }; // Fallback to original content if parsing fails
  } catch (error) {
    console.warn('Failed to parse EML file:', error);
    return { content, tooLarge: false }; // Return original content if parsing fails
  }
}

/**
 * Read file as text
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === 'string') {
        resolve(result);
      } else {
        reject(new Error('Failed to read file as text'));
      }
    };
    reader.onerror = () => reject(new Error('File reading failed'));
    reader.readAsText(file);
  });
}

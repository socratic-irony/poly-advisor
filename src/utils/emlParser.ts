/**
 * Parse .eml file content and extract readable text
 */
export function parseEmlFile(content: string): string {
  try {
    // Remove MIME boundaries and headers
    let cleanContent = content;
    
    // Extract headers (From, To, Subject, Date)
    const headerRegex = /^(From|To|Subject|Date|CC|BCC):\s*(.*)$/gim;
    const headers: string[] = [];
    let match;
    
    while ((match = headerRegex.exec(content)) !== null) {
      headers.push(`${match[1]}: ${match[2].trim()}`);
    }
    
    // Find the main content (usually after headers and blank line)
    // Look for common email body patterns
    const bodyStart = content.search(/\n\r?\n/);
    if (bodyStart !== -1) {
      cleanContent = content.substring(bodyStart);
    }
    
    // Remove MIME boundaries
    cleanContent = cleanContent.replace(/--[A-Za-z0-9_-]+/g, '');
    
    // Remove Content-Type and other MIME headers
    cleanContent = cleanContent.replace(/^Content-Type:.*$/gim, '');
    cleanContent = cleanContent.replace(/^Content-Transfer-Encoding:.*$/gim, '');
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
    const result = headers.length > 0 
      ? headers.join('\n') + '\n\n' + cleanContent
      : cleanContent;
    
    return result || content; // Fallback to original content if parsing fails
  } catch (error) {
    console.warn('Failed to parse EML file:', error);
    return content; // Return original content if parsing fails
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
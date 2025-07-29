import { describe, it, expect } from 'vitest';
import { parseEmlFile, readFileAsText } from '../utils/emlParser';

describe('EML Parser', () => {
  describe('parseEmlFile', () => {
    it('should extract headers and content from a simple email', () => {
      const emlContent = `From: sender@example.com
To: recipient@example.com
Subject: Test Email
Date: Mon, 29 Jul 2024 10:30:00 -0700

This is the email body content.
It can span multiple lines.`;

      const result = parseEmlFile(emlContent);
      
      expect(result).toContain('From: sender@example.com');
      expect(result).toContain('To: recipient@example.com');
      expect(result).toContain('Subject: Test Email');
      expect(result).toContain('Date: Mon, 29 Jul 2024 10:30:00 -0700');
      expect(result).toContain('This is the email body content.');
      expect(result).toContain('It can span multiple lines.');
    });

    it('should handle emails with MIME boundaries', () => {
      const emlContent = `From: sender@example.com
To: recipient@example.com
Subject: MIME Email
Content-Type: multipart/alternative; boundary="----boundary123"

------boundary123
Content-Type: text/plain

Plain text content here.

------boundary123
Content-Type: text/html

<p>HTML content here.</p>

------boundary123--`;

      const result = parseEmlFile(emlContent);
      
      expect(result).toContain('From: sender@example.com');
      expect(result).toContain('Plain text content here.');
      expect(result).not.toContain('------boundary123');
      expect(result).not.toContain('Content-Type:');
    });

    it('should handle quoted-printable encoding', () => {
      const emlContent = `From: sender@example.com
Subject: Encoded Email

This is a line with quoted=3Dprintable encoding.
This continues=
 on the next line.`;

      const result = parseEmlFile(emlContent);
      
      expect(result).toContain('This is a line with quoted=printable encoding.');
      expect(result).toContain('This continues on the next line.');
    });

    it('should return original content if parsing fails', () => {
      const malformedContent = 'Not a valid email format';
      
      const result = parseEmlFile(malformedContent);
      
      expect(result).toBe(malformedContent);
    });

    it('should handle empty content', () => {
      const result = parseEmlFile('');
      
      expect(result).toBe('');
    });
  });

  describe('readFileAsText', () => {
    it('should read file content as text', async () => {
      // Create a mock File object
      const fileContent = 'Test file content';
      const blob = new Blob([fileContent], { type: 'message/rfc822' });
      const file = new File([blob], 'test.eml', { type: 'message/rfc822' });

      const result = await readFileAsText(file);
      
      expect(result).toBe(fileContent);
    });

    it('should handle file reading errors', async () => {
      // Create a mock File object that will cause an error
      const file = {} as File; // Invalid file object
      
      await expect(readFileAsText(file)).rejects.toThrow();
    });
  });
});
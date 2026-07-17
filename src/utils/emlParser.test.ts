import { describe, it, expect, vi } from 'vitest';
import { parseEmlFile, readFileAsText } from '../utils/emlParser';
import { decodeBase64 } from './decodeBase64';

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
Content-Type: multipart/alternative; boundary='----boundary123'

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

      expect(result).toContain(
        'This is a line with quoted=printable encoding.',
      );
      expect(result).toContain('This continues on the next line.');
    });

    it('should decode base64 encoded content', () => {
      const emlContent = `From: sender@example.com
Subject: Base64 Email
Content-Type: text/plain; charset='UTF-8'
Content-Transfer-Encoding: base64

VGhpcyBpcyBhIHRlc3QgZW1haWwu`;

      const result = parseEmlFile(emlContent);

      expect(result).toContain('From: sender@example.com');
      expect(result).toContain('Subject: Base64 Email');
      expect(result).toContain('This is a test email.');
    });

    it('should decode wrapped base64 lines', () => {
      const emlContent = `From: sender@example.com
Subject: Wrapped
Content-Type: text/plain; charset='UTF-8'
Content-Transfer-Encoding: base64

VGhpcyBpcyBhIGxvbmdlciBsaW5lIG9mIHRleHQgdGhhdCB3aWxs
IGJlIGJhc2U2NCBlbmNvZGVkIHRvIHRlc3QgbGluZSBicmVha3Mu`;

      const result = parseEmlFile(emlContent);

      expect(result).toContain('Wrapped');
      expect(result).toContain('longer line of text');
    });

    it('should decode base64 without header', () => {
      const emlContent = `From: sender@example.com
Subject: No Header

aGVsbG8gd29ybGQ=`;

      const result = parseEmlFile(emlContent);

      expect(result).toContain('hello world');
    });

    it('should decode multiple base64 parts', () => {
      const emlContent = `From: sender@example.com
Subject: Multipart Base64
Content-Type: multipart/alternative; boundary="b"

--b
Content-Type: text/plain; charset='UTF-8'
Content-Transfer-Encoding: base64

SGVsbG8gdGV4dA==
--b
Content-Type: text/html; charset='UTF-8'
Content-Transfer-Encoding: base64

PGI+SGVsbG8gdGV4dDwvYj4=
--b--`;

      const result = parseEmlFile(emlContent);

      expect(result).toContain('Hello text');
      expect(result).not.toContain('--b');
    });

    it('handles mixed quoted-printable and base64 parts', () => {
      const emlContent = `Content-Type: multipart/mixed; boundary="z"\n\n--z\nContent-Type: text/plain; charset='UTF-8'\nContent-Transfer-Encoding: quoted-printable\n\nTest=3Dline\n--z\nContent-Type: text/html; charset='UTF-8'\nContent-Transfer-Encoding: base64\n\nPGI+VGVzdDwvYj4=\n--z--`;
      const result = parseEmlFile(emlContent);
      expect(result).toContain('Test=line');
      expect(result).toContain('<b>Test</b>');
    });

    it('does not decode plain text that only looks like base64', () => {
      const content = 'hello world';
      expect(parseEmlFile(content)).toBe(content);
    });

    it('logs a warning on invalid base64', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const content = `Content-Transfer-Encoding: base64\nYW55IGNhcm5hbCBwbGVhcw`;
      parseEmlFile(content);
      expect(warn).toHaveBeenCalled();
      warn.mockRestore();
    });

    it('skips parsing when payload exceeds limit', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const big = 'A'.repeat(5 * 1024 * 1024 + 10);
      expect(parseEmlFile(big)).toBe(big);
      expect(warn).toHaveBeenCalledWith('EML payload too large, skipping parse');
      warn.mockRestore();
    });

    it('handles CRLF line breaks and quoted boundaries', () => {
      const emlContent =
        "Content-Type: multipart/alternative; boundary=\"x\"\r\n\r\n--x\r\nContent-Transfer-Encoding: base64\r\n\r\nSGVsbG8=\r\n--x--";
      const result = parseEmlFile(emlContent);
      expect(result).toContain('Hello');
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

  describe('decodeBase64', () => {
    it('uses Buffer path in Node', () => {
      const spy = vi.spyOn(Buffer, 'from');
      decodeBase64('aGVsbG8=');
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('falls back to atob when Buffer missing', () => {
      const spy = vi.spyOn(globalThis, 'atob');
      const original = globalThis.Buffer;
      // @ts-ignore
      globalThis.Buffer = undefined;
      decodeBase64('aGVsbG8=');
      expect(spy).toHaveBeenCalled();
      globalThis.Buffer = original;
      spy.mockRestore();
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

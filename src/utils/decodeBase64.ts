/**
 * Decode a base64 string in both Node and browser environments.
 * Falls back to atob when Buffer is unavailable.
 * @param b64 - base64 encoded text
 * @returns UTF-8 decoded string or original value on failure
 */
export function decodeBase64(b64: string): string {
  const nodeSupported = typeof Buffer !== 'undefined' && typeof Buffer.from === 'function';
  const decoder = nodeSupported
    ? (val: string) => Buffer.from(val, 'base64').toString('utf-8')
    : (val: string) => decodeURIComponent(escape(atob(val)));
  const normalized = b64.replace(/[\r\n]+/g, '');
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(normalized) || normalized.length % 4 !== 0) {
    console.warn('base64 decode failed: invalid input');
    return b64;
  }
  try {
    return decoder(normalized);
  } catch (error) {
    console.warn('base64 decode failed', error);
    return b64;
  }
}

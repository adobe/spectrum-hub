/*
 * Pure JWT decoding. No signature verification here: the caller
 * (handlers/auth.js) proves a token is genuine by handing it to IMS
 * itself and checking IMS accepts it, rather than checking a signature
 * locally. Decoding is still useful once that happens - the payload is
 * where created_at/expires_in live. No Request, Response, fetch, or
 * platform bindings, so this runs unchanged on Workers, Lambda, and I/O
 * Runtime.
 */

const base64urlToBase64 = (value) => {
  const padLength = (4 - (value.length % 4)) % 4;
  return value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(padLength);
};

const base64urlDecode = (value) => {
  const binary = atob(base64urlToBase64(value));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) { bytes[i] = binary.charCodeAt(i); }
  return bytes;
};

const decodeSegment = (segment) => JSON.parse(new TextDecoder().decode(base64urlDecode(segment)));

// Splits a JWT and parses its header/payload. Does not touch the
// signature segment - nothing here verifies it, so there is nothing to
// decode it for. A malformed segment (bad base64url, non-JSON, wrong
// segment count) is "not a JWT", not a throw.
export const decodeJwt = (token) => {
  if (typeof token !== 'string') { return null; }
  const parts = token.split('.');
  if (parts.length !== 3) { return null; }
  const [headerPart, payloadPart] = parts;
  try {
    return { header: decodeSegment(headerPart), payload: decodeSegment(payloadPart) };
  } catch {
    return null;
  }
};

/*
 * Pure JWT decoding and signature verification. Given an already-fetched
 * JWK it needs no network access - no Request, Response, fetch, or
 * platform bindings - so it runs unchanged on Workers, Lambda, and I/O
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

// Splits a JWT into its parsed header/payload and the exact bytes RS256
// signs over, without verifying anything yet. A malformed segment (bad
// base64url, non-JSON, wrong segment count) is "not a JWT", not a throw.
export const decodeJwt = (token) => {
  if (typeof token !== 'string') { return null; }
  const parts = token.split('.');
  if (parts.length !== 3) { return null; }
  const [headerPart, payloadPart, signaturePart] = parts;
  try {
    return {
      header: decodeSegment(headerPart),
      payload: decodeSegment(payloadPart),
      signingInput: `${headerPart}.${payloadPart}`,
      signature: base64urlDecode(signaturePart),
    };
  } catch {
    return null;
  }
};

// IMS signs access tokens RS256. Rejecting anything else outright avoids
// ever importing a key under an algorithm it wasn't issued for.
export const verifyJwt = async (decoded, jwk) => {
  if (!decoded || decoded.header?.alg !== 'RS256' || jwk?.kty !== 'RSA') { return false; }
  const key = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  );
  return crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    decoded.signature,
    new TextEncoder().encode(decoded.signingInput),
  );
};

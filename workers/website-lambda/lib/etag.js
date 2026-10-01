/*
 * Gated ETags: validators for responses the Lambda filters for anonymous
 * visitors (pages and the query index). No Request/Response here.
 *
 * A conditional request (If-None-Match) forwarded to AEM is answered with a
 * bodiless 304 when the AEM content is unchanged - so the gate never sees the
 * body, and whatever copy the client already holds is kept. That is only safe
 * when the client's copy was itself produced by the current gate. So the Lambda
 * issues its own tags, `<AEM tag>` + GATE_ETAG_SUFFIX, and only a tag carrying
 * the current suffix is forwarded upstream (with the suffix removed). Anything
 * else - AEM's raw tag on a copy cached before the gate existed, a tag from an
 * older gate version, `*` - is dropped, so AEM returns a full body that the
 * gate checks again.
 *
 * Bump GATE_ETAG_VERSION whenever the gating or filtering logic changes
 * (lib/gate.js isPrivateHtml, lib/audience.js, lib/query-index.js): every
 * cached copy then fails revalidation and is re-fetched and re-filtered, with
 * no CloudFront invalidation needed.
 */

export const GATE_ETAG_VERSION = 2;
export const GATE_ETAG_SUFFIX = `--gate-v${GATE_ETAG_VERSION}`;

const ENTITY_TAG = /^(W\/)?"([^"]*)"$/;
const ENTITY_TAGS = /(W\/)?"([^"]*)"/g;

// The tag the Lambda issues for a gated response whose AEM tag is `etag`, or
// null when `etag` is not a well-formed entity tag (the caller then drops it).
export const toGatedEtag = (etag) => {
  const match = typeof etag === 'string' ? etag.trim().match(ENTITY_TAG) : null;
  if (!match) { return null; }
  const [, weak = '', opaque] = match;
  return `${weak}"${opaque}${GATE_ETAG_SUFFIX}"`;
};

// The If-None-Match value to send upstream for a client's If-None-Match header:
// only tags this gate version issued, with the suffix removed so AEM can compare
// them. Returns null when none qualify, meaning send no If-None-Match at all.
export const toUpstreamIfNoneMatch = (header) => {
  if (typeof header !== 'string') { return null; }
  const tags = [];
  for (const [, weak = '', opaque] of header.matchAll(ENTITY_TAGS)) {
    if (opaque.endsWith(GATE_ETAG_SUFFIX) && opaque.length > GATE_ETAG_SUFFIX.length) {
      tags.push(`${weak}"${opaque.slice(0, -GATE_ETAG_SUFFIX.length)}"`);
    }
  }
  return tags.length ? tags.join(', ') : null;
};

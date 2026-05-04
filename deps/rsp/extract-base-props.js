/**
 * Extracts shared base type properties from React Aria and @react-types/shared
 * and writes them to data/rsp-base-props.json.
 *
 * @react-types/shared: all interfaces auto-discovered via the unpkg ?meta API.
 * react-aria: specific files listed manually in REACT_ARIA_FILES — add entries
 * as new component categories are registered in components.json.
 *
 * Runs daily via GitHub Actions before extract-props.js.
 * Output is committed and consumed by extract-props.js.
 *
 * Usage: node deps/rsp/extract-base-props.js
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_FILE = join(__dirname, 'data', 'rsp-base-props.json');

const SHARED_TYPES_META = 'https://unpkg.com/@react-types/shared/src/?meta';
const SHARED_TYPES_BASE = 'https://unpkg.com/@react-types/shared';

// Add a URL here when a new component category surfaces untracked react-aria types.
const REACT_ARIA_FILES = [
  'https://unpkg.com/react-aria/dist/types/src/button/useButton.d.ts',
];

// Returns all exported interface names from a TypeScript source string.
// Used to extract every interface in a file without knowing names in advance.
function findInterfaceNames(source) {
  return [...source.matchAll(/export\s+interface\s+(\w+)/g)].map((m) => m[1]);
}

// Bracket-counting extraction — same rationale as in extract-props.js: interface bodies
// can contain nested object types that would cause a simple closing-brace regex to close too early.
function extractInterfaceBlock(source, interfaceName) {
  const startRegex = new RegExp(
    `(?:export\\s+)?(?:interface|type)\\s+${interfaceName}[^{]*\\{`,
  );
  const startMatch = startRegex.exec(source);
  if (!startMatch) return null;

  let depth = 1;
  let i = startMatch.index + startMatch[0].length;
  const start = i;

  while (i < source.length && depth > 0) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') depth--;
    i++;
  }

  return source.slice(start, i - 1);
}

// Identical to parseJSDoc in extract-props.js — kept local to avoid a shared module
// dependency between two scripts that run independently.
function parseJSDoc(comment) {
  const result = { description: '', default: null };
  if (!comment) return result;

  const cleaned = comment.replace(/^\/\*\*/, '').replace(/\*\/$/, '');
  const lines = cleaned
    .split('\n')
    .map((l) => l.replace(/^\s*\*\s?/, '').trim())
    .filter(Boolean);

  const descLines = [];
  for (const line of lines) {
    if (line.startsWith('@')) break;
    descLines.push(line);
  }
  result.description = descLines.join(' ').trim();

  const defaultMatch = comment.match(/@default\s+([^\n*]+)/);
  if (defaultMatch) result.default = defaultMatch[1].trim();

  return result;
}

// Same single-line regex parser and JSDoc fix as in extract-props.js. See that file for
// a full list of known limitations (multi-line unions, generics, function signatures).
function parseProps(block) {
  const props = [];
  const lines = block.split('\n');

  let jsdocLines = [];
  let inJSDoc = false;

  for (const raw of lines) {
    const line = raw.trim();

    // Single-line JSDoc must close inJSDoc on the same iteration to avoid absorbing
    // the next line (the property declaration) into jsdocLines.
    if (line.startsWith('/**')) {
      inJSDoc = true;
      jsdocLines = [line];

      if (line.includes('*/')) inJSDoc = false; continue;
    }
    if (inJSDoc) {
      jsdocLines.push(line);

      if (line.includes('*/')) inJSDoc = false; continue;
    }

    const propMatch = line.match(/^(?:readonly\s+)?(\w+|'[^']+'|\[[^\]]+\])(\??):\s*(.+?);?\s*$/);
    if (propMatch) {
      const [, name, optional, type] = propMatch;
      const { description, default: defaultVal } = parseJSDoc(jsdocLines.join('\n'));

      const prop = { property: name, type: type.trim().replace(/,$/, '') };
      if (optional !== '?') prop.required = true;
      if (defaultVal) prop.default = defaultVal;
      if (description) prop.description = description;

      props.push(prop);
    }

    if (line && !line.startsWith('//')) jsdocLines = [];
  }

  return props;
}

// Tries unpkg first, then falls back to jsdelivr. A single CDN blip would otherwise
// produce an empty rsp-base-props.json, silently wiping all inherited props on the next run.
async function fetchSource(url) {
  const urls = [
    url,
    url.replace('https://unpkg.com/', 'https://cdn.jsdelivr.net/npm/'),
  ];
  for (const cdnUrl of urls) {
    try {
      const res = await fetch(cdnUrl);
      if (res.ok) return res.text();
    } catch { /* try next CDN */ }
  }
  throw new Error(`Failed to fetch ${url} from all CDNs`);
}

// Extracts all exported interfaces from a source file and merges non-empty ones into result.
// Interfaces with 0 parsed props are skipped — they're typically re-export stubs or
// interfaces whose props use patterns the regex parser can't handle (see parseProps limits).
function extractAllFromSource(source, fileLabel, result) {
  const names = findInterfaceNames(source);
  let count = 0;
  for (const name of names) {
    const block = extractInterfaceBlock(source, name);
    if (!block) continue;
    const props = parseProps(block);
    if (props.length > 0) {
      result[name] = props;
      count++;
    }
  }
  return count;
}

async function main() {
  mkdirSync(join(__dirname, 'data'), { recursive: true });

  const result = {};

  // --- @react-types/shared: auto-discover all files via ?meta ---
  console.log('Discovering @react-types/shared files...');
  let metaRes;
  try {
    metaRes = await fetchSource(SHARED_TYPES_META);
  } catch (err) {
    console.warn(`  Warning: could not fetch @react-types/shared metadata — ${err.message}`);
  }

  if (metaRes) {
    const meta = JSON.parse(metaRes);
    // index.d.ts re-exports everything but declares nothing — parsing it would find no interfaces.
    const files = meta.files.filter((f) => f.path.endsWith('.d.ts') && !f.path.endsWith('index.d.ts'));
    console.log(`  Found ${files.length} files`);

    await Promise.all(files.map(async (f) => {
      const url = `${SHARED_TYPES_BASE}${f.path}`;
      try {
        const source = await fetchSource(url);
        const count = extractAllFromSource(source, f.path, result);
        if (count > 0) console.log(`  ${f.path}: ${count} interface(s)`);
      } catch (err) {
        console.warn(`  Warning: ${err.message}`);
      }
    }));
  }

  // --- react-aria: manual file list, auto-extract all interfaces ---
  console.log('Extracting react-aria base types...');
  await Promise.all(REACT_ARIA_FILES.map(async (url) => {
    try {
      const source = await fetchSource(url);
      const count = extractAllFromSource(source, url, result);
      console.log(`  ${url.split('/').slice(-2).join('/')}: ${count} interface(s)`);
    } catch (err) {
      console.warn(`  Warning: ${err.message}`);
    }
  }));

  writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2) + '\n');
  console.log(`Done. Wrote ${Object.keys(result).length} base type(s) to rsp-base-props.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

/**
 * Extracts shared base type properties from React Aria and @react-types/shared
 * and writes them to data/rsp-base-props.json.
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

const BASE_SOURCES = {
  AriaBaseButtonProps: {
    url: 'https://unpkg.com/react-aria/dist/types/src/button/useButton.d.ts',
    interface: 'AriaBaseButtonProps',
  },
  ButtonProps: {
    url: 'https://unpkg.com/react-aria/dist/types/src/button/useButton.d.ts',
    interface: 'ButtonProps',
  },
  StyleProps: {
    url: 'https://unpkg.com/@react-types/shared/src/style.d.ts',
    interface: 'StyleProps',
  },
  PressEvents: {
    url: 'https://unpkg.com/@react-types/shared/src/events.d.ts',
    interface: 'PressEvents',
  },
};

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

function parseProps(block) {
  const props = [];
  const lines = block.split('\n');

  let jsdocLines = [];
  let inJSDoc = false;

  for (const raw of lines) {
    const line = raw.trim();

    if (line.startsWith('/**')) { inJSDoc = true; jsdocLines = [line]; continue; }
    if (inJSDoc) { jsdocLines.push(line); if (line.includes('*/')) inJSDoc = false; continue; }

    const propMatch = line.match(/^(?:readonly\s+)?(\w+|'[^']+'|\[[^\]]+\])(\??):\s*(.+?);?\s*$/);
    if (propMatch) {
      const [, name, optional, type] = propMatch;
      const { description, default: defaultVal } = parseJSDoc(jsdocLines.join('\n'));

      const prop = { property: name, type: type.trim() };
      if (optional !== '?') prop.required = true;
      if (defaultVal) prop.default = defaultVal;
      if (description) prop.description = description;

      props.push(prop);
    }

    if (line && !line.startsWith('//')) jsdocLines = [];
  }

  return props;
}

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

async function main() {
  mkdirSync(join(__dirname, 'data'), { recursive: true });

  const result = {};
  const cache = {};

  for (const [name, { url, interface: interfaceName }] of Object.entries(BASE_SOURCES)) {
    console.log(`Fetching ${name} from ${url}...`);

    if (!cache[url]) {
      try {
        cache[url] = await fetchSource(url);
      } catch (err) {
        console.warn(`  Warning: ${err.message}`);
        continue;
      }
    }

    const block = extractInterfaceBlock(cache[url], interfaceName);
    if (!block) { console.warn(`  Warning: ${interfaceName} not found`); continue; }

    result[name] = parseProps(block);
    console.log(`  Extracted ${result[name].length} properties`);
  }

  writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2) + '\n');
  console.log(`Done. Wrote ${Object.keys(result).length} base type(s) to rsp-base-props.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

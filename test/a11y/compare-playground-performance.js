import { readFileSync } from 'node:fs';

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function summarize(result) {
  if (!result.sourceRevision || result.runs?.length !== 5) {
    throw new Error('Benchmark artifacts require a source revision and exactly five measured runs.');
  }
  return {
    requests: median(result.runs.map((run) => run.totals.requests)),
    encodedDataLength: median(result.runs.map((run) => run.totals.encodedDataLength)),
    firstPreviewMounted: median(result.runs.map((run) => run.marks.firstPreviewMounted)),
  };
}

export function compare(before, after) {
  const baseline = summarize(before);
  const candidate = summarize(after);
  const timingLimit = baseline.firstPreviewMounted * 1.05;
  if (candidate.requests >= baseline.requests) {
    throw new Error(`Request median did not decrease: ${baseline.requests} -> ${candidate.requests}`);
  }
  if (candidate.encodedDataLength >= baseline.encodedDataLength) {
    throw new Error(`Encoded-byte median did not decrease: ${baseline.encodedDataLength} -> ${candidate.encodedDataLength}`);
  }
  if (candidate.firstPreviewMounted > timingLimit) {
    throw new Error(
      `First-preview median regressed beyond 5%: ${baseline.firstPreviewMounted} -> ${candidate.firstPreviewMounted}`,
    );
  }
  return { before: baseline, after: candidate };
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const [, , beforePath, afterPath] = process.argv;
  if (!beforePath || !afterPath) {
    throw new Error('Usage: node compare-playground-performance.js <before.json> <after.json>');
  }
  const result = compare(
    JSON.parse(readFileSync(beforePath, 'utf8')),
    JSON.parse(readFileSync(afterPath, 'utf8')),
  );
  console.log(JSON.stringify(result, null, 2));
}

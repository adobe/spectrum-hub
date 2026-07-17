// No single published "all styles" bundle exists — a composed sub-component
// (e.g. ActionButton -> ProgressCircle) ships its own CSS file. So this loads
// every CSS file the package ships, given its real file listing.
export function resolveStylesheetHrefs(pkgName, pkgVersion, exportName, packageFiles) {
  const base = `https://esm.sh/${pkgName}@${pkgVersion}`;

  if (!packageFiles?.length) {
    // Listing unavailable — fall back to just the requested component's own CSS.
    return [`${base}/page.css`, `${base}/dist/private/${exportName}.css`];
  }

  const cssPaths = [...new Set(packageFiles.filter((path) => path.endsWith('.css')))];
  cssPaths.sort((a, b) => {
    if (a === '/page.css') { return -1; }
    if (b === '/page.css') { return 1; }
    return 0;
  });

  return cssPaths.map((path) => `${base}${path}`);
}

export const RSP_RUNTIME_SOURCE_CONFIG = Object.freeze({
  s2: Object.freeze({
    packageName: '@react-spectrum/s2',
    metadataUrl: 'https://esm.sh/@react-spectrum/s2/package.json',
    listingUrl: 'https://data.jsdelivr.com/v1/package/npm/@react-spectrum/s2@{version}/flat',
    pageStyles: Object.freeze(['/page.css']),
    externalModules: Object.freeze({
      ImageIllustration: Object.freeze({
        specifier: '@react-spectrum/s2/illustrations/gradient/generic1/Image',
        entryPath: '/illustrations/gradient/generic1/Image.mjs',
        exportName: 'default',
      }),
    }),
    canaries: Object.freeze({
      ActionButton: Object.freeze(['/dist/private/ProgressCircle.css']),
    }),
  }),
  ai: Object.freeze({
    packageName: '@react-spectrum/ai',
    metadataUrl: 'https://esm.sh/@react-spectrum/ai/package.json',
    listingUrl: 'https://data.jsdelivr.com/v1/package/npm/@react-spectrum/ai@{version}/flat',
    pageStyles: Object.freeze([]),
    externalModules: Object.freeze({}),
    canaries: Object.freeze({}),
  }),
});

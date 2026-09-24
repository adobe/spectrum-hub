import { PLAYGROUND_RUNTIME_SOURCES } from '../../scripts/utils/implementations.js';

export const RSP_RUNTIME_SOURCE_CONFIG = Object.freeze({
  s2: Object.freeze({
    ...PLAYGROUND_RUNTIME_SOURCES.s2,
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
});

/**
 * Source of truth for the web implementations the platform surfaces expose.
 *
 * Adding a new web implementation is intended to be a single edit here — every
 * block that lists or links implementations (picker, sitenav, related resources,
 * status table, implementation cards) imports from this file.
 *
 * For the data-extracted implementations, `id` matches both the directory under
 * `deps/` (e.g. `rsp` → `deps/rsp/`) and the source key in status-model.js, so the
 * mapping from an implementation to its data source stays obvious. `design-only`
 * has no extraction directory or status-model source — it's Figma-only.
 */

export const PLAYGROUND_RUNTIME_SOURCES = Object.freeze({
  s2: Object.freeze({
    packageName: '@react-spectrum/s2',
    metadataUrl: 'https://esm.sh/@react-spectrum/s2/package.json',
    listingUrl: 'https://data.jsdelivr.com/v1/package/npm/@react-spectrum/s2@{version}/flat',
    externalModules: Object.freeze({
      ImageIllustration: Object.freeze({
        specifier: '@react-spectrum/s2/illustrations/gradient/generic1/Image',
        exportName: 'default',
      }),
    }),
  }),
});

export const IMPLEMENTATIONS = [
  {
    id: 'rsp',
    label: 'React Spectrum',
    shortLabel: 'RSP',
    playground: {
      shell: 'blocks/playground/preview/index.html',
      adapter: 'deps/rsp/playground/rsp-preview.js',
      snippetDir: 'deps/rsp/playground/snippets',
      snippetExt: 'jsx',
      tagPattern: '{Pascal}',
      runtimeSource: 's2',
    },
  },
  {
    id: 'swc',
    label: 'Spectrum Web Components',
    shortLabel: 'SWC',
    playground: {
      shell: 'blocks/playground/preview/index.html',
      adapter: 'deps/swc/playground/swc-preview.js',
      snippetDir: 'deps/swc/playground/snippets',
      snippetExt: 'html',
      tagPattern: 'swc-{slug}',
    },
  },
  { id: 'design-only', label: 'Design only', shortLabel: 'Figma' },
];

const IMAGE_PLAYGROUND = Object.freeze({
  shell: 'blocks/playground/preview/index.html',
  adapter: 'blocks/playground/preview/image-preview.js',
  snippetDir: null,
  snippetExt: null,
  tagPattern: '{Pascal}',
});

const PREVIEW_ONLY_IMPLEMENTATIONS = Object.freeze({
  ios: IMAGE_PLAYGROUND,
  android: IMAGE_PLAYGROUND,
});

/**
 * The combined, all-implementations view option. This is a picker/view concept,
 * not a data source — never pass its id to status-model or a data fetch.
 */
export const ALL_OPTION = { id: 'all', label: 'All' };

/**
 * @param {string} id
 * @returns {{ id: string, label: string, shortLabel: string } | null}
 */
export function getImplementationById(id) {
  return IMPLEMENTATIONS.find((impl) => impl.id === id) || null;
}

/**
 * @param {string} currentId
 * @returns {{ id: string, label: string, shortLabel: string }[]}
 */
export function getOtherImplementations(currentId) {
  return IMPLEMENTATIONS.filter((impl) => impl.id !== currentId);
}

/**
 * How the playground renders this implementation, or null when it has none.
 *
 * `tagPattern` interpolates `{Pascal}` (ActionButton) or `{slug}` (action-button)
 * to give the element name the code disclosure prints.
 *
 * Null covers two real cases, both of which fall back to the block's generic
 * image-viewer shell: design-only never renders a live preview, and ios/android
 * are not in this registry yet — deliberately, since every consumer that lists
 * implementations reads it and they are not ready to appear site-wide.
 *
 * @param {string} id
 * @returns {{ shell: string, snippetDir: string, snippetExt: string, tagPattern: string } | null}
 */
export function getPlaygroundConfig(id) {
  return getImplementationById(id)?.playground ?? PREVIEW_ONLY_IMPLEMENTATIONS[id] ?? null;
}

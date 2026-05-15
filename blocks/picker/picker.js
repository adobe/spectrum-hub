import './picker-element.js';
import { IMPLEMENTATIONS, ALL_OPTION } from '../../scripts/utils/implementations.js';
import {
  getImplementationFromPath,
  getPlatformSectionSuffix,
  resolveTargetUrl,
} from '../../scripts/utils/platform-url.js';

const OPTIONS = [ALL_OPTION, ...IMPLEMENTATIONS];

export default async function init(el) {
  const path = window.location.pathname;
  const currentImpl = getImplementationFromPath(path);
  // Picker only makes sense inside an implementation context — i.e. anywhere
  // under /platforms/[impl]/. Bare /platforms (no impl) and non-platform pages
  // (/components, /foundations/*, etc.) get no picker.
  if (!currentImpl) {
    return;
  }

  // Preserve the section under the impl when switching. On a bare impl root
  // (e.g. /platforms/rsp) the suffix is empty — switching then routes to the
  // sibling impl's root (e.g. /platforms/swc/), which is its landing page.
  const sectionSuffix = getPlatformSectionSuffix(path);

  const picker = document.createElement('hub-picker');
  picker.options = OPTIONS;
  picker.value = currentImpl;
  picker.label = 'Choose an implementation';
  picker.addEventListener('change', (e) => {
    window.location.assign(resolveTargetUrl(e.detail.value, sectionSuffix));
  });

  el.append(picker);
}

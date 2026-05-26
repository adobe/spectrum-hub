import './picker-element.js';
import { IMPLEMENTATIONS, ALL_OPTION } from '../../scripts/utils/implementations.js';
import {
  getImplementationFromPath,
  resolveTargetUrl,
} from '../../scripts/utils/platform-url.js';

const OPTIONS = [ALL_OPTION, ...IMPLEMENTATIONS];

export default async function init(el) {
  const path = window.location.pathname;
  const currentImpl = getImplementationFromPath(path);
  if (!currentImpl) { return; }

  const picker = document.createElement('hub-picker');
  picker.options = OPTIONS;
  picker.value = currentImpl;
  picker.label = 'Choose an implementation';
  picker.addEventListener('change', (e) => {
    window.location.assign(resolveTargetUrl(path, e.detail.value));
  });

  el.append(picker);
}

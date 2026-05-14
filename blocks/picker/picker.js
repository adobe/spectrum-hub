import './picker-element.js';
import { IMPLEMENTATIONS, ALL_OPTION } from '../../scripts/utils/implementations.js';
import {
  getImplementationFromPath,
  getComponentFromPath,
  isOnPlatformComponentPage,
  resolveTargetUrl,
} from '../../scripts/utils/platform-url.js';

const OPTIONS = [ALL_OPTION, ...IMPLEMENTATIONS];

export default async function init(el) {
  const path = window.location.pathname;
  if (!isOnPlatformComponentPage(path)) {
    return;
  }

  const currentComponent = getComponentFromPath(path);
  const initialValue = getImplementationFromPath(path) ?? 'all';

  const picker = document.createElement('hub-picker');
  picker.options = OPTIONS;
  picker.value = initialValue;
  picker.label = 'Choose an implementation';
  picker.addEventListener('change', (e) => {
    window.location.assign(resolveTargetUrl(e.detail.value, currentComponent));
  });

  el.append(picker);
}

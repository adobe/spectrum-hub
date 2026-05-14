import './picker-element.js';
import { IMPLEMENTATIONS, ALL_OPTION } from '../../scripts/utils/implementations.js';
import { getImplementationFromPath } from '../../scripts/utils/platform-url.js';

const OPTIONS = [ALL_OPTION, ...IMPLEMENTATIONS];

export default async function init(el) {
  const path = window.location.pathname;
  const initialValue = getImplementationFromPath(path) ?? 'all';

  const picker = document.createElement('hub-picker');
  picker.options = OPTIONS;
  picker.value = initialValue;
  picker.label = 'Choose an implementation';
  picker.addEventListener('change', (e) => {
    picker.value = e.detail.value;
    // eslint-disable-next-line no-console
    console.log('[picker] change', e.detail.value);
  });

  el.append(picker);
}

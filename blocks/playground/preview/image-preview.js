import { isUnsetOption } from '../../../deps/shared/playground/unset-control-options.js';

function imagePath(component, implementation, props) {
  const variant = Object.entries(props)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([property, value]) => `${property}-${value}`)
    .join('--');
  const base = `/playground/${component}/images/${implementation}`;
  return variant ? `${base}/${variant}.png` : `${base}/default.png`;
}

export async function init({
  model, imageViewer, document: ownerDocument = document,
}) {
  const image = imageViewer.querySelector('#preview-image');
  const currentProps = { ...model.values };
  imageViewer.classList.add('active');

  function render() {
    const fallback = imagePath(model.component, model.implementation, {});
    image.onerror = () => {
      image.src = fallback;
      image.onerror = null;
    };
    image.src = imagePath(model.component, model.implementation, currentProps);
    const details = Object.entries(currentProps)
      .map(([property, value]) => `${property}: ${value}`)
      .join(', ');
    image.alt = `${model.component}${details ? ` — ${details}` : ''}`;
  }

  render();
  return {
    update({ property, value }) {
      if (isUnsetOption(value)) {
        delete currentProps[property];
      } else {
        currentProps[property] = value;
      }
      render();
    },
    updateTheme(scheme) {
      ownerDocument.body.style.colorScheme = scheme ?? '';
    },
    destroy() {
      image.onerror = null;
    },
  };
}

export default (el) => {
  const pics = el.querySelectorAll('picture');
  // only setup scheme-aware pics if more than one.
  if (pics.length > 1) {
    if (pics[1]) { pics[1].classList.add('scheme-aware-pic', 'dark-pic'); }
    pics[0].classList.add('scheme-aware-pic', 'light-pic');
  }
  // Detect custom size
  [...el.classList].forEach((cls) => {
    if (cls.startsWith('size-')) {
      el.style.setProperty('--media-width', `${cls.replace('size-', '')}px`);
      el.classList.remove(cls);
    }
    if (cls.startsWith('opacity-')) {
      el.style.setProperty('--opacity', `${cls.replace('opacity-', '')}%`);
      el.classList.remove(cls);
    }
  });
};

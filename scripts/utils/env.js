export default (() => {
  const { host } = window.location;
  if (host.includes('local')) { return 'dev'; }
  if (host.includes('.aem.') && !host.endsWith('.live')) { return 'stage'; }
  return 'prod';
})();

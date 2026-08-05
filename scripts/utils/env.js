const { host, port } = window.location;

const isDev = () => host.includes('local');

const isStage = () => (
  (host.includes('.aem.') && !host.endsWith('.live'))
  || host.endsWith('workers.dev')
);

export const cdnEnv = port === '8787' || host.endsWith('adobe.com');

export const env = (() => {
  if (isDev()) { return 'dev'; }
  if (isStage()) { return 'stage'; }
  return 'prod';
})();

export default env;

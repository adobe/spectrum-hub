// CloudFront Function (runtime cloudfront-js-2.0), associated as a viewer-request
// on every behavior of the prod distribution by set-canonical-host-redirect.sh.
//
// Permanently redirects alias hosts (s2.spectrum.adobe.com) to the canonical
// host, keeping the path and query string. It runs before the cache, so alias
// requests never reach the Lambda or AEM. Any other host passes through.
var CANONICAL_HOST = 'spectrum.adobe.com';
var REDIRECT_HOSTS = ['s2.spectrum.adobe.com'];

function buildQuery(querystring) {
  var parts = [];
  Object.keys(querystring).forEach(function (key) {
    var param = querystring[key];
    var values = param.multiValue ? param.multiValue : [param];
    values.forEach(function (v) {
      parts.push(v.value === '' ? key : key + '=' + v.value);
    });
  });
  return parts.length ? '?' + parts.join('&') : '';
}

function handler(event) {
  var request = event.request;
  var host = request.headers.host && request.headers.host.value.toLowerCase();

  if (REDIRECT_HOSTS.indexOf(host) === -1) {
    return request;
  }

  return {
    statusCode: 301,
    statusDescription: 'Moved Permanently',
    headers: {
      location: { value: 'https://' + CANONICAL_HOST + request.uri + buildQuery(request.querystring) },
      'cache-control': { value: 'max-age=86400' },
    },
  };
}

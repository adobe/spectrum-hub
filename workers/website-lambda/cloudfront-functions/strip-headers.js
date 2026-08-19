// CloudFront Function (runtime cloudfront-js-2.0), associated as a viewer-response
// on the media (*/media_*) behavior of the BYO-CDN distributions.
//
// Media served straight from the aem.live origin bypasses the Lambda, so the
// response hygiene the Lambda applies in handlers/aem.js (deleting Age and
// X-Robots-Tag) has to happen here instead. Mirrors Adobe's aem.live BYO-CDN
// CloudFront guide (the "Create a Function to remove Age and X-Robots-Tag
// headers" step): https://www.aem.live/docs/byo-cdn-cloudfront-setup
//
// - Age is dropped so a CloudFront-cached media object doesn't advertise a stale
//   edge age to the browser.
// - X-Robots-Tag is dropped except on .plain.html responses (which are not media,
//   but the guard matches the doc so the function is safe if ever reused).
function handler(event) {
  var request = event.request;
  var response = event.response;
  var headers = response.headers;

  delete headers['age'];

  if (!request.uri.endsWith('.plain.html')) {
    delete headers['x-robots-tag'];
  }

  return response;
}

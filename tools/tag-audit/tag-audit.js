import DA_SDK from 'https://da.live/nx/utils/sdk.js';

(async function init() {
  const { context, token } = await DA_SDK;
  const { org, repo, path } = context;

  console.log(org, repo, path, token);

  // const cmp = document.createElement('adl-tag-audit');
  // cmp.path = `/${org}/${repo}`;
  // cmp.token = token;

  // document.body.append(cmp);
}());

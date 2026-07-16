# Algolia search migration checklist

A step-by-step guide to finish connecting the search block to Algolia. Written
to be followed without prior Algolia experience. Delete this file once the
migration is merged.

**Legend:** 🧑 = you do this · 🤖 = ask Claude to do this (code change).

## What we are building

Today the search box downloads the whole page list (`query-index.json`) into the
browser and filters it there. We are moving the search to **Algolia**, a hosted
search service, in two halves:

1. **Reindex job** — sends the page list *up* to Algolia so it can be searched
   on their servers. Already built (`tools/algolia/reindex.js`). Only the real
   run is left.
2. **Search adapter** — the browser asks Algolia for results as the user types.
   Already built (`algoliaSearch` in `search.js`). Only the switch-on is left.

The existing search UI, highlighting, and accessibility stay exactly as they are.

> **Note:** we are using **standard Algolia**, not the "DocSearch" product. When
> you sign up, choose a normal Algolia application on the free plan.

## Glossary

| Term | Meaning |
| ---- | ------- |
| Application | Your Algolia account container. Has an **Application ID** (public). |
| Index | The searchable collection of your pages. You name it (e.g. `spectrum_hub`). |
| Admin API Key | **Secret.** Can write and delete data. Only the reindex job uses it. Never put it in the browser, the repo, or a page. |
| Search-Only API Key | Public. Can only search. Safe to ship in the browser. |
| Record | One page in the index (`objectID`, `path`, `title`, `description`, ...). |

## Config decision (already made)

The three public values (Application ID, Search-Only API Key, index name) will
be **hardcoded in a repo file** (`blocks/search/config.js`). Changing a value
later means editing that file and redeploying, which is fine since they rarely
change.

---

## Steps

### 1. 🧑 Create the Algolia application and get keys

- [ ] Sign up at [algolia.com](https://www.algolia.com) on the free plan (not DocSearch).
- [ ] Create an application (any name, e.g. `spectrum-hub`).
- [ ] Open **Settings → API Keys** and copy these three values somewhere private:
  - [ ] Application ID
  - [ ] Search-Only API Key
  - [ ] Admin API Key (treat like a password)

**Done when:** you have all three values saved privately.

### 2. 🧑 Choose an index name

- [ ] Pick a lowercase name with underscores, e.g. `spectrum_hub`. You do not
  need to create it in the dashboard; it appears the first time data is sent.

**Done when:** you have written down the exact name.

### 3. 🧑 Install the Algolia library for the reindex script

- [ ] Run:

  ```bash
  npm install --save-dev algoliasearch@5
  ```

- [ ] Confirm with `npm ls algoliasearch` (should show a version starting `5`).
- [ ] 🤖 Ask Claude to commit `package.json` and `package-lock.json`.

**Done when:** the package is installed and committed.

### 4. 🧑 Find your `query-index.json` URL

- [ ] Your page list lives at your site base URL + `/query-index.json`, for
  example `https://main--spectrum-hub--<owner>.aem.page/query-index.json`.
- [ ] Open the URL in a browser and confirm you see JSON with a `data` array.

**Done when:** the URL loads JSON containing a `data` array.

### 5. 🧑 Set the secret values for a one-time run

In a PowerShell window, run these with your real values (they live only in this
window and disappear when it closes, so the admin key never touches a file):

```powershell
$env:ALGOLIA_APP_ID = "PASTE_YOUR_APP_ID"
$env:ALGOLIA_ADMIN_KEY = "PASTE_YOUR_ADMIN_KEY"
$env:ALGOLIA_INDEX_NAME = "spectrum_hub"
```

- [ ] Confirm with `echo $env:ALGOLIA_INDEX_NAME` (should print the index name).

**Done when:** the three variables are set in the current window.

### 6. 🧑 Run the reindex to fill the index

In the **same** PowerShell window, run (with your URL from step 4):

```bash
npm run reindex -- "https://YOUR-SITE/query-index.json"
```

- [ ] You should see `reindexed N records into "spectrum_hub"`.
- [ ] In the Algolia dashboard, open **Search → your index** and confirm the
  pages appear as records.

If it fails, the message tells you what is missing (it never prints your key):

- `missing required environment variables` — a value in step 5 was not set.
- `failed to fetch query-index` — the URL in step 4 is wrong.

**Done when:** the index shows your pages in the dashboard.

### 7. 🤖 Wire the block to Algolia

Ask Claude to:

- [ ] Create `blocks/search/config.js` with the three values left blank.
- [ ] Update `decorate` in `search.js` to use the Algolia adapter when the config
  is filled in, and fall back to the current local search when it is blank.
- [ ] Create the browser search client from Algolia's CDN.
- [ ] Add tests for the adapter selection.

This can be done now (before you have the values) because the code falls back to
local search until the config is filled in.

**Done when:** the code is merged in and tests pass, with the config still blank.

### 8. 🧑 Fill in the config values

- [ ] Open `blocks/search/config.js` and paste in your Application ID,
  Search-Only API Key, and index name. Use the **Search-Only** key here, never
  the Admin key.

**Done when:** the three values are filled in.

### 9. 🧑 Verify search works for real

- [ ] Open a page with the search block and type a query. Results should appear.
- [ ] Open the browser Network tab (F12 → Network) and confirm requests go to an
  `algolia.net` / `algolianet.com` address.
- [ ] Type a slight misspelling (e.g. `buton`) and confirm it still finds the
  right page — proof the typo-tolerant Algolia path is active.

**Done when:** live search returns Algolia results, including for typos.

### 10. 🤖 Test cleanup pass

- [ ] Ask Claude to refocus the older local-path tests around the Algolia
  adapter, keeping the DOM, accessibility, and URL tests intact.

**Done when:** the test suite reflects the Algolia-backed path.

### 11. 🧑 Final review and pull request

- [ ] Run `npm test` and `npm run lint` — both should pass.
- [ ] Do a final manual search.
- [ ] 🤖 Ask Claude to draft the pull request description.

**Done when:** the pull request is open and green.

### 12. 🧑 (Later, optional) Automate the reindex

- [ ] Add a CI job that runs `npm run reindex` on content changes, with the three
  values stored as encrypted CI secrets (never in the repo). Ask Claude to walk
  through this for your CI when you are ready.

---

## Follow-ups (optional, after launch)

- [ ] **Better highlighting** — use Algolia's returned highlights, including for
  typo-corrected words, instead of the current client-side bolding.
- [ ] **Attribution** — check whether the free plan requires a "Search by
  Algolia" logo near the search box.

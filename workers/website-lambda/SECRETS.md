# Managing website-lambda secrets

The proxy's two secrets — `SESSION_SECRET` (HMAC key for the session cookie) and
`IMS_CLIENT_SECRET` (the confidential DA service credential) — must **not** live
in the Lambda's plaintext environment (Adobe AWS Security Standard §3.5.8.5).

Instead, `env.<target>.json` carries only non-secret **ids**, and the function
resolves the values at runtime from AWS Secrets Manager:

| Plain name          | Env var (the id)          | Secret it points at                     |
| ------------------- | ------------------------- | --------------------------------------- |
| `SESSION_SECRET`    | `SESSION_SECRET_ID`       | `spectrum-hub/<target>/session-secret`    |
| `IMS_CLIENT_SECRET` | `IMS_CLIENT_SECRET_ID`    | `spectrum-hub/<target>/ims-client-secret` |

On the first request on a cold container, [`lib/secrets.js`](./lib/secrets.js)
`resolveSecrets()` fetches each configured id (via the execution role) and
assigns the value onto `process.env` under the plain name, so the rest of the
code reads `env.SESSION_SECRET` / `env.IMS_CLIENT_SECRET` unchanged. It caches
for 10 minutes (rotation without redeploy), fails **closed** if a value can't be
resolved (anonymous / 500, never open), and is **migration-safe**: if a
`*_SECRET_ID` is unset it leaves any existing plaintext `env[name]` in place.

`<target>` is `stage` or `prod`, matching `deploy.sh`.

---

## Option A — the script (recommended)

[`set-secrets.sh`](./set-secrets.sh) creates or rotates the secrets (and can
grant the IAM read permission). Values are passed to the AWS CLI via a private
temp file, never on the command line. It reads `AWS_PROFILE` / `AWS_REGION` from
`deploy.env`.

```bash
# Create/rotate BOTH secrets for stage: generates a new SESSION_SECRET,
# prompts (hidden) for the IMS client secret, and grants the role read access.
TARGET=stage GRANT_ROLE=1 ./set-secrets.sh
```

Other forms:

```bash
TARGET=stage SESSION_ONLY=1 ./set-secrets.sh   # rotate only the session secret
TARGET=stage IMS_ONLY=1 ./set-secrets.sh       # rotate only the IMS client secret
```

To supply values non-interactively (e.g. from your own secret store), set
`SESSION_SECRET_VALUE` / `IMS_CLIENT_SECRET_VALUE` in the environment first.

The script prints the exact `*_SECRET_ID` lines to add to `env.<target>.json`.
Then wire them up and deploy (Option C below).

> IAM changes are account-wide, so `GRANT_ROLE=1` is opt-in. If you can't change
> IAM, run the script without it and have someone attach the policy from Option B.

---

## Option B — the AWS Console

### 1. Create (or update) each secret

1. **AWS Console → Secrets Manager → Store a new secret.**
2. Secret type: **Other type of secret**.
3. Choose **Plaintext** and paste the raw value — *just the value itself*, not
   JSON. For `SESSION_SECRET`, generate a fresh 32-byte key locally, e.g.
   `openssl rand -base64 32`. For `IMS_CLIENT_SECRET`, use the value from the
   Adobe Developer Console.
4. Encryption key: the default `aws/secretsmanager` is fine.
5. **Next → Secret name:** use exactly
   - `spectrum-hub/stage/session-secret` and `spectrum-hub/stage/ims-client-secret` (stage), or
   - `spectrum-hub/prod/session-secret` and `spectrum-hub/prod/ims-client-secret` (prod).
6. Leave rotation **disabled** (the app re-reads on a 10-min TTL; rotate by
   storing a new value here). **Next → Store.**

To **rotate** later: open the secret → **Retrieve secret value → Edit →**
paste the new value → **Save.** No redeploy needed; it propagates within ~10 min.
For an immediate cutover (compromise), redeploy to force fresh cold starts.

### 2. Grant the Lambda role read access

1. **Lambda → Functions → `spectrum-<target>-lambda-proxy` → Configuration →
   Permissions →** open the **Execution role** link (opens IAM).
2. **Add permissions → Create inline policy → JSON**, and paste (replace
   `<account>`, and `stage`/`prod` to match):

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [{
       "Effect": "Allow",
       "Action": "secretsmanager:GetSecretValue",
       "Resource": "arn:aws:secretsmanager:us-east-2:<account>:secret:spectrum-hub/stage/*"
     }]
   }
   ```
3. Name it `website-lambda-secrets-read-<target>` → **Create policy.**

---

## Option C — wire up env and deploy (both options)

1. Edit `env.<target>.json`: **remove** the plaintext `SESSION_SECRET` and
   `IMS_CLIENT_SECRET` entries and **add** the ids:

   ```json
   "SESSION_SECRET_ID": "spectrum-hub/stage/session-secret",
   "IMS_CLIENT_SECRET_ID": "spectrum-hub/stage/ims-client-secret",
   ```

   Keep `IMS_CLIENT_ID`, `IMS_SCOPE`, `AEM_*`, `ALLOWED_ORIGINS`, `PUBLIC_HOST`,
   etc. `AWS_REGION` is provided by the Lambda runtime — do not add it.

2. Deploy:

   ```bash
   TARGET=stage ./deploy.sh
   ```

3. Verify: sign in on the site and confirm `POST /auth/session` returns **200**
   with `Set-Cookie: spectrum_session`, and private content shows. If a secret
   can't be resolved, the function's CloudWatch logs show
   `website-lambda: cannot resolve …` and requests fall back to anonymous / 500
   (never serving private content open).

---

## Rotation checklist

1. Store the new value (script: `TARGET=<t> SESSION_ONLY=1 ./set-secrets.sh` or
   `IMS_ONLY=1`; or Console → Edit).
2. Wait up to ~10 min (`SECRET_TTL_MS`) — or redeploy for an immediate cutover.
3. Rotating `SESSION_SECRET` invalidates all existing session cookies (users
   must sign in again). Rotating `IMS_CLIENT_SECRET` requires the new value to
   also be active in the Adobe Developer Console.

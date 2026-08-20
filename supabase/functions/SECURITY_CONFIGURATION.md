# Edge Function security configuration

Set these Supabase Edge Function secrets before deploying this branch:

- `ALLOWED_ORIGINS`: exact browser origins separated by commas, for example `https://app.example.com,https://admin.example.com`. Wildcards are not accepted.
- `PRIVILEGED_USER_IDS`: Supabase Auth user IDs, separated by commas, permitted to perform administrative operations when the user does not instead have `app_metadata.role = "admin"` or an `app_metadata.roles` array containing `"admin"`.

Protected functions validate a caller's bearer token through Supabase Auth before using the service-role client. Vault operations and sensitive DLP operations require a privileged user. Deep-link and MFA verification remain publicly callable by design; issuing and revoking deep links require a privileged user.

Never place service-role keys, HMAC keys, or privileged user IDs in frontend environment variables.

# Client Telemetry

Client telemetry is intentionally small in P1. It records enough stage context
to separate operational failures without logging tokens, request bodies, user
messages, email addresses, authorization headers, or raw error objects.

## Auth Callback

`AuthCallbackClient` logs `Auth callback flow failed.` with one safe `stage`
value:

- `callback`: Cognito callback completion failed.
- `token`: callback completed but no API token was available.
- `profile`: `/v1/me` profile lookup failed.
- `watchlist_import`: local watchlist import failed after login.

The user-facing callback messages stay unchanged. Telemetry is only for
debugging which step failed.

## Safe Error Shape

Use `logClientError(message, error, context)` for client-side failures. The
helper accepts only reviewed context keys:

- `stage`
- `ticker`
- `authenticated`
- `hasSession`
- `policy_status`

It logs those safe context fields plus:

- `error.name`
- numeric `error.status`, when present

It does not log raw `Error.message`, `stack`, token fields, authorization
headers, API request payloads, user identifiers, or personal contact data.

When a new client flow adds telemetry, add a test that serializes
`console.error` calls and proves sensitive sample values are absent.

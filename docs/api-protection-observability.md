# API protection and observability

## Request duration logs

Every completed request emits one JSON log line with:

- `event: "http_request"`
- `requestId`
- HTTP `method`
- request `path` without query parameters
- response `statusCode`
- elapsed `durationMs`
- authenticated `userId`, when available
- `tableId`, when the route contains one

Request bodies, authorization headers, tokens, passwords, AI instructions, and
other payload data are not logged.

Example:

```json
{"event":"http_request","requestId":"...","method":"GET","path":"/api/v1/tables/abc/missions","statusCode":200,"durationMs":18.42,"userId":"...","tableId":"abc"}
```

Use `requestId` to correlate this completion log with error and permission
logs. Track high-percentile duration (`p95` and `p99`) grouped by method and
normalized route. The current `path` contains resource identifiers, so a
production log pipeline should normalize IDs before creating metrics to avoid
high-cardinality labels.

## Current rate limits

Limits use fixed one-minute windows:

- Authentication login/register: 10 requests per IP and route.
- Authenticated API traffic: 240 requests per user.
- Authenticated write traffic (`POST`, `PUT`, `PATCH`, `DELETE`): 80 requests
  per user. This is applied in addition to the general authenticated limit.
- Table AI endpoints: 12 requests per user and table. This is applied in
  addition to the authenticated write limits.

Rate-limited responses use HTTP `429` with code `RATE_LIMIT_EXCEEDED`.
Responses expose:

- `x-ratelimit-limit`
- `x-ratelimit-remaining`
- `x-ratelimit-reset`
- `retry-after` when blocked

AI requests happen only after an explicit client action. The backend does not
schedule or automatically retry AI generation.

## In-memory limitation and production recommendation

The current limiter stores counters in the Node.js process and periodically
removes expired buckets. This is suitable for local development and a single
application instance.

For production or multiple backend instances, use a shared Redis-backed rate
limit store. A shared store ensures all instances enforce the same counters,
survives process restarts, and avoids users receiving a separate allowance from
each instance. Keep the same user/table key strategy when migrating AI limits.

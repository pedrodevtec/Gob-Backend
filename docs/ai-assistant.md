# AI assistant

The table AI endpoints generate drafts only. They never create or update worlds,
missions, traits, submissions, or timeline events.

## Configuration

Set one of these server-side environment variables:

```env
OPENAI_API_KEY=...
# or
AI_API_KEY=...
```

The optional `AI_MODEL` variable defaults to `gpt-5-nano`.

If no API key is configured, protected AI requests return HTTP 503 with:

```json
{
  "error": {
    "code": "AI_NOT_CONFIGURED",
    "message": "AI assistant is not configured."
  }
}
```

## Authorization

Every AI endpoint requires an active table `MASTER` membership. The table
`masterId` remains a repair-safe fallback. Global `ADMIN` does not grant table
master access.

The AI router also applies JWT authentication directly and limits each
authenticated user and table pair to 12 AI requests per minute. This is applied
in addition to the common authenticated/write API limits. It is defense in
depth and does not replace the table-specific MASTER check.

## Data and cost controls

- Calls happen only when the frontend explicitly invokes an endpoint.
- The backend does not schedule automatic AI calls or automatic generation
  retries.
- Responses use strict JSON schemas and small output-token limits.
- GPT-5 nano uses minimal reasoning effort for these lightweight drafts.
- Requests send only table-relevant context.
- Provider-side response storage is disabled with `store: false`.
- The frontend must show the draft for manual review before using existing save
  endpoints.

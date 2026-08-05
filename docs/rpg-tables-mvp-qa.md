# RPG Tables MVP Manual QA

Use two authenticated users: one Master and one Player. Keep browser devtools open on the Network tab for table requests.

## Setup

- [ ] Backend is running and connected to the expected database.
- [ ] Frontend `NEXT_PUBLIC_API_BASE_URL` points to that backend.
- [ ] Master user can log in.
- [ ] Player user can log in in another browser/profile.
- [ ] At least one base character class exists for table character creation.

## End-to-End Flow

- [ ] Master opens `/tables/create`.
- [ ] Master creates a table with a clear name.
- [ ] Master lands on the created table and can see a `joinCode`.
- [ ] Player opens `/tables/join`.
- [ ] Player enters the code with extra spaces or lowercase letters.
- [ ] Request payload is `{ "joinCode": "CODE" }` with a trimmed uppercase string.
- [ ] Player joins successfully and lands on the table.
- [ ] Player opens `/tables/[id]/player`.
- [ ] Player sees a CTA/form to create a table character.
- [ ] Player creates a character.
- [ ] Player sees review status as pending/in review.
- [ ] Mission response controls are disabled while the character is not approved.
- [ ] Master opens `/tables/[id]/master`.
- [ ] Master sees the pending character.
- [ ] Master approves the character and optional feedback is saved.
- [ ] Player refreshes `/tables/[id]/player`.
- [ ] Player sees approved status and any Master feedback.
- [ ] Master creates a mission.
- [ ] Player sees the mission under active missions.
- [ ] Player submits a mission response.
- [ ] Master sees the submitted response in `/tables/[id]/master`.
- [ ] Master approves the submission and optional feedback is saved.
- [ ] Player sees the submission status and Master feedback.
- [ ] `/tables/[id]` timeline shows key events for table creation, character approval, mission creation, and submission approval.

## Negative Checks

- [ ] Empty join code does not call the API.
- [ ] Invalid join code shows a user-friendly error.
- [ ] Player cannot submit a mission response before character approval.
- [ ] Non-master user cannot access usable Master-only actions.
- [ ] Table creation flow still works after the join/player-panel changes.

## API Contract Checks

- [ ] `POST /api/v1/tables/join` receives `joinCode`.
- [ ] `POST /api/v1/tables/:tableId/characters` receives `name` and `classId`.
- [ ] `PATCH /api/v1/tables/:tableId/characters/:characterId/review` receives `status` and `masterFeedback`.
- [ ] `POST /api/v1/tables/:tableId/missions` receives `title`, `description`, and optional `dueDate`.
- [ ] `POST /api/v1/tables/:tableId/missions/:missionId/submissions` receives `characterId` and `content`.
- [ ] `PATCH /api/v1/tables/:tableId/missions/:missionId/submissions/:submissionId/review` receives `status` and `masterNote`.

## Final Verification

- [ ] `npm run typecheck` passes in the frontend.
- [ ] `npm run build` passes in the frontend.
- [ ] `npx tsc --noEmit` passes in the backend.
- [ ] `npm test` passes in the backend.

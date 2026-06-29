# Table Gameplay Flow

## Domain identity

- `User` is the global account that logs in.
- `TableMember` is the user's membership, role, and status inside one table.
- `Character` is the player's campaign persona inside one table.

Do not use `userId`, `tableMemberId`, and `characterId` interchangeably. Table access starts with `TableMember`. Gameplay actions such as mission submissions use `Character`.

Global `ADMIN` is not table `MASTER`. Master permission comes from the active table membership role.

## Player flow

1. Player joins a table with a join code.
2. Player creates a table-scoped character through `POST /api/v1/tables/:tableId/characters`.
3. Backend links the character to `tableId` and authenticated `userId`.
4. Backend creates a `CharacterReview` with `PENDING`.
5. Player reads `GET /api/v1/tables/:tableId/player/overview`.
6. Player waits for approval, sees feedback if rejected or needs changes, then continues after approval.
7. Player sees applied traits and suggested traits separately.
8. Player sees active missions.
9. Player submits a mission response with an approved character.
10. Player reads submission status, master feedback, and campaign timeline updates.

## Master flow

1. Master creates or updates the table world.
2. Master reviews submitted characters.
3. Master creates missions and timeline events.
4. Master reviews mission submissions.
5. Master creates trait suggestions manually or saves AI output as suggestions.
6. Master explicitly applies or dismisses suggestions.

## Traits and suggestions

`CharacterTrait` is an applied trait/perk. It affects the canonical character state visible in the campaign.

`CharacterTraitSuggestion` is a proposed trait/perk. It is visible to the master and the owning player, but it is not applied until the master calls the apply endpoint.

Suggestion statuses:

- `SUGGESTED`: proposed, not applied.
- `APPLIED`: converted into a `CharacterTrait`.
- `DISMISSED`: rejected by the master.

## Required payloads

Create table character:

```json
{
  "name": "Ayla",
  "classId": "class-uuid"
}
```

Submit mission response:

```json
{
  "characterId": "character-uuid",
  "content": "Narrative response from the player."
}
```

Generate AI trait suggestions:

```json
{
  "characterId": "character-uuid",
  "instruction": "Optional guidance for the AI."
}
```

Create or save a trait suggestion:

```json
{
  "type": "POSITIVE",
  "name": "Olhar atento",
  "description": "Percebe detalhes sutis em cenas de investigacao.",
  "category": "Investigacao",
  "value": "Bonus narrativo situacional",
  "source": "AI"
}
```

## Common mistakes to avoid

- Sending `userId` instead of `characterId` when submitting a mission.
- Sending a character name instead of `characterId`.
- Treating `TableMember` as if it were the playable `Character`.
- Treating global `ADMIN` as table `MASTER`.
- Creating a global/disconnected character for a table flow.
- Writing AI trait output directly to `CharacterTrait`; save it as `CharacterTraitSuggestion` first.
- Returning raw `TableWorld.rules` without also exposing stable text fields.

## World DTO

`TableWorld.rules` and `TableWorld.characterCreationCriteria` are JSON columns. APIs may accept strings and store them as `{ "text": "..." }`, or accept structured objects.

Responses should expose:

```json
{
  "rulesText": "...",
  "characterCreationCriteriaText": "..."
}
```

This keeps frontend rendering stable even when the stored JSON shape changes.

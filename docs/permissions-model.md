# Permission model

The backend separates global account authorization from table-scoped authorization.

## Global account role

`User.accountRole` uses `AccountRole`:

- `USER`
- `ADMIN`

This role controls system-wide administration only. `ADMIN` does not grant master
access to any RPG table.

## Table membership role

`TableMember.role` uses `TableMemberRole`:

- `MASTER`
- `PLAYER`

`MASTER` is valid only for a membership in a specific table. Master-only actions
require an active `TableMember` with role `MASTER`. As a repair-safe fallback,
the user referenced by `Table.masterId` is also treated as that table's master.

`TableMember.status` uses `TableMemberStatus`:

- `ACTIVE`
- `INVITED`
- `REMOVED`

Only active memberships grant table access or count toward the active membership
and player limits.

## Examples

- A user can be `ADMIN` globally and `PLAYER` in a table.
- A user can be `USER` globally and `MASTER` in a table.
- A global `ADMIN` has no master permissions in tables where they are not the
  active master member or the table's `masterId`.

Table list and detail responses expose `masterId`, `currentUserRole`, `isMaster`,
`memberStatus`, and `membersCount`. The join code is returned only to the current
table master.

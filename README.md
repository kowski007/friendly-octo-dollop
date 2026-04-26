
# NairaTag

## Name Index

NairaTag now has a dedicated Name Index in [src/data/name-index.json](src/data/name-index.json).

The Name Index controls the policy for a handle before ownership is checked:

- `public`: free to claim when unowned
- `premium`: managed paid name, not directly claimable
- `protected`: reserved namespace, request/review only
- `blocked`: never available publicly

If a handle is not present in the Name Index, it is treated as `public`.

## Name Rules vs Ownership

These are two different layers:

- **Name Index**: what a name is allowed to be
- **Claimed Handles**: who currently owns a name

Example:

- `₦femi` can be `public` in the Name Index and still be `taken` in the ownership layer
- `₦money` can be `premium` even if no one owns it yet
- `₦cbn` can be `protected` and never appear as a normal public claim

## Shared Handle States

The shared availability layer now returns:

- `available`
- `premium`
- `protected`
- `blocked`
- `taken`
- `invalid`

The main public search surface is:

- `GET /api/handles/availability?handle=<name>`

This route powers the claim flow and should be preferred for user-facing handle checks.

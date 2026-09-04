# AGENTS.md

Guidance for AI agents and developers working in the geofarm repository.

## Committing your work

When you have completed a unit of work, commit it using [Conventional Commits](https://www.conventionalcommits.org/).

### Format

```
<type>(<scope>): <description>

<optional body>

<optional footer>
```

- **Always include a scope in the parentheses** — the scope is required, never empty: `chore(repo): ...`, not `chore: ...` or `chore(): ...`.
- Keep the description in the imperative mood, lower-case, and under ~72 characters (e.g. `add`, not `added` or `adds`).
- Use the body to explain *what* and *why*, not *how*, when the change isn't self-explanatory.

### Types

| Type | Use for |
|------|---------|
| `feat` | A new feature or capability |
| `fix` | A bug fix |
| `docs` | Documentation only (RFCs, READMEs, comments) |
| `refactor` | A code change that neither fixes a bug nor adds a feature |
| `perf` | A performance improvement |
| `test` | Adding or correcting tests |
| `build` | Build system or dependency changes |
| `ci` | CI configuration and scripts |
| `chore` | Maintenance that doesn't fit the above |

### Scope

The scope is required and names the affected area, e.g. `docs(rfc)`, `feat(map)`, `fix(timeline)`. When a change has no obvious area, choose the most fitting one — e.g. `repo`, `build`, `deps`, or `docs`.

### Breaking changes

Signal a breaking change with a `!` after the type/scope and a `BREAKING CHANGE:` footer:

```
feat(map)!: replace layer toggle with visibility model

BREAKING CHANGE: layer state is now driven by the viewport, not per-field.
```

### Examples

```
docs(rfc): add RFC-0000 vision and design principles
feat(map): render fields as selectable polygons
fix(timeline): preserve events when a boundary is redrawn
chore(repo): add AGENTS.md with commit conventions
```

## Before touching `apps/web` or `packages/client`

Anything a grower sees answers to [the Grower Rules](docs/GROWER-RULES.md). The short form:

- Every word a person reads lives in `packages/client/surface` (`bun run lint:vocab`).
- Every wait, failure, and empty has a sentence, and every network call goes through `attempt()` in `apps/web/src/main.ts` (`bun run lint:grower`).
- Nothing under 12px, no raw colours outside the `:root` tokens, 44px targets on touch.
- Every colour on the map has a legend entry; sources are listed as sources, never as people.
- Render at 390, 1024, and 1440 before committing and mention it in the body.

Deviations are marked in place with a reason (`copy-pending:`, `attempt-exempt:`, `style-exempt:`) and counted by the lint; an unmarked one fails `bun run check`.

## When to commit

- Commit once a coherent unit of work is complete and the repository is in a consistent state.
- One logical change per commit — don't bundle unrelated changes.
- Only commit or push when the user has asked you to. Committing directly on `prod` (the default branch) is fine — no feature branch is needed unless the user asks for one.

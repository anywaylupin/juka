---
name: house-style
description:
  Juka's rules for writing code, comments and interface copy, and the checks that prove a change is finished. Use when
  writing or reviewing anything in this repository, when a comment or a piece of user-facing wording is being added, and
  before reporting a change as done.
---

# House style

The product brief is in `CLAUDE.md` and the working rules are in `AGENTS.md`. This skill is the short version of the
parts that are easy to get wrong.

## Formatting is not yours

Prettier owns it. Run `pnpm format` and move on. Do not hand align anything, do not wrap a line to look nicer, and do
not argue with the result: `eslint-config-prettier` has already switched off every ESLint rule that would disagree.

## Comments

- One sentence per line. Never wrap a sentence, however long the line runs.
- A blank comment line separates paragraphs. An indented line is a command or a code sample and keeps its indentation,
  with a blank line in front of it.
- Comments attach to declarations: a function, a constant, a type, a component. Not floating inside a body, not
  narrating the next statement.
- Record why, not what. The code says what. A comment is for what the next reader cannot see: the thing that was tried
  and removed, the number that was measured, the bug the odd looking line prevents.

Good:

```ts
/**
 * Practice order, weighted toward the cards you know least.
 *
 * Only the stack reads it. The gallery stays in the order the box is in, because a page you can come back to has to be
 * the same page next time.
 */
```

## TypeScript

Use what the language has now: `replaceAll`, `.at(-1)`, `slice`, `startsWith`, `Number.parseInt`, `node:` imports,
`catch {}` with no unused binding, `flatMap`, `Object.fromEntries`. The lintable half is enforced by the unicorn rules
in `eslint.config.mjs`. Prefer `satisfies` to a cast, and let inference work rather than annotating every local.

## Interface copy

Sentence case. Short hyphens, never em or en dashes, anywhere: copy, comments, commits, docs. Active voice, verb first.
No exclamation marks.

## Before saying a change is done

```bash
pnpm format
pnpm lint
pnpm typecheck
pnpm test
```

Anything visible also gets looked at in the browser, not assumed. The same sequence runs in `.github/workflows/ci.yml`,
plus a migration apply and a build, so a red badge means you skipped a step here.

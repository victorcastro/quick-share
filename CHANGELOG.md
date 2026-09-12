# Changelog

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning: [SemVer](https://semver.org/).

## [1.1.0] - 2026-09-12

### Changed

- Reworked the lookup field: an underlined input replacing the boxed style, larger centered text,
  a `code?` placeholder, and a submit button that only appears once a code is typed.
- Moved the copy-link and QR actions above the text area, out of the header.
- Removed the text area's border and increased its inner padding.
- Placeholder phrases now type out with a trailing `...` and hold longer before cycling.
- Hid the theme toggle button (logic kept for a future re-enable).

### Fixed

- QR popover and the "Copied" tooltip rendering behind the text area on narrow viewports.
- Lookup field's clear (`×`) and submit buttons not receiving clicks, shadowed by the input
  after it was restyled with a higher stacking order.
- Underline reserving space for the submit button even when it was hidden, leaving a visible gap.

## [1.0.0] - 2026-09-11

First release.

### Added

- Snip creation and reading against Firestore from the client, with no backend and no authentication.
- `LLLL-NNN` IDs generated with `crypto.getRandomValues`. Alphabet without `I`, `l`, `O` or `o`; case-sensitive.
- Configurable expiry with an absolute `expiresAt`. Ten minutes by default.
- Content validation: plain text, non-empty, up to 10,000 characters.
- Firestore rules that forbid enumerating, updating, deleting and writing arbitrary structures.
- Hash routing (`#/aKxP-428`) and a QR code generated in the browser.
- A code that cannot be opened (expired or missing) is reported by the lookup field turning red
  and shaking once after submit, with no message.
- Input mask on the lookup field: it only accepts the `LLLL-NNN` shape, silently drops characters
  outside the id alphabet, and pulls the id out of a pasted share URL.
- Light and dark themes built with Tailwind CSS 4, following the system preference with a toggle that persists in `localStorage`.
- Configuration through `VITE_*` variables, validated at build time.
- 68 business-logic tests, ESLint with type-aware rules, and CI that validates PRs and deploys `main` to GitHub Pages.

### Security

- ID collisions never overwrite: `allow update: if false` turns a clash into a failure.
- Expiry is enforced in the rules (`expiresAt > request.time`) and again in the application.
- The ID travels in the URL fragment, which reaches neither the server nor the `Referer` header.
- Content enters the DOM through `textContent`, never `innerHTML`.

### Limitations

- No real rate limiting: the client cannot enforce it. Requires App Check and server-side limits.
- The TTL policy requires the Blaze plan. On Spark, expired snips stay in storage although they remain inaccessible.
- A snip cannot be deleted or revoked before it expires.

[1.1.0]: https://github.com/victorcastro/quick-snip/releases/tag/v1.1.0
[1.0.0]: https://github.com/victorcastro/quick-snip/releases/tag/v1.0.0

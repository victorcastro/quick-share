# Changelog

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning: [SemVer](https://semver.org/).

## [1.3.1] - 2026-09-12

### Changed

- The textarea footer hides its character counter in compact layouts while keeping all content
  actions available.
- Increased the spacing between the main page sections from 16px to 32px.
- Arranged the QuickShare brand and code lookup side by side in compact layouts, using a narrower
  lookup field that occupies half the available width and smaller compact typography while keeping
  the rest of the page in its normal vertical flow.
- Gave the compact brand block the matching half-width column for a balanced header layout.
- Increased the central textarea background glow and changed it from green to white in both themes.

## [1.3.0] - 2026-09-12

### Added

- An integrated textarea footer shows the character limit on the left and can copy or download the
  content from the right. Downloads use the active code in the `.txt` filename when present.
- Clearing the current content now requires confirmation from an anchored popover before resetting
  the textarea, lookup code and active view. The shared snip remains available until normal expiry.

### Changed

- Renamed the product and its remaining technical identifiers from QuickSnip to QuickShare.
- Increased the maximum content length from 10,000 to 50,000 characters in both application
  validation and Firestore security rules.

## [1.2.0] - 2026-09-12

### Added

- Active snips now save text edits to the same Firestore document after a short debounce and
  stream remote changes to other clients viewing the link.
- A dedicated new-link action creates a fresh ID when the author explicitly wants to stop editing
  the current link, with an inline confirmation before switching.
- QR codes can be copied to the clipboard as PNG images directly from the QR popover.

### Changed

- Firestore rules allow content-only updates to live snips while keeping their creation and expiry
  timestamps immutable. Editing never extends the original lifetime.
- Refreshed the animated textarea placeholder with 40 short prompts about quick, temporary sharing,
  including `Paste it. Share it. Done...`, `Paste it, then send the QR...`, and
  `Ten minutes to pass it on...`. Typing is now slower while deletion keeps its original speed.

## [1.1.0] - 2026-09-12

### Added

- The copy-link and QR buttons now show a spinner in place of their icon while the snip is being
  created, so the wait is visible instead of the button just greying out. Only the clicked button
  spins; the other stays disabled with its icon. Nothing spins when the content is already shared,
  since no request is made.
- A paste button in the lookup field, shown only while the field is empty and sharing the slot the
  clear button occupies. It runs the clipboard text through the ID mask, so pasting a whole share
  link leaves just the code. Hovering or focusing it shows a `Paste` tooltip.

### Changed

- Reworked the lookup field: an underlined input replacing the boxed style, larger centered text,
  a `code?` placeholder, and a submit button that only appears once a code is typed.
- Moved the copy-link and QR actions above the text area, out of the header.
- Removed the text area's border and increased its inner padding.
- Placeholder phrases now type out with a trailing `...` and hold longer before cycling.
- Hid the theme toggle button (logic kept for a future re-enable).
- Reorganised `src/` into three layers: `core/` (pure logic, no DOM or Firebase), `data/`
  (Firestore access) and `ui/` (every module that touches the DOM). `main.ts` drops from 317 to
  145 lines and now only holds share state and the create/read flows; each UI module owns its own
  elements. `tests/` mirrors the same layout.
- Dissolved the catch-all `config.ts`: the ID alphabet moved into `core/id.ts`, the collection name
  and retry limit became private to `data/snips.ts`, and `core/constants.ts` keeps only the
  cross-cutting values.
- Icons now come from the `lucide-static` dependency instead of SVG paths written by hand. A Vite
  `transformIndexHtml` plugin expands `<i data-lucide="name">` placeholders at build time, so the
  markup ships as real SVG with no runtime cost, and an unknown icon name fails the build.

### Fixed

- QR popover and the "Copied" tooltip rendering behind the text area on narrow viewports.
- Lookup field's clear (`×`) and submit buttons not receiving clicks, shadowed by the input
  after it was restyled with a higher stacking order.
- Underline reserving space for the submit button even when it was hidden, leaving a visible gap.
- The QR popover opened empty after reading an existing snip: `showSnip` never rendered a code,
  and the already-shared short circuit skipped the render path entirely.
- The lookup field showed its clear and submit buttons after typing a character the mask strips,
  leaving both visible over an empty field. Button state now syncs after masking, not before.
- Authored error messages never reached the banner: `showError` only surfaces the text of a
  `SnipError`, so the clipboard failure notice fell back to the generic wording. A `showMessage`
  path now carries our own copy while `showError` stays conservative with unknown errors.

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

[1.3.1]: https://github.com/victorcastro/quick-share/releases/tag/v1.3.1
[1.3.0]: https://github.com/victorcastro/quick-share/releases/tag/v1.3.0
[1.2.0]: https://github.com/victorcastro/quick-share/releases/tag/v1.2.0
[1.1.0]: https://github.com/victorcastro/quick-share/releases/tag/v1.1.0
[1.0.0]: https://github.com/victorcastro/quick-share/releases/tag/v1.0.0

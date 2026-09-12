# QuickShare

The fastest way to move text between devices. Paste on your phone, open on your
laptop: any browser on Android, iOS, Windows, macOS or Linux works, with a short
code like `aKxP-428`, a link or a QR. Whoever holds the code reads the text until
it expires a few minutes later.

No sign-up, no login, no backend: the browser talks to Firestore directly.

**Try it: [victorcastro.github.io/quick-share](https://victorcastro.github.io/quick-share)**

## Quick start

Requires Node 24.

```bash
cp .env.example .env   # fill in your Firebase project values
npm install
npm run dev
```

Create a Firestore database for your Firebase project and deploy
[`firestore.rules`](./firestore.rules) (`npx firebase-tools deploy --only firestore:rules`).
Nothing works until the rules are deployed.

| Script | |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Type-check and bundle into `dist/` |
| `npm run lint` | ESLint with type-aware rules |
| `npm run test` | Business-logic suite (Vitest) |

## How it works

IDs are `LLLL-NNN`: four letters, a hyphen, three digits. The alphabet omits
`I`, `l`, `O` and `o` because they are confusable with `1` and `0` when read
aloud, leaving 48 letters and roughly 5.3 billion combinations.

Each snip stores `content`, `createdAt` and `expiresAt` in the `snips`
collection, keyed by its ID. While it is active, edits update `content` in real
time without extending the original expiry. Reads compare the current time
against `expiresAt`.

Share links use a URL fragment (`#/aKxP-428`), which the page reads on load to
fill in the code and fetch the snip.

`src/snip.ts` holds the core and touches neither the DOM nor `location`, so the
tests run without a browser.

## Security model

Four things are worth knowing before changing anything:

- **`firestore.rules` is the only boundary.** The client config is public by
  design; the rules are what stop enumeration, overwrites and deletions.
- **Collision safety is server-side.** Firestore only permits `content` to change
  on a live document. A create attempt also changes `createdAt` and `expiresAt`,
  so an ID clash still fails instead of overwriting someone else's snip.
- **Expiry is enforced twice** — in the rules and again in the app — because
  Firestore's TTL deletion runs well after a snip expires.
- **IDs are case-sensitive** and are the only credential. `aKxP-428` and
  `AkXp-428` are different snips, so never lowercase user input.

## Limitations

- **No real rate limiting.** Firebase App Check (reCAPTCHA Enterprise) attests
  that requests come from the real web app, which blocks scripted abuse from
  outside it, but it is not per-user or per-IP quota rate limiting; that needs
  Cloud Functions or similar. App Check also has to be enforced for Cloud
  Firestore in the Firebase console (App Check -> APIs -> Cloud Firestore ->
  Enforce); registering the app alone does not enforce anything.
- **No TTL cleanup on the Spark plan.** Expired snips stay in storage, though
  they are inaccessible from the moment they expire.
- **No deletion or revocation.** A snip lives out its lifetime.
- **Anyone with the ID can edit.** IDs are the only credential, so sharing a link
  grants both read and live-edit access until it expires.
- **Clock-sensitive.** A device more than ~10 minutes out of sync cannot create
  snips, since the rules validate `expiresAt` against server time.

## License

[MIT](./LICENSE)

<div align="center">
  <img src="../assets/banner.png" alt="Microsoft Rewards Bot" width="100%">
</div>

---

# Auto-Updates

Navigation: [Documentation index](./README.md) -> [Node.js version](./node-version.md) -> [Docker](./docker.md) -> [Troubleshooting](./troubleshooting.md)

`npm start` checks the latest signed official GitHub Release before building and launching the bot.

`npm run dev` and any launch using `-dev` skip auto-update so local development is not overwritten.

Docker never self-updates. It only logs when a newer version exists. Update Docker installs by pulling or rebuilding the image.

## How It Works

The updater has two apply strategies:

- Git installs: fetch the exact signed release tag, verify that it resolves to the signed commit, reset the working tree to that commit, restore user files, and verify the local version.
- ZIP/archive installs: download the immutable GitHub tarball for the signed commit, mirror managed project paths from the archive, preserve user files, and verify the local version.

The default strategy is `auto`: use Git when `.git` exists, `git` is installed, and `origin` matches the configured update repository; otherwise use the archive strategy.

The update flow is:

1. read the latest GitHub Release;
2. download `update-manifest.json` and `update-manifest.sig`;
3. verify the Ed25519 signature with the public key pinned in the installed updater;
4. validate the repository, tag, version, and full commit SHA;
5. read `package.json` at that SHA and require the signed version to match;
6. acquire `.updates/update.lock` before mutating files;
7. apply the signed commit with Git or the exact commit archive;
8. remove obsolete files from managed project paths;
9. preserve and migrate user files;
10. verify that the local `package.json` now matches the signed version;
11. run `npm ci` or `npm install`.

The updater does not report `Updated` unless the version on disk matches the remote version after the apply step.

The updater does not trust a mutable branch or an unsigned version file. Missing or invalid
release signatures fail closed.

If the installed files look damaged but the local version already matches the remote version, use repair mode:

```bash
npm run update:repair
```

Repair mode re-applies the current signed release commit through the same Git/archive updater path. It still preserves user-owned files and refuses to downgrade.

## Preserved User Files

Updates preserve:

- `src/config.json`
- `src/accounts.json`
- `plugins/plugins.jsonc`
- `sessions/`
- `logs/`
- `diagnostics/`
- `Page/`
- `.updates/`
- `.git/`

After an update, missing keys from `config.example.json` and `accounts.example.json` are added without replacing user values.

## Commands

```bash
npm start
npm run update:check
npm run update:repair
npm run update:doctor
```

## Terminal Or App Window

By default, `npm start` opens the app window. It is the best mode for normal users and is already enabled in `config.example.json`:

```jsonc
"terminal": {
  "enabled": false
}
```

This opens a desktop-style app window with the current step, Core status, accounts, points, coupons, start/stop controls, and a small input box for license or prompt responses. The launcher starts it detached so a terminal can close or return to the prompt after startup.

To force the classic terminal for one launch, run:

```bash
npm start -- --terminal
```

Docker, CI, and forced-headless launches keep terminal mode automatically because they cannot open a desktop window.

Useful environment variables:

- `MSRB_AUTO_UPDATE=0`: disable update checks and updates.
- `MSRB_NO_APP_WINDOW=1`: keep terminal mode even when `terminal.enabled` is `false`.
- `MSRB_FORCE_APP_WINDOW=1`: force the app window on a desktop machine.
- `MSRB_UPDATE_CHECK_ONLY=1`: check and log only; do not apply updates.
- `MSRB_UPDATE_FORCE=1`: re-apply the current remote version when local and remote versions are equal.
- `MSRB_UPDATE_LOCK_WAIT_MS=120000`: maximum time to wait for another updater process before continuing with the local version.
- `MSRB_UPDATE_LOCK_STALE_MS=1800000`: age after which an updater lock can be treated as stale.
- `MSRB_UPDATE_STRATEGY=auto`: choose Git when possible, otherwise archive.
- `MSRB_UPDATE_STRATEGY=git`: require Git update mode and fail if this is not a compatible Git working tree.
- `MSRB_UPDATE_STRATEGY=archive`: force archive download mode.
- `MSRB_UPDATE_REPO=QuestPilot/Microsoft-Rewards-Bot`: override the GitHub repo.
- `MSRB_UPDATE_BRANCH=main`: legacy branch name used only by unsigned test fixtures and compatibility paths.

## Manual Install From Git

Use the supported public branch:

```bash
git clone https://github.com/QuestPilot/Microsoft-Rewards-Bot.git
cd Microsoft-Rewards-Bot
npm install
npm start
```

Manual installs should use `main`. Automatic updates use signed GitHub Releases and exact
tagged commits, so mutable branch state is not an update authority.

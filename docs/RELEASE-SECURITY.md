# Release signing

The bot uses two independent Ed25519 trust roots:

- `scripts/security/update-public-key.pem` verifies `update-manifest.json` from GitHub Release assets.
- `scripts/security/core-public-key.pem` verifies `plugins/official-core.json` before Core receives privileged APIs.

Private keys must never be committed. The local release keys are stored under
`%USERPROFILE%\.msrb-release\` with access restricted to the current Windows user.

## GitHub release setup

Create the repository Actions secret `MSRB_UPDATE_SIGNING_KEY` from:

```text
%USERPROFILE%\.msrb-release\update-private-key.pem
```

The release workflow fails closed when this secret is missing. It publishes:

- `update-manifest.json`
- `update-manifest.sig`

The signed manifest binds the repository, version, tag, and exact 40-character commit SHA.

## Core release setup

`Core-Source/scripts/release-core-multitarget.ps1` uses
`MSRB_CORE_PRIVATE_KEY_PATH`, or defaults to:

```text
%USERPROFILE%\.msrb-release\core-private-key.pem
```

The generated `plugins/official-core.sig` signs the exact bytes of
`plugins/official-core.json`. Any target hash, version, or metadata change invalidates it.

## Key rotation

Key rotation requires a normal trusted release that embeds the new public key before
artifacts are signed by the new private key. Losing a private key without such a transition
requires users to install a trusted release manually.

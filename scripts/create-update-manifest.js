'use strict'

const fs = require('fs')
const path = require('path')
const { signBytes } = require('./security/SignedManifest')

const ROOT = path.resolve(__dirname, '..')
const outputDir = path.resolve(process.env.MSRB_UPDATE_MANIFEST_DIR || path.join(ROOT, '.updates', 'release'))
const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))
const repo = process.env.GITHUB_REPOSITORY || 'QuestPilot/Microsoft-Rewards-Bot'
const commitSha = process.env.GITHUB_SHA || process.argv[2]
const tag = process.env.MSRB_UPDATE_TAG || `v${packageJson.version}`
const privateKeyPath = process.env.MSRB_UPDATE_PRIVATE_KEY_PATH
const privateKeyPem = process.env.MSRB_UPDATE_PRIVATE_KEY
    || (privateKeyPath ? fs.readFileSync(path.resolve(privateKeyPath), 'utf8') : '')

if (!/^[a-f0-9]{40}$/i.test(commitSha || '')) {
    throw new Error('A full 40-character GITHUB_SHA is required')
}
if (!privateKeyPem) {
    throw new Error('MSRB_UPDATE_PRIVATE_KEY or MSRB_UPDATE_PRIVATE_KEY_PATH is required')
}

const manifest = {
    schema: 1,
    repo,
    version: packageJson.version,
    tag,
    commitSha,
    publishedAt: new Date().toISOString()
}
const payload = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`)

fs.mkdirSync(outputDir, { recursive: true })
fs.writeFileSync(path.join(outputDir, 'update-manifest.json'), payload)
fs.writeFileSync(path.join(outputDir, 'update-manifest.sig'), `${signBytes(payload, privateKeyPem)}\n`)
console.log(`[UPDATE-SIGN] Signed ${repo}@${commitSha} as ${tag}`)

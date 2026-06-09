const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const root = path.resolve(__dirname, '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8')

test('interface mode is documented for normal users and terminal diagnostics', () => {
    const updates = read('docs/updates.md')
    const troubleshooting = read('docs/troubleshooting.md')

    assert.match(updates, /Terminal Or Simple Interface/)
    assert.match(updates, /"terminal":\s*{\s*"enabled": false\s*}/)
    assert.match(updates, /npm start -- --terminal/)
    assert.match(troubleshooting, /Simple Interface Or Terminal/)
    assert.match(troubleshooting, /developer diagnostics/)
})

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const root = path.resolve(__dirname, '..')

test('local user interface launches the bot as a child process and accepts prompt input', () => {
    const source = fs.readFileSync(path.join(root, 'scripts/user-interface.js'), 'utf8')

    assert.match(source, /http\.createServer/)
    assert.match(source, /spawn\(process\.execPath,\s*\['\.\/dist\/index\.js',\s*'--ui-child'\]/)
    assert.match(source, /MSRB_UI_CHILD/)
    assert.match(source, /\/api\/input/)
    assert.match(source, /License or Prompt Input/)
    assert.match(source, /Core/)
    assert.match(source, /Coupons/)
})

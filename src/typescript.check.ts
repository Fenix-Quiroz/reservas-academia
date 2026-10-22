import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = path.join(root, 'src')
const sourceFiles = fs.readdirSync(src, { recursive: true })

assert.deepEqual(
  sourceFiles.filter((file): file is string => typeof file === 'string' && /\.(jsx?|mjs|cjs)$/.test(file)),
  [],
  'src no debe contener archivos JavaScript ejecutables',
)

const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8')
assert.match(index, /<script type="module" src="\/src\/main\.tsx"><\/script>/)
assert.doesNotMatch(index, /\/src\/main\.jsx/)

const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>
}
const checkScripts = Object.entries(packageJson.scripts ?? {})
  .filter(([name]) => name.startsWith('check'))
  .map(([, command]) => command)

assert.ok(checkScripts.length > 0)
assert.ok(checkScripts.every((command) => !/\.jsx?\b/.test(command)), 'Las comprobaciones deben ejecutarse desde TS')

console.log('✔ typescript.check.ts OK')

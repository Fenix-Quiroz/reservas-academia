import assert from 'node:assert/strict'
import fs from 'node:fs'

const app = fs.readFileSync(new URL('./App.tsx', import.meta.url), 'utf8')

assert.match(app, /const tokens = leerTokensReservas\(yo\?\.celular\)/)
assert.match(app, /const claveTokens = tokens\.join\('\|'\)/)
assert.doesNotMatch(app, /const \[tokens, setTokens\]/)
assert.match(app, /const EDAD_MAXIMA_MIS_RESERVAS_MS = 2 \* 60_000/)
assert.match(app, /const INTERVALO_MIS_RESERVAS_ACTIVAS_MS = 10_000/)
assert.match(app, /const ultimaCargaMias = useRef\(''\)/)
assert.match(app, /const ultimaSincronizacionMias = useRef\(0\)/)
assert.match(app, /const sincronizarMiasRef = useRef<\(\(\) => void\) \| null>\(null\)/)
assert.match(app, /void cargarMias\(mostrarCargaInicial\)/)
assert.match(app, /document\.addEventListener\('visibilitychange'/)
assert.match(app, /window\.addEventListener\('focus'/)
assert.match(app, /if \(!supabaseConfigurado \|\| !verMias \|\| !tokens\.length\) return/)
assert.match(app, /window\.setInterval\(sincronizarMientrasSeVe, INTERVALO_MIS_RESERVAS_ACTIVAS_MS\)/)
assert.doesNotMatch(app, /\}, \[verMias, tokens, intentoCarga\]\)/)

console.log('✔ mis-reservas-sync.check.ts OK')

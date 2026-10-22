import assert from 'node:assert/strict'
import fs from 'node:fs'

const root = new URL('../', import.meta.url)
const read = (file: string) => fs.readFileSync(new URL(file, root), 'utf8')
const exists = (file: string) => fs.existsSync(new URL(file, root))

const cliente = [
  'src/components/cliente/CabeceraCliente.tsx',
  'src/components/cliente/ProgresoReserva.tsx',
  'src/components/cliente/DibujoCampo.tsx',
  'src/components/cliente/SelectorCampos.tsx',
  'src/components/cliente/SelectorHorario.tsx',
  'src/components/cliente/DatosReserva.tsx',
  'src/components/cliente/ReservaCompletada.tsx',
  'src/components/cliente/MisReservas.tsx',
  'src/utils/fechasReserva.ts',
]

const admin = [
  'src/components/admin/AdminMarca.tsx',
  'src/components/admin/AdminLogin.tsx',
  'src/components/admin/AdminNoAutorizado.tsx',
  'src/components/admin/AdminCabecera.tsx',
  'src/components/admin/AdminMetricas.tsx',
  'src/components/admin/AdminBalanceMensual.tsx',
  'src/components/admin/AdminFiltros.tsx',
  'src/components/admin/AdminReservaCard.tsx',
  'src/components/admin/AdminListado.tsx',
  'src/components/admin/AdminAlarmaTurno.tsx',
]

for (const file of [...cliente, ...admin]) {
  assert.equal(exists(file), true, `Falta el archivo componentizado: ${file}`)
}

const app = read('src/App.tsx')
const adminApp = read('src/AdminApp.tsx')

for (const name of ['CabeceraCliente', 'ProgresoReserva', 'SelectorCampos', 'SelectorHorario', 'DatosReserva', 'ReservaCompletada', 'MisReservas']) {
  assert.match(app, new RegExp(`import .*${name}.* from`), `App.tsx debe importar ${name}`)
}

for (const name of ['AdminLogin', 'AdminNoAutorizado', 'AdminCabecera', 'AdminMetricas', 'AdminBalanceMensual', 'AdminFiltros', 'AdminListado', 'AdminAlarmaTurno']) {
  assert.match(adminApp, new RegExp(`import .*${name}.* from`), `AdminApp.tsx debe importar ${name}`)
}

assert.match(read('src/components/cliente/DatosReserva.tsx'), /className="resumen-imagen"/)
assert.match(read('src/components/cliente/MisReservas.tsx'), /src=\{c\.imagen\}/)
assert.match(read('src/components/admin/AdminCabecera.tsx'), /import AdminMarca.* from/)
assert.match(read('src/components/admin/AdminLogin.tsx'), /import AdminMarca.* from/)
assert.match(read('src/components/admin/AdminNoAutorizado.tsx'), /import AdminMarca.* from/)
assert.match(read('src/components/admin/AdminAlarmaTurno.tsx'), /className="admin-alarma/)
assert.match(read('src/components/admin/AdminAlarmaTurno.tsx'), /Probar alarmas/)

assert.doesNotMatch(app, /function (Progreso|DibujoCancha|PasoCancha|PasoHorario|PasoDatos|PasoListo|MisReservas)\s*\(/)
assert.doesNotMatch(adminApp, /function (AdminMarca|AdminLogin|AdminNoAutorizado)\s*\(/)
assert.doesNotMatch(adminApp, /<section className="admin-metricas"/)
assert.doesNotMatch(adminApp, /<article className="reserva-card"/)

for (const file of cliente.filter((item: string) => item.endsWith('.jsx') || item.endsWith('.tsx'))) {
  const source = read(file)
  assert.doesNotMatch(source, /from ['"]\.\/.*(?:almacen|supabase|supabaseData)/, `${file} no debe acceder a datos directamente`)
  assert.doesNotMatch(source, /from ['"](?:\.\.\/)+(?:almacen|supabase|supabaseData)/, `${file} no debe acceder a datos directamente`)
}

for (const file of admin) {
  const source = read(file)
  assert.doesNotMatch(source, /from ['"]\.\/.*(?:almacen|supabase|supabaseData)/, `${file} no debe acceder a datos directamente`)
  assert.doesNotMatch(source, /from ['"](?:\.\.\/)+(?:almacen|supabase|supabaseData)/, `${file} no debe acceder a datos directamente`)
}

console.log('✔ componentization.check.ts OK')

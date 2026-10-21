import assert from 'node:assert/strict'
import fs from 'node:fs'

const root = new URL('../', import.meta.url)
const read = (file) => fs.readFileSync(new URL(file, root), 'utf8')
const exists = (file) => fs.existsSync(new URL(file, root))

const cliente = [
  'src/components/cliente/CabeceraCliente.jsx',
  'src/components/cliente/ProgresoReserva.jsx',
  'src/components/cliente/DibujoCampo.jsx',
  'src/components/cliente/SelectorCampos.jsx',
  'src/components/cliente/SelectorHorario.jsx',
  'src/components/cliente/DatosReserva.jsx',
  'src/components/cliente/ReservaCompletada.jsx',
  'src/components/cliente/MisReservas.jsx',
  'src/utils/fechasReserva.js',
]

const admin = [
  'src/components/admin/AdminMarca.jsx',
  'src/components/admin/AdminLogin.jsx',
  'src/components/admin/AdminNoAutorizado.jsx',
  'src/components/admin/AdminCabecera.jsx',
  'src/components/admin/AdminMetricas.jsx',
  'src/components/admin/AdminFiltros.jsx',
  'src/components/admin/AdminReservaCard.jsx',
  'src/components/admin/AdminListado.jsx',
]

for (const file of [...cliente, ...admin]) {
  assert.equal(exists(file), true, `Falta el archivo componentizado: ${file}`)
}

const app = read('src/App.jsx')
const adminApp = read('src/AdminApp.jsx')

for (const name of ['CabeceraCliente', 'ProgresoReserva', 'SelectorCampos', 'SelectorHorario', 'DatosReserva', 'ReservaCompletada', 'MisReservas']) {
  assert.match(app, new RegExp(`import .*${name}.* from`), `App.jsx debe importar ${name}`)
}

for (const name of ['AdminLogin', 'AdminNoAutorizado', 'AdminCabecera', 'AdminMetricas', 'AdminFiltros', 'AdminListado']) {
  assert.match(adminApp, new RegExp(`import .*${name}.* from`), `AdminApp.jsx debe importar ${name}`)
}

assert.match(read('src/components/cliente/DatosReserva.jsx'), /className="resumen-imagen"/)
assert.match(read('src/components/cliente/MisReservas.jsx'), /src=\{c\.imagen\}/)
assert.match(read('src/components/admin/AdminCabecera.jsx'), /import AdminMarca.* from/)
assert.match(read('src/components/admin/AdminLogin.jsx'), /import AdminMarca.* from/)
assert.match(read('src/components/admin/AdminNoAutorizado.jsx'), /import AdminMarca.* from/)

assert.doesNotMatch(app, /function (Progreso|DibujoCancha|PasoCancha|PasoHorario|PasoDatos|PasoListo|MisReservas)\s*\(/)
assert.doesNotMatch(adminApp, /function (AdminMarca|AdminLogin|AdminNoAutorizado)\s*\(/)
assert.doesNotMatch(adminApp, /<section className="admin-metricas"/)
assert.doesNotMatch(adminApp, /<article className="reserva-card"/)

for (const file of cliente.filter((item) => item.endsWith('.jsx'))) {
  const source = read(file)
  assert.doesNotMatch(source, /from ['"]\.\/.*(?:almacen|supabase|supabaseData)/, `${file} no debe acceder a datos directamente`)
  assert.doesNotMatch(source, /from ['"](?:\.\.\/)+(?:almacen|supabase|supabaseData)/, `${file} no debe acceder a datos directamente`)
}

for (const file of admin) {
  const source = read(file)
  assert.doesNotMatch(source, /from ['"]\.\/.*(?:almacen|supabase|supabaseData)/, `${file} no debe acceder a datos directamente`)
  assert.doesNotMatch(source, /from ['"](?:\.\.\/)+(?:almacen|supabase|supabaseData)/, `${file} no debe acceder a datos directamente`)
}

console.log('✔ componentization.check.js OK')

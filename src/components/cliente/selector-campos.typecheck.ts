import type { Campo } from '../../types.js'
import SelectorCampos from './SelectorCampos.js'
import DibujoCampo from './DibujoCampo.js'

const campo: Campo = {
  id: 1,
  nombre: 'Campo 1',
  deporte: 'Fútbol 5',
  jugadores: 5,
  precioHora: 60,
  color: '#a97818',
  imagen: '/campos/campo-1-futbol-5.webp',
  oferta: 'Alquila este campo y recibe 1 agua de 625 ml',
}

const selector = SelectorCampos({
  campos: [campo],
  onSelect: (seleccionado) => seleccionado.id,
  tituloRef: { current: null },
})
const dibujo = DibujoCampo({ color: campo.color, jugadores: campo.jugadores, deporte: campo.deporte })

void [selector, dibujo]

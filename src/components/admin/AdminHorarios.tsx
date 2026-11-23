import { useEffect, useMemo, useState, type ReactElement } from 'react'
import { AlertTriangle, Check, ChevronDown, Copy, LockKeyhole, RotateCcw, Save, UnlockKeyhole } from 'lucide-react'
import type { BloqueoEvento, Campo, Reserva } from '../../types'
import {
  BLOQUE_MINUTOS,
  RANGO_ENTRENAMIENTOS,
  actualizarCeldaEnConfiguracion,
  copiarDiaEnConfiguracion,
  convertirHorariosACeldas,
  type CeldaHorarioAdmin,
  type ConfiguracionHorariosAdmin,
} from '../../horariosAdmin'
import {
  borrarBorradorHorariosDemo,
  guardarBorradorHorariosDemo,
  guardarHorariosDemo,
  leerBorradorHorariosDemo,
  leerConfiguracionHorariosDemo,
} from '../../horariosAdminDemo'
import {
  formatearMinutosAdmin,
  formatearRangoAdmin,
  NOMBRES_DIAS_ADMIN,
  obtenerConflictosHorarios,
} from './adminHorarios.utils'

interface AdminHorariosProps {
  canchas: readonly Campo[]
  reservas: readonly Reserva[]
  eventos: readonly BloqueoEvento[]
  supabaseConfigurado: boolean
  leerConfiguracion?: () => Promise<ConfiguracionHorariosAdmin>
  guardarConfiguracion?: (configuracion: ConfiguracionHorariosAdmin) => Promise<ConfiguracionHorariosAdmin>
}

export const TURNOS_HORARIOS_ADMIN = [
  { id: 'manana', etiqueta: 'Mañana', desde: 7 * 60, hasta: 12 * 60, descripcion: '7:00 a. m. – 12:00 p. m.' },
  { id: 'tarde', etiqueta: 'Tarde', desde: 12 * 60, hasta: 19 * 60, descripcion: '12:00 p. m. – 7:00 p. m.' },
  { id: 'noche', etiqueta: 'Noche', desde: 19 * 60, hasta: 22 * 60, descripcion: '7:00 p. m. – 10:00 p. m.' },
] as const

type TurnoHorarioId = typeof TURNOS_HORARIOS_ADMIN[number]['id']

function estadoInicial(): { guardada: ConfiguracionHorariosAdmin; borrador: ConfiguracionHorariosAdmin } {
  const guardada = leerConfiguracionHorariosDemo()
  return {
    guardada,
    borrador: leerBorradorHorariosDemo() ?? guardada,
  }
}

function claveCelda(celda: Pick<CeldaHorarioAdmin, 'diaSemana' | 'inicioMinuto'>): string {
  return `${celda.diaSemana}:${celda.inicioMinuto}`
}

function mismoContenido(a: ConfiguracionHorariosAdmin, b: ConfiguracionHorariosAdmin): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

function nombreFecha(fecha: string): string {
  return new Date(`${fecha}T12:00:00`).toLocaleDateString('es-PE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function AdminHorarios({
  canchas,
  reservas,
  eventos,
  supabaseConfigurado,
  leerConfiguracion,
  guardarConfiguracion,
}: AdminHorariosProps) {
  const [inicial] = useState(estadoInicial)
  const [campoSeleccionado, setCampoSeleccionado] = useState(canchas[0]?.id ?? 1)
  const [diaSeleccionado, setDiaSeleccionado] = useState(1)
  const [turnoAbierto, setTurnoAbierto] = useState<TurnoHorarioId>('tarde')
  const [configuracionGuardada, setConfiguracionGuardada] = useState(inicial.guardada)
  const [borrador, setBorrador] = useState(inicial.borrador)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [forzarError, setForzarError] = useState(false)
  const [mostrarAplicar, setMostrarAplicar] = useState(false)
  const [diasParaAplicar, setDiasParaAplicar] = useState<number[]>([])
  const [cargandoHorarios, setCargandoHorarios] = useState(supabaseConfigurado)
  const [horariosListos, setHorariosListos] = useState(!supabaseConfigurado)
  const [intentoCarga, setIntentoCarga] = useState(0)

  useEffect(() => {
    let activo = true

    if (!supabaseConfigurado) {
      setCargandoHorarios(false)
      setHorariosListos(true)
      return () => {
        activo = false
      }
    }

    setCargandoHorarios(true)
    setHorariosListos(false)
    setError('')

    if (!leerConfiguracion) {
      setCargandoHorarios(false)
      setError('No está disponible la lectura de horarios de Supabase.')
      return () => {
        activo = false
      }
    }

    void leerConfiguracion()
      .then((guardada) => {
        if (!activo) return
        const borradorLocal = leerBorradorHorariosDemo()
        setConfiguracionGuardada(guardada)
        setBorrador(borradorLocal ?? guardada)
        setHorariosListos(true)
      })
      .catch(() => {
        if (!activo) return
        setError('No pudimos cargar los horarios desde Supabase. Revisa la conexión e inténtalo de nuevo.')
      })
      .finally(() => {
        if (activo) setCargandoHorarios(false)
      })

    return () => {
      activo = false
    }
  }, [intentoCarga, leerConfiguracion, supabaseConfigurado])

  const campo = canchas.find((item) => item.id === campoSeleccionado) ?? canchas[0]
  const celdasCampo = useMemo(
    () => convertirHorariosACeldas(borrador.horarios, campo?.id ?? campoSeleccionado),
    [borrador, campo?.id, campoSeleccionado],
  )
  const celdasDia = useMemo(
    () => celdasCampo.filter((celda) => celda.diaSemana === diaSeleccionado),
    [celdasCampo, diaSeleccionado],
  )
  const turnoActivo = TURNOS_HORARIOS_ADMIN.find((turno) => turno.id === turnoAbierto) ?? TURNOS_HORARIOS_ADMIN[1]
  const celdasTurno = useMemo(
    () => celdasDia.filter((celda) => celda.inicioMinuto >= turnoActivo.desde && celda.finMinuto <= turnoActivo.hasta),
    [celdasDia, turnoActivo],
  )
  const celdasBloqueadas = useMemo(
    () => celdasCampo.filter((celda) => celda.bloqueado).length,
    [celdasCampo],
  )
  const tieneCambios = !mismoContenido(configuracionGuardada, borrador)
  const conflictos = useMemo(
    () => obtenerConflictosHorarios(borrador, reservas, eventos),
    [borrador, reservas, eventos],
  )

  function bloquesBloqueadosDelTurno(turno: typeof TURNOS_HORARIOS_ADMIN[number]): number {
    return celdasCampo.filter((celda) => (
      celda.bloqueado
      && celda.inicioMinuto >= turno.desde
      && celda.finMinuto <= turno.hasta
    )).length
  }

  function actualizarBorrador(siguiente: ConfiguracionHorariosAdmin): void {
    setBorrador(siguiente)
    guardarBorradorHorariosDemo(siguiente)
    setMensaje(supabaseConfigurado
      ? 'Cambio guardado localmente. Pulsa “Guardar cambios” para enviarlo a Supabase.'
      : 'Cambio guardado en este navegador. Pulsa “Guardar cambios” para confirmarlo.')
    setError('')
  }

  function cambiarCelda(celda: CeldaHorarioAdmin): void {
    actualizarBorrador(actualizarCeldaEnConfiguracion(borrador, celda, !celda.bloqueado))
  }

  async function guardar(): Promise<void> {
    if (!tieneCambios || guardando) return
    setGuardando(true)
    setMensaje(supabaseConfigurado ? 'Guardando configuración en Supabase…' : 'Guardando configuración demo…')
    setError('')
    try {
      if (supabaseConfigurado) {
        if (!guardarConfiguracion) throw new Error('guardado-supabase-no-disponible')
        const configuracionRemota = await guardarConfiguracion(borrador)
        setConfiguracionGuardada(configuracionRemota)
        setBorrador(configuracionRemota)
        borrarBorradorHorariosDemo()
        setMensaje('Configuración guardada en Supabase correctamente.')
        return
      }

      const resultado = await guardarHorariosDemo(borrador, { forzarError })
      if (!resultado.ok) {
        setError('La simulación falló. El borrador sigue guardado y puedes reintentar.')
        setMensaje('')
        return
      }
      setConfiguracionGuardada(resultado.configuracion)
      setBorrador(resultado.configuracion)
      borrarBorradorHorariosDemo()
      setMensaje('Configuración guardada en el servidor demo. En esta fase no se modificó Supabase.')
    } catch {
      setError(supabaseConfigurado
        ? 'No pudimos guardar los horarios en Supabase. El borrador sigue guardado y puedes reintentar.'
        : 'No pudimos guardar la configuración demo. El borrador sigue guardado y puedes reintentar.')
      setMensaje('')
    } finally {
      setGuardando(false)
    }
  }

  function deshacer(): void {
    if (!tieneCambios || guardando) return
    setBorrador(configuracionGuardada)
    borrarBorradorHorariosDemo()
    setMensaje('Cambios pendientes descartados.')
    setError('')
  }

  function aplicarDias(): void {
    if (!diasParaAplicar.length) {
      setError('Selecciona al menos un día para copiar la configuración.')
      return
    }
    actualizarBorrador(copiarDiaEnConfiguracion(
      borrador,
      campo?.id ?? campoSeleccionado,
      diaSeleccionado,
      diasParaAplicar,
    ))
    setMostrarAplicar(false)
    setDiasParaAplicar([])
  }

  function alternarDiaParaAplicar(dia: number): void {
    setDiasParaAplicar((actuales) => actuales.includes(dia)
      ? actuales.filter((actual) => actual !== dia)
      : [...actuales, dia])
  }

  if (supabaseConfigurado && (!horariosListos || cargandoHorarios)) {
    return (
      <section id="admin-horarios" className="admin-horarios" aria-labelledby="titulo-horarios-academia" aria-busy={cargandoHorarios}>
        <div className="admin-horarios-cabecera">
          <div>
            <p className="admin-kicker">Configuración semanal</p>
            <h2 id="titulo-horarios-academia">Horarios de academia</h2>
            <p className="admin-horarios-ayuda">Los horarios reales se cargan desde Supabase antes de permitir cambios.</p>
          </div>
          <div className="admin-horarios-demo-aviso" role={cargandoHorarios ? 'status' : 'alert'}>
            <strong>{cargandoHorarios ? 'Cargando horarios…' : 'No se pudo cargar'}</strong>
            <span>{cargandoHorarios ? 'Espera un momento.' : error}</span>
          </div>
        </div>
        {!cargandoHorarios && (
          <button className="admin-boton admin-control-primario" type="button" onClick={() => setIntentoCarga((actual) => actual + 1)}>
            Reintentar lectura
          </button>
        )}
      </section>
    )
  }

  function etiquetaCelda(celda: CeldaHorarioAdmin): string {
    const nombreDia = NOMBRES_DIAS_ADMIN.find((dia) => dia.valor === celda.diaSemana)?.largo ?? 'Día'
    const nombreCampo = campo?.nombre ?? `Campo ${celda.canchaId}`
    return `${nombreDia}, ${nombreCampo}, ${formatearRangoAdmin(celda.inicioMinuto, celda.finMinuto)}, ${celda.bloqueado ? 'bloqueado' : 'libre'}`
  }

  function renderSwitch(celda: CeldaHorarioAdmin): ReactElement {
    return (
      <button
        className={`admin-horarios-switch${celda.bloqueado ? ' bloqueado' : ' libre'}`}
        type="button"
        aria-pressed={celda.bloqueado}
        aria-label={etiquetaCelda(celda)}
        onClick={() => cambiarCelda(celda)}
      >
        <span className="admin-horarios-switch-icon" aria-hidden="true">
          {celda.bloqueado ? <LockKeyhole size={16} /> : <UnlockKeyhole size={16} />}
        </span>
        <span>{celda.bloqueado ? 'Bloqueado' : 'Libre'}</span>
      </button>
    )
  }

  return (
    <section id="admin-horarios" className="admin-horarios" aria-labelledby="titulo-horarios-academia">
      <div className="admin-horarios-cabecera">
        <div>
          <p className="admin-kicker">Configuración semanal</p>
          <h2 id="titulo-horarios-academia">Horarios de academia</h2>
          <p className="admin-horarios-ayuda">
            Se repite todas las semanas. Toca un switch para ocupar o liberar bloques de 30 minutos.
          </p>
        </div>
      </div>

      <div className="admin-horarios-controles">
        <div className="admin-horarios-campos" role="group" aria-label="Seleccionar campo">
          {canchas.map((item) => (
            <button
              className={`admin-horarios-campo${item.id === campoSeleccionado ? ' activo' : ''}`}
              type="button"
              key={item.id}
              aria-pressed={item.id === campoSeleccionado}
              onClick={() => setCampoSeleccionado(item.id)}
            >
              <span className="admin-horarios-campo-punto" style={{ backgroundColor: item.color }} aria-hidden="true" />
              {item.nombre}
            </button>
          ))}
        </div>

        <div className="admin-horarios-acciones">
          <button className="admin-boton admin-horarios-secundario" type="button" onClick={() => setMostrarAplicar((actual) => !actual)}>
            <Copy size={17} aria-hidden="true" />
            Copiar este día
          </button>
          <button className="admin-boton admin-horarios-secundario" type="button" onClick={deshacer} disabled={!tieneCambios || guardando}>
            <RotateCcw size={17} aria-hidden="true" />
            Deshacer cambios
          </button>
        </div>
      </div>

      {mostrarAplicar && (
        <div className="admin-horarios-aplicar" role="group" aria-label="Aplicar día a otros días">
          <div>
            <strong>Copiar {NOMBRES_DIAS_ADMIN.find((dia) => dia.valor === diaSeleccionado)?.largo}</strong>
            <span>Elige los días que recibirán los mismos switches de {campo?.nombre}.</span>
          </div>
          <div className="admin-horarios-dias-aplicar">
            {NOMBRES_DIAS_ADMIN.filter((dia) => dia.valor !== diaSeleccionado).map((dia) => (
              <label key={dia.valor} className="admin-horarios-dia-check">
                <input
                  type="checkbox"
                  checked={diasParaAplicar.includes(dia.valor)}
                  onChange={() => alternarDiaParaAplicar(dia.valor)}
                />
                <span>{dia.largo}</span>
              </label>
            ))}
          </div>
          <button className="admin-boton admin-control-primario" type="button" onClick={aplicarDias}>
            Aplicar a seleccionados
          </button>
        </div>
      )}

      <div className="admin-horarios-turnos" role="group" aria-label="Seleccionar turno">
        {TURNOS_HORARIOS_ADMIN.map((turno) => {
          const abierto = turno.id === turnoAbierto
          return (
            <button
              className={`admin-horarios-turno${abierto ? ' abierto' : ''}`}
              type="button"
              key={turno.id}
              aria-expanded={abierto}
              aria-controls={`admin-horarios-turno-${turno.id}`}
              onClick={() => setTurnoAbierto(turno.id)}
            >
              <span className="admin-horarios-turno-contenido">
                <strong>{turno.etiqueta}</strong>
                <small>{turno.descripcion}</small>
              </span>
              <span className="admin-horarios-turno-cantidad">{bloquesBloqueadosDelTurno(turno)} bloqueados</span>
              <ChevronDown className={abierto ? 'girada' : ''} size={19} aria-hidden="true" />
            </button>
          )
        })}
      </div>

      <p className="admin-horarios-turno-activo">
        Mostrando <strong>{turnoActivo.etiqueta}</strong>: {turnoActivo.descripcion}
      </p>

      <div className="admin-horarios-resumen" aria-live="polite">
        <span><strong>{celdasBloqueadas}</strong> bloques bloqueados en {campo?.nombre ?? 'el campo'}</span>
        <span><strong>{RANGO_ENTRENAMIENTOS.inicioMinuto / 60}:00 a. m. – 10:00 p. m.</strong></span>
        {tieneCambios && <span className="pendiente"><strong>Cambios pendientes</strong></span>}
      </div>

      <div className="admin-horarios-leyenda" aria-label="Leyenda de estados">
        <span><i className="libre" aria-hidden="true" /> Libre</span>
        <span><i className="bloqueado" aria-hidden="true" /> Bloqueado por entrenamiento</span>
      </div>

      <div id={`admin-horarios-turno-${turnoActivo.id}`} className="admin-horarios-grid-escritorio" aria-label={`${campo?.nombre ?? 'Campo'}: horario de ${turnoActivo.etiqueta}`}>
        <div className="admin-horarios-grid-cabecera hora">Hora</div>
        {NOMBRES_DIAS_ADMIN.map((dia) => (
          <div className="admin-horarios-grid-cabecera" key={dia.valor}>{dia.largo}</div>
        ))}
        {Array.from({ length: (turnoActivo.hasta - turnoActivo.desde) / BLOQUE_MINUTOS }, (_, indice) => {
          const inicioMinuto = turnoActivo.desde + indice * BLOQUE_MINUTOS
          return (
            <div className="admin-horarios-grid-fila" key={inicioMinuto}>
              <div className="admin-horarios-hora">{formatearMinutosAdmin(inicioMinuto)}</div>
              {NOMBRES_DIAS_ADMIN.map((dia) => {
                const celda = celdasCampo.find((item) => item.diaSemana === dia.valor && item.inicioMinuto === inicioMinuto)
                return <div className="admin-horarios-grid-celda" key={dia.valor}>{celda && renderSwitch(celda)}</div>
              })}
            </div>
          )
        })}
      </div>

      <div className="admin-horarios-movil">
        <div className="admin-horarios-tabs" role="tablist" aria-label="Seleccionar día">
          {NOMBRES_DIAS_ADMIN.map((dia) => (
            <button
              type="button"
              role="tab"
              key={dia.valor}
              aria-selected={dia.valor === diaSeleccionado}
              onClick={() => setDiaSeleccionado(dia.valor)}
            >
              {dia.corto}
            </button>
          ))}
        </div>
        <div className="admin-horarios-lista-movil">
          {celdasTurno.map((celda) => (
            <div className="admin-horarios-fila-movil" key={claveCelda(celda)}>
              <span>{formatearRangoAdmin(celda.inicioMinuto, celda.finMinuto)}</span>
              {renderSwitch(celda)}
            </div>
          ))}
        </div>
      </div>

      {conflictos.length > 0 && (
        <div className="admin-horarios-conflictos" role="note">
          <div className="admin-horarios-conflictos-icono" aria-hidden="true"><AlertTriangle size={20} /></div>
          <div>
            <strong>Hay reservas o eventos dentro de bloques seleccionados</strong>
            <p>El bloqueo recurrente se guardará para futuras fechas. No se cancelará ni modificará lo que ya está reservado.</p>
            <ul>
              {conflictos.slice(0, 5).map((conflicto) => (
                <li key={`${conflicto.tipo}:${conflicto.id}`}>
                  {conflicto.tipo === 'reserva' ? 'Reserva' : 'Evento'} de <strong>{conflicto.nombre}</strong> · {nombreFecha(conflicto.fecha)} · {formatearRangoAdmin(conflicto.inicioMinuto, conflicto.finMinuto)}
                </li>
              ))}
            </ul>
            {conflictos.length > 5 && <small>Y {conflictos.length - 5} coincidencia{conflictos.length - 5 === 1 ? '' : 's'} más.</small>}
          </div>
        </div>
      )}

      <div className="admin-horarios-pie">
        {!supabaseConfigurado && (
          <label className="admin-horarios-prueba">
            <input type="checkbox" checked={forzarError} onChange={(evento) => setForzarError(evento.target.checked)} />
            Simular error de guardado (pruebas)
          </label>
        )}
        <div className="admin-horarios-guardar">
          {mensaje && <span className="admin-horarios-mensaje" role="status">{mensaje}</span>}
          {error && <span className="admin-horarios-error" role="alert">{error}</span>}
          <button className="admin-boton admin-control-primario admin-horarios-guardar-boton" type="button" onClick={() => void guardar()} disabled={!tieneCambios || guardando}>
            <Save size={18} aria-hidden="true" />
            {guardando ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>

      {!tieneCambios && !mensaje && !error && (
        <p className="admin-horarios-confirmado"><Check size={17} aria-hidden="true" /> No hay cambios pendientes.</p>
      )}
    </section>
  )
}

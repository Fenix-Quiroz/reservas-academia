import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import canchas from '../../data/canchas.json'
import {
  crearReserva,
  cancelarReserva,
  registrarCliente,
  eliminarTokenReserva,
  guardarTokenReserva,
} from '../../almacen'
import { supabaseConfigurado } from '../../supabase'
import {
  cancelarReservaPublicaRemota,
  leerHorariosRemotos,
  precalentarRegistrarAdelantoYapeRemoto,
  registrarAdelantoYapeRemoto,
  verificarNumeroConfiableRemoto,
} from '../../supabaseData'
import type { ErrorReservaPublica, ResultadoCliente, ResultadoPago } from '../../supabaseData'
import { horarios, masCercana, fechaISO, sumarDias, DURACION_BLOQUE } from '../../reservas'
import type { HorarioDisponible } from '../../reservas'
import { optimizarComprobante, validarComprobante } from '../../pagos'
import type { BloqueoEvento, Campo, Cliente, Reserva } from '../../types.js'
import type { EtapaHorario, TurnoHorario } from '../../borradorReserva'
import type { NumeroBloqueado, NumeroConfiable } from '../../controlClientes'
import ProgresoReserva from '../cliente/ProgresoReserva'
import SelectorCampos from '../cliente/SelectorCampos'
import SelectorHorario from '../cliente/SelectorHorario'
import DatosReserva, { type DatosReservaActions } from '../cliente/DatosReserva'
import ReservaCompletada from '../cliente/ReservaCompletada'

type ResultadoReservaModal =
  | { reserva: Reserva; token?: string }
  | { error: ErrorReservaPublica; alternativa?: HorarioDisponible }

export interface AdminModalNuevaReservaProps {
  clienteInicial?: NumeroConfiable
  reservas: readonly Reserva[]
  bloqueosEventos: readonly BloqueoEvento[]
  confiables: readonly NumeroConfiable[]
  bloqueados: readonly NumeroBloqueado[]
  onClose: () => void
  onCreated: (reserva: Reserva) => void
}

const NOMBRES_PASOS = ['Campo', 'Día y hora', 'Tus datos'] as const

export default function AdminModalNuevaReserva({
  clienteInicial,
  reservas,
  bloqueosEventos,
  confiables,
  bloqueados,
  onClose,
  onCreated,
}: AdminModalNuevaReservaProps) {
  const [paso, setPaso] = useState<1 | 2 | 3 | 4>(1)
  const [cancha, setCancha] = useState<Campo | null>(null)
  const [dia, setDia] = useState(0)
  const [horas, setHoras] = useState(1)
  const [inicio, setInicio] = useState<number | null>(null)
  const [etapaHorario, setEtapaHorario] = useState<EtapaHorario>('dia')
  const [turnoHorario, setTurnoHorario] = useState<TurnoHorario | null>(null)
  const [semanaHorario, setSemanaHorario] = useState(0)
  const [horariosDisponibles, setHorariosDisponibles] = useState<HorarioDisponible[]>([])
  const [cargandoHorarios, setCargandoHorarios] = useState(false)
  const [errorConexion, setErrorConexion] = useState('')
  const [yo, setYo] = useState<Cliente | null>(() => clienteInicial
    ? { alias: clienteInicial.alias, celular: clienteInicial.celular }
    : null)
  const [hecha, setHecha] = useState<Reserva | null>(null)
  const tituloRef = useRef<HTMLHeadingElement>(null)
  const reservaPendienteRef = useRef<{ reserva: Reserva; token?: string } | null>(null)
  const fecha = fechaISO(sumarDias(dia))

  useEffect(() => {
    const anterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const cerrarConEscape = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') void cerrar()
    }
    window.addEventListener('keydown', cerrarConEscape)
    return () => {
      document.body.style.overflow = anterior
      window.removeEventListener('keydown', cerrarConEscape)
    }
  })

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => tituloRef.current?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [paso, hecha])

  useEffect(() => {
    if (paso !== 2 || !cancha) {
      setHorariosDisponibles([])
      setCargandoHorarios(false)
      return undefined
    }

    let montado = true
    setCargandoHorarios(true)
    const cargarHorarios = async () => {
      try {
        const actuales = supabaseConfigurado
          ? await leerHorariosRemotos(cancha.id, fecha)
          : horarios([...reservas], cancha.id, fecha, DURACION_BLOQUE, new Date(), bloqueosEventos)
        if (!montado) return
        setHorariosDisponibles(actuales)
        setErrorConexion('')
      } catch {
        if (montado) setErrorConexion('No pudimos cargar los horarios. Revisa la conexión e inténtalo de nuevo.')
      } finally {
        if (montado) setCargandoHorarios(false)
      }
    }
    void cargarHorarios()
    return () => {
      montado = false
    }
  }, [paso, cancha, fecha, reservas, bloqueosEventos])

  async function cancelarPendiente(): Promise<void> {
    const pendiente = reservaPendienteRef.current
    if (!pendiente) return
    reservaPendienteRef.current = null
    try {
      if (supabaseConfigurado && pendiente.token) {
        await cancelarReservaPublicaRemota(pendiente.reserva.id, pendiente.token)
      } else {
        await Promise.resolve(cancelarReserva(pendiente.reserva.id, pendiente.reserva.celular))
      }
      eliminarTokenReserva(pendiente.reserva.id)
    } catch {
      // El TTL de Supabase mantiene una reserva pendiente como salvaguarda.
    }
  }

  async function cerrar(): Promise<void> {
    await cancelarPendiente()
    onClose()
  }

  function elegirCancha(nuevaCancha: Campo): void {
    setCancha(nuevaCancha)
    setDia(0)
    setHoras(1)
    setInicio(null)
    setEtapaHorario('dia')
    setTurnoHorario(null)
    setSemanaHorario(0)
    setErrorConexion('')
    setPaso(2)
  }

  async function retroceder(): Promise<void> {
    if (paso === 3) await cancelarPendiente()
    setPaso((actual) => Math.max(1, actual - 1) as 1 | 2 | 3 | 4)
  }

  async function crearCliente(alias: string, celular: string): Promise<ResultadoCliente> {
    if (supabaseConfigurado) return { cliente: { alias, celular } }
    return Promise.resolve(registrarCliente(alias, celular))
  }

  async function verificarNumeroConfiable(celular: string): Promise<boolean> {
    if (supabaseConfigurado) return verificarNumeroConfiableRemoto(celular)
    const bloqueado = bloqueados.some((numero) => numero.activo && numero.celular === celular)
    return !bloqueado && confiables.some((numero) => numero.activo && numero.celular === celular)
  }

  async function reservarCliente(cliente: Cliente, hora: number, sinAdelanto = false): Promise<ResultadoReservaModal> {
    if (!cancha) return { error: 'conexion' }
    try {
      const resultado = await Promise.resolve(crearReserva({
        canchaId: cancha.id,
        fecha,
        inicio: hora,
        horas,
        montoTotal: cancha.precioHora * horas,
        ...cliente,
      }, sinAdelanto))

      if ('reserva' in resultado) {
        if (resultado.token) guardarTokenReserva(resultado.reserva.id, resultado.token, cliente.celular)
        if (resultado.reserva.pagoEstado === 'pendiente') {
          reservaPendienteRef.current = { reserva: resultado.reserva, token: resultado.token }
        }
        return resultado
      }

      if (resultado.error === 'ocupado') {
        let actuales = horariosDisponibles
        if (supabaseConfigurado) {
          try {
            actuales = await leerHorariosRemotos(cancha.id, fecha)
            setHorariosDisponibles(actuales)
          } catch {
            // Conserva la disponibilidad anterior para orientar al administrador.
          }
        }
        return { ...resultado, alternativa: masCercana(actuales, hora, horas) }
      }
      return resultado
    } catch {
      return { error: 'conexion' }
    }
  }

  async function enviarComprobante(
    reserva: Reserva,
    token: string | undefined,
    comprobante: File,
    idempotencia: string,
  ): Promise<ResultadoPago> {
    if (validarComprobante(comprobante)) return { error: 'archivo-invalido' }
    if (!supabaseConfigurado) return {}
    if (!token) return { error: 'reserva-no-autorizada' }
    return registrarAdelantoYapeRemoto(reserva.id, token, await optimizarComprobante(comprobante), idempotencia)
  }

  const actions: DatosReservaActions = {
    createClient: crearCliente,
    reserve: reservarCliente,
    checkTrustedNumber: verificarNumeroConfiable,
    prewarmPayment: precalentarRegistrarAdelantoYapeRemoto,
    submitPayment: enviarComprobante,
  }

  function guardarCliente(cliente: Cliente): void {
    setYo(cliente)
  }

  function finalizarReserva(reserva: Reserva): void {
    reservaPendienteRef.current = null
    setHecha(reserva)
    onCreated(reserva)
  }

  function reiniciar(): void {
    setPaso(1)
    setCancha(null)
    setDia(0)
    setHoras(1)
    setInicio(null)
    setEtapaHorario('dia')
    setTurnoHorario(null)
    setSemanaHorario(0)
    setHorariosDisponibles([])
    setHecha(null)
    setErrorConexion('')
  }

  const contenido = hecha ? (
    <div className="admin-modal-reserva-paso main-completada">
      <ReservaCompletada
        tituloRef={tituloRef}
        reserva={hecha}
        cancha={cancha ?? canchas.find((item) => item.id === hecha.canchaId) ?? canchas[0]}
        dia={dia}
        onFinish={reiniciar}
        onViewBookings={() => void cerrar()}
      />
    </div>
  ) : (
    <>
      <ProgresoReserva paso={paso} nombresPasos={NOMBRES_PASOS} />
      {paso > 1 && (
        <button className="navegacion-paso admin-modal-reserva-atras" type="button" onClick={() => void retroceder()}>
          ← Atrás
        </button>
      )}
      {errorConexion && <p className="error" role="alert">{errorConexion}</p>}
      {paso === 1 && (
        <div className="admin-modal-reserva-paso main-campos">
          <SelectorCampos campos={canchas} tituloRef={tituloRef} onSelect={elegirCancha} />
        </div>
      )}
      {paso === 2 && cancha && (
        <div className="admin-modal-reserva-paso main-horario">
          <SelectorHorario
            tituloRef={tituloRef}
            cancha={cancha}
            horariosDisponibles={horariosDisponibles}
            cargando={cargandoHorarios}
            dia={dia}
            etapa={etapaHorario}
            onEtapaChange={setEtapaHorario}
            turno={turnoHorario}
            onTurnoChange={setTurnoHorario}
            semana={semanaHorario}
            onSemanaChange={setSemanaHorario}
            onDiaChange={setDia}
            horas={horas}
            onHorasChange={setHoras}
            fecha={fecha}
            inicio={inicio}
            onSelectHour={setInicio}
            onClearHour={() => setInicio(null)}
            onConfirmHour={() => setPaso(3)}
          />
        </div>
      )}
      {paso === 3 && cancha && inicio !== null && (
        <div className="admin-modal-reserva-paso main-datos">
          <DatosReserva
            tituloRef={tituloRef}
            cancha={cancha}
            dia={dia}
            fecha={fecha}
            horas={horas}
            inicio={inicio}
            onInicioChange={setInicio}
            yo={yo}
            onRememberClient={guardarCliente}
            onForgetClient={() => setYo(null)}
            onBack={() => void retroceder()}
            onViewBookings={() => void cerrar()}
            onReserved={finalizarReserva}
            actions={actions}
          />
        </div>
      )}
    </>
  )

  return createPortal(
    <div className="admin-modal-reserva-capa" onMouseDown={(evento) => {
      if (evento.target === evento.currentTarget) void cerrar()
    }}>
      <section
        className="admin-modal-reserva"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-modal-reserva-titulo"
        onMouseDown={(evento) => evento.stopPropagation()}
      >
        <header className="admin-modal-reserva-cabecera">
          <div>
            <span className="admin-modal-reserva-kicker">Panel administrador</span>
            <h2 id="admin-modal-reserva-titulo">{hecha ? 'Reserva confirmada' : 'Nueva reserva'}</h2>
            <p>
              {yo ? <>A nombre de <strong>{yo.alias}</strong> · {yo.celular}</> : 'Completa los pasos con el diseño de la web.'}
            </p>
          </div>
          <button className="admin-modal-reserva-cerrar" type="button" aria-label="Cerrar nueva reserva" onClick={() => void cerrar()}>
            <X size={22} strokeWidth={2.5} aria-hidden="true" />
          </button>
        </header>
        <div className="admin-modal-reserva-cuerpo">
          {contenido}
        </div>
      </section>
    </div>,
    document.body,
  )
}

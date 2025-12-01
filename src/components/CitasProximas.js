import React, { useEffect, useState, useRef } from 'react';
import API from '../api';
import { useNavigate } from 'react-router-dom';
import './CitasProximas.css';
import moment from 'moment';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

export default function CitasProximas({ onAction }) {
  const [citasProximas, setCitasProximas] = useState([]);
  const [citasAtrasadas, setCitasAtrasadas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState('lista');
  const navigate = useNavigate();

  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [slotInfo, setSlotInfo] = useState(null);

  const [toast, setToast] = useState({ show: false, type: '', title: '', message: '' });

  const [form, setForm] = useState({
    pacienteId: '',
    pacienteNombre: '',
    especialidadId: '',
    fecha: '',
    hora: '',
    motivo: '',
    modoPago: 'efectivo',
    monto: ''
  });

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [consultaModalOpen, setConsultaModalOpen] = useState(false);
  const [selectedCita, setSelectedCita] = useState(null);
  const [notasMedicas, setNotasMedicas] = useState('');
  const [pacienteSuggestions, setPacienteSuggestions] = useState([]);
  const [especialidades, setEspecialidades] = useState([]);
  const suggestionsRef = useRef();

  const [recetaModalOpen, setRecetaModalOpen] = useState(false);
  const [medicamentos, setMedicamentos] = useState([{
    nombre: '',
    dosis: '',
    frecuencia: '',
    duracion: ''
  }]);
  const [observacionesReceta, setObservacionesReceta] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [mostrarAtrasadas, setMostrarAtrasadas] = useState(false);

  const showToast = (type, title, message) => {
    setToast({ show: true, type, title, message });
    setTimeout(() => {
      setToast({ show: false, type: '', title: '', message: '' });
    }, 4000);
  };

  const getMedicoId = () => {
    try {
      const u = JSON.parse(localStorage.getItem("user"));
      return u?._id || u?.id;
    } catch { return null; }
  };

  const fetchCitas = async () => {
    setLoading(true);
    try {
      const medicoId = getMedicoId();
      if (!medicoId) return setError("No hay médico en sesión.");

      const { data } = await API.get('/appointments', {
        params: {
          medicoId,
          campos: ['pacienteId.nombre', 'pacienteId.apellido', 'fecha', 'hora', 'estado', 'motivo', 'monto', 'especialidadId.nombre']
        }
      });
      const citasRaw = data.citas || [];

      const citas = citasRaw.map(c => ({
        ...c,
        paciente: c.pacienteId ? `${c.pacienteId.nombre} ${c.pacienteId.apellido}` : "-"
      }));

      const ahora = moment.utc();

      const proximas = [];
      const atrasadas = [];

      citas.filter(c => ["pendiente", "reprogramada"].includes(c.estado)).forEach(c => {
        const fechaHoraCita = moment.utc(`${moment.utc(c.fecha).format("YYYY-MM-DD")} ${c.hora}`, "YYYY-MM-DD HH:mm");
        const ahoraUTC = moment.utc();

        if (fechaHoraCita.isBefore(ahoraUTC)) atrasadas.push(c);
        else proximas.push(c);
      });

      setCitasProximas(proximas);
      setCitasAtrasadas(atrasadas);
    } catch (err) {
      console.error(err);
      setError("Error cargando citas");
    } finally {
      setLoading(false);
    }
  };

  const fetchEspecialidades = async () => {
    try {
      const { data } = await API.get('/appointments/especialidades');
      console.log('📋 Especialidades recibidas:', data);
      setEspecialidades(data.especialidades || []);
    } catch (err) {
      console.error("Error cargando especialidades", err);
    }
  };

  useEffect(() => {
    fetchCitas();
    fetchEspecialidades();
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        setPacienteSuggestions([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const eventosCalendario = citasProximas.map(c => {
    const start = new Date(moment.utc(c.fecha).format("YYYY-MM-DD") + "T" + c.hora);
    const end = new Date(start.getTime() + 30 * 60000);

    let bgColor = "#2A6FB0"; // azul por defecto
    if (c.estado === "pendiente") bgColor = "#57B894"; // verde
    if (c.estado === "reprogramada") bgColor = "#F59E0B"; // naranja
    if (c.estado === "cancelada") bgColor = "#FF6B6B"; // rojo
    if (c.estado === "completada") bgColor = c.recetaId ? "#1f4ed8" : "#6b7280"; // azul intenso si tiene receta, gris si no

    return {
      id: c._id,
      title: `${c.paciente} — ${c.motivo}`, // título limpio, sin íconos
      start,
      end,
      cita: c,
      bgColor
    };
  });

  const generarHorariosDisponibles = (fecha) => {
    if (!fecha) return [];
    const horarios = [];
    let start = moment(fecha).hour(10).minute(0);
    const end = moment(fecha).hour(16).minute(0);

    while (start <= end) {
      horarios.push(start.format("HH:mm"));
      start = start.add(30, 'minutes');
    }

    citasProximas.forEach(c => {
      // ✅ CORREGIDO: Usar .utc()
      if (moment.utc(c.fecha).format("YYYY-MM-DD") === fecha) {
        const index = horarios.indexOf(c.hora);
        if (index !== -1) horarios.splice(index, 1);
      }
    });

    return horarios;
  };

  const handleNavigate = (newDate) => {
    console.log('📅 Navegando a:', newDate);
    setCurrentDate(newDate);
  };

  const actualizarEstado = async (id, estado) => {
    try {
      await API.patch(`/appointments/${id}`, { estado });
      await fetchCitas();

      if (onAction) onAction();

      setEventModalOpen(false);

      if (estado === "completada") {
        showToast('success', 'Cita completada', 'La cita ha sido marcada como completada exitosamente');
      } else if (estado === "cancelada") {
        showToast('error', 'Cita cancelada', 'La cita ha sido cancelada');
      }
    } catch {
      showToast('error', 'Error', 'No se pudo actualizar el estado de la cita');
    }
  };

  const iniciarConsulta = (cita) => {
    setSelectedCita(cita);
    setNotasMedicas(cita.comentarios || '');
    setConsultaModalOpen(true);
  };

  const finalizarConsulta = async () => {
    try {
      if (!notasMedicas.trim()) {
        showToast('error', 'Error', 'Por favor agrega notas médicas');
        return;
      }

      const { data } = await API.patch(`/appointments/${selectedCita._id}/notas`, {
        comentarios: notasMedicas
      });

      if (data.success) {
        showToast('success', 'Consulta finalizada', 'Las notas médicas han sido guardadas');
        setConsultaModalOpen(false);
        setNotasMedicas('');
        setSelectedCita(null);
        await fetchCitas();

        if (onAction) onAction();
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Error', 'No se pudo finalizar la consulta');
    }
  };

  const generarReceta = () => {
    setRecetaModalOpen(true);
  };

  const agregarMedicamento = () => {
    setMedicamentos([...medicamentos, {
      nombre: '',
      dosis: '',
      frecuencia: '',
      duracion: ''
    }]);
  };

  const eliminarMedicamento = (index) => {
    const nuevos = medicamentos.filter((_, i) => i !== index);
    setMedicamentos(nuevos);
  };

  const actualizarMedicamento = (index, campo, valor) => {
    const nuevos = [...medicamentos];
    nuevos[index][campo] = valor;
    setMedicamentos(nuevos);
  };

  const guardarReceta = async () => {
    try {
      const medicamentosValidos = medicamentos.filter(m =>
        m.nombre && m.dosis && m.frecuencia && m.duracion
      );

      if (medicamentosValidos.length === 0) {
        showToast('error', 'Error', 'Debes agregar al menos un medicamento completo');
        return;
      }

      const { data } = await API.post('/appointments/receta', {
        citaId: selectedCita._id,
        medicamentos: medicamentosValidos,
        observaciones: observacionesReceta
      });

      if (data.success) {
        showToast('success', 'Receta creada', 'La receta ha sido guardada correctamente');
        setRecetaModalOpen(false);
        setMedicamentos([{
          nombre: '',
          dosis: '',
          frecuencia: '',
          duracion: ''
        }]);
        setObservacionesReceta('');
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Error', 'No se pudo crear la receta');
    }
  };

  const handleSelectEvent = (event) => {
    setSelectedEvent(event.cita);
    setEventModalOpen(true);
  };

  const handleSelectSlot = (slot) => {
    const fecha = moment(slot.start).format("YYYY-MM-DD");
    setForm(prev => ({
      ...prev,
      fecha,
      hora: "",
      pacienteId: "",
      pacienteNombre: "",
      especialidadId: "",
      motivo: "",
      monto: ""
    }));
    setSlotInfo(slot);
    setCreateModalOpen(true);
  };

  const handlePacienteSearch = async (e) => {
    const query = e.target.value;
    setForm(prev => ({ ...prev, pacienteNombre: query, pacienteId: '' }));

    if (query.length < 2) {
      setPacienteSuggestions([]);
      return;
    }

    try {
      const { data } = await API.get('/appointments/pacientes/buscar', { params: { q: query } });
      setPacienteSuggestions(data.usuarios || []);
    } catch (err) {
      console.error("Error buscando pacientes", err);
    }
  };

  const selectPaciente = (paciente) => {
    setForm(prev => ({
      ...prev,
      pacienteId: paciente._id,
      pacienteNombre: `${paciente.nombre} ${paciente.apellido}`
    }));
    setPacienteSuggestions([]);
  };

  const handleCreateAppointment = async (e) => {
    e.preventDefault();
    try {
      const medicoId = getMedicoId();
      if (!medicoId) {
        showToast('error', 'Error', 'No hay médico en sesión');
        return;
      }
      if (!form.pacienteId) {
        showToast('error', 'Error', 'Selecciona un paciente');
        return;
      }
      if (!form.especialidadId) {
        showToast('error', 'Error', 'Selecciona una especialidad');
        return;
      }

      const payload = {
        medicoId,
        pacienteId: form.pacienteId,
        especialidadId: form.especialidadId,
        fecha: form.fecha,
        hora: form.hora,
        motivo: form.motivo,
        modoPago: form.modoPago,
        monto: Number(form.monto)
      };

      const { data } = await API.post("/appointments", payload);
      if (data?.success) {
        showToast('success', 'Cita creada', 'La cita ha sido creada correctamente');
        setCreateModalOpen(false);
        await fetchCitas();

        if (onAction) onAction();
      } else {
        showToast('error', 'Error', data.message || 'No se pudo crear la cita');
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Error', 'No se pudo crear la cita');
    }
  };

  const getEstadoBadge = (estado) => {
    const estados = {
      'pendiente': { class: 'pendiente', text: 'Pendiente' },
      'confirmada': { class: 'confirmada', text: 'Confirmada' },
      'reprogramada': { class: 'reprogramada', text: 'Reprogramada' },
      'completada': { class: 'completada', text: 'Completada' },
      'cancelada': { class: 'cancelada', text: 'Cancelada' }
    };
    return estados[estado] || { class: 'pendiente', text: estado };
  };

  if (loading) return <p>Cargando...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div className="citas-proximas">
      {toast.show && (
        <div className={`toast-notification ${toast.type}`}>
          <div className="toast-icon">✓</div>
          <div className="toast-content">
            <div className="toast-title">{toast.title}</div>
            <p className="toast-message">{toast.message}</p>
          </div>
        </div>
      )}

      <h2>Próximas Citas</h2>

      <div className="tabs">
        <button className={view === "lista" ? "active" : ""} onClick={() => setView("lista")}>Lista</button>
        <button className={view === "calendario" ? "active" : ""} onClick={() => setView("calendario")}>Calendario</button>
      </div>

      {view === "lista" && citasAtrasadas.length > 0 && (
        <div style={{ marginBottom: '15px' }}>
          <button
            onClick={() => setMostrarAtrasadas(!mostrarAtrasadas)}
            style={{
              padding: '8px 16px',
              backgroundColor: mostrarAtrasadas ? '#dc3545' : '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            {mostrarAtrasadas ? '🔽 Ocultar' : '▶️ Mostrar'} Citas Atrasadas ({citasAtrasadas.length})
          </button>
        </div>
      )}

      {view === "lista" ? (
        <>
          {mostrarAtrasadas && citasAtrasadas.length > 0 && (
            <>
              <h3 className="atrasadas-title">Citas atrasadas</h3>
              <ul className="citas-list">
                {citasAtrasadas.map(c => (
                  <li key={c._id} className="cita-item atrasada">
                    <div className="cita-header">
                      <span>{c.paciente}</span>
                      <span className="estado atrasada">Atrasada</span>
                    </div>
                    <p><strong>Fecha:</strong> {moment.utc(c.fecha).format("DD/MM/YYYY")}</p>
                    <p><strong>Hora:</strong> {c.hora}</p>
                    <p><strong>Motivo:</strong> {c.motivo}</p>
                    <p><strong>Costo:</strong> ${c.monto}</p>
                    <div className="acciones">
                      <button className="btn-completar" onClick={() => actualizarEstado(c._id, "completada")}>Completar</button>
                      <button className="btn-cancelar" onClick={() => actualizarEstado(c._id, "cancelada")}>Cancelar</button>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}

          {citasProximas.length === 0 ? <p>No hay citas programadas.</p> : (
            <ul className="citas-list">
              {citasProximas.map(c => {
                const badge = getEstadoBadge(c.estado);
                return (
                  <li key={c._id} className="cita-item">
                    <div className="cita-header">
                      <span>{c.paciente}</span>
                      <span className={`estado ${badge.class}`}>{badge.text}</span>
                    </div>
                    <p><strong>Fecha:</strong> {moment.utc(c.fecha).format("DD/MM/YYYY")}</p>
                    <p><strong>Hora:</strong> {c.hora}</p>
                    {c.especialidadId && (
                      <p><strong>Especialidad:</strong> {c.especialidadId.nombre}</p>
                    )}
                    <p><strong>Motivo:</strong> {c.motivo}</p>
                    <p><strong>Costo:</strong> ${c.monto}</p>
                    <div className="acciones">
                      <button className="btn-iniciar" onClick={() => iniciarConsulta(c)}>Iniciar Consulta</button>
                      <button className="btn-cancelar" onClick={() => actualizarEstado(c._id, "cancelada")}>Cancelar</button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      ) : (
        <Calendar
          localizer={localizer}
          events={eventosCalendario}
          selectable
          onSelectEvent={handleSelectEvent}
          onSelectSlot={handleSelectSlot}
          onNavigate={handleNavigate}
          date={currentDate}
          startAccessor="start"
          endAccessor="end"
          style={{ height: 600 }}
          views={['month', 'week', 'day', 'agenda']}
          defaultView="month"
        />
      )}

      {createModalOpen && (
        <div className="sf-modal-backdrop" onClick={() => setCreateModalOpen(false)}>
          <div className="sf-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Crear nueva cita</h3>
            </div>
            <form onSubmit={handleCreateAppointment}>
              <div className="modal-body">
                <div className="create-form">
                  <div className="form-group">
                    <label>Paciente</label>
                    <div ref={suggestionsRef} className="autocomplete-container">
                      <input
                        type="text"
                        value={form.pacienteNombre || ''}
                        onChange={handlePacienteSearch}
                        placeholder="Escribe el nombre del paciente"
                        autoComplete="off"
                        required
                      />
                      {pacienteSuggestions.length > 0 && (
                        <ul className="suggestions-list">
                          {pacienteSuggestions.map(p => (
                            <li key={p._id} onClick={() => selectPaciente(p)}>
                              {p.nombre} {p.apellido}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Especialidad</label>
                    <select
                      value={form.especialidadId}
                      onChange={e => setForm({ ...form, especialidadId: e.target.value })}
                      required
                    >
                      <option value="">Selecciona una especialidad</option>
                      {especialidades.map(esp => (
                        <option key={esp._id} value={esp._id}>
                          {esp.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Fecha</label>
                    <input
                      type="date"
                      value={form.fecha}
                      onChange={e => setForm({ ...form, fecha: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Hora</label>
                    <select
                      value={form.hora}
                      onChange={e => setForm({ ...form, hora: e.target.value })}
                      required
                    >
                      <option value="">Selecciona hora</option>
                      {generarHorariosDisponibles(form.fecha).map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Motivo</label>
                    <textarea
                      value={form.motivo}
                      onChange={e => setForm({ ...form, motivo: e.target.value })}
                      placeholder="Describe el motivo de la consulta"
                      rows="3"
                    />
                  </div>

                  <div className="form-group">
                    <label>Monto</label>
                    <input
                      type="number"
                      value={form.monto}
                      onChange={e => setForm({ ...form, monto: e.target.value })}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn-primary">Crear</button>
                <button type="button" className="btn-close" onClick={() => setCreateModalOpen(false)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {eventModalOpen && selectedEvent && (
        <div className="sf-modal-backdrop" onClick={() => setEventModalOpen(false)}>
          <div className="sf-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Detalles de la cita</h3>
            </div>
            <div className="modal-body">
              <p><strong>Paciente:</strong> {selectedEvent.paciente}</p>
              {selectedEvent.especialidadId && (
                <p><strong>Especialidad:</strong> {selectedEvent.especialidadId.nombre}</p>
              )}
              <p><strong>Fecha:</strong> {moment.utc(selectedEvent.fecha).format("DD/MM/YYYY")}</p>
              <p><strong>Hora:</strong> {selectedEvent.hora}</p>
              <p><strong>Motivo:</strong> {selectedEvent.motivo}</p>
              <p><strong>Costo:</strong> ${selectedEvent.monto}</p>
            </div>
            <div className="modal-actions">
              <button className="btn-iniciar" onClick={() => {
                setEventModalOpen(false);
                iniciarConsulta(selectedEvent);
              }}>Iniciar Consulta</button>
              <button className="btn-cancelar" onClick={() => actualizarEstado(selectedEvent._id, "cancelada")}>Cancelar</button>
              <button className="btn-close" onClick={() => setEventModalOpen(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {consultaModalOpen && selectedCita && (
        <div className="sf-modal-backdrop" onClick={() => setConsultaModalOpen(false)}>
          <div className="sf-modal consulta-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Consulta - {selectedCita.paciente}</h3>
            </div>
            <div className="modal-body">
              <div className="datos-cita">
                <h4>📋 Datos de la Cita</h4>
                <p><strong>Fecha:</strong> {moment.utc(selectedCita.fecha).format("DD/MM/YYYY")}</p>
                <p><strong>Hora:</strong> {selectedCita.hora}</p>
                {selectedCita.especialidadId && (
                  <p><strong>Especialidad:</strong> {selectedCita.especialidadId.nombre}</p>
                )}
                <p><strong>Motivo:</strong> {selectedCita.motivo}</p>
                <p><strong>Costo:</strong> ${selectedCita.monto}</p>
              </div>

              <div className="notas-medicas">
                <h4>📝 Notas Médicas</h4>
                <textarea
                  value={notasMedicas}
                  onChange={(e) => setNotasMedicas(e.target.value)}
                  placeholder="Escribe aquí las observaciones..."
                  rows="8"
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '5px',
                    border: '1px solid #ccc',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-receta" onClick={generarReceta}>📄 Generar Receta</button>
              <button className="btn-finalizar" onClick={finalizarConsulta}>✅ Finalizar</button>
              <button className="btn-close" onClick={() => setConsultaModalOpen(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {recetaModalOpen && (
        <div className="sf-modal-backdrop" onClick={() => setRecetaModalOpen(false)}>
          <div className="sf-modal receta-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📄 Generar Receta Médica</h3>
            </div>
            <div className="modal-body">
              <div className="medicamentos-lista">
                <h4>Medicamentos</h4>
                {medicamentos.map((med, index) => (
                  <div key={index} className="medicamento-item">
                    <div className="medicamento-header">
                      <span>Medicamento {index + 1}</span>
                      {medicamentos.length > 1 && (
                        <button
                          type="button"
                          className="btn-eliminar-med"
                          onClick={() => eliminarMedicamento(index)}
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    <input
                      type="text"
                      placeholder="Nombre del medicamento"
                      value={med.nombre}
                      onChange={(e) => actualizarMedicamento(index, 'nombre', e.target.value)}
                      style={{ width: '100%', marginBottom: '8px', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                    />

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <input
                        type="text"
                        placeholder="Dosis (ej: 500mg)"
                        value={med.dosis}
                        onChange={(e) => actualizarMedicamento(index, 'dosis', e.target.value)}
                        style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                      />

                      <input
                        type="text"
                        placeholder="Frecuencia (ej: Cada 8 hrs)"
                        value={med.frecuencia}
                        onChange={(e) => actualizarMedicamento(index, 'frecuencia', e.target.value)}
                        style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                      />
                    </div>

                    <input
                      type="text"
                      placeholder="Duración (ej: 7 días)"
                      value={med.duracion}
                      onChange={(e) => actualizarMedicamento(index, 'duracion', e.target.value)}
                      style={{ width: '100%', marginTop: '8px', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                    />
                  </div>
                ))}

                <button
                  type="button"
                  className="btn-agregar-med"
                  onClick={agregarMedicamento}
                >
                  + Agregar otro medicamento
                </button>
              </div>

              <div className="observaciones-receta">
                <h4>Observaciones</h4>
                <textarea
                  value={observacionesReceta}
                  onChange={(e) => setObservacionesReceta(e.target.value)}
                  placeholder="Observaciones adicionales..."
                  rows="4"
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '5px',
                    border: '1px solid #ccc',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-guardar-receta" onClick={guardarReceta}>
                Guardar Receta
              </button>
              <button className="btn-close" onClick={() => setRecetaModalOpen(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
import React, { useEffect, useState } from 'react';
import API from '../api';
import './CitasProximas.css';
import moment from 'moment';

export default function CitasAtrasadas({ onAction }) {
  const [citasAtrasadas, setCitasAtrasadas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [form, setForm] = useState({
    pacienteId: '',
    especialidadId: '', // ✅ AGREGAR ESTO

    fecha: '',
    hora: '',
    motivo: '',
    modoPago: 'efectivo',
    monto: ''
  });
  const [citaOriginalId, setCitaOriginalId] = useState(null);

  const getMedicoId = () => {
    try {
      const u = JSON.parse(localStorage.getItem("user"));
      return u?._id || u?.id;
    } catch {
      return null;
    }
  };

  const fetchCitas = async () => {
    setLoading(true);
    setError('');
    try {
      const medicoId = getMedicoId();
      if (!medicoId) {
        setError("No hay médico en sesión.");
        setLoading(false);
        return;
      }

      const { data } = await API.get('/appointments', { params: { medicoId } });
      const citas = data.citas || [];

      // ✅ CAMBIO: Usar moment para comparar fecha Y hora
      const ahora = moment();

      const atrasadas = citas
        .filter(c => ["pendiente", "reprogramada"].includes(c.estado))
        .filter(c => {
          // ✅ Construir fecha+hora completa de la cita
          const fechaHoraCita = moment(`${moment(c.fecha).utc().format("YYYY-MM-DD")} ${c.hora}`, "YYYY-MM-DD HH:mm");
          return fechaHoraCita.isBefore(ahora); // ✅ Comparar con momento actual
        });

      setCitasAtrasadas(atrasadas);
    } catch (err) {
      console.error(err);
      setError("Error cargando citas atrasadas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCitas();
  }, []);

  const actualizarEstado = async (id, estado) => {
    try {
      console.log('🔍 ID de la cita:', id);
      console.log('🔍 Nuevo estado:', estado);
      await API.patch(`/appointments/${id}`, { estado });
      await fetchCitas();
      if (onAction) onAction();
    } catch (err) {
      console.error('Error:', err);
      alert("Error actualizando el estado.");
    }
  };

  const handleReprogramar = (c, days = 1) => {
    setForm({
      pacienteId: c.pacienteId?._id || c.pacienteId,
      especialidadId: c.especialidadId?._id || c.especialidadId, // ✅ AGREGAR ESTO
      fecha: moment().add(days, "days").format("YYYY-MM-DD"),
      hora: c.hora || '09:00',
      motivo: c.motivo || '',
      modoPago: c.modoPago || 'efectivo',
      monto: c.monto ?? ''
    });
    setCitaOriginalId(c._id);
    setCreateModalOpen(true);
  };

  const handleCreateAppointment = async (e) => {
    e.preventDefault();
    try {
      if (!citaOriginalId) return alert("No hay cita para reprogramar");

      console.log('📤 Reprogramando cita:', citaOriginalId);
      console.log('📤 Datos:', {
        estado: 'reprogramada',
        nuevaFecha: form.fecha,
        nuevoHora: form.hora,
        especialidadId: form.especialidadId, // ✅ AGREGAR ESTO
        motivo: form.motivo,
        monto: Number(form.monto || 0)
      });

      const { data } = await API.patch(`/appointments/${citaOriginalId}`, {
        estado: 'reprogramada',
        nuevaFecha: form.fecha,
        nuevoHora: form.hora,
        especialidadId: form.especialidadId, // ✅ AGREGAR ESTO
        motivo: form.motivo,
        monto: Number(form.monto || 0)
      });

      console.log('✅ Respuesta:', data);

      if (data?.success) {
        alert("Cita reprogramada correctamente");
        setCreateModalOpen(false);
        setCitaOriginalId(null);
        await fetchCitas();
        if (typeof onAction === 'function') onAction();
      } else {
        alert(data.message || "No se pudo reprogramar la cita");
      }
    } catch (err) {
      console.error('❌ Error completo:', err);
      console.error('❌ Response:', err.response?.data);
      alert("Error al reprogramar la cita: " + (err.response?.data?.message || err.message));
    }
  };

  if (loading) return <p>Cargando...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div className="citas-proximas">
      <h2>Citas atrasadas</h2>

      {citasAtrasadas.length === 0 ? (
        <p>No hay citas atrasadas.</p>
      ) : (
        <ul className="citas-list">
          {citasAtrasadas.map(c => (
            <li key={c._id} className="cita-item atrasada">
              <div className="cita-header">
                <span>{c.pacienteId?.nombre} {c.pacienteId?.apellido}</span>
                <span className="estado atrasada">Atrasada</span>
              </div>

              <p><strong>Fecha:</strong> {moment(c.fecha).utc().format("DD/MM/YYYY")}</p>
              <p><strong>Hora:</strong> {c.hora}</p>
              <p><strong>Motivo:</strong> {c.motivo}</p>
              <p><strong>Costo:</strong> ${c.monto}</p>

              <div className="acciones">
                <button className="btn-completar" onClick={() => actualizarEstado(c._id, "completada")}>Completar</button>
                <button className="btn-cancelar" onClick={() => actualizarEstado(c._id, "cancelada")}>Cancelar</button>
                <button className="btn-reprogramar" onClick={() => handleReprogramar(c, 7)}>Reprogramar (+7 días)</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {createModalOpen && (
        <div className="sf-modal-backdrop" onClick={() => setCreateModalOpen(false)}>
          <div className="sf-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Reprogramar cita</h3>

            <form onSubmit={handleCreateAppointment} className="create-form">
              <label>Paciente (ID)</label>
              <input
                type="text"
                value={form.pacienteId}
                onChange={e => setForm(prev => ({ ...prev, pacienteId: e.target.value }))}
                required
                disabled
                style={{ backgroundColor: '#f5f5f5' }}
              />

              <label>Fecha</label>
              <input
                type="date"
                value={form.fecha}
                onChange={e => setForm(prev => ({ ...prev, fecha: e.target.value }))}
                required
              />

              <label>Hora</label>
              <input
                type="time"
                value={form.hora}
                onChange={e => setForm(prev => ({ ...prev, hora: e.target.value }))}
                required
              />

              <label>Motivo</label>
              <input
                type="text"
                value={form.motivo}
                onChange={e => setForm(prev => ({ ...prev, motivo: e.target.value }))}
              />

              <label>Monto</label>
              <input
                type="number"
                value={form.monto}
                onChange={e => setForm(prev => ({ ...prev, monto: e.target.value }))}
              />

              <div className="modal-actions">
                <button type="submit" className="btn-primary">Guardar</button>
                <button type="button" className="btn-close" onClick={() => setCreateModalOpen(false)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
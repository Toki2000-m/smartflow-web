import React, { useEffect, useState } from 'react';
import API from '../api';

export default function DashboardResumen({ refrescarFlag }) { // ⬅️ Recibe prop para refrescar
  const [resumen, setResumen] = useState({
    citasProximas: 0,
    citasAtrasadas: 0,
    pacientesAtendidos: 0,
    citasCompletadas: 0,
  });

  const getMedicoId = () => {
    try {
      const u = JSON.parse(localStorage.getItem("user"));
      return u?._id || u?.id;
    } catch { return null; }
  };

  const fetchResumen = async () => {
    const medicoId = getMedicoId();
    if (!medicoId) return;

    try {
      // 1️⃣ Citas próximas y atrasadas
      const { data } = await API.get('/appointments', { params: { medicoId } });
      const citas = data.citas || [];
      const hoy = new Date();
      let proximas = 0;
      let atrasadas = 0;
      citas.forEach(c => {
        if (c.estado === 'pendiente') {
          const fechaCita = new Date(c.fecha);
          if (fechaCita < hoy) atrasadas++;
          else proximas++;
        }
      });

      // 2️⃣ Historial de citas completadas
      const { data: historialData } = await API.get(`/appointments/historial/${medicoId}`);
      const historial = historialData.historial || [];
      const pacientesAtendidos = new Set(historial.map(c => c.pacienteId._id)).size;

      setResumen({
        citasProximas: proximas,
        citasAtrasadas: atrasadas,
        pacientesAtendidos,
        citasCompletadas: historial.length,
      });
    } catch (err) {
      console.error("Error obteniendo resumen del dashboard:", err);
    }
  };

  useEffect(() => {
    fetchResumen();
  }, [refrescarFlag]); // ⬅️ Cada vez que cambie el flag se refresca

  return (
    <div className="dashboard-resumen">
      <h2>Bienvenido, Victor</h2>
      <div className="cards">
        <div className="card">
          <span className="icon">event_available</span>
          <div className="info">
            <p>{resumen.citasProximas}</p>
            <small>Citas próximas</small>
          </div>
        </div>
        <div className="card">
          <span className="icon">warning</span>
          <div className="info">
            <p>{resumen.citasAtrasadas}</p>
            <small>Citas atrasadas</small>
          </div>
        </div>
        <div className="card">
          <span className="icon">groups</span>
          <div className="info">
            <p>{resumen.pacientesAtendidos}</p>
            <small>Pacientes atendidos</small>
          </div>
        </div>
        <div className="card">
          <span className="icon">history</span>
          <div className="info">
            <p>{resumen.citasCompletadas}</p>
            <small>Citas completadas</small>
          </div>
        </div>
      </div>
    </div>
  );
}

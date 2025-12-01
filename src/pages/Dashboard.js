import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import './Dashboard.css';
import API from '../api';

import CitasProximas from '../components/CitasProximas';
import CitasAtrasadas from '../components/CitasAtrasadas';
import Historial from '../components/Historial';
import MiPerfil from '../components/MiPerfil';
import Metricas from '../components/Metricas';

export default function Dashboard({ user, onLogout }) {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState('inicio');

  const [citasCounts, setCitasCounts] = useState({
    atrasadas: 0,
    proximas: 0,
    completadas: 0,
    satisfaccion: 0
  });
  const [loadingCounts, setLoadingCounts] = useState(true);
  const [errorCounts, setErrorCounts] = useState('');

  const getMedicoId = () => {
    try {
      const u = JSON.parse(localStorage.getItem('user'));
      return u?._id || u?.id;
    } catch {
      return null;
    }
  };

  const fetchCounts = useCallback(async () => {
    try {
      const medicoId = getMedicoId();
      if (!medicoId) return;

      setLoadingCounts(true); // 🔥 Mostrar loading al refrescar

      const { data } = await API.get('/appointments/dashboard/resumen', {
        params: { medicoId }
      });

      console.log('📊 Datos recibidos del backend:', data); // ⬅️ AGREGAR ESTO

      setCitasCounts({
        atrasadas: data.citasAtrasadas || 0,
        proximas: data.citasProgramadas || 0,
        completadas: data.citasCompletadas || 0,
        satisfaccion: data.satisfaccion || 0
      });

      setErrorCounts('');
    } catch (err) {
      console.error('Error cargando resumen:', err);
      setErrorCounts('Error cargando conteos');
    } finally {
      setLoadingCounts(false);
    }
  }, []);

  // Primera carga
  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    fetchCounts();
  }, [user, navigate, fetchCounts]);

  // 🔥 NUEVO: Refrescar cuando vuelves al inicio
  useEffect(() => {
    if (activeView === 'inicio') {
      fetchCounts();
    }
  }, [activeView, fetchCounts]);

  if (!user) return null;

  const renderInicio = () => (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h2>
            Bienvenido, <span className="user-name">{user.nombre}</span>
          </h2>
          <p className="page-sub">
            <span className="material-icons" style={{ fontSize: '18px' }}>calendar_today</span>
            {new Date().toLocaleDateString('es-MX', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>
      </div>

      {/* Grid de tarjetas */}
      <div className="home-grid">

        {/* Citas Próximas */}
        <div
          className="card"
          onClick={() => setActiveView('citas')}
          data-color="primary"
        >
          <div className="card-top">
            <span className="material-icons card-icon">event_available</span>
            <div className={`card-number ${loadingCounts ? 'loading' : ''}`}>
              {loadingCounts ? '' : errorCounts ? '—' : citasCounts.proximas}
            </div>
          </div>
          <h4>Citas Programadas</h4>
          <p className="muted">Consultas próximas</p>
        </div>

        {/* Citas Atrasadas */}
        <div
          className="card"
          onClick={() => setActiveView('citasAtrasadas')}
          data-color="danger"
        >
          <div className="card-top">
            <span className="material-icons card-icon">schedule</span>
            <div className={`card-number ${loadingCounts ? 'loading' : ''}`}>
              {loadingCounts ? '' : errorCounts ? '—' : citasCounts.atrasadas}
            </div>
          </div>
          <h4>Citas Atrasadas</h4>
          <p className="muted">Requieren atención</p>
        </div>

        {/* Citas Completadas */}
        <div
          className="card"
          onClick={() => setActiveView('historial')}
          data-color="secondary"
        >
          <div className="card-top">
            <span className="material-icons card-icon">verified</span>
            <div className={`card-number ${loadingCounts ? 'loading' : ''}`}>
              {loadingCounts ? '' : errorCounts ? '—' : citasCounts.completadas}
            </div>
          </div>
          <h4>Citas Completadas</h4>
          <p className="muted">Este mes</p>
        </div>

        {/* Satisfacción */}
        <div className="card" data-color="secondary">
          <div className="card-top">
            <span className="material-icons card-icon">trending_up</span>
            <div className={`card-number ${loadingCounts ? 'loading' : ''}`}>
              {loadingCounts ? '' : errorCounts ? '—' : `${citasCounts.satisfaccion}%`}
            </div>
          </div>
          <h4>Satisfacción</h4>
          <p className="muted">Calificación promedio</p>
        </div>
      </div>
    </div>
  );

  const renderView = () => {
    switch (activeView) {
      case 'inicio':
        return renderInicio();
      case 'citas':
        return <CitasProximas onAction={fetchCounts} />;
      case 'citasAtrasadas':
        return <CitasAtrasadas onAction={fetchCounts} />;
      case 'historial':
        return <Historial medicoId={user._id} />;
      case 'perfil':
        return <MiPerfil />;
      case 'metricas':
        return <Metricas />;
      default:
        return null;
    }
  };

  return (
    <div className="dashboard-wrapper">
      <Sidebar activeView={activeView} setActiveView={setActiveView} />
      <div className="dashboard-main">
        <Navbar nombre={user.nombre} onLogout={onLogout} />
        <main className="dashboard-view">
          {renderView()}
        </main>
      </div>
    </div>
  );
}
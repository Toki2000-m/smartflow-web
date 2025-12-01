import React from 'react';
import './Sidebar.css';

export default function Sidebar({ activeView, setActiveView }) {
  const menuItems = [
    { id: 'inicio', label: 'Inicio', icon: 'home' },
    { id: 'citas', label: 'Próximas Citas', icon: 'event_available' },
    { id: 'citasAtrasadas', label: 'Citas Atrasadas', icon: 'schedule' },
    { id: 'historial', label: 'Historial de Pacientes', icon: 'history' },
    { id: 'perfil', label: 'Mi Perfil', icon: 'person' },
    { id: 'metricas', label: 'Métricas', icon: 'trending_up' }
  ];

  return (
    <aside className="sidebar">
      {/* Header del Sidebar */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <span className="material-icons">local_hospital</span>
        </div>
        <h1 className="sidebar-title">SmartFlow</h1>
        <small className="sidebar-subtitle">Médico</small>
      </div>

      {/* Menú */}
      <nav className="sidebar-menu">
        {menuItems.map(item => (
          <div
            key={item.id}
            className={`sidebar-item ${activeView === item.id ? 'active' : ''}`}
            onClick={() => setActiveView(item.id)}
          >
            <span className="material-icons">{item.icon}</span>
            <span>{item.label}</span>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        SmartFlow Médico v1.0
      </div>
    </aside>
  );
}

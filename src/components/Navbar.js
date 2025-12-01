import React, { useState, useEffect } from 'react';
import API from '../api';
import socket from '../config/socket'; // ✅ Importar socket configurado
import './Navbar.css';

export default function Navbar({ nombre, onLogout }) {
  const [notificaciones, setNotificaciones] = useState([]);
  const [open, setOpen] = useState(false);
  const [ultimaLectura, setUltimaLectura] = useState(null);

  // Cargar notificaciones al montar
  useEffect(() => {
    fetchNotificaciones();
    const interval = setInterval(fetchNotificaciones, 10000);
    return () => clearInterval(interval);
  }, []);

  // Conexión socket (ahora usa el socket importado)
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return;

    // Unirse a la sala del usuario
    socket.emit('join', user.id);

    // Escuchar nuevas notificaciones
    const handleNuevaNotificacion = (noti) => {
      console.log('📩 Nueva notificación recibida:', noti);
      setNotificaciones(prev => {
        const existe = prev.some(n => n._id === noti._id);
        if (existe) return prev;
        return [{ ...noti, leida: false }, ...prev];
      });
    };

    socket.on('nuevaNotificacion', handleNuevaNotificacion);

    // Cleanup: solo remover el listener, NO desconectar el socket
    return () => {
      socket.off('nuevaNotificacion', handleNuevaNotificacion);
    };
  }, []);

  // Obtener notificaciones del backend
  const fetchNotificaciones = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      if (!user) return;
      const { data } = await API.get(`/notificaciones/${user.id}`);
      setNotificaciones(data.notificaciones);
    } catch (err) {
      console.error('Error al cargar notificaciones:', err);
    }
  };

  // Marcar como leídas
  const marcarLeidas = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      if (!user) return;
      await API.patch(`/notificaciones/marcar-leidas/${user.id}`);
      await fetchNotificaciones();
    } catch (err) {
      console.error('Error al marcar notificaciones como leídas:', err);
    }
  };

  // Abrir/cerrar dropdown
  const toggleDropdown = async () => {
    const nuevoEstado = !open;
    setOpen(nuevoEstado);
    if (nuevoEstado) {
      await marcarLeidas();
      setUltimaLectura(new Date());
    }
  };

  // Calcular nuevas desde la última lectura
  const nuevasDesdeLectura = notificaciones.filter(n => {
    const fecha = new Date(n.createdAt);
    return !n.leida && (!ultimaLectura || fecha > ultimaLectura);
  }).length;

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="user-pill">
          <span className="material-icons" style={{ fontSize: 20 }}>person</span>
          <span className="user-name">{nombre}</span>
        </div>
      </div>

      <div className="topbar-right">
        <div className="user-actions">
          <div className="notification-wrapper" onClick={toggleDropdown}>
            <span className="material-icons notification-icon">notifications</span>
            {nuevasDesdeLectura > 0 && (
              <span className="notification-badge">{nuevasDesdeLectura}</span>
            )}
            {open && (
              <div className="notification-dropdown">
                {notificaciones.length === 0 ? (
                  <p className="no-notifications">No hay notificaciones</p>
                ) : (
                  notificaciones.map(n => (
                    <div key={n._id} className={`notification-item ${n.leida ? 'leida' : 'nueva'}`}>
                      {n.mensaje}
                      <br />
                      <small className="notification-date">
                        {new Date(n.createdAt).toLocaleString()}
                      </small>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <button className="btn-logout" onClick={onLogout}>Cerrar sesión</button>
        </div>
      </div>
    </header>
  );
}
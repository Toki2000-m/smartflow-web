// src/components/Topbar.js
import React, { useState, useEffect } from 'react';
import { FiBell } from 'react-icons/fi';
import API from '../api';

export default function Topbar({ user }) {
  const [notificaciones, setNotificaciones] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fetchNotificaciones = async () => {
      try {
        const response = await API.get(`/notificaciones/${user.id}`);
        setNotificaciones(response.data.notificaciones);
      } catch (err) {
        console.error(err);
      }
    };

    fetchNotificaciones();
    const interval = setInterval(fetchNotificaciones, 5000); // refresca cada 5s
    return () => clearInterval(interval);
  }, [user.id]);

  return (
    <div className="topbar" style={{ display: 'flex', justifyContent: 'flex-end', padding: '10px 20px', background: '#fff', alignItems: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
      <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setOpen(!open)}>
        <FiBell size={24} />
        {notificaciones.length > 0 && (
          <span style={{
            position: 'absolute',
            top: '-5px',
            right: '-5px',
            background: 'red',
            color: '#fff',
            borderRadius: '50%',
            fontSize: '12px',
            padding: '2px 6px'
          }}>
            {notificaciones.length}
          </span>
        )}
        {open && (
          <div style={{
            position: 'absolute',
            top: '30px',
            right: 0,
            width: '300px',
            maxHeight: '400px',
            overflowY: 'auto',
            background: '#fff',
            border: '1px solid #ddd',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 100
          }}>
            {notificaciones.length === 0 ? (
              <p style={{ padding: '10px' }}>No hay notificaciones</p>
            ) : (
              notificaciones.map((n) => (
                <div key={n._id} style={{ padding: '10px', borderBottom: '1px solid #eee', fontSize: '14px' }}>
                  {n.mensaje}
                  <br />
                  <small style={{ color: '#999' }}>{new Date(n.fechaEnvio).toLocaleString()}</small>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import API from '../api';
import './MiPerfil.css';
import { ToastContainer } from './ToastNotification';

export default function MiPerfil() {
  const [perfil, setPerfil] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [especialidades, setEspecialidades] = useState([]);
  const [toasts, setToasts] = useState([]);

  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    cedula: '',
    especialidades: [],
    tarifaConsulta: '',
    descripcion: '',
    experiencia: '',
    ubicacion: {
      direccion: '',
      ciudad: ''
    }
  });

  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type, duration: 3000 }]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const getUserId = () => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      return user?._id || user?.id;
    } catch {
      return null;
    }
  };

  const fetchPerfil = async () => {
    setLoading(true);
    try {
      const userId = getUserId();
      if (!userId) {
        showToast('No se encontró usuario en sesión', 'error');
        return;
      }

      const { data } = await API.get(`/perfil/${userId}`);
      if (data.success) {
        setPerfil(data.usuario);
        setFormData({
          nombre: data.usuario.nombre || '',
          apellido: data.usuario.apellido || '',
          email: data.usuario.email || '',
          telefono: data.usuario.telefono || '',
          cedula: data.usuario.medicoInfo?.cedula || '',
          especialidades: data.usuario.medicoInfo?.especialidades?.map(e => e._id) || [],
          tarifaConsulta: data.usuario.medicoInfo?.tarifaConsulta || '',
          descripcion: data.usuario.medicoInfo?.descripcion || '',
          experiencia: data.usuario.medicoInfo?.experiencia || '',
          ubicacion: {
            direccion: data.usuario.medicoInfo?.ubicacion?.direccion || '',
            ciudad: data.usuario.medicoInfo?.ubicacion?.ciudad || ''
          }
        });
      }
    } catch (error) {
      console.error('Error cargando perfil:', error);
      showToast('Error al cargar el perfil', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchEspecialidades = async () => {
    try {
      const { data } = await API.get('/appointments/especialidades');
      setEspecialidades(data.especialidades || []);
    } catch (error) {
      console.error('Error cargando especialidades:', error);
    }
  };

  useEffect(() => {
    fetchPerfil();
    fetchEspecialidades();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleEspecialidadesChange = (e) => {
    const options = Array.from(e.target.selectedOptions);
    const values = options.map(opt => opt.value);
    setFormData(prev => ({ ...prev, especialidades: values }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const userId = getUserId();
      const { data } = await API.put(`/perfil/${userId}`, formData);

      if (data.success) {
        showToast('Perfil actualizado correctamente', 'success');
        setPerfil(data.usuario);
        setEditMode(false);
        
        // Actualizar localStorage si cambió nombre
        const user = JSON.parse(localStorage.getItem('user'));
        user.nombre = data.usuario.nombre;
        user.apellido = data.usuario.apellido;
        localStorage.setItem('user', JSON.stringify(user));
      }
    } catch (error) {
      console.error('Error actualizando perfil:', error);
      showToast('Error al actualizar el perfil', 'error');
    }
  };

  const cancelEdit = () => {
    setEditMode(false);
    if (perfil) {
      setFormData({
        nombre: perfil.nombre || '',
        apellido: perfil.apellido || '',
        email: perfil.email || '',
        telefono: perfil.telefono || '',
        cedula: perfil.medicoInfo?.cedula || '',
        especialidades: perfil.medicoInfo?.especialidades?.map(e => e._id) || [],
        tarifaConsulta: perfil.medicoInfo?.tarifaConsulta || '',
        descripcion: perfil.medicoInfo?.descripcion || '',
        experiencia: perfil.medicoInfo?.experiencia || '',
        ubicacion: {
          direccion: perfil.medicoInfo?.ubicacion?.direccion || '',
          ciudad: perfil.medicoInfo?.ubicacion?.ciudad || ''
        }
      });
    }
  };

  if (loading) return <div className="loading">Cargando perfil...</div>;
  if (!perfil) return <div className="error">No se pudo cargar el perfil</div>;

  return (
    <div className="mi-perfil">
      <div className="perfil-header">
        <h2>Mi Perfil</h2>
        {!editMode && (
          <button className="btn-editar" onClick={() => setEditMode(true)}>
            <span className="material-icons">edit</span>
            Editar Perfil
          </button>
        )}
      </div>

      <div className="perfil-container">
        {/* Card de Info Personal */}
        <div className="perfil-card">
          <div className="card-header">
            <span className="material-icons">person</span>
            <h3>Información Personal</h3>
          </div>

          {editMode ? (
            <form onSubmit={handleSubmit} className="perfil-form">
              <div className="form-row">
                <div className="form-field">
                  <label>Nombre</label>
                  <input
                    type="text"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-field">
                  <label>Apellido</label>
                  <input
                    type="text"
                    name="apellido"
                    value={formData.apellido}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-field">
                  <label>Teléfono</label>
                  <input
                    type="tel"
                    name="telefono"
                    value={formData.telefono}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              {perfil.rol === 'medico' && (
                <>
                  <div className="form-field">
                    <label>Cédula Profesional</label>
                    <input
                      type="text"
                      name="cedula"
                      value={formData.cedula}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="form-field">
                    <label>Especialidades</label>
                    <select
                      multiple
                      name="especialidades"
                      value={formData.especialidades}
                      onChange={handleEspecialidadesChange}
                      className="select-multiple"
                    >
                      {especialidades.map(esp => (
                        <option key={esp._id} value={esp._id}>
                          {esp.nombre}
                        </option>
                      ))}
                    </select>
                    <small>Mantén presionado Ctrl/Cmd para seleccionar múltiples</small>
                  </div>

                  <div className="form-field">
                    <label>Tarifa de Consulta ($)</label>
                    <input
                      type="number"
                      name="tarifaConsulta"
                      value={formData.tarifaConsulta}
                      onChange={handleInputChange}
                      min="0"
                    />
                  </div>

                  <div className="form-field">
                    <label>Descripción Profesional</label>
                    <textarea
                      name="descripcion"
                      value={formData.descripcion}
                      onChange={handleInputChange}
                      rows="4"
                      placeholder="Cuéntanos sobre tu práctica médica..."
                    />
                  </div>

                  <div className="form-field">
                    <label>Experiencia</label>
                    <textarea
                      name="experiencia"
                      value={formData.experiencia}
                      onChange={handleInputChange}
                      rows="3"
                      placeholder="Años de experiencia, áreas de especialización..."
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-field">
                      <label>Dirección del Consultorio</label>
                      <input
                        type="text"
                        name="ubicacion.direccion"
                        value={formData.ubicacion.direccion}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="form-field">
                      <label>Ciudad</label>
                      <input
                        type="text"
                        name="ubicacion.ciudad"
                        value={formData.ubicacion.ciudad}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="form-actions">
                <button type="submit" className="btn-guardar">
                  <span className="material-icons">save</span>
                  Guardar Cambios
                </button>
                <button type="button" className="btn-cancelar" onClick={cancelEdit}>
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <div className="perfil-info">
              <div className="info-item">
                <span className="info-label">Nombre Completo</span>
                <span className="info-value">{perfil.nombre} {perfil.apellido}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Email</span>
                <span className="info-value">{perfil.email}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Teléfono</span>
                <span className="info-value">{perfil.telefono}</span>
              </div>

              {perfil.rol === 'medico' && perfil.medicoInfo && (
                <>
                  {perfil.medicoInfo.cedula && (
                    <div className="info-item">
                      <span className="info-label">Cédula Profesional</span>
                      <span className="info-value">{perfil.medicoInfo.cedula}</span>
                    </div>
                  )}

                  {perfil.medicoInfo.especialidades?.length > 0 && (
                    <div className="info-item">
                      <span className="info-label">Especialidades</span>
                      <div className="especialidades-list">
                        {perfil.medicoInfo.especialidades.map(esp => (
                          <span key={esp._id} className="especialidad-tag">
                            {esp.nombre}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {perfil.medicoInfo.tarifaConsulta && (
                    <div className="info-item">
                      <span className="info-label">Tarifa de Consulta</span>
                      <span className="info-value">${perfil.medicoInfo.tarifaConsulta}</span>
                    </div>
                  )}

                  {perfil.medicoInfo.descripcion && (
                    <div className="info-item full-width">
                      <span className="info-label">Descripción Profesional</span>
                      <p className="info-text">{perfil.medicoInfo.descripcion}</p>
                    </div>
                  )}

                  {perfil.medicoInfo.experiencia && (
                    <div className="info-item full-width">
                      <span className="info-label">Experiencia</span>
                      <p className="info-text">{perfil.medicoInfo.experiencia}</p>
                    </div>
                  )}

                  {perfil.medicoInfo.ubicacion && (
                    <div className="info-item full-width">
                      <span className="info-label">Ubicación</span>
                      <p className="info-text">
                        {perfil.medicoInfo.ubicacion.direccion}
                        {perfil.medicoInfo.ubicacion.ciudad && `, ${perfil.medicoInfo.ubicacion.ciudad}`}
                      </p>
                    </div>
                  )}

                  <div className="estadisticas">
                    <div className="stat-item">
                      <span className="material-icons">star</span>
                      <div>
                        <span className="stat-value">{perfil.medicoInfo.calificacionPromedio || 0}</span>
                        <span className="stat-label">Calificación</span>
                      </div>
                    </div>
                    <div className="stat-item">
                      <span className="material-icons">event_available</span>
                      <div>
                        <span className="stat-value">{perfil.medicoInfo.totalCitasAtendidas || 0}</span>
                        <span className="stat-label">Citas Atendidas</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
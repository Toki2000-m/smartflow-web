import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, LineChart, Line
} from 'recharts';

const Metricas = () => {
  const [loading, setLoading] = useState(true);
  const [vistaIngresos, setVistaIngresos] = useState('semana'); // semana, mes, rango
  const [ingresos, setIngresos] = useState([]);
  const [citasEstado, setCitasEstado] = useState([]);
  const [pacientesTipo, setPacientesTipo] = useState([]);
  const [horarios, setHorarios] = useState([]);
  const [stats, setStats] = useState({
    ingresosTotal: 0,
    ingresosAnterior: 0,
    cambioPorc: 0,
    citasTotal: 0,
    pacientesNuevos: 0,
    horasPico: ''
  });

  const getMedicoId = () => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        return user?.id || user?._id;
      }
    } catch (error) {
      console.error('Error obteniendo medicoId:', error);
    }
    return null;
  };

  const medicoId = getMedicoId();

  useEffect(() => {
    cargarMetricas();
  }, [vistaIngresos, medicoId]);

  const cargarMetricas = async () => {
    if (!medicoId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const baseURL = 'http://localhost:3000/api/web/appointments/metrics';
      
      // Cargar datos según la vista seleccionada
      let endpoint = '';
      if (vistaIngresos === 'semana') {
        endpoint = `${baseURL}/ingresos-semanales?medicoId=${medicoId}`;
      } else if (vistaIngresos === 'mes') {
        endpoint = `${baseURL}/ingresos-mensuales?medicoId=${medicoId}`;
      } else {
        endpoint = `${baseURL}/ingresos-mensuales?medicoId=${medicoId}`; // Por defecto mensual
      }

      const [ingresosRes, citasRes, pacientesRes, horariosRes] = await Promise.all([
        fetch(endpoint),
        fetch(`${baseURL}/citas-estado?medicoId=${medicoId}`),
        fetch(`${baseURL}/pacientes-tipo?medicoId=${medicoId}`),
        fetch(`${baseURL}/horarios-demanda?medicoId=${medicoId}`)
      ]);

      const ingresosData = await ingresosRes.json();
      const citasData = await citasRes.json();
      const pacientesData = await pacientesRes.json();
      const horariosData = await horariosRes.json();

      // Procesar horarios
      const horariosOrdenados = Array.isArray(horariosData) 
        ? horariosData
            .reduce((acc, item) => {
              const existing = acc.find(h => h.hora === item.hora);
              if (existing) {
                existing.cantidad += item.cantidad;
              } else {
                acc.push({ ...item });
              }
              return acc;
            }, [])
            .sort((a, b) => {
              const timeToMinutes = (hora) => {
                const [h, m] = hora.split(':').map(Number);
                return h * 60 + (m || 0);
              };
              return timeToMinutes(a.hora) - timeToMinutes(b.hora);
            })
            .slice(0, 10)
        : [];
      
      const horaPico = horariosOrdenados.length > 0
        ? (() => {
            const maxHora = horariosOrdenados.reduce((max, item) => 
              item.cantidad > max.cantidad ? item : max
            );
            return `${maxHora.dia || ''} ${maxHora.hora || ''}`.trim();
          })()
        : 'N/A';

      setIngresos(Array.isArray(ingresosData) ? ingresosData : []);
      setCitasEstado(Array.isArray(citasData) ? citasData : []);
      setPacientesTipo(Array.isArray(pacientesData) ? pacientesData : []);
      setHorarios(horariosOrdenados);

      // Calcular estadísticas
      const arrayIngresos = Array.isArray(ingresosData) ? ingresosData : [];
      const totalIngresos = arrayIngresos.reduce((sum, item) => sum + (item.total || 0), 0);
      
      // Comparar con periodo anterior (última vs penúltima)
      const ultimoPeriodo = arrayIngresos[arrayIngresos.length - 1]?.total || 0;
      const penultimoPeriodo = arrayIngresos[arrayIngresos.length - 2]?.total || 0;
      const cambio = penultimoPeriodo > 0 
        ? (((ultimoPeriodo - penultimoPeriodo) / penultimoPeriodo) * 100).toFixed(1)
        : 0;

      const totalCitas = (Array.isArray(citasData) ? citasData : [])
        .reduce((sum, item) => sum + (item.cantidad || 0), 0);
      const nuevos = (Array.isArray(pacientesData) ? pacientesData : [])
        .find(p => p._id === 'Nuevos')?.cantidad || 0;

      setStats({
        ingresosTotal: totalIngresos,
        ingresosAnterior: penultimoPeriodo,
        cambioPorc: parseFloat(cambio),
        citasTotal: totalCitas,
        pacientesNuevos: nuevos,
        horasPico: horaPico
      });

    } catch (error) {
      console.error('Error cargando métricas:', error);
      setIngresos([]);
      setCitasEstado([]);
      setPacientesTipo([]);
      setHorarios([]);
    } finally {
      setLoading(false);
    }
  };

  const ESTADO_COLORS = {
    'programada': '#3b82f6',
    'completada': '#10b981',
    'cancelada': '#ef4444'
  };

  const PACIENTE_COLORS = ['#3b82f6', '#8b5cf6'];

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '60px', 
            height: '60px', 
            border: '4px solid #f3f4f6', 
            borderTop: '4px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p style={{ color: '#6b7280', fontSize: '18px' }}>Cargando métricas...</p>
        </div>
      </div>
    );
  }

  if (!medicoId) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #0f172a 100%)', padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'white' }}>
          <span className="material-icons" style={{ fontSize: '64px', marginBottom: '16px' }}>error_outline</span>
          <h2>No se pudo cargar el ID del médico</h2>
        </div>
      </div>
    );
  }

  const getTituloIngresos = () => {
    if (vistaIngresos === 'semana') return 'Ingresos por Semana';
    if (vistaIngresos === 'mes') return 'Ingresos Mensuales';
    return 'Ingresos';
  };

  const getEtiquetaEje = () => {
    if (vistaIngresos === 'semana') return 'semana';
    return 'mes';
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #0f172a 100%)', padding: '24px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '36px', fontWeight: 'bold', color: 'white', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className="material-icons" style={{ fontSize: '40px' }}>trending_up</span>
           Kpi's
        </h1>
        <p style={{ color: '#bfdbfe' }}>Analiza tus datos</p>
      </div>

      {/* Cards de estadísticas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        <div style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', borderRadius: '16px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-10px', right: '-10px', opacity: 0.1, fontSize: '80px' }}>💰</div>
          <span className="material-icons" style={{ fontSize: '40px', color: 'white' }}>attach_money</span>
          <p style={{ color: '#bfdbfe', fontSize: '14px', marginTop: '16px', marginBottom: '4px' }}>
            Ingresos Totales ({vistaIngresos === 'semana' ? 'Semanales' : 'Mensuales'})
          </p>
          <h3 style={{ fontSize: '36px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>
            ${stats.ingresosTotal.toLocaleString()}
          </h3>
          {stats.cambioPorc !== 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-icons" style={{ fontSize: '20px', color: stats.cambioPorc >= 0 ? '#10b981' : '#ef4444' }}>
                {stats.cambioPorc >= 0 ? 'trending_up' : 'trending_down'}
              </span>
              <span style={{ 
                fontSize: '16px', 
                fontWeight: 'bold',
                color: stats.cambioPorc >= 0 ? '#10b981' : '#ef4444' 
              }}>
                {stats.cambioPorc >= 0 ? '+' : ''}{stats.cambioPorc}%
              </span>
              <span style={{ fontSize: '14px', color: '#bfdbfe' }}>vs anterior</span>
            </div>
          )}
        </div>

        <div style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', borderRadius: '16px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)' }}>
          <span className="material-icons" style={{ fontSize: '40px', color: 'white' }}>event</span>
          <p style={{ color: '#d1fae5', fontSize: '14px', marginTop: '16px', marginBottom: '4px' }}>Citas Totales</p>
          <h3 style={{ fontSize: '36px', fontWeight: 'bold', color: 'white' }}>{stats.citasTotal}</h3>
        </div>

        <div style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', borderRadius: '16px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)' }}>
          <span className="material-icons" style={{ fontSize: '40px', color: 'white' }}>people</span>
          <p style={{ color: '#e9d5ff', fontSize: '14px', marginTop: '16px', marginBottom: '4px' }}>Pacientes Nuevos</p>
          <h3 style={{ fontSize: '36px', fontWeight: 'bold', color: 'white' }}>{stats.pacientesNuevos}</h3>
        </div>

        <div style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', borderRadius: '16px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)' }}>
          <span className="material-icons" style={{ fontSize: '40px', color: 'white' }}>schedule</span>
          <p style={{ color: '#fef3c7', fontSize: '14px', marginTop: '16px', marginBottom: '4px' }}>Hora Pico</p>
          <h3 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white' }}>{stats.horasPico}</h3>
        </div>
      </div>

      {/* Gráficas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '24px' }}>
        
        {/* Ingresos con Filtros */}
        <div style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', borderRadius: '16px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <h3 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', margin: 0 }}>
              <span className="material-icons" style={{ color: '#10b981', marginRight: '8px', verticalAlign: 'middle' }}>attach_money</span>
              {getTituloIngresos()}
            </h3>
            
            {/* Filtros */}
            <div style={{ display: 'flex', gap: '8px', background: 'rgba(0,0,0,0.3)', padding: '4px', borderRadius: '8px' }}>
              <button
                onClick={() => setVistaIngresos('semana')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  background: vistaIngresos === 'semana' ? '#3b82f6' : 'transparent',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: vistaIngresos === 'semana' ? 'bold' : 'normal',
                  transition: 'all 0.3s'
                }}
              >
                Semana
              </button>
              <button
                onClick={() => setVistaIngresos('mes')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  background: vistaIngresos === 'mes' ? '#3b82f6' : 'transparent',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: vistaIngresos === 'mes' ? 'bold' : 'normal',
                  transition: 'all 0.3s'
                }}
              >
                Mes
              </button>
            </div>
          </div>

          {ingresos.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={ingresos}>
                <defs>
                  <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis 
                  dataKey={getEtiquetaEje()} 
                  stroke="#fff" 
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#fff" 
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value) => `$${value.toLocaleString()}`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: 'none', 
                    borderRadius: '12px', 
                    color: '#fff',
                    padding: '12px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                  }}
                  formatter={(value) => [`$${value.toLocaleString()}`, 'Ingresos']}
                  labelStyle={{ fontWeight: 'bold', marginBottom: '8px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="total" 
                  stroke="#10b981" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorIngresos)"
                  dot={{ fill: '#10b981', strokeWidth: 2, r: 5 }}
                  activeDot={{ r: 8, strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', flexDirection: 'column', gap: '12px' }}>
              <span className="material-icons" style={{ fontSize: '48px', opacity: 0.5 }}>bar_chart</span>
              <p>No hay datos disponibles para este periodo</p>
            </div>
          )}
        </div>

        {/* Estado de Citas */}
        <div style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', borderRadius: '16px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)' }}>
          <h3 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', marginBottom: '16px' }}>
            <span className="material-icons" style={{ color: '#3b82f6', marginRight: '8px', verticalAlign: 'middle' }}>event</span>
            Estado de Citas
          </h3>
          {citasEstado.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={citasEstado}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="estado" stroke="#fff" />
                <YAxis stroke="#fff" />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                <Bar dataKey="cantidad" radius={[8, 8, 0, 0]}>
                  {citasEstado.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={ESTADO_COLORS[entry.estado] || '#6b7280'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
              <p>No hay datos disponibles</p>
            </div>
          )}
        </div>

        {/* Tipo de Pacientes */}
        <div style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', borderRadius: '16px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)' }}>
          <h3 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', marginBottom: '16px' }}>
            <span className="material-icons" style={{ color: '#8b5cf6', marginRight: '8px', verticalAlign: 'middle' }}>people</span>
            Tipo de Pacientes
          </h3>
          {pacientesTipo.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pacientesTipo}
                  dataKey="cantidad"
                  nameKey="_id"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ _id, cantidad }) => `${_id}: ${cantidad}`}
                  labelStyle={{ fill: '#fff', fontSize: '14px', fontWeight: 'bold' }}
                >
                  {pacientesTipo.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PACIENTE_COLORS[index % PACIENTE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
              <p>No hay datos disponibles</p>
            </div>
          )}
        </div>

        {/* Horarios Más Demandados */}
        <div style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', borderRadius: '16px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)' }}>
          <h3 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', marginBottom: '16px' }}>
            <span className="material-icons" style={{ color: '#f59e0b', marginRight: '8px', verticalAlign: 'middle' }}>schedule</span>
            Horarios Más Demandados
          </h3>
          {horarios.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={horarios} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis type="number" stroke="#fff" />
                <YAxis 
                  dataKey="hora" 
                  type="category" 
                  stroke="#fff" 
                  width={70}
                  tick={{ fill: '#fff', fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                  formatter={(value) => [`${value} citas`, 'Cantidad']}
                  labelFormatter={(hora) => `Hora: ${hora}`}
                />
                <Bar dataKey="cantidad" fill="#f59e0b" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
              <p>No hay datos disponibles</p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Metricas;
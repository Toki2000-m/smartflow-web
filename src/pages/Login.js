import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import './Login.css';
import { FaEnvelope, FaLock } from 'react-icons/fa';
import LogoSmartFlow from '../img/icon_smart_flow.png';

export default function Login({ setUser }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await API.post('/auth/login', { email, password });
      const { token, user } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify({
        id: user.id || user._id,
        nombre: user.nombre,
        rol: user.rol
      }));

      setUser(user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Error al iniciar sesión');
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-panel">
        <div className="login-logo">
          <img src={LogoSmartFlow} alt="SmartFlow Logo" />
        </div>

        <h1>SmartFlow</h1>
        <p className="subtitle">Tu salud en buenas manos</p>

        <form onSubmit={handleLogin}>
          <label>Correo electrónico</label>
          <div className="input-group">
            <FaEnvelope className="input-icon" />
            <input
              type="email"
              placeholder="ejemplo@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <label>Contraseña</label>
          <div className="input-group">
            <FaLock className="input-icon" />
            <input
              type="password"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="error-message">{error}</p>}

          <div className="button-container">
            <button type="submit">Entrar</button>
          </div>
        </form>

        <a href="/recuperar" className="forgot">¿Olvidaste tu contraseña?</a>
      </div>
    </div>
  );
}

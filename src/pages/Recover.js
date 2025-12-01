import { useState } from "react";
import { Link } from "react-router-dom";
import "./Login.css";

export default function Recover() {
  const [email, setEmail] = useState("");

  const handleRecover = (e) => {
    e.preventDefault();
    alert("Te enviamos un correo para recuperar tu contraseña");
  };

  return (
    <div className="login-wrapper">
      <div className="login-panel">
        <h1>Recuperar contraseña</h1>
        <p className="subtitle">Ingresa tu correo y te enviaremos un enlace</p>

        <form onSubmit={handleRecover}>
          <label>Correo electrónico</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <button type="submit">Enviar instrucciones</button>
        </form>

        <Link to="/" className="forgot">Volver al login</Link>
      </div>
    </div>
  );
}

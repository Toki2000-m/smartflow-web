import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Recover from "./pages/Recover";

function App() {
  const [user, setUser] = useState(null);

  // 🚀 Al cargar la app, revisamos si hay usuario en localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <Router>
      <Routes>
        {/* LOGIN */}
        <Route 
          path="/" 
          element={
            user ? <Navigate to="/dashboard" /> : <Login setUser={setUser} />
          } 
        />

        {/* RECUPERAR CONTRASEÑA */}
        <Route path="/recuperar" element={<Recover />} />

        {/* DASHBOARD (PROTEGIDO) */}
        <Route 
          path="/dashboard" 
          element={
            user ? (
              <Dashboard user={user} onLogout={handleLogout} />
            ) : (
              <Navigate to="/" />
            )
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;

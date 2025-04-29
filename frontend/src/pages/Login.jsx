import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Login.css';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [forgotPassword, setForgotPassword] = useState(false);
  const [resetUsername, setResetUsername] = useState(''); // Nuevo campo para username en recuperación
  const [email, setEmail] = useState('');
  const [tempCode, setTempCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [step, setStep] = useState('login'); // 'login', 'email', 'reset'
  const navigate = useNavigate();

  // Manejar el login normal
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:8001/api/token/', { username, password });
      localStorage.setItem('accessToken', response.data.access);
      navigate('/home');
    } catch (err) {
      setError('Credenciales inválidas');
    }
  };

  // Enviar username y correo para recuperar contraseña
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:8001/api/password_reset_request/', { username: resetUsername, email });
      setMessage(response.data.message);
      setStep('reset');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al procesar la solicitud');
    }
  };

  // Restablecer contraseña con clave temporal
  const handleResetPassword = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:8001/api/password_reset_confirm/', {
        username: resetUsername,
        email,
        temp_code: tempCode,
        new_password: newPassword,
      });
      setMessage(response.data.message);
      setStep('login');
      setResetUsername('');
      setEmail('');
      setTempCode('');
      setNewPassword('');
      setForgotPassword(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al restablecer la contraseña');
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <img src="/logo.png" alt="Logo" className="login-logo" />
        {step === 'login' && (
          <>
            <h2>Iniciar Sesión</h2>
            <form onSubmit={handleSubmit}>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Usuario"
                className="login-input"
                required
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña"
                className="login-input"
                required
              />
              <button type="submit" className="login-button">Iniciar Sesión</button>
            </form>
            {error && <p className="error-message">{error}</p>}
            <p className="forgot-link" onClick={() => setStep('email')}>
              ¿Olvidaste tu contraseña?
            </p>
          </>
        )}

        {step === 'email' && (
          <>
            <h2>Recuperar Contraseña</h2>
            <form onSubmit={handleForgotPassword}>
              <input
                type="text"
                value={resetUsername}
                onChange={(e) => setResetUsername(e.target.value)}
                placeholder="Usuario"
                className="login-input"
                required
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ingresa tu correo"
                className="login-input"
                required
              />
              <button type="submit" className="login-button">Enviar Clave Temporal</button>
            </form>
            {error && <p className="error-message">{error}</p>}
            {message && <p className="success-message">{message}</p>}
            <p className="back-link" onClick={() => setStep('login')}>
              Volver al inicio de sesión
            </p>
          </>
        )}

        {step === 'reset' && (
          <>
            <h2>Restablecer Contraseña</h2>
            <form onSubmit={handleResetPassword}>
              <input
                type="text"
                value={tempCode}
                onChange={(e) => setTempCode(e.target.value)}
                placeholder="Clave temporal recibida"
                className="login-input"
                required
              />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nueva contraseña"
                className="login-input"
                required
              />
              <button type="submit" className="login-button">Cambiar Contraseña</button>
            </form>
            {error && <p className="error-message">{error}</p>}
            {message && <p className="success-message">{message}</p>}
            <p className="back-link" onClick={() => setStep('login')}>
              Volver al inicio de sesión
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default Login;
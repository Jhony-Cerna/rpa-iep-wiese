import { useState, type FormEvent } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Bot, Mail, Lock, Eye, EyeOff, AlertCircle, ShieldCheck, Loader2 } from 'lucide-react';
import { API_BASE } from '../config';
import { isAuthenticated, saveSession } from '../auth';

const C = {
  bg: '#0f172a',
  card: '#1e293b',
  input: '#0f172a',
  border: '#334155',
  text: '#f1f5f9',
  muted: '#94a3b8',
  dim: '#64748b',
  blue: '#3b82f6',
  blueHover: '#2563eb',
  red: '#ef4444',
};

const Login = () => {
  const navigate = useNavigate();
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [wakingServer, setWakingServer] = useState(false);

  if (isAuthenticated()) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!correo.trim() || !password) {
      setError('Por favor ingresa tu correo institucional y contraseña.');
      return;
    }

    setLoading(true);
    setWakingServer(false);
    const wakeTimer = setTimeout(() => setWakingServer(true), 3500);

    try {
      const res = await fetch(`${API_BASE}/api/auth/login-json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: correo.trim(), password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.detail || 'Correo o contraseña incorrectos.');
        return;
      }

      saveSession(data.access_token, {
        nombre: data.nombre || 'Administrador',
        correo: data.correo || correo.trim(),
        rol: data.rol || 'Administrador',
      });

      navigate('/dashboard', { replace: true });
    } catch {
      setError('No se pudo conectar con el servidor. Intenta nuevamente en unos segundos.');
    } finally {
      clearTimeout(wakeTimer);
      setLoading(false);
      setWakingServer(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: `radial-gradient(circle at top, #1e3a8a33 0%, ${C.bg} 55%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 16,
          padding: '36px 32px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.55)',
        }}
      >
        {/* Cabecera Institucional */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 28 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 14,
              boxShadow: '0 8px 20px -4px rgba(59, 130, 246, 0.5)',
            }}
          >
            <Bot size={30} color="white" />
          </div>
          <h1 style={{ color: C.text, fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
            Sistema RPA-IEP
          </h1>
          <p style={{ color: C.muted, fontSize: 13, marginTop: 4, marginBottom: 0 }}>
            I.E.P. Augusto Wiese — Panel Administrativo
          </p>
        </div>

        {/* Alerta de error */}
        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: '#450a0a66',
              border: '1px solid #ef444466',
              borderRadius: 10,
              padding: '10px 14px',
              marginBottom: 18,
            }}
          >
            <AlertCircle size={18} color="#f87171" style={{ flexShrink: 0 }} />
            <span style={{ color: '#fca5a5', fontSize: 13 }}>{error}</span>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', color: C.muted, fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
              Correo electrónico
            </label>
            <div style={{ position: 'relative' }}>
              <Mail
                size={16}
                color={C.dim}
                style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="admin@colegio.edu.pe"
                autoComplete="email"
                disabled={loading}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  background: C.input,
                  border: `1px solid ${C.border}`,
                  borderRadius: 10,
                  padding: '11px 12px 11px 38px',
                  color: C.text,
                  fontSize: 14,
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', color: C.muted, fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
              Contraseña
            </label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={16}
                color={C.dim}
                style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={loading}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  background: C.input,
                  border: `1px solid ${C.border}`,
                  borderRadius: 10,
                  padding: '11px 40px 11px 38px',
                  color: C.text,
                  fontSize: 14,
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {showPassword ? <EyeOff size={16} color={C.muted} /> : <Eye size={16} color={C.muted} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              background: loading ? '#1e40af' : C.blue,
              color: 'white',
              border: 'none',
              borderRadius: 10,
              padding: '12px 16px',
              fontSize: 14,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'background 0.15s',
            }}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Verificando acceso...</span>
              </>
            ) : (
              <>
                <ShieldCheck size={18} />
                <span>Iniciar Sesión</span>
              </>
            )}
          </button>

          {wakingServer && (
            <p style={{ color: '#93c5fd', fontSize: 12, textAlign: 'center', marginTop: 12, marginBottom: 0 }}>
              Activando servidor en la nube, espera unos segundos...
            </p>
          )}
        </form>

        {/* Pie de seguridad */}
        <div
          style={{
            marginTop: 26,
            paddingTop: 16,
            borderTop: `1px solid ${C.border}`,
            textAlign: 'center',
          }}
        >
          <p style={{ color: C.dim, fontSize: 11, margin: 0 }}>
            Acceso exclusivo para personal autorizado de I.E.P. Augusto Wiese
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;

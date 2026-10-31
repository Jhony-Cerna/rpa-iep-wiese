import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Plus, RefreshCw, X, Shield, Users, UserCheck, UserX,
  Edit2, Eye, EyeOff, AlertCircle, CheckCircle2, Mail, Lock, User as UserIcon
} from 'lucide-react';
import { API_BASE } from '../config';
import { getToken, getStoredUser, clearSession } from '../auth';

const C = {
  bg: '#0f172a',
  card: '#1e293b',
  input: '#0f172a',
  border: '#334155',
  text: '#f1f5f9',
  muted: '#94a3b8',
  dim: '#64748b',
  blue: '#3b82f6',
  green: '#22c55e',
  red: '#ef4444',
  yellow: '#f59e0b',
  purple: '#a855f7',
};

interface UserItem {
  id: number;
  nombre: string;
  correo: string;
  rol: string;
  estado: boolean;
  fecha_creacion?: string | null;
}

const ROLES = [
  'Administrador',
  'Dirección',
  'Secretaría',
  'Tutoría',
  'Psicología',
  'Tesorería',
  'Operador',
];

const rolStyle = (rol: string) => {
  if (rol === 'Administrador') {
    return { bg: '#581c8744', color: '#d8b4fe', border: '#a855f755' };
  }
  if (rol === 'Dirección') {
    return { bg: '#1e3a8a44', color: '#93c5fd', border: '#3b82f655' };
  }
  return { bg: '#0f766e33', color: '#5eead4', border: '#14b8a644' };
};

const Usuarios = () => {
  const navigate = useNavigate();
  const currentUser = getStoredUser();

  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState<'Todos' | 'Activos' | 'Desactivados'>('Todos');
  const [filterRol, setFilterRol] = useState('Todos');
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  // Modal Crear / Editar
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [rol, setRol] = useState('Secretaría');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken() || ''}`,
  });

  const showToast = (type: 'ok' | 'err', msg: string) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 4000);
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/users/`, {
        headers: authHeaders(),
      });
      if (res.status === 401) {
        clearSession();
        navigate('/login', { replace: true });
        return;
      }
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setUsers(data);
      } else {
        showToast('err', data.detail || 'No se pudo cargar la lista de usuarios.');
      }
    } catch {
      showToast('err', 'Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openCreateModal = () => {
    setEditingUser(null);
    setNombre('');
    setCorreo('');
    setRol('Secretaría');
    setPassword('');
    setShowPwd(false);
    setModalError('');
    setModalOpen(true);
  };

  const openEditModal = (u: UserItem) => {
    setEditingUser(u);
    setNombre(u.nombre);
    setCorreo(u.correo);
    setRol(u.rol || 'Secretaría');
    setPassword('');
    setShowPwd(false);
    setModalError('');
    setModalOpen(true);
  };

  const handleSaveUser = async (e: FormEvent) => {
    e.preventDefault();
    setModalError('');

    if (!nombre.trim() || !correo.trim()) {
      setModalError('Completa el nombre completo y el correo electrónico.');
      return;
    }

    if (!editingUser && password.trim().length < 6) {
      setModalError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (editingUser && password.trim().length > 0 && password.trim().length < 6) {
      setModalError('Si deseas cambiar la contraseña, debe tener mínimo 6 caracteres.');
      return;
    }

    setSaving(true);
    try {
      const isEdit = Boolean(editingUser);
      const url = isEdit
        ? `${API_BASE}/api/users/${editingUser!.id}`
        : `${API_BASE}/api/users/`;
      const method = isEdit ? 'PUT' : 'POST';

      const payload: Record<string, unknown> = {
        nombre: nombre.trim(),
        correo: correo.trim().toLowerCase(),
        rol,
      };
      if (!isEdit) {
        payload.password = password;
        payload.estado = true;
      } else if (password.trim()) {
        payload.password = password;
      }

      const res = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setModalError(data.detail || 'Error al guardar el usuario.');
        return;
      }

      setModalOpen(false);
      showToast(
        'ok',
        isEdit
          ? `Usuario "${data.nombre}" actualizado correctamente.`
          : `Usuario "${data.nombre}" creado y habilitado.`
      );
      fetchUsers();
    } catch {
      setModalError('No se pudo conectar con el servidor.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (u: UserItem) => {
    setTogglingId(u.id);
    try {
      const res = await fetch(`${API_BASE}/api/users/${u.id}/toggle-status`, {
        method: 'PATCH',
        headers: authHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast('err', data.detail || 'No se pudo cambiar el estado del usuario.');
        return;
      }
      setUsers((prev) => prev.map((item) => (item.id === u.id ? data : item)));
      showToast(
        'ok',
        data.estado
          ? `Cuenta de "${data.nombre}" reactivada exitosamente.`
          : `Cuenta de "${data.nombre}" desactivada. Ya no podrá iniciar sesión.`
      );
    } catch {
      showToast('err', 'Error de red al cambiar estado del usuario.');
    } finally {
      setTogglingId(null);
    }
  };

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchText =
      u.nombre.toLowerCase().includes(q) ||
      u.correo.toLowerCase().includes(q) ||
      u.rol.toLowerCase().includes(q);
    const matchEstado =
      filterEstado === 'Todos' ||
      (filterEstado === 'Activos' && u.estado) ||
      (filterEstado === 'Desactivados' && !u.estado);
    const matchRol = filterRol === 'Todos' || u.rol === filterRol;
    return matchText && matchEstado && matchRol;
  });

  const totalActivos = users.filter((u) => u.estado).length;
  const totalInactivos = users.filter((u) => !u.estado).length;
  const totalAdmins = users.filter((u) => u.rol === 'Administrador').length;

  return (
    <div style={{ color: C.text }}>
      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 22 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Shield size={24} color={C.purple} />
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Gestión de Usuarios y Accesos</h1>
          </div>
          <p style={{ color: C.muted, fontSize: 13, marginTop: 4, marginBottom: 0 }}>
            Módulo exclusivo de Administración — Registra personal, asigna roles, desactiva cuentas o vuelve a habilitarlas.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={fetchUsers}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: C.card, color: C.text, border: `1px solid ${C.border}`,
              borderRadius: 8, padding: '9px 14px', fontSize: 13, cursor: 'pointer',
            }}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Actualizar</span>
          </button>

          <button
            onClick={openCreateModal}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: C.blue, color: 'white', border: 'none',
              borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}
          >
            <Plus size={16} />
            <span>Nuevo Usuario</span>
          </button>
        </div>
      </div>

      {/* Notificación flotante */}
      {feedback && (
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: feedback.type === 'ok' ? '#14532d66' : '#450a0a88',
            border: `1px solid ${feedback.type === 'ok' ? '#22c55e66' : '#ef444466'}`,
            borderRadius: 10, padding: '11px 16px', marginBottom: 18,
          }}
        >
          {feedback.type === 'ok' ? (
            <CheckCircle2 size={18} color={C.green} />
          ) : (
            <AlertCircle size={18} color={C.red} />
          )}
          <span style={{ fontSize: 13, color: feedback.type === 'ok' ? '#bbf7d0' : '#fecaca' }}>
            {feedback.msg}
          </span>
        </div>
      )}

      {/* Tarjetas Resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'Total Registrados', value: users.length, color: C.blue, icon: Users },
          { label: 'Cuentas Activas', value: totalActivos, color: C.green, icon: UserCheck },
          { label: 'Cuentas Desactivadas', value: totalInactivos, color: C.red, icon: UserX },
          { label: 'Administradores', value: totalAdmins, color: C.purple, icon: Shield },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              style={{
                background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
                padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}
            >
              <div>
                <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>{kpi.label}</p>
                <p style={{ color: C.text, fontSize: 28, fontWeight: 800, margin: '4px 0 0' }}>{kpi.value}</p>
              </div>
              <div style={{ background: `${kpi.color}20`, padding: 10, borderRadius: 10 }}>
                <Icon size={22} color={kpi.color} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Filtros */}
      <div
        style={{
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
          padding: 14, marginBottom: 18, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center',
        }}
      >
        <div style={{ position: 'relative', flex: '1 1 250px' }}>
          <Search size={15} color={C.dim} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Buscar por nombre, correo o rol..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%', boxSizing: 'border-box', background: C.bg, border: `1px solid ${C.border}`,
              borderRadius: 8, padding: '8px 12px 8px 34px', color: C.text, fontSize: 13, outline: 'none',
            }}
          />
        </div>

        <select
          value={filterEstado}
          onChange={(e) => setFilterEstado(e.target.value as 'Todos' | 'Activos' | 'Desactivados')}
          style={{
            background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8,
            padding: '8px 12px', color: C.text, fontSize: 13, outline: 'none',
          }}
        >
          <option value="Todos">Estado: Todos</option>
          <option value="Activos">Solo Activos</option>
          <option value="Desactivados">Solo Desactivados</option>
        </select>

        <select
          value={filterRol}
          onChange={(e) => setFilterRol(e.target.value)}
          style={{
            background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8,
            padding: '8px 12px', color: C.text, fontSize: 13, outline: 'none',
          }}
        >
          <option value="Todos">Rol: Todos</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      {/* Tabla de Usuarios */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#0f172a88', borderBottom: `1px solid ${C.border}`, textAlign: 'left' }}>
                <th style={{ padding: '12px 16px', color: C.muted, fontWeight: 600 }}>Usuario</th>
                <th style={{ padding: '12px 16px', color: C.muted, fontWeight: 600 }}>Correo Electrónico</th>
                <th style={{ padding: '12px 16px', color: C.muted, fontWeight: 600 }}>Rol / Área</th>
                <th style={{ padding: '12px 16px', color: C.muted, fontWeight: 600 }}>Estado</th>
                <th style={{ padding: '12px 16px', color: C.muted, fontWeight: 600 }}>Registro</th>
                <th style={{ padding: '12px 16px', color: C.muted, fontWeight: 600, textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: 36, textAlign: 'center', color: C.muted }}>
                    Cargando usuarios del sistema...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 36, textAlign: 'center', color: C.muted }}>
                    No se encontraron usuarios con ese criterio.
                  </td>
                </tr>
              ) : (
                filtered.map((u) => {
                  const isMe = u.correo.toLowerCase() === currentUser.correo.toLowerCase();
                  const rStyle = rolStyle(u.rol);
                  const initial = (u.nombre || 'U').trim().charAt(0).toUpperCase();

                  return (
                    <tr
                      key={u.id}
                      style={{
                        borderBottom: `1px solid ${C.border}`,
                        opacity: u.estado ? 1 : 0.65,
                        transition: 'opacity 0.15s',
                      }}
                    >
                      <td style={{ padding: '13px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              width: 32, height: 32, borderRadius: '50%',
                              background: u.estado ? C.blue : C.dim,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: 'white', fontWeight: 700, fontSize: 13, flexShrink: 0,
                            }}
                          >
                            {initial}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontWeight: 600, color: C.text }}>{u.nombre}</span>
                              {isMe && (
                                <span
                                  style={{
                                    fontSize: 10, fontWeight: 700, padding: '2px 7px',
                                    borderRadius: 999, background: '#1d4ed844', color: '#93c5fd',
                                  }}
                                >
                                  Tú
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '13px 16px', color: C.muted }}>{u.correo}</td>

                      <td style={{ padding: '13px 16px' }}>
                        <span
                          style={{
                            display: 'inline-block', padding: '3px 10px', borderRadius: 999,
                            fontSize: 11, fontWeight: 700,
                            background: rStyle.bg, color: rStyle.color, border: `1px solid ${rStyle.border}`,
                          }}
                        >
                          {u.rol}
                        </span>
                      </td>

                      <td style={{ padding: '13px 16px' }}>
                        <span
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                            background: u.estado ? '#14532d55' : '#450a0a66',
                            color: u.estado ? '#86efac' : '#fca5a5',
                          }}
                        >
                          <span
                            style={{
                              width: 6, height: 6, borderRadius: '50%',
                              background: u.estado ? C.green : C.red,
                            }}
                          />
                          {u.estado ? 'Activo' : 'Desactivado'}
                        </span>
                      </td>

                      <td style={{ padding: '13px 16px', color: C.dim, fontSize: 12 }}>
                        {u.fecha_creacion
                          ? new Date(u.fecha_creacion).toLocaleDateString('es-PE')
                          : 'Inicial'}
                      </td>

                      <td style={{ padding: '13px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                          <button
                            onClick={() => openEditModal(u)}
                            title="Editar datos o cambiar contraseña"
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 5,
                              background: '#0f172a', color: C.muted, border: `1px solid ${C.border}`,
                              borderRadius: 7, padding: '6px 10px', fontSize: 12, cursor: 'pointer',
                            }}
                          >
                            <Edit2 size={13} />
                            <span>Editar</span>
                          </button>

                          <button
                            onClick={() => handleToggleStatus(u)}
                            disabled={isMe || togglingId === u.id}
                            title={
                              isMe
                                ? 'No puedes desactivar tu propia cuenta en uso'
                                : u.estado
                                ? 'Desactivar acceso al sistema'
                                : 'Volver a activar acceso al sistema'
                            }
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 5,
                              background: isMe
                                ? '#1e293b'
                                : u.estado
                                ? '#450a0a55'
                                : '#14532d55',
                              color: isMe ? C.dim : u.estado ? '#fca5a5' : '#86efac',
                              border: `1px solid ${
                                isMe ? C.border : u.estado ? '#ef444455' : '#22c55e55'
                              }`,
                              borderRadius: 7, padding: '6px 11px', fontSize: 12, fontWeight: 600,
                              cursor: isMe ? 'not-allowed' : 'pointer',
                            }}
                          >
                            {u.estado ? (
                              <>
                                <UserX size={13} />
                                <span>Desactivar</span>
                              </>
                            ) : (
                              <>
                                <UserCheck size={13} />
                                <span>Activar</span>
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Crear / Editar Usuario */}
      {modalOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(2, 6, 23, 0.75)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16,
          }}
        >
          <div
            style={{
              width: '100%', maxWidth: 460, background: C.card, border: `1px solid ${C.border}`,
              borderRadius: 14, padding: 24, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.6)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: C.text }}>
                {editingUser ? 'Editar Usuario' : 'Registrar Nuevo Usuario'}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: C.muted }}
              >
                <X size={18} />
              </button>
            </div>

            {modalError && (
              <div
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: '#450a0a66', border: '1px solid #ef444466',
                  borderRadius: 8, padding: '9px 12px', marginBottom: 14,
                }}
              >
                <AlertCircle size={16} color="#f87171" />
                <span style={{ color: '#fca5a5', fontSize: 12 }}>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveUser}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', color: C.muted, fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
                  Nombre completo
                </label>
                <div style={{ position: 'relative' }}>
                  <UserIcon size={15} color={C.dim} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej. María Elena Torres"
                    style={{
                      width: '100%', boxSizing: 'border-box', background: C.input, border: `1px solid ${C.border}`,
                      borderRadius: 8, padding: '9px 12px 9px 34px', color: C.text, fontSize: 13, outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', color: C.muted, fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
                  Correo electrónico de acceso
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={15} color={C.dim} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="email"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    placeholder="secretaria@colegio.edu.pe"
                    style={{
                      width: '100%', boxSizing: 'border-box', background: C.input, border: `1px solid ${C.border}`,
                      borderRadius: 8, padding: '9px 12px 9px 34px', color: C.text, fontSize: 13, outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', color: C.muted, fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
                  Rol / Área en la institución
                </label>
                <select
                  value={rol}
                  onChange={(e) => setRol(e.target.value)}
                  disabled={Boolean(editingUser && editingUser.correo.toLowerCase() === currentUser.correo.toLowerCase())}
                  style={{
                    width: '100%', boxSizing: 'border-box', background: C.input, border: `1px solid ${C.border}`,
                    borderRadius: 8, padding: '9px 12px', color: C.text, fontSize: 13, outline: 'none',
                  }}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <p style={{ color: C.dim, fontSize: 11, margin: '5px 0 0' }}>
                  {rol === 'Administrador'
                    ? 'Acceso total al sistema, incluyendo creación y desactivación de usuarios.'
                    : 'Acceso operativo a Dashboard y módulos de solicitudes (sin panel de usuarios).'}
                </p>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', color: C.muted, fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
                  {editingUser ? 'Nueva contraseña (opcional)' : 'Contraseña inicial'}
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={15} color={C.dim} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={editingUser ? 'Dejar vacío para mantener la actual' : 'Mínimo 6 caracteres'}
                    style={{
                      width: '100%', boxSizing: 'border-box', background: C.input, border: `1px solid ${C.border}`,
                      borderRadius: 8, padding: '9px 36px 9px 34px', color: C.text, fontSize: 13, outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    style={{
                      position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                      background: 'transparent', border: 'none', cursor: 'pointer', color: C.muted,
                    }}
                  >
                    {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{
                    background: 'transparent', color: C.muted, border: `1px solid ${C.border}`,
                    borderRadius: 8, padding: '9px 16px', fontSize: 13, cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    background: C.blue, color: 'white', border: 'none',
                    borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 700,
                    cursor: saving ? 'not-allowed' : 'pointer',
                  }}
                >
                  {saving ? 'Guardando...' : editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Usuarios;

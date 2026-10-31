import { useState, useEffect } from 'react';
import { Search, Plus, RefreshCw, Eye, X } from 'lucide-react';
import { API_BASE } from '../config';


const C = {
  bg: '#0f172a', card: '#1e293b', border: '#334155',
  text: '#f1f5f9', muted: '#94a3b8', dim: '#64748b',
  blue: '#3b82f6', green: '#22c55e', red: '#ef4444',
  yellow: '#f59e0b', orange: '#f97316',
};

const API = `${API_BASE}/api/actualizacion`;

const TIPOS_PERSONA = ['Estudiante', 'Padre', 'Madre', 'Apoderado'];
const CAMPOS = ['Nombre', 'Dirección', 'Teléfono', 'Correo', 'Fecha de nacimiento', 'Otro'];
const PRIORIDADES = ['Baja', 'Normal', 'Alta', 'Urgente'];
const ESTADOS = ['Todos', 'Recibida', 'En proceso', 'En revisión', 'Atendida', 'Cerrada', 'Error', 'Requiere revisión manual'];

const estadoStyle = (e: string) => {
  const map: Record<string, { bg: string; color: string }> = {
    'Recibida':    { bg: '#1e3a5f33', color: '#93c5fd' },
    'En proceso':  { bg: '#92400e33', color: '#fcd34d' },
    'En revisión': { bg: '#4c1d9533', color: '#c4b5fd' },
    'Atendida':    { bg: '#14532d33', color: '#86efac' },
    'Cerrada':     { bg: '#1e293b',   color: '#64748b' },
    'Error':       { bg: '#450a0a33', color: '#fca5a5' },
    'Requiere revisión manual': { bg: '#431407', color: '#fdba74' },
  };
  return map[e] || { bg: '#1e293b', color: '#94a3b8' };
};

const decisionStyle = (d: string | null) => {
  if (!d || d === 'En revisión') return { color: C.yellow };
  if (d === 'Aprobada') return { color: C.green };
  return { color: C.red };
};

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('es-PE', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—';

// ─────────────────────────────────────────────
// Componente Modal formulario
// ─────────────────────────────────────────────
const ModalFormulario = ({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) => {
  const [form, setForm] = useState({
    nombre_solicitante: '', correo_solicitante: '', telefono_solicitante: '',
    prioridad: 'Normal', tipo_persona: 'Padre', dni_titular: '',
    nombre_titular: '', campo_actualizar: 'Nombre', valor_actual: '',
    valor_nuevo: '', motivo: '', observaciones: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.nombre_solicitante || !form.correo_solicitante || !form.dni_titular ||
        !form.nombre_titular || !form.valor_nuevo || !form.motivo) {
      setError('Completa todos los campos obligatorios (*)');
      return;
    }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error(await res.text());
      onCreated(); onClose();
    } catch (e: any) {
      setError(e.message || 'Error al crear solicitud');
    } finally { setLoading(false); }
  };

  const Field = ({ label, req, children }: { label: string; req?: boolean; children: React.ReactNode }) => (
    <div>
      <label style={{ display: 'block', color: C.muted, fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
        {label} {req && <span style={{ color: C.red }}>*</span>}
      </label>
      {children}
    </div>
  );

  const inp = (key: string, placeholder?: string, type = 'text') => (
    <input type={type} value={(form as any)[key]} placeholder={placeholder}
      onChange={e => set(key, e.target.value)}
      style={{ width: '100%', padding: '8px 12px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 7, color: C.text, fontSize: 13 }} />
  );

  const sel = (key: string, opts: string[]) => (
    <select value={(form as any)[key]} onChange={e => set(key, e.target.value)}
      style={{ width: '100%', padding: '8px 12px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 7, color: C.text, fontSize: 13 }}>
      {opts.map(o => <option key={o}>{o}</option>)}
    </select>
  );

  return (
    <div style={{ position:'fixed', inset:0, background:'#000000aa', zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ background: C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:28, width:'100%', maxWidth:640, maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h2 style={{ color: C.text, fontSize:18, fontWeight:700 }}>Nueva Solicitud de Actualización de Datos</h2>
          <button onClick={onClose}><X size={20} color={C.muted} /></button>
        </div>

        <div style={{ display:'grid', gap:14 }}>
          <p style={{ color: C.dim, fontSize:12, fontWeight:700, letterSpacing:'0.07em', borderBottom:`1px solid ${C.border}`, paddingBottom:6 }}>DATOS DEL SOLICITANTE</p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Field label="Nombre del solicitante" req>{inp('nombre_solicitante', 'Ej. Juan Pérez')}</Field>
            <Field label="Correo de contacto" req>{inp('correo_solicitante', 'correo@ejemplo.com', 'email')}</Field>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Field label="Teléfono">{inp('telefono_solicitante', 'Opcional')}</Field>
            <Field label="Prioridad">{sel('prioridad', PRIORIDADES)}</Field>
          </div>

          <p style={{ color: C.dim, fontSize:12, fontWeight:700, letterSpacing:'0.07em', borderBottom:`1px solid ${C.border}`, paddingBottom:6, marginTop:4 }}>DETALLE DE LA ACTUALIZACIÓN</p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Field label="Tipo de persona" req>{sel('tipo_persona', TIPOS_PERSONA)}</Field>
            <Field label="DNI del titular" req>{inp('dni_titular', '12345678')}</Field>
          </div>
          <Field label="Nombre completo del titular" req>{inp('nombre_titular', 'Nombre como aparece en el sistema')}</Field>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Field label="Dato a actualizar" req>{sel('campo_actualizar', CAMPOS)}</Field>
            <Field label="Valor actual (si lo conoce)">{inp('valor_actual', 'Opcional — no obligatorio')}</Field>
          </div>
          <Field label="Nuevo valor solicitado" req>{inp('valor_nuevo', 'Dato correcto que debe quedar registrado')}</Field>
          <Field label="Motivo de la actualización" req>
            <textarea value={form.motivo} onChange={e => set('motivo', e.target.value)} rows={3} placeholder="Explique brevemente por qué se solicita el cambio"
              style={{ width:'100%', padding:'8px 12px', background:C.bg, border:`1px solid ${C.border}`, borderRadius:7, color:C.text, fontSize:13, resize:'vertical' }} />
          </Field>
          <Field label="Observaciones adicionales">
            <textarea value={form.observaciones} onChange={e => set('observaciones', e.target.value)} rows={2}
              style={{ width:'100%', padding:'8px 12px', background:C.bg, border:`1px solid ${C.border}`, borderRadius:7, color:C.text, fontSize:13, resize:'vertical' }} />
          </Field>
        </div>

        {error && <p style={{ color: C.red, fontSize:13, marginTop:12 }}>⚠ {error}</p>}

        <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:20 }}>
          <button onClick={onClose} style={{ padding:'9px 18px', background:'transparent', border:`1px solid ${C.border}`, borderRadius:8, color:C.muted, fontSize:13, cursor:'pointer' }}>
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={loading}
            style={{ padding:'9px 20px', background:C.blue, border:'none', borderRadius:8, color:'white', fontSize:13, fontWeight:700, cursor:'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Registrando...' : 'Registrar Solicitud'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Componente Detalle / Modal de detalle
// ─────────────────────────────────────────────
const ModalDetalle = ({ solicitud, onClose, onRefresh }: { solicitud: any; onClose: () => void; onRefresh: () => void }) => {
  const [cambiandoEstado, setCambiandoEstado] = useState(false);
  const [nuevoEstado, setNuevoEstado] = useState(solicitud.estado);
  const [comentario, setComentario] = useState('');
  const [decision, setDecision] = useState('');
  const [comentarioDecision, setComentarioDecision] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState('');

  const cambiarEstado = async () => {
    setGuardando(true);
    const res = await fetch(`${API}/${solicitud.id}/estado`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: nuevoEstado, comentario }),
    });
    if (res.ok) { setMsg('✅ Estado actualizado'); onRefresh(); setCambiandoEstado(false); }
    setGuardando(false);
  };

  const registrarDecision = async () => {
    if (!decision) return;
    setGuardando(true);
    const res = await fetch(`${API}/${solicitud.id}/decision`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision, comentario_decision: comentarioDecision }),
    });
    if (res.ok) { setMsg(`✅ Decisión registrada: ${decision}`); onRefresh(); }
    setGuardando(false);
  };

  const det = solicitud.detalle;

  return (
    <div style={{ position:'fixed', inset:0, background:'#000000aa', zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ background: C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:28, width:'100%', maxWidth:700, maxHeight:'92vh', overflowY:'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'start', marginBottom:18 }}>
          <div>
            <p style={{ color: C.blue, fontSize:12, fontWeight:700 }}>ACTUALIZACIÓN DE DATOS</p>
            <h2 style={{ color: C.text, fontSize:17, fontWeight:700 }}>{solicitud.codigo || `#${solicitud.id}`}</h2>
          </div>
          <button onClick={onClose}><X size={20} color={C.muted} /></button>
        </div>

        {/* Estado y decisión */}
        <div style={{ display:'flex', gap:10, marginBottom:18, flexWrap:'wrap' }}>
          <span style={{ ...estadoStyle(solicitud.estado), padding:'4px 12px', borderRadius:20, fontSize:12, fontWeight:700 }}>{solicitud.estado}</span>
          {det?.decision && (
            <span style={{ ...decisionStyle(det.decision), padding:'4px 12px', borderRadius:20, fontSize:12, fontWeight:700, border:`1px solid currentColor` }}>
              Decisión: {det.decision}
            </span>
          )}
          <span style={{ color: C.dim, fontSize:12, padding:'4px 8px' }}>📅 {fmtDate(solicitud.fecha_recepcion)}</span>
        </div>

        {/* Solicitante */}
        <Section title="Solicitante">
          <Row label="Nombre" value={solicitud.nombre_solicitante} />
          <Row label="Correo" value={solicitud.correo_solicitante} />
          <Row label="Teléfono" value={solicitud.telefono_solicitante} />
          <Row label="Prioridad" value={solicitud.prioridad} />
        </Section>

        {/* Detalle de actualización */}
        {det && (
          <Section title="Datos a actualizar">
            <Row label="Tipo de persona" value={det.tipo_persona} />
            <Row label="DNI del titular" value={det.dni_titular} />
            <Row label="Nombre del titular" value={det.nombre_titular} />
            <Row label="Dato a actualizar" value={det.campo_actualizar} />
            <Row label="Valor actual" value={det.valor_actual || 'No proporcionado'} />
            <Row label="Nuevo valor" value={det.valor_nuevo} />
            <Row label="Motivo" value={det.motivo} full />
          </Section>
        )}

        {/* Decisión de aprobación */}
        {det && solicitud.estado !== 'Atendida' && solicitud.estado !== 'Cerrada' && (
          <Section title="Registrar decisión">
            <div style={{ display:'grid', gap:10 }}>
              <select value={decision} onChange={e => setDecision(e.target.value)}
                style={{ padding:'8px 12px', background:C.bg, border:`1px solid ${C.border}`, borderRadius:7, color:C.text, fontSize:13 }}>
                <option value="">— Selecciona decisión —</option>
                <option>Aprobada</option>
                <option>Rechazada</option>
                <option>En revisión</option>
              </select>
              <textarea value={comentarioDecision} onChange={e => setComentarioDecision(e.target.value)} rows={2}
                placeholder="Comentario de la decisión (opcional)"
                style={{ padding:'8px 12px', background:C.bg, border:`1px solid ${C.border}`, borderRadius:7, color:C.text, fontSize:13, resize:'vertical' }} />
              <button onClick={registrarDecision} disabled={!decision || guardando}
                style={{ padding:'9px 18px', background: C.blue, border:'none', borderRadius:8, color:'white', fontSize:13, fontWeight:700, cursor:'pointer', opacity: (!decision || guardando) ? 0.5 : 1 }}>
                Guardar decisión
              </button>
            </div>
          </Section>
        )}

        {/* Cambiar estado */}
        <Section title="Cambiar estado">
          {!cambiandoEstado ? (
            <button onClick={() => setCambiandoEstado(true)}
              style={{ padding:'8px 16px', background:'transparent', border:`1px solid ${C.border}`, borderRadius:8, color:C.muted, fontSize:13, cursor:'pointer' }}>
              Cambiar estado
            </button>
          ) : (
            <div style={{ display:'grid', gap:10 }}>
              <select value={nuevoEstado} onChange={e => setNuevoEstado(e.target.value)}
                style={{ padding:'8px 12px', background:C.bg, border:`1px solid ${C.border}`, borderRadius:7, color:C.text, fontSize:13 }}>
                {ESTADOS.filter(e => e !== 'Todos').map(e => <option key={e}>{e}</option>)}
              </select>
              <input value={comentario} onChange={e => setComentario(e.target.value)} placeholder="Comentario (opcional)"
                style={{ padding:'8px 12px', background:C.bg, border:`1px solid ${C.border}`, borderRadius:7, color:C.text, fontSize:13 }} />
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={cambiarEstado} disabled={guardando}
                  style={{ padding:'8px 16px', background:C.blue, border:'none', borderRadius:8, color:'white', fontSize:13, cursor:'pointer' }}>Guardar</button>
                <button onClick={() => setCambiandoEstado(false)}
                  style={{ padding:'8px 16px', background:'transparent', border:`1px solid ${C.border}`, borderRadius:8, color:C.muted, fontSize:13, cursor:'pointer' }}>Cancelar</button>
              </div>
            </div>
          )}
        </Section>

        {/* Historial */}
        {solicitud.historial?.length > 0 && (
          <Section title={`Historial (${solicitud.historial.length})`}>
            <div style={{ display:'grid', gap:8 }}>
              {[...solicitud.historial].reverse().map((h: any, i: number) => (
                <div key={i} style={{ background:C.bg, borderRadius:8, padding:'10px 14px', borderLeft:`3px solid ${C.blue}` }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                    <span style={{ color:C.text, fontSize:13, fontWeight:600 }}>
                      {h.estado_anterior ? `${h.estado_anterior} → ` : ''}{h.estado_nuevo}
                    </span>
                    <span style={{ color:C.dim, fontSize:11 }}>{fmtDate(h.fecha)}</span>
                  </div>
                  {h.comentario && <p style={{ color:C.muted, fontSize:12 }}>{h.comentario}</p>}
                  <p style={{ color:C.dim, fontSize:11 }}>{h.automatico ? '🤖 Proceso automático' : '👤 Usuario'}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {msg && <p style={{ color: C.green, fontSize:13, marginTop:12 }}>{msg}</p>}
      </div>
    </div>
  );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div style={{ marginBottom:18 }}>
    <p style={{ color: C.dim, fontSize:11, fontWeight:700, letterSpacing:'0.07em', borderBottom:`1px solid ${C.border}`, paddingBottom:5, marginBottom:12 }}>{title.toUpperCase()}</p>
    {children}
  </div>
);

const Row = ({ label, value, full }: { label: string; value?: string | null; full?: boolean }) => (
  <div style={{ display: full ? 'block' : 'grid', gridTemplateColumns:'160px 1fr', gap:8, marginBottom:6 }}>
    <span style={{ color: C.dim, fontSize:12 }}>{label}:</span>
    <span style={{ color: C.text, fontSize:13 }}>{value || '—'}</span>
  </div>
);

// ─────────────────────────────────────────────
// PÁGINA PRINCIPAL
// ─────────────────────────────────────────────
const Actualizacion = () => {
  const [solicitudes, setSolicitudes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('Todos');
  const [showForm, setShowForm] = useState(false);
  const [detalle, setDetalle] = useState<any | null>(null);
  const [lastUpdate, setLastUpdate] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/list`);
      setSolicitudes(await res.json());
      setLastUpdate(new Date().toLocaleTimeString('es-PE'));
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const fetchDetalle = async (id: number) => {
    const res = await fetch(`${API}/${id}`);
    setDetalle(await res.json());
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = solicitudes.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = (s.codigo || '').toLowerCase().includes(q) ||
      (s.nombre_solicitante || '').toLowerCase().includes(q) ||
      (s.detalle?.dni_titular || '').includes(q) ||
      (s.correo_solicitante || '').toLowerCase().includes(q);
    const matchEstado = filterEstado === 'Todos' || s.estado === filterEstado;
    return matchSearch && matchEstado;
  });

  return (
    <div style={{ color: C.text }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <h1 style={{ fontSize:21, fontWeight:700, color:C.text, marginBottom:3 }}>Actualización de Datos</h1>
          <p style={{ color:C.dim, fontSize:13 }}>
            Solicitudes de corrección o actualización de información personal
            {lastUpdate && ` · Actualizado: ${lastUpdate}`}
          </p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={fetchData} disabled={loading}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', background:'transparent', border:`1px solid ${C.border}`, borderRadius:8, color:C.muted, fontSize:13, cursor:'pointer' }}>
            <RefreshCw size={14} /> Actualizar
          </button>
          <button onClick={() => setShowForm(true)}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', background:C.blue, border:'none', borderRadius:8, color:'white', fontSize:13, fontWeight:700, cursor:'pointer' }}>
            <Plus size={16} /> Nueva Solicitud
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:'12px 16px', display:'flex', gap:12, marginBottom:16, flexWrap:'wrap' }}>
        <div style={{ position:'relative', flex:1, minWidth:200 }}>
          <Search size={15} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:C.dim }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por código, DNI, nombre o correo..."
            style={{ width:'100%', paddingLeft:32, paddingRight:12, padding:'8px 12px 8px 32px', background:C.bg, border:`1px solid ${C.border}`, borderRadius:7, color:C.text, fontSize:13, outline:'none' }} />
        </div>
        <select value={filterEstado} onChange={e => setFilterEstado(e.target.value)}
          style={{ padding:'8px 12px', background:C.bg, border:`1px solid ${C.border}`, borderRadius:7, color:C.muted, fontSize:13 }}>
          {ESTADOS.map(e => <option key={e}>{e}</option>)}
        </select>
      </div>

      {/* Tabla */}
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ background:C.bg, borderBottom:`1px solid ${C.border}` }}>
              {['Código','Titular / DNI','Dato a actualizar','Solicitante','Prioridad','Recepción','Estado','Decisión',''].map(h => (
                <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:700, color:C.dim, letterSpacing:'0.06em', whiteSpace:'nowrap' }}>
                  {h.toUpperCase()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((s, i) => {
              const det = s.detalle;
              const es = estadoStyle(s.estado);
              return (
                <tr key={s.id} style={{ borderBottom:`1px solid ${C.border}`, background: i%2===0 ? C.card : '#192132' }}
                  onMouseEnter={e => e.currentTarget.style.background='#253347'}
                  onMouseLeave={e => e.currentTarget.style.background= i%2===0 ? C.card : '#192132'}>
                  <td style={{ padding:'11px 14px', fontSize:13, color:C.blue, fontWeight:700 }}>{s.codigo || `#${s.id}`}</td>
                  <td style={{ padding:'11px 14px' }}>
                    <p style={{ color:C.text, fontSize:13, fontWeight:600 }}>{det?.nombre_titular || '—'}</p>
                    <p style={{ color:C.dim, fontSize:11 }}>DNI: {det?.dni_titular || '—'} · {det?.tipo_persona}</p>
                  </td>
                  <td style={{ padding:'11px 14px', fontSize:13, color:C.muted }}>{det?.campo_actualizar || '—'}</td>
                  <td style={{ padding:'11px 14px', fontSize:12, color:C.muted }}>{s.nombre_solicitante}</td>
                  <td style={{ padding:'11px 14px' }}>
                    <span style={{ fontSize:12, color: s.prioridad==='Alta'||s.prioridad==='Urgente' ? C.orange : C.muted, fontWeight:600 }}>{s.prioridad}</span>
                  </td>
                  <td style={{ padding:'11px 14px', fontSize:12, color:C.dim, whiteSpace:'nowrap' }}>{fmtDate(s.fecha_recepcion)}</td>
                  <td style={{ padding:'11px 14px' }}>
                    <span style={{ ...es, padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700 }}>{s.estado}</span>
                  </td>
                  <td style={{ padding:'11px 14px', ...decisionStyle(det?.decision), fontSize:12, fontWeight:600 }}>
                    {det?.decision || '—'}
                  </td>
                  <td style={{ padding:'11px 14px' }}>
                    <button onClick={() => fetchDetalle(s.id)}
                      style={{ display:'flex', alignItems:'center', gap:5, color:C.blue, background:'none', border:'none', fontSize:13, cursor:'pointer', fontWeight:600 }}>
                      <Eye size={15} /> Ver
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {!loading && filtered.length === 0 && (
          <div style={{ padding:'40px', textAlign:'center', color:C.dim }}>
            <p style={{ fontSize:15, fontWeight:600 }}>{solicitudes.length === 0 ? 'Aún no hay solicitudes registradas' : 'Sin resultados para la búsqueda'}</p>
            <p style={{ fontSize:13, marginTop:4 }}>Usa el botón "Nueva Solicitud" para registrar una.</p>
          </div>
        )}
      </div>
      <p style={{ color:C.dim, fontSize:12, marginTop:8 }}>{filtered.length} solicitud(es) encontrada(s)</p>

      {showForm && <ModalFormulario onClose={() => setShowForm(false)} onCreated={fetchData} />}
      {detalle && <ModalDetalle solicitud={detalle} onClose={() => setDetalle(null)} onRefresh={() => { fetchData(); fetchDetalle(detalle.id); }} />}
    </div>
  );
};

export default Actualizacion;

import { useState, useEffect } from 'react';
import { Search, Plus, RefreshCw, Eye, X, Send, MessageSquare } from 'lucide-react';
import { API_BASE } from '../config';

const C = {
  bg: '#0f172a', card: '#1e293b', border: '#334155',
  text: '#f1f5f9', muted: '#94a3b8', dim: '#64748b',
  blue: '#3b82f6', green: '#22c55e', red: '#ef4444',
  yellow: '#f59e0b', purple: '#a855f7',
};

const API = `${API_BASE}/api/consultas`;

const CATEGORIAS = ['Académica', 'Administrativa', 'Financiera', 'Matrícula', 'Reglamento', 'Otra'];
const AREAS = ['Dirección', 'Secretaría', 'Tutoría', 'Tesorería', 'Psicología', 'Otra'];
const PRIORIDADES = ['Baja', 'Normal', 'Alta', 'Urgente'];
const ESTADOS = ['Todos', 'Recibida', 'En proceso', 'Atendida', 'Cerrada', 'Requiere revisión manual'];

const estadoStyle = (e: string) => {
  const m: Record<string, { bg: string; color: string }> = {
    'Recibida':    { bg: '#1e3a5f33', color: '#93c5fd' },
    'En proceso':  { bg: '#92400e33', color: '#fcd34d' },
    'Atendida':    { bg: '#14532d33', color: '#86efac' },
    'Cerrada':     { bg: '#1e293b',   color: '#64748b' },
    'Requiere revisión manual': { bg: '#431407', color: '#fdba74' },
  };
  return m[e] || { bg: '#1e293b', color: '#94a3b8' };
};

const categoriaColor = (cat: string) => {
  const m: Record<string, string> = {
    'Académica':'#818cf8','Administrativa':'#38bdf8','Financiera':'#34d399',
    'Matrícula':'#fb923c','Reglamento':'#f472b6','Otra':'#94a3b8',
  };
  return m[cat] || '#94a3b8';
};

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('es-PE', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—';

const inp = (val: string, onChange: (v: string) => void, placeholder = '', type = 'text') => (
  <input type={type} value={val} onChange={e => onChange(e.target.value)} placeholder={placeholder}
    style={{ width:'100%', padding:'8px 12px', background:C.bg, border:`1px solid ${C.border}`, borderRadius:7, color:C.text, fontSize:13, outline:'none' }} />
);

const sel = (val: string, onChange: (v: string) => void, opts: string[]) => (
  <select value={val} onChange={e => onChange(e.target.value)}
    style={{ width:'100%', padding:'8px 12px', background:C.bg, border:`1px solid ${C.border}`, borderRadius:7, color:C.text, fontSize:13 }}>
    {opts.map(o => <option key={o}>{o}</option>)}
  </select>
);

const Field = ({ label, req, children }: { label: string; req?: boolean; children: React.ReactNode }) => (
  <div>
    <label style={{ display:'block', color:C.muted, fontSize:12, fontWeight:600, marginBottom:5 }}>
      {label}{req && <span style={{ color:C.red }}> *</span>}
    </label>
    {children}
  </div>
);

const SectionTitle = ({ t }: { t: string }) => (
  <p style={{ color:C.dim, fontSize:11, fontWeight:700, letterSpacing:'0.07em', borderBottom:`1px solid ${C.border}`, paddingBottom:5, marginBottom:12, marginTop:4 }}>{t}</p>
);

// ── Modal de Creación ────────────────────────
const ModalNueva = ({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) => {
  const [f, setF] = useState({ nombre_solicitante:'', correo_solicitante:'', telefono_solicitante:'', prioridad:'Normal', asunto:'', descripcion:'', categoria:'Académica', area_responsable:'Secretaría', observaciones:'' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const s = (k: string) => (v: string) => setF(p => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!f.nombre_solicitante || !f.correo_solicitante || !f.asunto || !f.descripcion) {
      setError('Completa los campos obligatorios (*)'); return;
    }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(f) });
      if (!res.ok) throw new Error(await res.text());
      onCreated(); onClose();
    } catch (e: any) { setError(e.message || 'Error al registrar');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'#000a', zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:28, width:'100%', maxWidth:640, maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
          <h2 style={{ color:C.text, fontSize:17, fontWeight:700 }}>Nueva Consulta Administrativa</h2>
          <button onClick={onClose}><X size={20} color={C.muted} /></button>
        </div>

        <div style={{ display:'grid', gap:13 }}>
          <SectionTitle t="DATOS DEL SOLICITANTE" />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Field label="Nombre completo" req>{inp(f.nombre_solicitante, s('nombre_solicitante'), 'Ej. Ana Torres')}</Field>
            <Field label="Correo de contacto" req>{inp(f.correo_solicitante, s('correo_solicitante'), 'correo@ejemplo.com', 'email')}</Field>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Field label="Teléfono">{inp(f.telefono_solicitante, s('telefono_solicitante'), 'Opcional')}</Field>
            <Field label="Prioridad">{sel(f.prioridad, s('prioridad'), PRIORIDADES)}</Field>
          </div>

          <SectionTitle t="DETALLE DE LA CONSULTA" />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Field label="Categoría" req>{sel(f.categoria, s('categoria'), CATEGORIAS)}</Field>
            <Field label="Área responsable">{sel(f.area_responsable, s('area_responsable'), AREAS)}</Field>
          </div>
          <Field label="Asunto" req>{inp(f.asunto, s('asunto'), 'Resumen breve de la consulta')}</Field>
          <Field label="Descripción detallada" req>
            <textarea value={f.descripcion} onChange={e => s('descripcion')(e.target.value)} rows={4}
              placeholder="Describa la consulta con todos los detalles necesarios"
              style={{ width:'100%', padding:'8px 12px', background:C.bg, border:`1px solid ${C.border}`, borderRadius:7, color:C.text, fontSize:13, resize:'vertical' }} />
          </Field>
          <Field label="Observaciones">
            <textarea value={f.observaciones} onChange={e => s('observaciones')(e.target.value)} rows={2}
              style={{ width:'100%', padding:'8px 12px', background:C.bg, border:`1px solid ${C.border}`, borderRadius:7, color:C.text, fontSize:13, resize:'vertical' }} />
          </Field>
        </div>

        {error && <p style={{ color:C.red, fontSize:13, marginTop:10 }}>⚠ {error}</p>}
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:18 }}>
          <button onClick={onClose} style={{ padding:'9px 18px', background:'transparent', border:`1px solid ${C.border}`, borderRadius:8, color:C.muted, fontSize:13, cursor:'pointer' }}>Cancelar</button>
          <button onClick={submit} disabled={loading} style={{ padding:'9px 20px', background:C.blue, border:'none', borderRadius:8, color:'white', fontSize:13, fontWeight:700, cursor:'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Registrando...' : 'Registrar Consulta'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Modal de Detalle ────────────────────────
const ModalDetalle = ({ solicitud, onClose, onRefresh }: { solicitud: any; onClose: () => void; onRefresh: () => void }) => {
  const [respuesta, setRespuesta] = useState('');
  const [areaDerivada, setAreaDerivada] = useState(solicitud.detalle?.area_derivada || '');
  const [cerrar, setCerrar] = useState(false);
  const [cambiandoEstado, setCambiandoEstado] = useState(false);
  const [nuevoEstado, setNuevoEstado] = useState(solicitud.estado);
  const [comentario, setComentario] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState('');

  const responder = async () => {
    if (!respuesta.trim()) return;
    setGuardando(true);
    const res = await fetch(`${API}/${solicitud.id}/responder`, {
      method:'PUT', headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ respuesta, area_derivada: areaDerivada, cerrar }),
    });
    if (res.ok) { setMsg('✅ Respuesta registrada'); onRefresh(); setRespuesta(''); }
    setGuardando(false);
  };

  const cambiarEstado = async () => {
    setGuardando(true);
    const res = await fetch(`${API}/${solicitud.id}/estado`, {
      method:'PUT', headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ estado: nuevoEstado, comentario }),
    });
    if (res.ok) { setMsg('✅ Estado actualizado'); onRefresh(); setCambiandoEstado(false); }
    setGuardando(false);
  };

  const det = solicitud.detalle;
  const yaTieneRespuesta = !!det?.respuesta;

  return (
    <div style={{ position:'fixed', inset:0, background:'#000a', zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:28, width:'100%', maxWidth:700, maxHeight:'92vh', overflowY:'auto' }}>
        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'start', marginBottom:16 }}>
          <div>
            <p style={{ color:C.purple, fontSize:11, fontWeight:700, letterSpacing:'0.07em' }}>CONSULTA ADMINISTRATIVA</p>
            <h2 style={{ color:C.text, fontSize:17, fontWeight:700 }}>{solicitud.codigo || `#${solicitud.id}`}</h2>
            <p style={{ color:C.muted, fontSize:13 }}>{solicitud.asunto}</p>
          </div>
          <button onClick={onClose}><X size={20} color={C.muted} /></button>
        </div>

        {/* Badges */}
        <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
          <span style={{ ...estadoStyle(solicitud.estado), padding:'3px 12px', borderRadius:20, fontSize:11, fontWeight:700 }}>{solicitud.estado}</span>
          <span style={{ background:'#4c1d9533', color:'#c4b5fd', padding:'3px 12px', borderRadius:20, fontSize:11, fontWeight:700 }}>
            {det?.categoria}
          </span>
          <span style={{ color:C.dim, fontSize:12, padding:'3px 8px' }}>📅 {fmtDate(solicitud.fecha_recepcion)}</span>
          {solicitud.area_responsable && (
            <span style={{ color:C.muted, fontSize:12, padding:'3px 8px' }}>🏢 {solicitud.area_responsable}</span>
          )}
        </div>

        {/* Solicitante */}
        <SectionTitle t="SOLICITANTE" />
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:16 }}>
          {[['Nombre', solicitud.nombre_solicitante], ['Correo', solicitud.correo_solicitante], ['Teléfono', solicitud.telefono_solicitante], ['Prioridad', solicitud.prioridad]].map(([l, v]) => (
            <div key={l}><span style={{ color:C.dim, fontSize:11 }}>{l}: </span><span style={{ color:C.text, fontSize:13 }}>{v || '—'}</span></div>
          ))}
        </div>

        {/* Contenido */}
        <SectionTitle t="CONTENIDO DE LA CONSULTA" />
        <div style={{ background:C.bg, borderRadius:8, padding:'12px 16px', marginBottom:16 }}>
          <p style={{ color:C.text, fontSize:13, lineHeight:1.6 }}>{solicitud.descripcion}</p>
        </div>

        {/* Respuesta existente */}
        {yaTieneRespuesta && (
          <>
            <SectionTitle t="RESPUESTA REGISTRADA" />
            <div style={{ background:'#14532d22', border:`1px solid #166534`, borderRadius:8, padding:'12px 16px', marginBottom:16 }}>
              <p style={{ color:'#86efac', fontSize:13, lineHeight:1.6 }}>{det.respuesta}</p>
              <p style={{ color:C.dim, fontSize:11, marginTop:6 }}>Respondido el {fmtDate(det.fecha_respuesta)} · Área: {det.area_derivada || '—'}</p>
            </div>
          </>
        )}

        {/* Formulario respuesta */}
        {!yaTieneRespuesta && solicitud.estado !== 'Cerrada' && (
          <>
            <SectionTitle t="REGISTRAR RESPUESTA" />
            <div style={{ display:'grid', gap:10, marginBottom:16 }}>
              <textarea value={respuesta} onChange={e => setRespuesta(e.target.value)} rows={4}
                placeholder="Escribe la respuesta a esta consulta..."
                style={{ padding:'10px 12px', background:C.bg, border:`1px solid ${C.border}`, borderRadius:8, color:C.text, fontSize:13, resize:'vertical' }} />
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                {sel(areaDerivada, setAreaDerivada, ['', ...AREAS])}
                <label style={{ display:'flex', alignItems:'center', gap:8, color:C.muted, fontSize:13, cursor:'pointer' }}>
                  <input type="checkbox" checked={cerrar} onChange={e => setCerrar(e.target.checked)} />
                  Marcar como cerrada al responder
                </label>
              </div>
              <button onClick={responder} disabled={!respuesta.trim() || guardando}
                style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'10px 20px', background:C.green, border:'none', borderRadius:8, color:'white', fontSize:13, fontWeight:700, cursor:'pointer', opacity: (!respuesta.trim() || guardando) ? 0.5 : 1 }}>
                <Send size={15} /> Guardar respuesta
              </button>
            </div>
          </>
        )}

        {/* Cambio de estado */}
        <SectionTitle t="CAMBIAR ESTADO" />
        {!cambiandoEstado ? (
          <button onClick={() => setCambiandoEstado(true)}
            style={{ padding:'8px 16px', background:'transparent', border:`1px solid ${C.border}`, borderRadius:8, color:C.muted, fontSize:13, cursor:'pointer', marginBottom:16 }}>
            Cambiar estado
          </button>
        ) : (
          <div style={{ display:'grid', gap:10, marginBottom:16 }}>
            {sel(nuevoEstado, setNuevoEstado, ESTADOS.filter(e => e !== 'Todos'))}
            {inp(comentario, setComentario, 'Comentario (opcional)')}
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={cambiarEstado} disabled={guardando} style={{ padding:'8px 16px', background:C.blue, border:'none', borderRadius:8, color:'white', fontSize:13, cursor:'pointer' }}>Guardar</button>
              <button onClick={() => setCambiandoEstado(false)} style={{ padding:'8px 16px', background:'transparent', border:`1px solid ${C.border}`, borderRadius:8, color:C.muted, fontSize:13, cursor:'pointer' }}>Cancelar</button>
            </div>
          </div>
        )}

        {/* Historial */}
        {solicitud.historial?.length > 0 && (
          <>
            <SectionTitle t={`HISTORIAL (${solicitud.historial.length})`} />
            <div style={{ display:'grid', gap:8 }}>
              {[...solicitud.historial].reverse().map((h: any, i: number) => (
                <div key={i} style={{ background:C.bg, borderRadius:8, padding:'10px 14px', borderLeft:`3px solid ${C.purple}` }}>
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
          </>
        )}

        {msg && <p style={{ color:C.green, fontSize:13, marginTop:14 }}>{msg}</p>}
      </div>
    </div>
  );
};

// ── PÁGINA PRINCIPAL ─────────────────────────
const Consultas = () => {
  const [solicitudes, setSolicitudes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('Todos');
  const [filterCat, setFilterCat] = useState('Todas');
  const [showForm, setShowForm] = useState(false);
  const [detalle, setDetalle] = useState<any | null>(null);
  const [lastUpdate, setLastUpdate] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/list`);
      setSolicitudes(await res.json());
      setLastUpdate(new Date().toLocaleTimeString('es-PE'));
    } finally { setLoading(false); }
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
      (s.asunto || '').toLowerCase().includes(q) ||
      (s.correo_solicitante || '').toLowerCase().includes(q);
    const matchEstado = filterEstado === 'Todos' || s.estado === filterEstado;
    const matchCat = filterCat === 'Todas' || s.detalle?.categoria === filterCat;
    return matchSearch && matchEstado && matchCat;
  });

  // Contadores rápidos
  const recibidas = solicitudes.filter(s => s.estado === 'Recibida').length;
  const sinRespuesta = solicitudes.filter(s => !s.detalle?.respuesta && s.estado !== 'Cerrada').length;

  return (
    <div style={{ color:C.text }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
        <div>
          <h1 style={{ fontSize:21, fontWeight:700, color:C.text, marginBottom:3 }}>Consultas Administrativas</h1>
          <p style={{ color:C.dim, fontSize:13 }}>Recepción, clasificación y respuesta a consultas{lastUpdate && ` · ${lastUpdate}`}</p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={fetchData} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', background:'transparent', border:`1px solid ${C.border}`, borderRadius:8, color:C.muted, fontSize:13, cursor:'pointer' }}>
            <RefreshCw size={14} /> Actualizar
          </button>
          <button onClick={() => setShowForm(true)} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', background:C.purple, border:'none', borderRadius:8, color:'white', fontSize:13, fontWeight:700, cursor:'pointer' }}>
            <Plus size={16} /> Nueva Consulta
          </button>
        </div>
      </div>

      {/* Mini KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:12, marginBottom:16 }}>
        {[
          { label:'Total', value: solicitudes.length, color: C.text },
          { label:'Recibidas', value: recibidas, color: '#93c5fd' },
          { label:'Sin respuesta', value: sinRespuesta, color: C.yellow },
          { label:'Cerradas', value: solicitudes.filter(s => s.estado==='Cerrada').length, color: C.dim },
        ].map(k => (
          <div key={k.label} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:'14px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ color:C.dim, fontSize:12 }}>{k.label}</span>
            <span style={{ color: k.color, fontSize:22, fontWeight:700 }}>{k.value}</span>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:'12px 16px', display:'flex', gap:12, marginBottom:14, flexWrap:'wrap' }}>
        <div style={{ position:'relative', flex:1, minWidth:180 }}>
          <Search size={15} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:C.dim }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por código, asunto, nombre..."
            style={{ width:'100%', paddingLeft:32, padding:'8px 12px 8px 32px', background:C.bg, border:`1px solid ${C.border}`, borderRadius:7, color:C.text, fontSize:13, outline:'none' }} />
        </div>
        {sel(filterEstado, setFilterEstado, ESTADOS)}
        {sel(filterCat, setFilterCat, ['Todas', ...CATEGORIAS])}
      </div>

      {/* Tabla */}
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ background:C.bg, borderBottom:`1px solid ${C.border}` }}>
              {['Código','Solicitante','Categoría','Asunto','Área','Recepción','Estado','Respuesta',''].map(h => (
                <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:700, color:C.dim, letterSpacing:'0.06em', whiteSpace:'nowrap' }}>{h.toUpperCase()}</th>
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
                  <td style={{ padding:'11px 14px', fontSize:13, color:C.purple, fontWeight:700 }}>{s.codigo || `#${s.id}`}</td>
                  <td style={{ padding:'11px 14px' }}>
                    <p style={{ color:C.text, fontSize:13, fontWeight:600 }}>{s.nombre_solicitante}</p>
                    <p style={{ color:C.dim, fontSize:11 }}>{s.correo_solicitante}</p>
                  </td>
                  <td style={{ padding:'11px 14px' }}>
                    <span style={{ color: categoriaColor(det?.categoria), fontSize:12, fontWeight:600, background:`${categoriaColor(det?.categoria)}22`, padding:'2px 8px', borderRadius:12 }}>
                      {det?.categoria || '—'}
                    </span>
                  </td>
                  <td style={{ padding:'11px 14px', fontSize:13, color:C.muted, maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.asunto}</td>
                  <td style={{ padding:'11px 14px', fontSize:12, color:C.dim }}>{s.area_responsable || '—'}</td>
                  <td style={{ padding:'11px 14px', fontSize:12, color:C.dim, whiteSpace:'nowrap' }}>{fmtDate(s.fecha_recepcion)}</td>
                  <td style={{ padding:'11px 14px' }}>
                    <span style={{ ...es, padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700 }}>{s.estado}</span>
                  </td>
                  <td style={{ padding:'11px 14px' }}>
                    {det?.respuesta
                      ? <span style={{ color:C.green, fontSize:12 }}>✓ Respondida</span>
                      : <span style={{ color:C.yellow, fontSize:12 }}>⏳ Pendiente</span>}
                  </td>
                  <td style={{ padding:'11px 14px' }}>
                    <button onClick={() => fetchDetalle(s.id)}
                      style={{ display:'flex', alignItems:'center', gap:5, color:C.purple, background:'none', border:'none', fontSize:13, cursor:'pointer', fontWeight:600 }}>
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
            <MessageSquare size={36} style={{ margin:'0 auto 10px', opacity:0.3 }} />
            <p style={{ fontSize:15, fontWeight:600 }}>{solicitudes.length === 0 ? 'Aún no hay consultas registradas' : 'Sin resultados'}</p>
          </div>
        )}
      </div>
      <p style={{ color:C.dim, fontSize:12, marginTop:8 }}>{filtered.length} consulta(s) encontrada(s)</p>

      {showForm && <ModalNueva onClose={() => setShowForm(false)} onCreated={fetchData} />}
      {detalle && <ModalDetalle solicitud={detalle} onClose={() => setDetalle(null)} onRefresh={() => { fetchData(); fetchDetalle(detalle.id); }} />}
    </div>
  );
};

export default Consultas;

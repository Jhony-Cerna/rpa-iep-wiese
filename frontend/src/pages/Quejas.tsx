import { useState, useEffect } from 'react';
import { Search, Plus, RefreshCw, Eye, X, MessageCircle, Sparkles, Clock, AlertCircle, Shield } from 'lucide-react';
import { API_BASE } from '../config';

const C = {
  bg: '#0f172a', card: '#1e293b', border: '#334155',
  text: '#f1f5f9', muted: '#94a3b8', dim: '#64748b',
  blue: '#3b82f6', green: '#22c55e', red: '#ef4444',
  yellow: '#f59e0b', purple: '#a855f7', pink: '#ec4899',
};

const API = `${API_BASE}/api/quejas`;

const CATEGORIAS = ['Atención al público', 'Comunicación', 'Infraestructura', 'Procesos', 'Otro'];

const AREAS = ['Dirección', 'Secretaría', 'Coordinación Académica', 'Tutoría', 'Tesorería', 'Mantenimiento', 'Otra'];
const PRIORIDADES = ['Baja', 'Normal', 'Alta'];
const ESTADOS = [
  'Todos', 'Recibida', 'En revisión', 'Evaluada', 'En atención', 'Respondida', 'Cerrada', 'Archivada'
];

const estadoStyle = (e: string) => {
  const m: Record<string, { bg: string; color: string }> = {
    'Recibida':     { bg: '#1e3a5f33', color: '#93c5fd' },
    'En revisión':  { bg: '#78350f33', color: '#fde047' },
    'Evaluada':     { bg: '#3b076433', color: '#d8b4fe' },
    'En atención':  { bg: '#92400e33', color: '#fdba74' },
    'Respondida':   { bg: '#14532d33', color: '#86efac' },
    'Cerrada':      { bg: '#1e293b',   color: '#64748b' },
    'Archivada':    { bg: '#1e293b',   color: '#475569' },
  };
  return m[e] || { bg: '#1e293b', color: '#94a3b8' };
};

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('es-PE', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—';

const inp = (val: string, onChange: (v: string) => void, placeholder = '', type = 'text', disabled = false) => (
  <input type={type} value={val} onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={disabled}
    style={{ width:'100%', padding:'8px 12px', background:disabled ? '#1e293b88' : C.bg, border:`1px solid ${C.border}`, borderRadius:7, color:disabled ? C.dim : C.text, fontSize:13, outline:'none' }} />
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
  const [f, setF] = useState({
    es_anonimo: false,
    nombre_solicitante: '',
    correo_solicitante: '',
    telefono_solicitante: '',
    tipo: 'Queja',
    categoria: 'Atención al público',
    area_relacionada: 'Secretaría',
    prioridad: 'Normal',
    asunto: '',
    descripcion: '',
    observaciones: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const s = (k: string) => (v: any) => setF(p => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!f.correo_solicitante || !f.asunto || !f.descripcion) {
      setError('Completa los campos obligatorios (*). El correo es requerido para enviar acuse/respuesta.'); return;
    }
    if (!f.es_anonimo && !f.nombre_solicitante) {
      setError('Indica tu nombre o marca la casilla de envío anónimo.'); return;
    }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(f) });
      if (!res.ok) throw new Error(await res.text());
      onCreated(); onClose();
    } catch (e: any) {
      setError(e.message || 'Error al registrar');
    } finally {
      setLoading(false);
    }
  };

  const isQueja = f.tipo === 'Queja';

  return (
    <div style={{ position:'fixed', inset:0, background:'#000a', zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:28, width:'100%', maxWidth:640, maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ padding:8, background: isQueja ? '#ec489922' : '#22c55e22', borderRadius:8 }}>
              {isQueja ? <AlertCircle size={20} color={C.pink} /> : <Sparkles size={20} color={C.green} />}
            </div>
            <div>
              <h2 style={{ color:C.text, fontSize:17, fontWeight:700, margin:0 }}>Nueva {f.tipo}</h2>
              <p style={{ color:C.muted, fontSize:12, margin:0 }}>Buzón institucional de quejas y sugerencias de mejora</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background:'transparent', border:'none', cursor:'pointer' }}><X size={20} color={C.muted} /></button>
        </div>

        {/* Selector de Tipo */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
          {['Queja', 'Sugerencia'].map(t => (
            <button key={t} type="button" onClick={() => s('tipo')(t)}
              style={{
                padding:'10px 14px', borderRadius:8, fontWeight:700, fontSize:13, cursor:'pointer', border:'none',
                background: f.tipo === t ? (t === 'Queja' ? C.pink : C.green) : C.bg,
                color: f.tipo === t ? '#fff' : C.muted
              }}>
              {t === 'Queja' ? '⚠️ Queja' : '💡 Sugerencia'}
            </button>
          ))}
        </div>

        <div style={{ display:'grid', gap:13 }}>
          <SectionTitle t="DATOS DEL SOLICITANTE" />
          <div style={{ display:'flex', alignItems:'center', gap:8, background:C.bg, padding:'10px 14px', borderRadius:8, border:`1px solid ${C.border}` }}>
            <input type="checkbox" id="anonimo" checked={f.es_anonimo} onChange={e => s('es_anonimo')(e.target.checked)} style={{ cursor:'pointer' }} />
            <label htmlFor="anonimo" style={{ color:C.text, fontSize:13, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
              <Shield size={15} color={C.pink} /> Presentar de forma anónima (el nombre no será visible en los listados)
            </label>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Field label="Nombre completo" req={!f.es_anonimo}>
              {inp(f.nombre_solicitante, s('nombre_solicitante'), f.es_anonimo ? 'Envío anónimo activado' : 'Ej. Rosa Meléndez', 'text', f.es_anonimo)}
            </Field>
            <Field label="Correo para notificaciones" req>
              {inp(f.correo_solicitante, s('correo_solicitante'), 'correo@ejemplo.com', 'email')}
            </Field>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Field label="Teléfono">
              {inp(f.telefono_solicitante, s('telefono_solicitante'), 'Opcional', 'text', f.es_anonimo)}
            </Field>
            <Field label="Prioridad">{sel(f.prioridad, s('prioridad'), PRIORIDADES)}</Field>
          </div>

          <SectionTitle t="DETALLE Y CLASIFICACIÓN" />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Field label="Categoría" req>{sel(f.categoria, s('categoria'), CATEGORIAS)}</Field>
            <Field label="Área relacionada">{sel(f.area_relacionada, s('area_relacionada'), AREAS)}</Field>
          </div>
          <Field label="Asunto / Título" req>{inp(f.asunto, s('asunto'), isQueja ? 'Motivo de la queja' : 'Idea o propuesta de mejora')}</Field>
          <Field label={isQueja ? "Detalle de la queja *" : "Propuesta de mejora *"} req>
            <textarea value={f.descripcion} onChange={e => s('descripcion')(e.target.value)} rows={4}
              placeholder={isQueja ? "Explique la situación que motivó su queja..." : "Describa detalladamente su propuesta y el impacto esperado..."}
              style={{ width:'100%', padding:'8px 12px', background:C.bg, border:`1px solid ${C.border}`, borderRadius:7, color:C.text, fontSize:13, resize:'vertical' }} />
          </Field>
          <Field label="Observaciones">
            <textarea value={f.observaciones} onChange={e => s('observaciones')(e.target.value)} rows={2}
              placeholder="Notas adicionales"
              style={{ width:'100%', padding:'8px 12px', background:C.bg, border:`1px solid ${C.border}`, borderRadius:7, color:C.text, fontSize:13, resize:'vertical' }} />
          </Field>
        </div>

        {error && <p style={{ color:C.red, fontSize:12, marginTop:12 }}>⚠️ {error}</p>}

        <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:22 }}>
          <button onClick={onClose} style={{ padding:'9px 18px', background:'transparent', border:`1px solid ${C.border}`, borderRadius:8, color:C.muted, fontSize:13, cursor:'pointer' }}>Cancelar</button>
          <button onClick={submit} disabled={loading}
            style={{ padding:'9px 20px', background: isQueja ? C.pink : C.green, border:'none', borderRadius:8, color:'#fff', fontWeight:600, fontSize:13, cursor:'pointer' }}>
            {loading ? 'Registrando...' : `Registrar ${f.tipo}`}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Modal de Detalle y Seguimiento ───────────
const ModalDetalle = ({ id, onClose, onUpdated }: { id: number; onClose: () => void; onUpdated: () => void }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Formulario evaluación interna
  const [evaluacion, setEvaluacion] = useState('');
  const [accionPropuesta, setAccionPropuesta] = useState('');
  const [savingEval, setSavingEval] = useState(false);

  // Formulario respuesta al usuario
  const [respuestaFinal, setRespuestaFinal] = useState('');
  const [savingResp, setSavingResp] = useState(false);

  // Formulario cambio de estado
  const [nuevoEstado, setNuevoEstado] = useState('');
  const [comentarioEstado, setComentarioEstado] = useState('');
  const [areaResp, setAreaResp] = useState('');
  const [savingEst, setSavingEst] = useState(false);

  const [msg, setMsg] = useState('');

  const load = async () => {
    try {
      const res = await fetch(`${API}/${id}`);
      const d = await res.json();
      setData(d);
      setNuevoEstado(d.estado);
      setAreaResp(d.area_responsable || 'Secretaría');
      if (d.detalle?.evaluacion) setEvaluacion(d.detalle.evaluacion);
      if (d.detalle?.accion_propuesta) setAccionPropuesta(d.detalle.accion_propuesta);
      if (d.detalle?.respuesta_final) setRespuestaFinal(d.detalle.respuesta_final);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const guardarEvaluacion = async () => {
    if (!evaluacion) { setMsg('Escriba el análisis de evaluación'); return; }
    setSavingEval(true); setMsg('');
    try {
      const res = await fetch(`${API}/${id}/evaluar`, {
        method:'PUT', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ evaluacion, accion_propuesta: accionPropuesta })
      });
      if (!res.ok) throw new Error(await res.text());
      setMsg('✅ Evaluación registrada');
      onUpdated(); load();
    } catch (e: any) { setMsg('Error: ' + e.message); }
    finally { setSavingEval(false); }
  };

  const guardarRespuesta = async () => {
    if (!respuestaFinal) { setMsg('Escriba la respuesta formal'); return; }
    setSavingResp(true); setMsg('');
    try {
      const res = await fetch(`${API}/${id}/responder`, {
        method:'PUT', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ respuesta_final: respuestaFinal })
      });
      if (!res.ok) throw new Error(await res.text());
      setMsg('✅ Respuesta registrada exitosamente');
      onUpdated(); load();
    } catch (e: any) { setMsg('Error: ' + e.message); }
    finally { setSavingResp(false); }
  };

  const cambiarEstado = async () => {
    setSavingEst(true); setMsg('');
    try {
      const res = await fetch(`${API}/${id}/estado`, {
        method:'PUT', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ estado: nuevoEstado, comentario: comentarioEstado, area_responsable: areaResp })
      });
      if (!res.ok) throw new Error(await res.text());
      setMsg('✅ Estado actualizado');
      setComentarioEstado('');
      onUpdated(); load();
    } catch (e: any) { setMsg('Error: ' + e.message); }
    finally { setSavingEst(false); }
  };

  if (loading) return null;
  const det = data?.detalle || {};
  const isQueja = det.tipo === 'Queja';

  return (
    <div style={{ position:'fixed', inset:0, background:'#000a', zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:28, width:'100%', maxWidth:760, maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
              <span style={{ color: isQueja ? C.pink : C.green, fontWeight:700, fontSize:15 }}>{data.codigo || `QUE-${data.id}`}</span>
              <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background: isQueja ? '#ec489922' : '#22c55e22', color: isQueja ? C.pink : C.green, fontWeight:700 }}>
                {det.tipo || 'Queja'}
              </span>
              <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, ...estadoStyle(data.estado) }}>{data.estado}</span>
              {det.es_anonimo && (
                <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background:'#64748b22', color:C.muted, display:'inline-flex', alignItems:'center', gap:4 }}>
                  <Shield size={12} /> Anónimo
                </span>
              )}
            </div>
            <h2 style={{ color:C.text, fontSize:17, fontWeight:700, margin:0 }}>{data.asunto}</h2>
          </div>
          <button onClick={onClose} style={{ background:'transparent', border:'none', cursor:'pointer' }}><X size={20} color={C.muted} /></button>
        </div>

        {/* Resumen info */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:10, background:C.bg, padding:14, borderRadius:8, marginBottom:18 }}>
          <div><span style={{ color:C.dim, fontSize:11 }}>SOLICITANTE:</span><p style={{ color:C.text, fontSize:13, margin:0, fontWeight:600 }}>{det.es_anonimo ? 'Anónimo (Confidencial)' : (data.nombre_solicitante || '—')}</p></div>
          <div><span style={{ color:C.dim, fontSize:11 }}>CORREO:</span><p style={{ color:C.text, fontSize:13, margin:0 }}>{data.correo_solicitante}</p></div>
          <div><span style={{ color:C.dim, fontSize:11 }}>CATEGORÍA:</span><p style={{ color:C.text, fontSize:13, margin:0 }}>{det.categoria || '—'}</p></div>
          <div><span style={{ color:C.dim, fontSize:11 }}>ÁREA:</span><p style={{ color:C.text, fontSize:13, margin:0 }}>{det.area_relacionada || data.area_responsable || '—'}</p></div>
        </div>

        {/* Detalle */}
        <div style={{ marginBottom:18 }}>
          <SectionTitle t={`CONTENIDO DE LA ${det.tipo ? det.tipo.toUpperCase() : 'SOLICITUD'}`} />
          <div style={{ background:C.bg, padding:14, borderRadius:8, border:`1px solid ${C.border}`, color:C.text, fontSize:13, lineHeight:1.6, whiteSpace:'pre-wrap' }}>
            {data.descripcion || 'Sin descripción registrada.'}
          </div>
        </div>

        {/* Evaluación interna */}
        <div style={{ marginBottom:18, background:C.bg, padding:14, borderRadius:8, border:`1px solid ${C.purple}44` }}>
          <SectionTitle t="1. EVALUACIÓN Y ACCIÓN DE MEJORA INTERNA" />
          <div style={{ display:'grid', gap:10 }}>
            <div>
              <label style={{ display:'block', color:C.muted, fontSize:12, marginBottom:4 }}>Evaluación / Diagnóstico interno:</label>
              <textarea value={evaluacion} onChange={e => setEvaluacion(e.target.value)} rows={2}
                placeholder="Análisis del caso por la dirección/área competente..."
                style={{ width:'100%', padding:'8px 12px', background:C.card, border:`1px solid ${C.border}`, borderRadius:7, color:C.text, fontSize:13 }} />
            </div>
            <div>
              <label style={{ display:'block', color:C.muted, fontSize:12, marginBottom:4 }}>Acción correctiva o propuesta adoptada:</label>
              <input value={accionPropuesta} onChange={e => setAccionPropuesta(e.target.value)}
                placeholder="Ej. Implementar protocolo de atención en ventanilla"
                style={{ width:'100%', padding:'8px 12px', background:C.card, border:`1px solid ${C.border}`, borderRadius:7, color:C.text, fontSize:13 }} />
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end' }}>
              <button onClick={guardarEvaluacion} disabled={savingEval}
                style={{ padding:'7px 14px', background:C.purple, border:'none', borderRadius:7, color:'#fff', fontWeight:600, fontSize:12, cursor:'pointer' }}>
                {savingEval ? 'Guardando...' : 'Guardar Evaluación'}
              </button>
            </div>
          </div>
        </div>

        {/* Respuesta al solicitante */}
        <div style={{ marginBottom:18, background:C.bg, padding:14, borderRadius:8, border:`1px solid ${C.green}44` }}>
          <SectionTitle t="2. RESPUESTA FORMAL AL SOLICITANTE" />
          <div style={{ display:'grid', gap:10 }}>
            <textarea value={respuestaFinal} onChange={e => setRespuestaFinal(e.target.value)} rows={3}
              placeholder="Texto formal de respuesta o agradecimiento enviado al solicitante..."
              style={{ width:'100%', padding:'8px 12px', background:C.card, border:`1px solid ${C.border}`, borderRadius:7, color:C.text, fontSize:13 }} />
            <div style={{ display:'flex', justifyContent:'flex-end' }}>
              <button onClick={guardarRespuesta} disabled={savingResp}
                style={{ padding:'7px 14px', background:C.green, border:'none', borderRadius:7, color:'#fff', fontWeight:600, fontSize:12, cursor:'pointer' }}>
                {savingResp ? 'Guardando...' : 'Registrar Respuesta Final y Marcar Respondida'}
              </button>
            </div>
          </div>
        </div>

        {/* Estado y derivación */}
        <div style={{ marginBottom:18, background:C.bg, padding:14, borderRadius:8, border:`1px solid ${C.border}` }}>
          <SectionTitle t="3. ESTADO Y DERIVACIÓN" />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
            <div>
              <label style={{ color:C.muted, fontSize:11 }}>Estado:</label>
              {sel(nuevoEstado, setNuevoEstado, ESTADOS.filter(e => e !== 'Todos'))}
            </div>
            <div>
              <label style={{ color:C.muted, fontSize:11 }}>Área asignada:</label>
              {sel(areaResp, setAreaResp, AREAS)}
            </div>
          </div>
          <div style={{ marginBottom:10 }}>
            <label style={{ color:C.muted, fontSize:11 }}>Comentario:</label>
            {inp(comentarioEstado, setComentarioEstado, 'Motivo del cambio de estado')}
          </div>
          <div style={{ display:'flex', justifyContent:'flex-end' }}>
            <button onClick={cambiarEstado} disabled={savingEst}
              style={{ padding:'7px 14px', background:C.blue, border:'none', borderRadius:7, color:'#fff', fontWeight:600, fontSize:12, cursor:'pointer' }}>
              {savingEst ? 'Actualizando...' : 'Actualizar Estado'}
            </button>
          </div>
        </div>

        {msg && <p style={{ color:C.text, fontSize:12, marginBottom:14 }}>{msg}</p>}

        {/* Historial */}
        <div>
          <SectionTitle t="HISTORIAL DE LA ATENCIÓN" />
          <div style={{ display:'grid', gap:8 }}>
            {data.historial && data.historial.length > 0 ? (
              data.historial.map((h: any, i: number) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:10, background:C.bg, padding:'8px 12px', borderRadius:7, fontSize:12 }}>
                  <Clock size={14} color={C.dim} />
                  <span style={{ color:C.dim, minWidth:110 }}>{fmtDate(h.fecha)}</span>
                  <span style={{ color: isQueja ? C.pink : C.green, fontWeight:600 }}>{h.estado_nuevo}</span>
                  <span style={{ color:C.muted }}>— {h.comentario || 'Sin comentario'}</span>
                  {h.area_responsable && <span style={{ marginLeft:'auto', color:C.dim, fontSize:11 }}>[{h.area_responsable}]</span>}
                </div>
              ))
            ) : (
              <p style={{ color:C.dim, fontSize:12 }}>No hay registros de historial aún.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Página Principal Quejas y Sugerencias ────
export default function Quejas() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('Todos');
  const [filtroEstado, setFiltroEstado] = useState('Todos');
  const [showNueva, setShowNueva] = useState(false);
  const [selId, setSelId] = useState<number | null>(null);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/list`);
      const d = await res.json();
      setItems(Array.isArray(d) ? d : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  const filtered = items.filter(r => {
    const s = q.toLowerCase();
    const matchQ = !q ||
      r.codigo?.toLowerCase().includes(s) ||
      r.nombre_solicitante?.toLowerCase().includes(s) ||
      r.correo_solicitante?.toLowerCase().includes(s) ||
      r.asunto?.toLowerCase().includes(s);
    const matchT = filtroTipo === 'Todos' || r.detalle?.tipo === filtroTipo;
    const matchE = filtroEstado === 'Todos' || r.estado === filtroEstado;
    return matchQ && matchT && matchE;
  });

  const kpis = {
    total: items.length,
    quejas: items.filter(r => r.detalle?.tipo === 'Queja').length,
    sugerencias: items.filter(r => r.detalle?.tipo === 'Sugerencia').length,
    respondidas: items.filter(r => ['Respondida', 'Cerrada'].includes(r.estado)).length,
  };

  return (
    <div style={{ padding:28, background:C.bg, minHeight:'100vh' }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
        <div>
          <h1 style={{ color:C.text, fontSize:22, fontWeight:700, margin:0 }}>Buzón de Quejas y Sugerencias</h1>
          <p style={{ color:C.muted, fontSize:13, margin:'4px 0 0' }}>Recepción, registro confidencial, evaluación y seguimiento de propuestas y quejas</p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={fetchItems} style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 14px', background:C.card, border:`1px solid ${C.border}`, borderRadius:8, color:C.muted, fontSize:13, cursor:'pointer' }}>
            <RefreshCw size={15} /> Actualizar
          </button>
          <button onClick={() => setShowNueva(true)} style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 16px', background:C.pink, border:'none', borderRadius:8, color:'#fff', fontWeight:600, fontSize:13, cursor:'pointer' }}>
            <Plus size={16} /> Nueva Entrada
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:14, marginBottom:22 }}>
        {[
          { label:'TOTAL ENTRADAS', val:kpis.total, color:C.blue },
          { label:'QUEJAS', val:kpis.quejas, color:C.pink },
          { label:'SUGERENCIAS DE MEJORA', val:kpis.sugerencias, color:C.green },
          { label:'RESPONDIDAS / CERRADAS', val:kpis.respondidas, color:C.purple },
        ].map(k => (
          <div key={k.label} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:'16px 20px' }}>
            <p style={{ color:C.dim, fontSize:11, fontWeight:700, margin:0, letterSpacing:'0.05em' }}>{k.label}</p>
            <p style={{ color:k.color, fontSize:28, fontWeight:800, margin:'6px 0 0' }}>{k.val}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display:'flex', gap:12, marginBottom:18, flexWrap:'wrap' }}>
        <div style={{ position:'relative', flex:1, minWidth:240 }}>
          <Search size={16} color={C.dim} style={{ position:'absolute', left:11, top:11 }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por código, asunto, solicitante..."
            style={{ width:'100%', padding:'9px 12px 9px 34px', background:C.card, border:`1px solid ${C.border}`, borderRadius:8, color:C.text, fontSize:13, outline:'none' }} />
        </div>
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
          style={{ padding:'9px 14px', background:C.card, border:`1px solid ${C.border}`, borderRadius:8, color:C.text, fontSize:13 }}>
          {['Todos', 'Queja', 'Sugerencia'].map(t => <option key={t}>{t}</option>)}
        </select>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
          style={{ padding:'9px 14px', background:C.card, border:`1px solid ${C.border}`, borderRadius:8, color:C.text, fontSize:13 }}>
          {ESTADOS.map(e => <option key={e}>{e}</option>)}
        </select>
      </div>

      {/* Tabla */}
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
          <thead>
            <tr style={{ borderBottom:`1px solid ${C.border}`, color:C.dim, fontSize:11, fontWeight:700, textAlign:'left' }}>
              <th style={{ padding:'12px 16px' }}>CÓDIGO</th>
              <th style={{ padding:'12px 16px' }}>TIPO</th>
              <th style={{ padding:'12px 16px' }}>CATEGORÍA</th>
              <th style={{ padding:'12px 16px' }}>SOLICITANTE</th>
              <th style={{ padding:'12px 16px' }}>ASUNTO</th>
              <th style={{ padding:'12px 16px' }}>RECEPCIÓN</th>
              <th style={{ padding:'12px 16px' }}>ESTADO</th>
              <th style={{ padding:'12px 16px', textAlign:'center' }}>ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ padding:36, textAlign:'center', color:C.muted }}>Cargando entradas...</td></tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding:48, textAlign:'center', color:C.dim }}>
                  <MessageCircle size={36} style={{ margin:'0 auto 10px', opacity:0.4 }} />
                  <p style={{ margin:0, fontWeight:600 }}>No hay quejas ni sugerencias registradas</p>
                  <p style={{ fontSize:12, marginTop:4 }}>Utiliza el botón "Nueva Entrada" para registrar una.</p>
                </td>
              </tr>
            ) : (
              filtered.map(r => {
                const isQ = r.detalle?.tipo === 'Queja';
                return (
                  <tr key={r.id} style={{ borderBottom:`1px solid ${C.border}22`, color:C.text }}>
                    <td style={{ padding:'12px 16px', fontWeight:700, color: isQ ? C.pink : C.green }}>{r.codigo || `QUE-${r.id}`}</td>
                    <td style={{ padding:'12px 16px' }}>
                      <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background: isQ ? '#ec489922' : '#22c55e22', color: isQ ? C.pink : C.green, fontWeight:700 }}>
                        {r.detalle?.tipo || 'Queja'}
                      </span>
                    </td>
                    <td style={{ padding:'12px 16px', color:C.muted }}>{r.detalle?.categoria || 'General'}</td>
                    <td style={{ padding:'12px 16px' }}>
                      <div style={{ fontWeight:600 }}>{r.nombre_solicitante || '—'}</div>
                      <div style={{ fontSize:11, color:C.dim }}>{r.correo_solicitante}</div>
                    </td>
                    <td style={{ padding:'12px 16px', maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.asunto}</td>
                    <td style={{ padding:'12px 16px', color:C.dim, fontSize:12 }}>{fmtDate(r.fecha_recepcion)}</td>
                    <td style={{ padding:'12px 16px' }}>
                      <span style={{ fontSize:11, padding:'3px 9px', borderRadius:20, ...estadoStyle(r.estado) }}>
                        {r.estado}
                      </span>
                    </td>
                    <td style={{ padding:'12px 16px', textAlign:'center' }}>
                      <button onClick={() => setSelId(r.id)}
                        style={{ padding:'6px 12px', background: isQ ? '#ec489918' : '#22c55e18', border:`1px solid ${isQ ? C.pink : C.green}44`, borderRadius:6, color: isQ ? C.pink : C.green, fontSize:12, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:4 }}>
                        <Eye size={13} /> Gestionar
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showNueva && <ModalNueva onClose={() => setShowNueva(false)} onCreated={fetchItems} />}
      {selId !== null && <ModalDetalle id={selId} onClose={() => setSelId(null)} onUpdated={fetchItems} />}
    </div>
  );
}

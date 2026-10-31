import { useState, useEffect } from 'react';
import { Search, Plus, RefreshCw, Eye, X, AlertTriangle, CheckCircle, ShieldAlert, Clock } from 'lucide-react';
import { API_BASE } from '../config';


const C = {
  bg: '#0f172a', card: '#1e293b', border: '#334155',
  text: '#f1f5f9', muted: '#94a3b8', dim: '#64748b',
  blue: '#3b82f6', green: '#22c55e', red: '#ef4444',
  yellow: '#f59e0b', purple: '#a855f7', orange: '#f97316',
};

const API = `${API_BASE}/api/reclamos`;

const CATEGORIAS = ['Servicio', 'Docente', 'Administrativo', 'Infraestructura', 'Otro'];
const AREAS = ['Dirección', 'Secretaría', 'Coordinación Académica', 'Tutoría', 'Tesorería', 'Mantenimiento', 'Otra'];
const PRIORIDADES = ['Baja', 'Normal', 'Alta', 'Urgente'];
const ESTADOS = [
  'Todos', 'Recibido', 'En evaluación', 'Derivado', 'En atención',
  'Pendiente de información', 'Resuelto', 'Cerrado', 'Requiere revisión manual'
];

const estadoStyle = (e: string) => {
  const m: Record<string, { bg: string; color: string }> = {
    'Recibido':                  { bg: '#1e3a5f33', color: '#93c5fd' },
    'En evaluación':             { bg: '#78350f33', color: '#fde047' },
    'Derivado':                  { bg: '#3b076433', color: '#d8b4fe' },
    'En atención':               { bg: '#92400e33', color: '#fdba74' },
    'Pendiente de información':  { bg: '#451a0333', color: '#fed7aa' },
    'Resuelto':                  { bg: '#14532d33', color: '#86efac' },
    'Cerrado':                   { bg: '#1e293b',   color: '#64748b' },
    'Requiere revisión manual':  { bg: '#450a0a33', color: '#fca5a5' },
  };
  return m[e] || { bg: '#1e293b', color: '#94a3b8' };
};

const categoriaColor = (cat: string) => {
  const m: Record<string, string> = {
    'Servicio': '#38bdf8', 'Docente': '#f472b6', 'Administrativo': '#fb923c',
    'Infraestructura': '#eab308', 'Otro': '#94a3b8',
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
  const [f, setF] = useState({
    nombre_solicitante:'', correo_solicitante:'', telefono_solicitante:'',
    prioridad:'Normal', asunto:'', categoria:'Servicio', hechos:'',
    area_responsable:'Secretaría', observaciones:''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const s = (k: string) => (v: string) => setF(p => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!f.nombre_solicitante || !f.correo_solicitante || !f.asunto || !f.hechos) {
      setError('Completa los campos obligatorios (*)'); return;
    }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(f) });
      if (!res.ok) throw new Error(await res.text());
      onCreated(); onClose();
    } catch (e: any) {
      setError(e.message || 'Error al registrar reclamo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'#000a', zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:28, width:'100%', maxWidth:640, maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ padding:8, background:'#f9731622', borderRadius:8 }}>
              <AlertTriangle size={20} color={C.orange} />
            </div>
            <div>
              <h2 style={{ color:C.text, fontSize:17, fontWeight:700, margin:0 }}>Nuevo Reclamo</h2>
              <p style={{ color:C.muted, fontSize:12, margin:0 }}>Registro de incidencia o disconformidad</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background:'transparent', border:'none', cursor:'pointer' }}><X size={20} color={C.muted} /></button>
        </div>

        <div style={{ display:'grid', gap:13 }}>
          <SectionTitle t="DATOS DEL RECLAMANTE" />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Field label="Nombre completo" req>{inp(f.nombre_solicitante, s('nombre_solicitante'), 'Ej. Carlos Valdivia')}</Field>
            <Field label="Correo de contacto" req>{inp(f.correo_solicitante, s('correo_solicitante'), 'correo@ejemplo.com', 'email')}</Field>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Field label="Teléfono">{inp(f.telefono_solicitante, s('telefono_solicitante'), 'Ej. 987654321')}</Field>
            <Field label="Prioridad">{sel(f.prioridad, s('prioridad'), PRIORIDADES)}</Field>
          </div>

          <SectionTitle t="CLASIFICACIÓN Y DETALLE DEL RECLAMO" />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Field label="Categoría" req>{sel(f.categoria, s('categoria'), CATEGORIAS)}</Field>
            <Field label="Área asignada">{sel(f.area_responsable, s('area_responsable'), AREAS)}</Field>
          </div>
          <Field label="Motivo / Asunto" req>{inp(f.asunto, s('asunto'), 'Ej. Cobro indebido en matrícula / Atención docente')}</Field>
          <Field label="Descripción de los hechos" req>
            <textarea value={f.hechos} onChange={e => s('hechos')(e.target.value)} rows={4}
              placeholder="Describa los hechos ocurridos con fecha, personas involucradas y detalles concretos"
              style={{ width:'100%', padding:'8px 12px', background:C.bg, border:`1px solid ${C.border}`, borderRadius:7, color:C.text, fontSize:13, resize:'vertical' }} />
          </Field>
          <Field label="Observaciones">
            <textarea value={f.observaciones} onChange={e => s('observaciones')(e.target.value)} rows={2}
              placeholder="Notas internas adicionales"
              style={{ width:'100%', padding:'8px 12px', background:C.bg, border:`1px solid ${C.border}`, borderRadius:7, color:C.text, fontSize:13, resize:'vertical' }} />
          </Field>
        </div>

        {error && <p style={{ color:C.red, fontSize:12, marginTop:12 }}>⚠️ {error}</p>}

        <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:22 }}>
          <button onClick={onClose} style={{ padding:'9px 18px', background:'transparent', border:`1px solid ${C.border}`, borderRadius:8, color:C.muted, fontSize:13, cursor:'pointer' }}>Cancelar</button>
          <button onClick={submit} disabled={loading} style={{ padding:'9px 20px', background:C.orange, border:'none', borderRadius:8, color:'#fff', fontWeight:600, fontSize:13, cursor:'pointer' }}>
            {loading ? 'Registrando...' : 'Registrar Reclamo'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Modal de Detalle y Resolución ────────────
const ModalDetalle = ({ id, onClose, onUpdated }: { id: number; onClose: () => void; onUpdated: () => void }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Formulario de resolución
  const [acciones, setAcciones] = useState('');
  const [resolucion, setResolucion] = useState('');
  const [savingRes, setSavingRes] = useState(false);

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
      if (d.detalle?.acciones_realizadas) setAcciones(d.detalle.acciones_realizadas);
      if (d.detalle?.resolucion) setResolucion(d.detalle.resolucion);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const guardarResolucion = async () => {
    if (!resolucion) { setMsg('Escriba el texto de la resolución'); return; }
    setSavingRes(true); setMsg('');
    try {
      const res = await fetch(`${API}/${id}/resolver`, {
        method:'PUT', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ acciones_realizadas: acciones, resolucion })
      });
      if (!res.ok) throw new Error(await res.text());
      setMsg('✅ Reclamo resuelto exitosamente');
      onUpdated(); load();
    } catch (e: any) { setMsg('Error: ' + e.message); }
    finally { setSavingRes(false); }
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

  return (
    <div style={{ position:'fixed', inset:0, background:'#000a', zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:28, width:'100%', maxWidth:760, maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
              <span style={{ color:C.orange, fontWeight:700, fontSize:15 }}>{data.codigo || `REC-${data.id}`}</span>
              <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, ...estadoStyle(data.estado) }}>{data.estado}</span>
              <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background:`${categoriaColor(det.categoria)}22`, color:categoriaColor(det.categoria) }}>{det.categoria}</span>
            </div>
            <h2 style={{ color:C.text, fontSize:17, fontWeight:700, margin:0 }}>{data.asunto}</h2>
          </div>
          <button onClick={onClose} style={{ background:'transparent', border:'none', cursor:'pointer' }}><X size={20} color={C.muted} /></button>
        </div>

        {/* Resumen info */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:10, background:C.bg, padding:14, borderRadius:8, marginBottom:18 }}>
          <div><span style={{ color:C.dim, fontSize:11 }}>RECLAMANTE:</span><p style={{ color:C.text, fontSize:13, margin:0, fontWeight:600 }}>{data.nombre_solicitante || '—'}</p></div>
          <div><span style={{ color:C.dim, fontSize:11 }}>CORREO:</span><p style={{ color:C.text, fontSize:13, margin:0 }}>{data.correo_solicitante}</p></div>
          <div><span style={{ color:C.dim, fontSize:11 }}>RECEPCIÓN:</span><p style={{ color:C.text, fontSize:13, margin:0 }}>{fmtDate(data.fecha_recepcion)}</p></div>
          <div><span style={{ color:C.dim, fontSize:11 }}>ÁREA ASIGNADA:</span><p style={{ color:C.text, fontSize:13, margin:0 }}>{data.area_responsable || 'Sin asignar'}</p></div>
        </div>

        {/* Hechos */}
        <div style={{ marginBottom:18 }}>
          <SectionTitle t="HECHOS DESCRITOS POR EL RECLAMANTE" />
          <div style={{ background:C.bg, padding:14, borderRadius:8, border:`1px solid ${C.border}`, color:C.text, fontSize:13, lineHeight:1.6, whiteSpace:'pre-wrap' }}>
            {det.hechos || 'Sin detalle de hechos registrado.'}
          </div>
        </div>

        {/* Panel de Resolución */}
        <div style={{ marginBottom:18, background:'#1e293b', border:`1px solid ${C.orange}44`, borderRadius:10, padding:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
            <CheckCircle size={18} color={C.orange} />
            <h3 style={{ color:C.text, fontSize:14, fontWeight:700, margin:0 }}>Resolución del Reclamo</h3>
            {det.fecha_resolucion && (
              <span style={{ color:C.dim, fontSize:11, marginLeft:'auto' }}>Resuelto: {fmtDate(det.fecha_resolucion)}</span>
            )}
          </div>
          <div style={{ display:'grid', gap:10 }}>
            <div>
              <label style={{ display:'block', color:C.muted, fontSize:12, marginBottom:4 }}>Acciones de investigación realizadas:</label>
              <textarea value={acciones} onChange={e => setAcciones(e.target.value)} rows={2}
                placeholder="Ej. Se entrevistó al docente / Se verificaron recibos de pago en caja..."
                style={{ width:'100%', padding:'8px 12px', background:C.bg, border:`1px solid ${C.border}`, borderRadius:7, color:C.text, fontSize:13 }} />
            </div>
            <div>
              <label style={{ display:'block', color:C.muted, fontSize:12, marginBottom:4 }}>Resolución y respuesta final al reclamante *:</label>
              <textarea value={resolucion} onChange={e => setResolucion(e.target.value)} rows={3}
                placeholder="Indique la solución, respuesta formal y medidas correctivas adoptadas..."
                style={{ width:'100%', padding:'8px 12px', background:C.bg, border:`1px solid ${C.border}`, borderRadius:7, color:C.text, fontSize:13 }} />
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end' }}>
              <button onClick={guardarResolucion} disabled={savingRes}
                style={{ padding:'8px 16px', background:C.orange, border:'none', borderRadius:7, color:'#fff', fontWeight:600, fontSize:12, cursor:'pointer' }}>
                {savingRes ? 'Guardando...' : 'Registrar Resolución y Marcar Resuelto'}
              </button>
            </div>
          </div>
        </div>

        {/* Cambio de Estado */}
        <div style={{ marginBottom:18, background:C.bg, padding:14, borderRadius:8, border:`1px solid ${C.border}` }}>
          <SectionTitle t="GESTIÓN DE ESTADO Y DERIVACIÓN" />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
            <div>
              <label style={{ color:C.muted, fontSize:11 }}>Nuevo Estado:</label>
              {sel(nuevoEstado, setNuevoEstado, ESTADOS.filter(e => e !== 'Todos'))}
            </div>
            <div>
              <label style={{ color:C.muted, fontSize:11 }}>Derivar a Área:</label>
              {sel(areaResp, setAreaResp, AREAS)}
            </div>
          </div>
          <div style={{ marginBottom:10 }}>
            <label style={{ color:C.muted, fontSize:11 }}>Comentario del cambio:</label>
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
          <SectionTitle t="TRAZABILIDAD E HISTORIAL DEL RECLAMO" />
          <div style={{ display:'grid', gap:8 }}>
            {data.historial && data.historial.length > 0 ? (
              data.historial.map((h: any, i: number) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:10, background:C.bg, padding:'8px 12px', borderRadius:7, fontSize:12 }}>
                  <Clock size={14} color={C.dim} />
                  <span style={{ color:C.dim, minWidth:110 }}>{fmtDate(h.fecha)}</span>
                  <span style={{ color:C.orange, fontWeight:600 }}>{h.estado_nuevo}</span>
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

// ── Página Principal Reclamos ────────────────
export default function Reclamos() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('Todos');
  const [filtroCategoria, setFiltroCategoria] = useState('Todas');
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
    const matchE = filtroEstado === 'Todos' || r.estado === filtroEstado;
    const matchC = filtroCategoria === 'Todas' || r.detalle?.categoria === filtroCategoria;
    return matchQ && matchE && matchC;
  });

  const kpis = {
    total: items.length,
    enAtencion: items.filter(r => ['Recibido', 'En evaluación', 'Derivado', 'En atención', 'Pendiente de información'].includes(r.estado)).length,
    resueltos: items.filter(r => r.estado === 'Resuelto').length,
    cerrados: items.filter(r => r.estado === 'Cerrado').length,
  };

  return (
    <div style={{ padding:28, background:C.bg, minHeight:'100vh' }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
        <div>
          <h1 style={{ color:C.text, fontSize:22, fontWeight:700, margin:0 }}>Módulo de Reclamos</h1>
          <p style={{ color:C.muted, fontSize:13, margin:'4px 0 0' }}>Registro, clasificación, derivación, investigación y seguimiento de reclamos</p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={fetchItems} style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 14px', background:C.card, border:`1px solid ${C.border}`, borderRadius:8, color:C.muted, fontSize:13, cursor:'pointer' }}>
            <RefreshCw size={15} /> Actualizar
          </button>
          <button onClick={() => setShowNueva(true)} style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 16px', background:C.orange, border:'none', borderRadius:8, color:'#fff', fontWeight:600, fontSize:13, cursor:'pointer' }}>
            <Plus size={16} /> Nuevo Reclamo
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:14, marginBottom:22 }}>
        {[
          { label:'TOTAL RECLAMOS', val:kpis.total, color:C.blue },
          { label:'EN EVALUACIÓN / ATENCIÓN', val:kpis.enAtencion, color:C.orange },
          { label:'RESUELTOS', val:kpis.resueltos, color:C.green },
          { label:'CERRADOS', val:kpis.cerrados, color:C.muted },
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
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por código, solicitante, correo, asunto..."
            style={{ width:'100%', padding:'9px 12px 9px 34px', background:C.card, border:`1px solid ${C.border}`, borderRadius:8, color:C.text, fontSize:13, outline:'none' }} />
        </div>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
          style={{ padding:'9px 14px', background:C.card, border:`1px solid ${C.border}`, borderRadius:8, color:C.text, fontSize:13 }}>
          {ESTADOS.map(e => <option key={e}>{e}</option>)}
        </select>
        <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)}
          style={{ padding:'9px 14px', background:C.card, border:`1px solid ${C.border}`, borderRadius:8, color:C.text, fontSize:13 }}>
          {['Todas', ...CATEGORIAS].map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* Tabla */}
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
          <thead>
            <tr style={{ borderBottom:`1px solid ${C.border}`, color:C.dim, fontSize:11, fontWeight:700, textAlign:'left' }}>
              <th style={{ padding:'12px 16px' }}>CÓDIGO</th>
              <th style={{ padding:'12px 16px' }}>CATEGORÍA</th>
              <th style={{ padding:'12px 16px' }}>RECLAMANTE</th>
              <th style={{ padding:'12px 16px' }}>ASUNTO</th>
              <th style={{ padding:'12px 16px' }}>ÁREA</th>
              <th style={{ padding:'12px 16px' }}>RECEPCIÓN</th>
              <th style={{ padding:'12px 16px' }}>ESTADO</th>
              <th style={{ padding:'12px 16px', textAlign:'center' }}>ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ padding:36, textAlign:'center', color:C.muted }}>Cargando reclamos...</td></tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding:48, textAlign:'center', color:C.dim }}>
                  <ShieldAlert size={36} style={{ margin:'0 auto 10px', opacity:0.4 }} />
                  <p style={{ margin:0, fontWeight:600 }}>No hay reclamos registrados</p>
                  <p style={{ fontSize:12, marginTop:4 }}>Utiliza el botón "Nuevo Reclamo" para agregar uno.</p>
                </td>
              </tr>
            ) : (
              filtered.map(r => (
                <tr key={r.id} style={{ borderBottom:`1px solid ${C.border}22`, color:C.text }}>
                  <td style={{ padding:'12px 16px', fontWeight:700, color:C.orange }}>{r.codigo || `REC-${r.id}`}</td>
                  <td style={{ padding:'12px 16px' }}>
                    <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background:`${categoriaColor(r.detalle?.categoria)}22`, color:categoriaColor(r.detalle?.categoria) }}>
                      {r.detalle?.categoria || 'Otro'}
                    </span>
                  </td>
                  <td style={{ padding:'12px 16px' }}>
                    <div style={{ fontWeight:600 }}>{r.nombre_solicitante || '—'}</div>
                    <div style={{ fontSize:11, color:C.dim }}>{r.correo_solicitante}</div>
                  </td>
                  <td style={{ padding:'12px 16px', maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.asunto}</td>
                  <td style={{ padding:'12px 16px', color:C.muted }}>{r.area_responsable || '—'}</td>
                  <td style={{ padding:'12px 16px', color:C.dim, fontSize:12 }}>{fmtDate(r.fecha_recepcion)}</td>
                  <td style={{ padding:'12px 16px' }}>
                    <span style={{ fontSize:11, padding:'3px 9px', borderRadius:20, ...estadoStyle(r.estado) }}>
                      {r.estado}
                    </span>
                  </td>
                  <td style={{ padding:'12px 16px', textAlign:'center' }}>
                    <button onClick={() => setSelId(r.id)}
                      style={{ padding:'6px 12px', background:'#f9731618', border:`1px solid ${C.orange}44`, borderRadius:6, color:C.orange, fontSize:12, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:4 }}>
                      <Eye size={13} /> Gestionar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showNueva && <ModalNueva onClose={() => setShowNueva(false)} onCreated={fetchItems} />}
      {selId !== null && <ModalDetalle id={selId} onClose={() => setSelId(null)} onUpdated={fetchItems} />}
    </div>
  );
}

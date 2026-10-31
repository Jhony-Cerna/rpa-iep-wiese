import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, RefreshCw, Layers, CheckCircle, Clock, AlertTriangle, ArrowRight } from 'lucide-react';
import { API_BASE } from '../config';


const C = {
  bg: '#0f172a', card: '#1e293b', border: '#334155',
  text: '#f1f5f9', muted: '#94a3b8', dim: '#64748b',
  blue: '#3b82f6', green: '#22c55e', red: '#ef4444',
  yellow: '#f59e0b', purple: '#a855f7', orange: '#f97316', pink: '#ec4899', cyan: '#06b6d4',
};

const API = `${API_BASE}/api/requests/list`;

const TIPOS = [
  'Todos',
  'Libreta de Notas',
  'Actualizacion de Datos',
  'Consulta',
  'Entrevista',
  'Reclamo',
  'Queja o Sugerencia'
];

const ESTADOS = [
  'Todos',
  'Recibida',
  'En proceso',
  'En evaluación',
  'Programada',
  'Atendida',
  'Resuelto',
  'Respondida',
  'Cerrada',
  'Error',
  'Requiere revisión manual'
];

const tipoConfig: Record<string, { color: string; route: string; label: string }> = {
  'Libreta de Notas':       { color: C.blue,   route: '/libretas',     label: 'Libreta' },
  'Actualizacion de Datos': { color: C.purple, route: '/actualizacion', label: 'Actualización' },
  'Consulta':               { color: C.cyan,   route: '/consultas',    label: 'Consulta' },
  'Entrevista':             { color: C.green,  route: '/entrevistas',  label: 'Entrevista' },
  'Reclamo':                { color: C.orange, route: '/reclamos',     label: 'Reclamo' },
  'Queja o Sugerencia':     { color: C.pink,   route: '/quejas',       label: 'Queja/Sug.' },
};

const estadoStyle = (e: string) => {
  const m: Record<string, { bg: string; color: string }> = {
    'Recibida':                  { bg: '#1e3a5f33', color: '#93c5fd' },
    'Recibido':                  { bg: '#1e3a5f33', color: '#93c5fd' },
    'En proceso':                { bg: '#78350f33', color: '#fde047' },
    'En evaluación':             { bg: '#78350f33', color: '#fde047' },
    'En revisión':               { bg: '#78350f33', color: '#fde047' },
    'Programada':                { bg: '#14532d33', color: '#86efac' },
    'Atendida':                  { bg: '#14532d33', color: '#86efac' },
    'Resuelto':                  { bg: '#14532d33', color: '#86efac' },
    'Respondida':                { bg: '#14532d33', color: '#86efac' },
    'Cerrada':                   { bg: '#1e293b',   color: '#64748b' },
    'Cerrado':                   { bg: '#1e293b',   color: '#64748b' },
    'Error':                     { bg: '#450a0a33', color: '#fca5a5' },
    'Requiere revisión manual':  { bg: '#450a0a33', color: '#fca5a5' },
  };
  return m[e] || { bg: '#1e293b', color: '#94a3b8' };
};

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('es-PE', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—';

export default function Solicitudes() {
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('Todos');
  const [filtroEstado, setFiltroEstado] = useState('Todos');
  const [filtroCanal, setFiltroCanal] = useState('Todos');

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch(API);
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
      r.asunto?.toLowerCase().includes(s) ||
      r.dni_estudiante?.toLowerCase().includes(s);
    const matchT = filtroTipo === 'Todos' || r.tipo_solicitud === filtroTipo;
    const matchE = filtroEstado === 'Todos' || r.estado === filtroEstado;
    const matchC = filtroCanal === 'Todos' || r.canal_origen === filtroCanal;
    return matchQ && matchT && matchE && matchC;
  });

  const atendidos = ['Atendida', 'Resuelto', 'Respondida', 'Cerrada', 'Cerrado'];
  const tramites = ['En proceso', 'En evaluación', 'En revisión', 'Programada', 'Recibida', 'Recibido', 'En atención'];

  const kpis = {
    total: items.length,
    atendidas: items.filter(r => atendidos.includes(r.estado)).length,
    enTramite: items.filter(r => tramites.includes(r.estado)).length,
    conIncidencia: items.filter(r => ['Error', 'Requiere revisión manual'].includes(r.estado)).length,
  };

  const irAModulo = (tipo: string) => {
    const cfg = tipoConfig[tipo];
    if (cfg) navigate(cfg.route);
  };

  return (
    <div style={{ padding:28, background:C.bg, minHeight:'100vh' }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
        <div>
          <h1 style={{ color:C.text, fontSize:22, fontWeight:700, margin:0 }}>Vista Unificada de Solicitudes</h1>
          <p style={{ color:C.muted, fontSize:13, margin:'4px 0 0' }}>Bandeja centralizada de todas las solicitudes administrativas institucionales</p>
        </div>
        <button onClick={fetchItems} style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 14px', background:C.card, border:`1px solid ${C.border}`, borderRadius:8, color:C.muted, fontSize:13, cursor:'pointer' }}>
          <RefreshCw size={15} /> Actualizar
        </button>
      </div>

      {/* KPIs Generales */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:14, marginBottom:22 }}>
        {[
          { label:'TOTAL SOLICITUDES', val:kpis.total, color:C.blue, icon:Layers },
          { label:'EN TRÁMITE / GESTIÓN', val:kpis.enTramite, color:C.yellow, icon:Clock },
          { label:'ATENDIDAS / RESUELTAS', val:kpis.atendidas, color:C.green, icon:CheckCircle },
          { label:'REQUIEREN ATENCIÓN', val:kpis.conIncidencia, color:C.red, icon:AlertTriangle },
        ].map(k => {
          const Icon = k.icon;
          return (
            <div key={k.label} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:'16px 20px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <p style={{ color:C.dim, fontSize:11, fontWeight:700, margin:0, letterSpacing:'0.05em' }}>{k.label}</p>
                <p style={{ color:k.color, fontSize:28, fontWeight:800, margin:'6px 0 0' }}>{k.val}</p>
              </div>
              <div style={{ padding:10, borderRadius:8, background:`${k.color}15` }}>
                <Icon size={22} color={k.color} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Filtros */}
      <div style={{ display:'flex', gap:12, marginBottom:18, flexWrap:'wrap' }}>
        <div style={{ position:'relative', flex:1, minWidth:260 }}>
          <Search size={16} color={C.dim} style={{ position:'absolute', left:11, top:11 }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar código, solicitante, DNI, asunto..."
            style={{ width:'100%', padding:'9px 12px 9px 34px', background:C.card, border:`1px solid ${C.border}`, borderRadius:8, color:C.text, fontSize:13, outline:'none' }} />
        </div>
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
          style={{ padding:'9px 14px', background:C.card, border:`1px solid ${C.border}`, borderRadius:8, color:C.text, fontSize:13 }}>
          {TIPOS.map(t => <option key={t}>{t === 'Todos' ? 'Todos los tipos' : t}</option>)}
        </select>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
          style={{ padding:'9px 14px', background:C.card, border:`1px solid ${C.border}`, borderRadius:8, color:C.text, fontSize:13 }}>
          {ESTADOS.map(e => <option key={e}>{e === 'Todos' ? 'Todos los estados' : e}</option>)}
        </select>
        <select value={filtroCanal} onChange={e => setFiltroCanal(e.target.value)}
          style={{ padding:'9px 14px', background:C.card, border:`1px solid ${C.border}`, borderRadius:8, color:C.text, fontSize:13 }}>
          {['Todos', 'Gmail', 'Manual', 'Web'].map(c => <option key={c}>{c === 'Todos' ? 'Todos los canales' : c}</option>)}
        </select>
      </div>

      {/* Tabla Unificada */}
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
          <thead>
            <tr style={{ borderBottom:`1px solid ${C.border}`, color:C.dim, fontSize:11, fontWeight:700, textAlign:'left' }}>
              <th style={{ padding:'12px 16px' }}>CÓDIGO</th>
              <th style={{ padding:'12px 16px' }}>TIPO</th>
              <th style={{ padding:'12px 16px' }}>CANAL</th>
              <th style={{ padding:'12px 16px' }}>SOLICITANTE</th>
              <th style={{ padding:'12px 16px' }}>ASUNTO / DETALLE</th>
              <th style={{ padding:'12px 16px' }}>FECHA RECEPCIÓN</th>
              <th style={{ padding:'12px 16px' }}>ESTADO</th>
              <th style={{ padding:'12px 16px', textAlign:'center' }}>IR AL MÓDULO</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ padding:36, textAlign:'center', color:C.muted }}>Cargando solicitudes unificadas...</td></tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding:48, textAlign:'center', color:C.dim }}>
                  <Layers size={36} style={{ margin:'0 auto 10px', opacity:0.4 }} />
                  <p style={{ margin:0, fontWeight:600 }}>No se encontraron solicitudes con los filtros aplicados</p>
                </td>
              </tr>
            ) : (
              filtered.map(r => {
                const cfg = tipoConfig[r.tipo_solicitud] || { color: C.muted, route: '/dashboard', label: r.tipo_solicitud || 'Solicitud' };
                return (
                  <tr key={r.id} style={{ borderBottom:`1px solid ${C.border}22`, color:C.text }}>
                    <td style={{ padding:'12px 16px', fontWeight:700, color: cfg.color }}>{r.codigo || `SOL-${r.id}`}</td>
                    <td style={{ padding:'12px 16px' }}>
                      <span style={{ fontSize:11, padding:'3px 8px', borderRadius:20, background:`${cfg.color}22`, color:cfg.color, fontWeight:700, whiteSpace:'nowrap' }}>
                        {cfg.label}
                      </span>
                    </td>
                    <td style={{ padding:'12px 16px' }}>
                      <span style={{ fontSize:11, padding:'2px 7px', borderRadius:4, background:'#1e293b', color:C.muted, border:`1px solid ${C.border}` }}>
                        {r.canal_origen || 'Gmail'}
                      </span>
                    </td>
                    <td style={{ padding:'12px 16px' }}>
                      <div style={{ fontWeight:600 }}>{r.nombre_solicitante || (r.dni_estudiante ? `DNI: ${r.dni_estudiante}` : '—')}</div>
                      <div style={{ fontSize:11, color:C.dim }}>{r.correo_solicitante}</div>
                    </td>
                    <td style={{ padding:'12px 16px', maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {r.asunto || (r.grado ? `Libreta - Grado: ${r.grado}` : '—')}
                    </td>
                    <td style={{ padding:'12px 16px', color:C.dim, fontSize:12 }}>{fmtDate(r.fecha_recepcion)}</td>
                    <td style={{ padding:'12px 16px' }}>
                      <span style={{ fontSize:11, padding:'3px 9px', borderRadius:20, ...estadoStyle(r.estado) }}>
                        {r.estado}
                      </span>
                    </td>
                    <td style={{ padding:'12px 16px', textAlign:'center' }}>
                      <button onClick={() => irAModulo(r.tipo_solicitud)}
                        style={{ padding:'6px 12px', background:`${cfg.color}15`, border:`1px solid ${cfg.color}44`, borderRadius:6, color:cfg.color, fontSize:12, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:4 }}>
                        <span>Ver en módulo</span>
                        <ArrowRight size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

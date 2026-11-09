import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, RefreshCw, Layers, CheckCircle, Clock, Timer, ArrowRight } from 'lucide-react';
import { API_BASE } from '../config';

const C = {
  bg: '#0f172a', card: '#1e293b', border: '#334155',
  text: '#f1f5f9', muted: '#94a3b8', dim: '#64748b',
  blue: '#3b82f6', green: '#22c55e', red: '#ef4444',
  yellow: '#f59e0b', purple: '#a855f7', orange: '#f97316', pink: '#ec4899', cyan: '#06b6d4',
};

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
  'Atendida',
  'Pendiente',
  'Recibida',
  'En proceso',
  'En evaluación',
  'Programada',
  'Resuelto',
  'Respondida',
  'Cerrada',
  'Error',
  'Requiere revisión manual'
];

const tipoConfig: Record<string, { color: string; route: string; label: string }> = {
  'Libreta de Notas':       { color: C.blue,   route: '/libretas',      label: 'Libreta de notas' },
  'Actualizacion de Datos': { color: C.purple, route: '/actualizacion', label: 'Actualización de datos' },
  'Consulta':               { color: C.cyan,   route: '/consultas',     label: 'Consulta' },
  'Entrevista':             { color: C.green,  route: '/entrevistas',   label: 'Entrevista' },
  'Reclamo':                { color: C.orange, route: '/reclamos',      label: 'Reclamo' },
  'Queja o Sugerencia':     { color: C.pink,   route: '/quejas',        label: 'Queja/Sug.' },
};

const estadoStyle = (e: string) => {
  const m: Record<string, { bg: string; color: string }> = {
    'Pendiente':                 { bg: '#78350f33', color: '#fbbf24' },
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

// Muestra fecha exacta YYYY-MM-DD HH:MM:SS sin desfase horario
const fmtExact = (iso: string | null) => {
  if (!iso) return '—';
  return iso.replace('T', ' ').slice(0, 19);
};

export default function Solicitudes() {
  const navigate = useNavigate();
  const [fase, setFase] = useState<'post' | 'pre' | 'all'>('post');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('Todos');
  const [filtroEstado, setFiltroEstado] = useState('Todos');

  const fetchItems = async (targetFase = fase) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/requests/list?fase=${targetFase}`);
      const d = await res.json();
      setItems(Array.isArray(d) ? d : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(fase); }, [fase]);

  const filtered = items.filter(r => {
    const s = q.toLowerCase();
    const matchQ = !q ||
      r.codigo?.toLowerCase().includes(s) ||
      r.expediente?.toLowerCase().includes(s) ||
      r.gmail_message_id?.toLowerCase().includes(s) ||
      r.nombre_solicitante?.toLowerCase().includes(s) ||
      r.correo_solicitante?.toLowerCase().includes(s) ||
      r.estudiante?.toLowerCase().includes(s) ||
      r.asunto?.toLowerCase().includes(s) ||
      r.dni_estudiante?.toLowerCase().includes(s);
    const matchT = filtroTipo === 'Todos' || r.tipo_solicitud === filtroTipo;
    const matchE = filtroEstado === 'Todos' || r.estado === filtroEstado;
    return matchQ && matchT && matchE;
  });

  const atendidos = ['Atendida', 'Resuelto', 'Respondida', 'Cerrada', 'Cerrado'];
  const tramites = ['Pendiente', 'En proceso', 'En evaluación', 'En revisión', 'Programada', 'Recibida', 'Recibido', 'En atención'];

  const tprValidos = items
    .filter(r => atendidos.includes(r.estado) && typeof r.tpr_minutos === 'number')
    .map(r => r.tpr_minutos as number);
  const tprMedia = tprValidos.length > 0
    ? (tprValidos.reduce((a, b) => a + b, 0) / tprValidos.length).toFixed(2)
    : '0.00';

  const kpis = {
    total: items.length,
    atendidas: items.filter(r => atendidos.includes(r.estado)).length,
    enTramite: items.filter(r => tramites.includes(r.estado)).length,
    tprPromedio: `${tprMedia} min`,
  };

  const irAModulo = (tipo: string) => {
    const cfg = tipoConfig[tipo];
    if (cfg) navigate(cfg.route);
  };

  return (
    <div style={{ padding: 28, background: C.bg, minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ color: C.text, fontSize: 22, fontWeight: 700, margin: 0 }}>
            Registro Auditado de Solicitudes ({fase === 'post' ? 'Pos-Test con RPA' : fase === 'pre' ? 'Pre-Test Manual' : 'Consolidado Total'})
          </h1>
          <p style={{ color: C.muted, fontSize: 13, margin: '4px 0 0' }}>
            Trazabilidad completa de tickets, IDs de Gmail API, apoderados, estudiantes y tiempos exactos de primera respuesta (TPR)
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select
            value={fase}
            onChange={e => setFase(e.target.value as 'post' | 'pre' | 'all')}
            style={{ padding: '9px 14px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 13, fontWeight: 600 }}
          >
            <option value="post">Fase Pos-Test RPA (40)</option>
            <option value="pre">Fase Pre-Test Manual (40)</option>
            <option value="all">Todas las fases (80)</option>
          </select>
          <button onClick={() => fetchItems(fase)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, color: C.muted, fontSize: 13, cursor: 'pointer' }}>
            <RefreshCw size={15} /> Actualizar
          </button>
        </div>
      </div>

      {/* KPIs Generales */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 22 }}>
        {[
          { label: 'TOTAL SOLICITUDES', val: kpis.total, color: C.blue, icon: Layers },
          { label: 'ATENDIDAS', val: kpis.atendidas, color: C.green, icon: CheckCircle },
          { label: 'PENDIENTES / EN TRÁMITE', val: kpis.enTramite, color: C.yellow, icon: Clock },
          { label: 'MEDIA TPR (ATENDIDAS)', val: kpis.tprPromedio, color: C.cyan, icon: Timer },
        ].map(k => {
          const Icon = k.icon;
          return (
            <div key={k.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ color: C.dim, fontSize: 11, fontWeight: 700, margin: 0, letterSpacing: '0.05em' }}>{k.label}</p>
                <p style={{ color: k.color, fontSize: 26, fontWeight: 800, margin: '6px 0 0' }}>{k.val}</p>
              </div>
              <div style={{ padding: 10, borderRadius: 8, background: `${k.color}15` }}>
                <Icon size={22} color={k.color} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
          <Search size={16} color={C.dim} style={{ position: 'absolute', left: 11, top: 11 }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar ticket (POST-001), Gmail ID, apoderado, correo, estudiante o DNI..."
            style={{ width: '100%', padding: '9px 12px 9px 34px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 13, outline: 'none' }} />
        </div>
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
          style={{ padding: '9px 14px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 13 }}>
          {TIPOS.map(t => <option key={t} value={t}>{t === 'Todos' ? 'Todos los tipos' : t}</option>)}
        </select>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
          style={{ padding: '9px 14px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 13 }}>
          {ESTADOS.map(e => <option key={e} value={e}>{e === 'Todos' ? 'Todos los estados' : e}</option>)}
        </select>
      </div>

      {/* Tabla Unificada */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}`, color: C.dim, fontSize: 11, fontWeight: 700, textAlign: 'left' }}>
              <th style={{ padding: '12px 14px' }}>TICKET</th>
              <th style={{ padding: '12px 14px' }}>TIPO</th>
              <th style={{ padding: '12px 14px' }}>REMITENTE / APODERADO</th>
              <th style={{ padding: '12px 14px' }}>ESTUDIANTE / GRADO</th>
              <th style={{ padding: '12px 14px' }}>FECHA RECEPCIÓN</th>
              <th style={{ padding: '12px 14px' }}>FECHA 1RA RESPUESTA</th>
              <th style={{ padding: '12px 14px' }}>TPR (MIN)</th>
              <th style={{ padding: '12px 14px' }}>ESTADO</th>
              <th style={{ padding: '12px 14px', textAlign: 'center' }}>ACCIÓN</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ padding: 36, textAlign: 'center', color: C.muted }}>Cargando solicitudes auditadas...</td></tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: 48, textAlign: 'center', color: C.dim }}>
                  <Layers size={36} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                  <p style={{ margin: 0, fontWeight: 600 }}>No se encontraron solicitudes con los filtros aplicados</p>
                </td>
              </tr>
            ) : (
              filtered.map(r => {
                const cfg = tipoConfig[r.tipo_solicitud] || { color: C.muted, route: '/dashboard', label: r.tipo_solicitud || 'Solicitud' };
                const tprStr = typeof r.tpr_minutos === 'number' ? `${r.tpr_minutos.toFixed(2)} min` : '—';
                return (
                  <tr key={r.id} style={{ borderBottom: `1px solid ${C.border}22`, color: C.text }}>
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ fontWeight: 700, color: cfg.color }}>{r.codigo || `SOL-${r.id}`}</div>
                      {r.expediente && <div style={{ fontSize: 10.5, color: C.dim }}>{r.expediente}</div>}
                      {r.gmail_message_id && <div style={{ fontSize: 10, color: '#475569', fontFamily: 'monospace' }}>{r.gmail_message_id}</div>}
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, background: `${cfg.color}22`, color: cfg.color, fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {cfg.label}
                      </span>
                      {r.area_responsable && <div style={{ fontSize: 10.5, color: C.dim, marginTop: 4 }}>{r.area_responsable}</div>}
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ fontWeight: 600 }}>{r.nombre_solicitante || '—'}</div>
                      <div style={{ fontSize: 11, color: C.muted }}>{r.correo_solicitante}</div>
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ fontWeight: 600 }}>{r.estudiante || '—'}</div>
                      <div style={{ fontSize: 11, color: C.dim }}>
                        DNI: {r.dni_estudiante || '—'} · {r.grado || '—'}
                      </div>
                    </td>
                    <td style={{ padding: '11px 14px', color: C.muted, fontSize: 11.5, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                      {fmtExact(r.fecha_recepcion)}
                    </td>
                    <td style={{ padding: '11px 14px', color: C.muted, fontSize: 11.5, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                      {fmtExact(r.fecha_primera_respuesta)}
                    </td>
                    <td style={{ padding: '11px 14px', fontWeight: 700, color: tprStr !== '—' ? C.green : C.dim, whiteSpace: 'nowrap' }}>
                      {tprStr}
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, fontWeight: 700, ...estadoStyle(r.estado) }}>
                        {r.estado}
                      </span>
                    </td>
                    <td style={{ padding: '11px 14px', textAlign: 'center' }}>
                      <button onClick={() => irAModulo(r.tipo_solicitud)}
                        style={{ padding: '6px 10px', background: `${cfg.color}15`, border: `1px solid ${cfg.color}44`, borderRadius: 6, color: cfg.color, fontSize: 11.5, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
                        <span>Módulo</span>
                        <ArrowRight size={12} />
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

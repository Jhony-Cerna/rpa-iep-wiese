import { useState, useEffect } from 'react';
import { Search, RefreshCw, Inbox } from 'lucide-react';
import { API_BASE } from '../config';

const CARD_BG = '#1e293b';
const BORDER = '#334155';
const TEXT_PRIMARY = '#f1f5f9';
const TEXT_MUTED = '#94a3b8';
const TEXT_DIM = '#64748b';

interface LibretaRequest {
  id: number;
  codigo?: string;
  expediente?: string | null;
  gmail_message_id: string | null;
  nombre_solicitante?: string | null;
  correo_solicitante: string;
  estudiante?: string | null;
  dni_estudiante: string;
  grado: string;
  asunto: string | null;
  estado: string;
  tpr_minutos?: number | null;
  fecha_recepcion: string;
  fecha_primera_respuesta: string | null;
}

const getStatusStyle = (estado: string) => {
  switch (estado) {
    case 'Atendida':
      return { background: '#14532d', color: '#86efac', border: '1px solid #166534' };
    case 'Pendiente':
      return { background: '#78350f33', color: '#fbbf24', border: '1px solid #b45309' };
    case 'En proceso':
      return { background: '#1e3a5f', color: '#93c5fd', border: '1px solid #1d4ed8' };
    case 'Requiere revisión manual':
      return { background: '#431407', color: '#fdba74', border: '1px solid #9a3412' };
    case 'Error':
      return { background: '#450a0a', color: '#fca5a5', border: '1px solid #991b1b' };
    case 'Recibida':
    default:
      return { background: '#1e293b', color: '#94a3b8', border: '1px solid #334155' };
  }
};

const formatExactDate = (isoStr: string | null) => {
  if (!isoStr) return '—';
  return isoStr.replace('T', ' ').slice(0, 19);
};

const cleanGrado = (grado: string) => {
  return (grado || '—').replace('.xlsx', '').trim();
};

const ESTADOS = ['Todos', 'Atendida', 'Pendiente', 'En proceso', 'Requiere revisión manual', 'Error', 'Recibida'];

const Requests = () => {
  const [requests, setRequests] = useState<LibretaRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState('Todos');
  const [lastUpdate, setLastUpdate] = useState('');

  const fetchRequests = () => {
    setLoading(true);
    fetch(`${API_BASE}/api/requests/list?fase=post&tipo=${encodeURIComponent('Libreta de Notas')}`)
      .then(res => res.json())
      .then(data => {
        setRequests(Array.isArray(data) ? data : []);
        setLastUpdate(new Date().toLocaleTimeString('es-PE'));
        setLoading(false);
      })
      .catch(err => {
        console.error('Error cargando solicitudes:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, 20000);
    return () => clearInterval(interval);
  }, []);

  const filtered = requests.filter(req => {
    const s = searchTerm.toLowerCase();
    const matchSearch =
      (req.dni_estudiante || '').toLowerCase().includes(s) ||
      (req.correo_solicitante || '').toLowerCase().includes(s) ||
      (req.nombre_solicitante || '').toLowerCase().includes(s) ||
      (req.estudiante || '').toLowerCase().includes(s) ||
      (req.codigo || '').toLowerCase().includes(s);
    const matchEstado = filterEstado === 'Todos' || req.estado === filterEstado;
    return matchSearch && matchEstado;
  });

  return (
    <div style={{ color: TEXT_PRIMARY }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: TEXT_PRIMARY, marginBottom: 4 }}>
            Libretas de Notas — Ejecución Autónoma RPA
          </h1>
          <p style={{ color: TEXT_DIM, fontSize: 13 }}>
            Solicitudes de libretas procesadas automáticamente vía Gmail API + Google Drive
            {lastUpdate && <span> · Actualizado: {lastUpdate}</span>}
          </p>
        </div>
        <button
          onClick={fetchRequests}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 16px', background: '#3b82f6', color: 'white',
            border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
            cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1
          }}
        >
          <RefreshCw size={15} />
          {loading ? 'Cargando...' : 'Actualizar'}
        </button>
      </div>

      {/* Búsqueda y filtros */}
      <div
        className="flex flex-col md:flex-row gap-3 mb-4"
        style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '14px 16px' }}
      >
        <div className="relative flex-1">
          <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: TEXT_DIM }} />
          <input
            type="text"
            placeholder="Buscar por ticket, estudiante, DNI o correo..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              width: '100%', paddingLeft: 34, paddingRight: 12, paddingTop: 8, paddingBottom: 8,
              background: '#0f172a', border: `1px solid ${BORDER}`, borderRadius: 7,
              color: TEXT_PRIMARY, fontSize: 13, outline: 'none'
            }}
          />
        </div>
        <select
          value={filterEstado}
          onChange={e => setFilterEstado(e.target.value)}
          style={{
            padding: '8px 12px', background: '#0f172a', border: `1px solid ${BORDER}`,
            borderRadius: 7, color: TEXT_MUTED, fontSize: 13, outline: 'none'
          }}
        >
          {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
      </div>

      {/* Tabla */}
      <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 10, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#0f172a', borderBottom: `1px solid ${BORDER}` }}>
              {['Ticket', 'Estudiante / DNI', 'Grado', 'Solicitante / Correo', 'Recepción', '1ra Respuesta', 'Estado', 'TPR'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: TEXT_DIM, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((req, i) => {
              let ttr = '—';
              if (typeof req.tpr_minutos === 'number') {
                ttr = `${req.tpr_minutos.toFixed(2)} min`;
              } else if (req.fecha_primera_respuesta && req.fecha_recepcion) {
                const diff = (new Date(req.fecha_primera_respuesta).getTime() - new Date(req.fecha_recepcion).getTime()) / 60000;
                ttr = `${diff.toFixed(2)} min`;
              }

              return (
                <tr
                  key={req.id}
                  style={{
                    borderBottom: `1px solid ${BORDER}`,
                    background: i % 2 === 0 ? CARD_BG : '#192132',
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#253347')}
                  onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? CARD_BG : '#192132')}
                >
                  <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700, color: '#60a5fa' }}>
                    <div>{req.codigo || `#${req.id}`}</div>
                    {req.expediente && <div style={{ fontSize: 10.5, color: TEXT_DIM, fontWeight: 400 }}>{req.expediente}</div>}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13 }}>
                    <div style={{ fontWeight: 600, color: TEXT_PRIMARY }}>{req.estudiante || '—'}</div>
                    <div style={{ fontSize: 11.5, color: '#60a5fa' }}>DNI: {req.dni_estudiante}</div>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: TEXT_MUTED }}>{cleanGrado(req.grado)}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13 }}>
                    <div style={{ color: TEXT_PRIMARY, fontWeight: 500 }}>{req.nombre_solicitante || '—'}</div>
                    <div style={{ fontSize: 11.5, color: TEXT_MUTED }}>{req.correo_solicitante}</div>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: TEXT_DIM, fontFamily: 'monospace' }}>{formatExactDate(req.fecha_recepcion)}</td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: TEXT_DIM, fontFamily: 'monospace' }}>{formatExactDate(req.fecha_primera_respuesta)}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      ...getStatusStyle(req.estado),
                      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700
                    }}>
                      {req.estado}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: ttr !== '—' ? '#22c55e' : TEXT_DIM, fontWeight: ttr !== '—' ? 700 : 400 }}>
                    {ttr}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: TEXT_DIM }}>
            <Inbox size={40} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
            <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
              {requests.length === 0 ? 'Aún no hay solicitudes registradas' : 'No hay resultados para tu búsqueda'}
            </p>
          </div>
        )}

        {loading && (
          <div style={{ padding: '32px', textAlign: 'center', color: TEXT_DIM, fontSize: 13 }}>
            Cargando solicitudes...
          </div>
        )}
      </div>

      <p style={{ color: TEXT_DIM, fontSize: 12, marginTop: 8 }}>
        {filtered.length} solicitud(es) encontrada(s) · TPR = Tiempo de Primera Respuesta del Robot RPA
      </p>
    </div>
  );
};

export default Requests;

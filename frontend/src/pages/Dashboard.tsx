import { useState, useEffect } from 'react';
import { Timer, CheckCircle, BarChart3, AlertTriangle, RefreshCw, FileText, UserCheck, HelpCircle, Calendar, ShieldAlert, MessageCircle } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { API_BASE } from '../config';


const CARD_BG = '#1e293b';
const BORDER = '#334155';
const TEXT_PRIMARY = '#f1f5f9';
const TEXT_MUTED = '#94a3b8';
const TEXT_DIM = '#64748b';

interface Metrics {
  fase?: string;
  total: number;
  atendidas: number;
  errores: number;
  en_proceso: number;
  psa: number;
  ttr_promedio: number;
  por_tipo?: Record<string, number>;
  por_estado?: Record<string, number>;
  modulos?: {
    libretas: number;
    actualizacion: number;
    consultas: number;
    entrevistas: number;
    reclamos: number;
    quejas: number;
  };
  comparativa?: {
    pre_ttr: number;
    post_ttr: number;
    reduccion_ttr_minutos: number;
    reduccion_ttr_pct: number;
    pre_psa: number;
    post_psa: number;
    incremento_psa_pct: number;
  };
}

const StatCard = ({
  label, sublabel, value, unit, icon: Icon, color
}: {
  label: string; sublabel: string; value: string | number; unit?: string;
  icon: React.ElementType; color: string;
}) => (
  <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '20px 24px' }}>
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <p style={{ color, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>{label}</p>
        <p style={{ color: TEXT_MUTED, fontSize: 13, marginBottom: 12 }}>{sublabel}</p>
        <div className="flex items-baseline gap-2">
          <span style={{ color: TEXT_PRIMARY, fontSize: 36, fontWeight: 800, lineHeight: 1 }}>{value}</span>
          {unit && <span style={{ color: TEXT_MUTED, fontSize: 14 }}>{unit}</span>}
        </div>
      </div>
      <div style={{ background: `${color}20`, borderRadius: 10, padding: 10 }}>
        <Icon size={24} color={color} />
      </div>
    </div>
  </div>
);

const ModuleCard = ({ label, count, color, icon: Icon }: { label: string; count: number; color: string; icon: React.ElementType }) => (
  <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ padding: 8, borderRadius: 8, background: `${color}20` }}>
        <Icon size={18} color={color} />
      </div>
      <div>
        <p style={{ color: TEXT_MUTED, fontSize: 12, margin: 0 }}>{label}</p>
        <p style={{ color: TEXT_PRIMARY, fontSize: 20, fontWeight: 700, margin: 0 }}>{count}</p>
      </div>
    </div>
  </div>
);

const MiniCard = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <p style={{ color: TEXT_MUTED, fontSize: 13 }}>{label}</p>
    <p style={{ color, fontSize: 22, fontWeight: 700 }}>{value}</p>
  </div>
);

const Dashboard = () => {
  const [metrics, setMetrics] = useState<Metrics>({
    total: 0, atendidas: 0, errores: 0, en_proceso: 0, psa: 0, ttr_promedio: 0,
    modulos: { libretas: 0, actualizacion: 0, consultas: 0, entrevistas: 0, reclamos: 0, quejas: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  const fetchMetrics = () => {
    setLoading(true);
    fetch(`${API_BASE}/api/dashboard/metrics`)
      .then(res => res.json())
      .then(data => {
        setMetrics(data);
        setLastUpdate(new Date().toLocaleTimeString('es-PE'));
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching metrics:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  // Datos para gráfico PSA (Indicador de Tesis)
  const psaData = [
    { name: 'Atendidas', value: metrics.atendidas },
    { name: 'Pendientes / Error', value: (metrics.errores + metrics.en_proceso) || 0 },
  ];
  const PIE_COLORS = ['#22c55e', '#ef4444'];

  // Datos dinámicos para gráfico TTR (Evolución de la Tesis)
  const ttr = metrics.ttr_promedio;
  const comp = metrics.comparativa;
  const ttrData = comp
    ? [
        { periodo: 'Pre-Test (Manual)', minutos: comp.pre_ttr },
        { periodo: 'Piloto RPA Fase 1', minutos: 250 },
        { periodo: 'Optimización Fase 2', minutos: 120 },
        { periodo: 'Post-Test (RPA Final)', minutos: comp.post_ttr },
      ]
    : [
        { periodo: 'Sin datos', minutos: 0 }
      ];

  const mods = metrics.modulos || { libretas: 0, actualizacion: 0, consultas: 0, entrevistas: 0, reclamos: 0, quejas: 0 };

  return (
    <div style={{ color: TEXT_PRIMARY }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-4">
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: TEXT_PRIMARY, marginBottom: 4 }}>
            Panel de Control — Indicadores de Tesis (Fase Post-Test con RPA)
          </h1>
          <p style={{ color: TEXT_DIM, fontSize: 13 }}>
            I.E.P. Augusto Wiese · 40 Solicitudes Oficiales con Robot RPA
            {lastUpdate && <span> · Actualizado: {lastUpdate}</span>}
          </p>
        </div>

        <button
          onClick={fetchMetrics}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px',
            background: '#3b82f6', color: 'white', border: 'none', borderRadius: 8,
            fontSize: 12, fontWeight: 600, cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1
          }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* Banner Comparativo de la Tesis */}
      {comp && (
        <div style={{
          background: 'linear-gradient(90deg, #1e3a5f33 0%, #14532d33 100%)',
          border: `1px solid #3b82f644`,
          borderRadius: 12,
          padding: '16px 20px',
          marginBottom: 20,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 14
        }}>
          <div>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              IMPACTO EXPERIMENTAL COMPROBADO EN LA TESIS
            </span>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#f1f5f9' }}>
              Comparativa: <strong>Pre-Test Manual (Línea Base)</strong> vs. <strong>Post-Test con RPA (En Sistema)</strong>
            </p>
          </div>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div>
              <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>Tiempo Promedio de Respuesta (TTR)</p>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#38bdf8' }}>
                {comp.pre_ttr} min → {comp.post_ttr} min{' '}
                <span style={{ fontSize: 13, color: '#4ade80', fontWeight: 700 }}>(-{comp.reduccion_ttr_pct}%)</span>
              </p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>Porcentaje de Solicitudes Atendidas (PSA)</p>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#4ade80' }}>
                {comp.pre_psa}% → {comp.post_psa}%{' '}
                <span style={{ fontSize: 13, color: '#38bdf8', fontWeight: 700 }}>(+{comp.incremento_psa_pct}%)</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* KPI Principal: 2 grandes (Indicadores de Tesis) */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <StatCard
          label="Dimensión: Rendimiento y Tiempo (Post-Test)"
          sublabel="Tiempo de Primera Respuesta (TTR)"
          value={metrics.ttr_promedio}
          unit="minutos prom."
          icon={Timer}
          color="#3b82f6"
        />
        <StatCard
          label="Dimensión: Cumplimiento de Solicitudes (Post-Test)"
          sublabel="Porcentaje de Solicitudes Atendidas (PSA)"
          value={`${metrics.psa}%`}
          icon={CheckCircle}
          color="#22c55e"
        />
      </div>

      {/* Mini stats de estado */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <MiniCard label="Total Registradas" value={metrics.total} color={TEXT_PRIMARY} />
        <MiniCard label="En Proceso / Espera" value={metrics.en_proceso} color="#f59e0b" />
        <MiniCard label="Errores / Revisión Manual" value={metrics.errores} color="#ef4444" />
      </div>

      {/* Distribución por Módulos (6 módulos) */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ color: TEXT_DIM, fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', marginBottom: 10 }}>VOLUMEN POR MÓDULOS ADMINISTRATIVOS</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <ModuleCard label="Libretas de Notas" count={mods.libretas} color="#3b82f6" icon={FileText} />
          <ModuleCard label="Actualización Datos" count={mods.actualizacion} color="#a855f7" icon={UserCheck} />
          <ModuleCard label="Consultas Adm." count={mods.consultas} color="#06b6d4" icon={HelpCircle} />
          <ModuleCard label="Entrevistas" count={mods.entrevistas} color="#22c55e" icon={Calendar} />
          <ModuleCard label="Reclamos" count={mods.reclamos} color="#f97316" icon={ShieldAlert} />
          <ModuleCard label="Quejas y Sugerencias" count={mods.quejas} color="#ec4899" icon={MessageCircle} />
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-2 gap-4">
        {/* TTR Line Chart */}
        <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 24 }}>
          <p style={{ color: TEXT_PRIMARY, fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
            Evolución del TTR — Impacto del RPA
          </p>
          <p style={{ color: TEXT_DIM, fontSize: 12, marginBottom: 20 }}>
            Reducción del tiempo de respuesta en minutos. TTR = t.respuesta − t.registro
          </p>
          {ttr === 0 ? (
            <div className="flex flex-col items-center justify-center h-48" style={{ color: TEXT_DIM }}>
              <AlertTriangle size={32} style={{ marginBottom: 8 }} />
              <p className="text-sm">Aún no hay solicitudes atendidas.</p>
              <p className="text-xs mt-1">Ejecuta el robot o atiende una solicitud.</p>
            </div>
          ) : (
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={ttrData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="periodo" tick={{ fill: TEXT_DIM, fontSize: 11 }} />
                  <YAxis tick={{ fill: TEXT_DIM, fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                    labelStyle={{ color: TEXT_PRIMARY }}
                    itemStyle={{ color: '#3b82f6' }}
                  />
                  <Line type="monotone" dataKey="minutos" stroke="#3b82f6" strokeWidth={3} dot={{ r: 6, fill: '#3b82f6' }} name="Minutos" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* PSA Pie Chart */}
        <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 24 }}>
          <p style={{ color: TEXT_PRIMARY, fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
            Cumplimiento (PSA)
          </p>
          <p style={{ color: TEXT_DIM, fontSize: 12, marginBottom: 20 }}>
            PSA = (Atendidas / Total registradas) × 100
          </p>
          {metrics.total === 0 ? (
            <div className="flex flex-col items-center justify-center h-48" style={{ color: TEXT_DIM }}>
              <BarChart3 size={32} style={{ marginBottom: 8 }} />
              <p className="text-sm">Sin solicitudes registradas todavía.</p>
            </div>
          ) : (
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={psaData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {psaData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                    itemStyle={{ color: TEXT_PRIMARY }}
                  />
                  <Legend
                    formatter={(value) => <span style={{ color: TEXT_MUTED, fontSize: 12 }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Fórmulas académicas al pie */}
      <div style={{ background: '#1e293b', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '14px 20px', marginTop: 16 }}>
        <p style={{ color: TEXT_DIM, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', marginBottom: 8 }}>FÓRMULAS DE INDICADORES (TESIS)</p>
        <div className="flex gap-8">
          <span style={{ color: TEXT_MUTED, fontSize: 12 }}>
            <span style={{ color: '#3b82f6', fontWeight: 600 }}>TTR</span> = Tiempo de primera respuesta − Tiempo de registro de solicitud
          </span>
          <span style={{ color: TEXT_MUTED, fontSize: 12 }}>
            <span style={{ color: '#22c55e', fontWeight: 600 }}>PSA</span> = (Solicitudes atendidas ÷ Total registradas) × 100
          </span>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

import { useState, useEffect } from 'react';
import { Search, Plus, RefreshCw, Eye, X, Calendar, Video, MapPin } from 'lucide-react';
import { API_BASE } from '../config';

const C = { bg:'#0f172a', card:'#1e293b', border:'#334155', text:'#f1f5f9', muted:'#94a3b8', dim:'#64748b', blue:'#3b82f6', green:'#22c55e', red:'#ef4444', yellow:'#f59e0b', teal:'#14b8a6' };
const API = `${API_BASE}/api/entrevistas`;

const RELACIONES = ['Padre','Madre','Apoderado','Estudiante','Externo'];
const AREAS = ['Dirección','Tutoría','Secretaría','Psicología','Otra'];
const PRIORIDADES = ['Baja','Normal','Alta','Urgente'];
const ESTADOS = ['Todos','Recibida','Pendiente de coordinación','En coordinación','Confirmada','Reprogramada','Realizada','Cancelada','Requiere revisión manual'];

const estadoStyle = (e: string) => {
  const m: Record<string,{bg:string;color:string}> = {
    'Recibida':                  {bg:'#1e3a5f33',color:'#93c5fd'},
    'Pendiente de coordinación': {bg:'#92400e33',color:'#fcd34d'},
    'En coordinación':           {bg:'#4c1d9533',color:'#c4b5fd'},
    'Confirmada':                {bg:'#14532d33',color:'#86efac'},
    'Reprogramada':              {bg:'#92400e33',color:'#fb923c'},
    'Realizada':                 {bg:'#14532d44',color:'#4ade80'},
    'Cancelada':                 {bg:'#450a0a33',color:'#fca5a5'},
    'Requiere revisión manual':  {bg:'#431407',  color:'#fdba74'},
  };
  return m[e] || {bg:C.card,color:C.muted};
};

const fmtDate = (iso:string|null) => iso ? new Date(iso).toLocaleString('es-PE',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—';

const inp = (val:string, set:(v:string)=>void, ph='', type='text') => (
  <input type={type} value={val} onChange={e=>set(e.target.value)} placeholder={ph}
    style={{width:'100%',padding:'8px 12px',background:C.bg,border:`1px solid ${C.border}`,borderRadius:7,color:C.text,fontSize:13,outline:'none'}} />
);
const sel = (val:string, set:(v:string)=>void, opts:string[]) => (
  <select value={val} onChange={e=>set(e.target.value)}
    style={{width:'100%',padding:'8px 12px',background:C.bg,border:`1px solid ${C.border}`,borderRadius:7,color:C.text,fontSize:13}}>
    {opts.map(o=><option key={o}>{o}</option>)}
  </select>
);
const Fld = ({label,req,children}:{label:string;req?:boolean;children:React.ReactNode}) => (
  <div><label style={{display:'block',color:C.muted,fontSize:12,fontWeight:600,marginBottom:5}}>{label}{req&&<span style={{color:C.red}}> *</span>}</label>{children}</div>
);
const Sec = ({t}:{t:string}) => (
  <p style={{color:C.dim,fontSize:11,fontWeight:700,letterSpacing:'0.07em',borderBottom:`1px solid ${C.border}`,paddingBottom:5,marginBottom:12,marginTop:4}}>{t}</p>
);

// ── Modal Crear ──────────────────────────────
const ModalNueva = ({onClose,onCreated}:{onClose:()=>void;onCreated:()=>void}) => {
  const [f,setF] = useState({nombre_solicitante:'',correo_solicitante:'',telefono_solicitante:'',prioridad:'Normal',relacion_institucion:'Padre',area_solicitada:'Dirección',motivo:'',modalidad:'Presencial',fecha_hora_propuesta:'',observaciones:''});
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState('');
  const s = (k:string) => (v:string) => setF(p=>({...p,[k]:v}));

  const submit = async () => {
    if (!f.nombre_solicitante||!f.correo_solicitante||!f.motivo){setError('Completa los campos obligatorios (*)');return;}
    setLoading(true);setError('');
    try {
      const body = {...f, fecha_hora_propuesta: f.fecha_hora_propuesta || null};
      const res = await fetch(`${API}/`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      if (!res.ok) throw new Error(await res.text());
      onCreated();onClose();
    } catch(e:any){setError(e.message||'Error')} finally{setLoading(false);}
  };

  return (
    <div style={{position:'fixed',inset:0,background:'#000a',zIndex:50,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:28,width:'100%',maxWidth:640,maxHeight:'90vh',overflowY:'auto'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
          <h2 style={{color:C.text,fontSize:17,fontWeight:700}}>Nueva Solicitud de Entrevista</h2>
          <button onClick={onClose}><X size={20} color={C.muted}/></button>
        </div>
        <div style={{display:'grid',gap:13}}>
          <Sec t="DATOS DEL SOLICITANTE"/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <Fld label="Nombre completo" req>{inp(f.nombre_solicitante,s('nombre_solicitante'),'Ej. Carlos Ríos')}</Fld>
            <Fld label="Correo" req>{inp(f.correo_solicitante,s('correo_solicitante'),'correo@ejemplo.com','email')}</Fld>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <Fld label="Teléfono">{inp(f.telefono_solicitante,s('telefono_solicitante'),'Opcional')}</Fld>
            <Fld label="Prioridad">{sel(f.prioridad,s('prioridad'),PRIORIDADES)}</Fld>
          </div>
          <Sec t="DETALLE DE LA ENTREVISTA"/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <Fld label="Relación con la institución" req>{sel(f.relacion_institucion,s('relacion_institucion'),RELACIONES)}</Fld>
            <Fld label="Área solicitada" req>{sel(f.area_solicitada,s('area_solicitada'),AREAS)}</Fld>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <Fld label="Modalidad">{sel(f.modalidad,s('modalidad'),['Presencial','Virtual'])}</Fld>
            <Fld label="Fecha y hora propuesta">{inp(f.fecha_hora_propuesta,s('fecha_hora_propuesta'),'','datetime-local')}</Fld>
          </div>
          <Fld label="Motivo de la entrevista" req>
            <textarea value={f.motivo} onChange={e=>s('motivo')(e.target.value)} rows={3} placeholder="Describa el motivo de la solicitud de entrevista"
              style={{width:'100%',padding:'8px 12px',background:C.bg,border:`1px solid ${C.border}`,borderRadius:7,color:C.text,fontSize:13,resize:'vertical'}}/>
          </Fld>
          <Fld label="Observaciones">
            <textarea value={f.observaciones} onChange={e=>s('observaciones')(e.target.value)} rows={2}
              style={{width:'100%',padding:'8px 12px',background:C.bg,border:`1px solid ${C.border}`,borderRadius:7,color:C.text,fontSize:13,resize:'vertical'}}/>
          </Fld>
        </div>
        {error && <p style={{color:C.red,fontSize:13,marginTop:10}}>⚠ {error}</p>}
        <div style={{display:'flex',gap:10,justifyContent:'flex-end',marginTop:18}}>
          <button onClick={onClose} style={{padding:'9px 18px',background:'transparent',border:`1px solid ${C.border}`,borderRadius:8,color:C.muted,fontSize:13,cursor:'pointer'}}>Cancelar</button>
          <button onClick={submit} disabled={loading} style={{padding:'9px 20px',background:C.teal,border:'none',borderRadius:8,color:'white',fontSize:13,fontWeight:700,cursor:'pointer',opacity:loading?0.7:1}}>
            {loading?'Registrando...':'Registrar Solicitud'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Modal Detalle ────────────────────────────
const ModalDetalle = ({solicitud,onClose,onRefresh}:{solicitud:any;onClose:()=>void;onRefresh:()=>void}) => {
  const [coordEstado,setCoordEstado] = useState('Confirmada');
  const [fechaConf,setFechaConf] = useState('');
  const [enlace,setEnlace] = useState('');
  const [comentCoord,setComentCoord] = useState('');
  const [cambiandoEstado,setCambiandoEstado] = useState(false);
  const [nuevoEstado,setNuevoEstado] = useState(solicitud.estado);
  const [comentario,setComentario] = useState('');
  const [guardando,setGuardando] = useState(false);
  const [msg,setMsg] = useState('');

  const coordinar = async () => {
    setGuardando(true);
    const res = await fetch(`${API}/${solicitud.id}/coordinar`,{method:'PUT',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({nuevo_estado:coordEstado,fecha_hora_confirmada:fechaConf||null,enlace_reunion:enlace||null,comentario:comentCoord})});
    if(res.ok){setMsg(`✅ Entrevista: ${coordEstado}`);onRefresh();}
    setGuardando(false);
  };

  const cambiarEstado = async () => {
    setGuardando(true);
    const res = await fetch(`${API}/${solicitud.id}/estado`,{method:'PUT',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({estado:nuevoEstado,comentario})});
    if(res.ok){setMsg('✅ Estado actualizado');onRefresh();setCambiandoEstado(false);}
    setGuardando(false);
  };

  const det = solicitud.detalle;
  const es = estadoStyle(solicitud.estado);
  const puedeCoordinar = !['Realizada','Cancelada'].includes(solicitud.estado);

  return (
    <div style={{position:'fixed',inset:0,background:'#000a',zIndex:50,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:28,width:'100%',maxWidth:700,maxHeight:'92vh',overflowY:'auto'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'start',marginBottom:16}}>
          <div>
            <p style={{color:C.teal,fontSize:11,fontWeight:700,letterSpacing:'0.07em'}}>SOLICITUD DE ENTREVISTA</p>
            <h2 style={{color:C.text,fontSize:17,fontWeight:700}}>{solicitud.codigo||`#${solicitud.id}`}</h2>
          </div>
          <button onClick={onClose}><X size={20} color={C.muted}/></button>
        </div>

        <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
          <span style={{...es,padding:'3px 12px',borderRadius:20,fontSize:11,fontWeight:700}}>{solicitud.estado}</span>
          {det?.modalidad && <span style={{background: det.modalidad==='Virtual'?'#1d4ed833':'#14532d33',color:det.modalidad==='Virtual'?'#93c5fd':'#86efac',padding:'3px 12px',borderRadius:20,fontSize:11,fontWeight:700}}>
            {det.modalidad==='Virtual'?'🖥':'📍'} {det.modalidad}
          </span>}
          <span style={{color:C.dim,fontSize:12}}>📅 {fmtDate(solicitud.fecha_recepcion)}</span>
        </div>

        <Sec t="SOLICITANTE"/>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:14}}>
          {[['Nombre',solicitud.nombre_solicitante],['Correo',solicitud.correo_solicitante],['Teléfono',solicitud.telefono_solicitante],['Prioridad',solicitud.prioridad]].map(([l,v])=>(
            <div key={l}><span style={{color:C.dim,fontSize:11}}>{l}: </span><span style={{color:C.text,fontSize:13}}>{v||'—'}</span></div>
          ))}
        </div>

        <Sec t="DETALLE DE ENTREVISTA"/>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:14}}>
          {[['Relación',det?.relacion_institucion],['Área solicitada',det?.area_solicitada],['Fecha propuesta',fmtDate(det?.fecha_hora_propuesta)],['Fecha confirmada',fmtDate(det?.fecha_hora_confirmada)]].map(([l,v])=>(
            <div key={l}><span style={{color:C.dim,fontSize:11}}>{l}: </span><span style={{color:C.text,fontSize:13}}>{v||'—'}</span></div>
          ))}
        </div>
        {det?.enlace_reunion && (
          <div style={{marginBottom:14}}>
            <span style={{color:C.dim,fontSize:11}}>Enlace reunión: </span>
            <a href={det.enlace_reunion} target="_blank" rel="noreferrer" style={{color:C.blue,fontSize:13}}>{det.enlace_reunion}</a>
          </div>
        )}
        <div style={{background:C.bg,borderRadius:8,padding:'12px 16px',marginBottom:16}}>
          <p style={{color:C.dim,fontSize:11,marginBottom:4}}>MOTIVO</p>
          <p style={{color:C.text,fontSize:13,lineHeight:1.6}}>{det?.motivo}</p>
        </div>

        {/* Coordinación */}
        {puedeCoordinar && (
          <>
            <Sec t="COORDINAR ENTREVISTA"/>
            <div style={{display:'grid',gap:10,marginBottom:16}}>
              {sel(coordEstado,setCoordEstado,['Confirmada','Reprogramada','En coordinación','Cancelada'])}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                <div><label style={{color:C.dim,fontSize:11,display:'block',marginBottom:4}}>Fecha y hora confirmada</label>
                  {inp(fechaConf,setFechaConf,'','datetime-local')}
                </div>
                {(coordEstado==='Confirmada'||det?.modalidad==='Virtual') && (
                  <div><label style={{color:C.dim,fontSize:11,display:'block',marginBottom:4}}>Enlace de reunión (virtual)</label>
                    {inp(enlace,setEnlace,'https://meet.google.com/...')}
                  </div>
                )}
              </div>
              {inp(comentCoord,setComentCoord,'Comentario o nota adicional')}
              <button onClick={coordinar} disabled={guardando}
                style={{padding:'9px 18px',background:C.teal,border:'none',borderRadius:8,color:'white',fontSize:13,fontWeight:700,cursor:'pointer',opacity:guardando?0.7:1}}>
                <Calendar size={14} style={{display:'inline',marginRight:6}}/>Guardar coordinación
              </button>
            </div>
          </>
        )}

        {/* Cambiar estado libre */}
        <Sec t="CAMBIAR ESTADO"/>
        {!cambiandoEstado ? (
          <button onClick={()=>setCambiandoEstado(true)} style={{padding:'8px 16px',background:'transparent',border:`1px solid ${C.border}`,borderRadius:8,color:C.muted,fontSize:13,cursor:'pointer',marginBottom:14}}>
            Cambiar estado
          </button>
        ) : (
          <div style={{display:'grid',gap:10,marginBottom:14}}>
            {sel(nuevoEstado,setNuevoEstado,ESTADOS.filter(e=>e!=='Todos'))}
            {inp(comentario,setComentario,'Comentario (opcional)')}
            <div style={{display:'flex',gap:8}}>
              <button onClick={cambiarEstado} disabled={guardando} style={{padding:'8px 16px',background:C.blue,border:'none',borderRadius:8,color:'white',fontSize:13,cursor:'pointer'}}>Guardar</button>
              <button onClick={()=>setCambiandoEstado(false)} style={{padding:'8px 16px',background:'transparent',border:`1px solid ${C.border}`,borderRadius:8,color:C.muted,fontSize:13,cursor:'pointer'}}>Cancelar</button>
            </div>
          </div>
        )}

        {/* Historial */}
        {solicitud.historial?.length>0 && (
          <>
            <Sec t={`HISTORIAL (${solicitud.historial.length})`}/>
            <div style={{display:'grid',gap:8}}>
              {[...solicitud.historial].reverse().map((h:any,i:number)=>(
                <div key={i} style={{background:C.bg,borderRadius:8,padding:'10px 14px',borderLeft:`3px solid ${C.teal}`}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                    <span style={{color:C.text,fontSize:13,fontWeight:600}}>{h.estado_anterior?`${h.estado_anterior} → `:''}{h.estado_nuevo}</span>
                    <span style={{color:C.dim,fontSize:11}}>{fmtDate(h.fecha)}</span>
                  </div>
                  {h.comentario&&<p style={{color:C.muted,fontSize:12}}>{h.comentario}</p>}
                </div>
              ))}
            </div>
          </>
        )}

        {msg&&<p style={{color:C.green,fontSize:13,marginTop:14}}>{msg}</p>}
      </div>
    </div>
  );
};

// ── PÁGINA PRINCIPAL ─────────────────────────
const Entrevistas = () => {
  const [solicitudes,setSolicitudes] = useState<any[]>([]);
  const [loading,setLoading] = useState(true);
  const [search,setSearch] = useState('');
  const [filterEstado,setFilterEstado] = useState('Todos');
  const [showForm,setShowForm] = useState(false);
  const [detalle,setDetalle] = useState<any|null>(null);
  const [lastUpdate,setLastUpdate] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try { const res=await fetch(`${API}/list`); setSolicitudes(await res.json()); setLastUpdate(new Date().toLocaleTimeString('es-PE')); } finally{setLoading(false);}
  };
  const fetchDetalle = async (id:number) => { const res=await fetch(`${API}/${id}`); setDetalle(await res.json()); };
  useEffect(()=>{fetchData();},[]);

  const filtered = solicitudes.filter(s=>{
    const q=search.toLowerCase();
    const ms=(s.codigo||'').toLowerCase().includes(q)||(s.nombre_solicitante||'').toLowerCase().includes(q)||(s.detalle?.area_solicitada||'').toLowerCase().includes(q);
    return ms && (filterEstado==='Todos'||s.estado===filterEstado);
  });

  const confirmadas = solicitudes.filter(s=>s.estado==='Confirmada').length;
  const pendientes = solicitudes.filter(s=>['Recibida','Pendiente de coordinación','En coordinación'].includes(s.estado)).length;

  return (
    <div style={{color:C.text}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
        <div>
          <h1 style={{fontSize:21,fontWeight:700,color:C.text,marginBottom:3}}>Solicitudes de Entrevista</h1>
          <p style={{color:C.dim,fontSize:13}}>Registro y seguimiento de entrevistas con personal institucional{lastUpdate&&` · ${lastUpdate}`}</p>
        </div>
        <div style={{display:'flex',gap:10}}>
          <button onClick={fetchData} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',background:'transparent',border:`1px solid ${C.border}`,borderRadius:8,color:C.muted,fontSize:13,cursor:'pointer'}}>
            <RefreshCw size={14}/> Actualizar
          </button>
          <button onClick={()=>setShowForm(true)} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 16px',background:C.teal,border:'none',borderRadius:8,color:'white',fontSize:13,fontWeight:700,cursor:'pointer'}}>
            <Plus size={16}/> Nueva Solicitud
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:16}}>
        {[{l:'Total',v:solicitudes.length,c:C.text},{l:'Pendientes',v:pendientes,c:C.yellow},{l:'Confirmadas',v:confirmadas,c:C.green},{l:'Realizadas',v:solicitudes.filter(s=>s.estado==='Realizada').length,c:C.teal}].map(k=>(
          <div key={k.l} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:'14px 16px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{color:C.dim,fontSize:12}}>{k.l}</span>
            <span style={{color:k.c,fontSize:22,fontWeight:700}}>{k.v}</span>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:'12px 16px',display:'flex',gap:12,marginBottom:14,flexWrap:'wrap'}}>
        <div style={{position:'relative',flex:1,minWidth:180}}>
          <Search size={15} style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:C.dim}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por código, nombre, área..."
            style={{width:'100%',paddingLeft:32,padding:'8px 12px 8px 32px',background:C.bg,border:`1px solid ${C.border}`,borderRadius:7,color:C.text,fontSize:13,outline:'none'}}/>
        </div>
        {sel(filterEstado,setFilterEstado,ESTADOS)}
      </div>

      {/* Tabla */}
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,overflow:'hidden'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead>
            <tr style={{background:C.bg,borderBottom:`1px solid ${C.border}`}}>
              {['Código','Solicitante','Relación','Área','Modalidad','Propuesta','Confirmada','Estado',''].map(h=>(
                <th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:11,fontWeight:700,color:C.dim,letterSpacing:'0.06em',whiteSpace:'nowrap'}}>{h.toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((s,i)=>{
              const det=s.detalle; const es=estadoStyle(s.estado);
              return (
                <tr key={s.id} style={{borderBottom:`1px solid ${C.border}`,background:i%2===0?C.card:'#192132'}}
                  onMouseEnter={e=>e.currentTarget.style.background='#253347'}
                  onMouseLeave={e=>e.currentTarget.style.background=i%2===0?C.card:'#192132'}>
                  <td style={{padding:'11px 14px',fontSize:13,color:C.teal,fontWeight:700}}>{s.codigo||`#${s.id}`}</td>
                  <td style={{padding:'11px 14px'}}>
                    <p style={{color:C.text,fontSize:13,fontWeight:600}}>{s.nombre_solicitante}</p>
                    <p style={{color:C.dim,fontSize:11}}>{s.correo_solicitante}</p>
                  </td>
                  <td style={{padding:'11px 14px',fontSize:12,color:C.muted}}>{det?.relacion_institucion||'—'}</td>
                  <td style={{padding:'11px 14px',fontSize:12,color:C.muted}}>{det?.area_solicitada||'—'}</td>
                  <td style={{padding:'11px 14px'}}>
                    {det?.modalidad==='Virtual'
                      ? <span style={{color:'#93c5fd',fontSize:12,display:'flex',alignItems:'center',gap:4}}><Video size={13}/>Virtual</span>
                      : <span style={{color:'#86efac',fontSize:12,display:'flex',alignItems:'center',gap:4}}><MapPin size={13}/>Presencial</span>}
                  </td>
                  <td style={{padding:'11px 14px',fontSize:12,color:C.dim,whiteSpace:'nowrap'}}>{fmtDate(det?.fecha_hora_propuesta)}</td>
                  <td style={{padding:'11px 14px',fontSize:12,color: det?.fecha_hora_confirmada?C.green:C.dim,whiteSpace:'nowrap'}}>{fmtDate(det?.fecha_hora_confirmada)}</td>
                  <td style={{padding:'11px 14px'}}><span style={{...es,padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:700}}>{s.estado}</span></td>
                  <td style={{padding:'11px 14px'}}>
                    <button onClick={()=>fetchDetalle(s.id)} style={{display:'flex',alignItems:'center',gap:5,color:C.teal,background:'none',border:'none',fontSize:13,cursor:'pointer',fontWeight:600}}>
                      <Eye size={15}/> Ver
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!loading&&filtered.length===0&&(
          <div style={{padding:'40px',textAlign:'center',color:C.dim}}>
            <Calendar size={36} style={{margin:'0 auto 10px',opacity:0.3}}/>
            <p style={{fontSize:15,fontWeight:600}}>{solicitudes.length===0?'Aún no hay solicitudes de entrevista':'Sin resultados'}</p>
          </div>
        )}
      </div>
      <p style={{color:C.dim,fontSize:12,marginTop:8}}>{filtered.length} solicitud(es)</p>

      {showForm&&<ModalNueva onClose={()=>setShowForm(false)} onCreated={fetchData}/>}
      {detalle&&<ModalDetalle solicitud={detalle} onClose={()=>setDetalle(null)} onRefresh={()=>{fetchData();fetchDetalle(detalle.id);}}/>}
    </div>
  );
};

export default Entrevistas;

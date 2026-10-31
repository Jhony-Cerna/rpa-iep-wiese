import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, LogOut, Bot,
  BookOpen, RefreshCw, HelpCircle, Users2, AlertTriangle, MessageSquareWarning, ListFilter
} from 'lucide-react';
import { clearSession, getStoredUser } from '../auth';


const C = {
  bg: '#0f172a', sidebar: '#1e293b', border: '#334155',
  text: '#f1f5f9', muted: '#94a3b8', dim: '#475569',
  blue: '#3b82f6', active: '#1d4ed8',
};

const NavItem = ({ to, icon: Icon, label, disabled }: { to: string; icon: any; label: string; disabled?: boolean }) => {
  if (disabled) {
    return (
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', borderRadius:8, cursor:'not-allowed', opacity:0.4 }}>
        <Icon size={16} color={C.muted} />
        <span style={{ color:C.muted, fontSize:13 }}>{label}</span>
        <span style={{ marginLeft:'auto', fontSize:10, padding:'2px 6px', background:C.border, color:C.dim, borderRadius:4 }}>Pronto</span>
      </div>
    );
  }
  return (
    <NavLink to={to} style={({ isActive }) => ({
      display:'flex', alignItems:'center', gap:10, padding:'8px 12px', borderRadius:8,
      textDecoration:'none', fontSize:13, fontWeight: isActive ? 600 : 400,
      background: isActive ? C.blue : 'transparent',
      color: isActive ? 'white' : C.muted,
      transition: 'all 0.15s',
    })}>
      {({ isActive }) => (
        <>
          <Icon size={16} color={isActive ? 'white' : C.muted} />
          <span>{label}</span>
        </>
      )}
    </NavLink>
  );
};

const SectionLabel = ({ label }: { label: string }) => (
  <p style={{ color:C.dim, fontSize:10, fontWeight:700, letterSpacing:'0.1em', padding:'12px 12px 4px', marginTop:4 }}>{label}</p>
);

const Layout = () => {
  const navigate = useNavigate();
  const user = getStoredUser();
  const initial = (user.nombre || 'A').trim().charAt(0).toUpperCase();

  const handleLogout = () => {
    clearSession();
    navigate('/login', { replace: true });
  };

  return (
    <div style={{ display:'flex', height:'100vh', background:C.bg }}>
      {/* Sidebar */}
      <aside style={{ width:220, display:'flex', flexDirection:'column', background:C.sidebar, borderRight:`1px solid ${C.border}`, flexShrink:0 }}>
        {/* Logo */}
        <div style={{ padding:'16px 16px 12px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:34, height:34, borderRadius:9, background:C.blue, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Bot size={18} color="white" />
          </div>
          <div>
            <p style={{ color:C.text, fontWeight:700, fontSize:15, lineHeight:1 }}>RPA-IEP</p>
            <p style={{ color:C.dim, fontSize:10, marginTop:2 }}>Sistema Administrativo</p>
          </div>
        </div>

        {/* Navegación */}
        <nav style={{ flex:1, padding:'8px 10px', overflowY:'auto' }}>
          <SectionLabel label="GENERAL" />
          <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" />

          <SectionLabel label="SOLICITUDES" />
          <NavItem to="/solicitudes" icon={ListFilter} label="Todas las solicitudes" />
          <NavItem to="/libretas" icon={BookOpen} label="Libretas de notas" />
          <NavItem to="/actualizacion" icon={RefreshCw} label="Actualización de datos" />
          <NavItem to="/consultas" icon={HelpCircle} label="Consultas" />
          <NavItem to="/entrevistas" icon={Users2} label="Entrevistas" />
          <NavItem to="/reclamos" icon={AlertTriangle} label="Reclamos" />
          <NavItem to="/quejas" icon={MessageSquareWarning} label="Quejas y sugerencias" />
        </nav>

        {/* Footer */}
        <div style={{ padding:'10px', borderTop:`1px solid ${C.border}` }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 10px', borderRadius:8, background:C.bg }}>
            <div style={{ width:30, height:30, borderRadius:'50%', background:C.blue, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:'white', flexShrink:0 }}>
              {initial}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ color:C.text, fontSize:12, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user.nombre}</p>
              <p style={{ color:C.dim, fontSize:10, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user.correo}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Cerrar sesión"
              style={{
                background: 'transparent',
                border: 'none',
                padding: 4,
                borderRadius: 6,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <LogOut size={15} color="#f87171" />
            </button>
          </div>
        </div>
      </aside>

      {/* Contenido principal */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        {/* Topbar */}
        <header style={{ height:52, background:C.sidebar, borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 20px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:'#22c55e', animation:'pulse 2s infinite' }} />
            <span style={{ color:C.muted, fontSize:13 }}>Robot RPA en línea</span>
          </div>
          <span style={{ color:C.dim, fontSize:13 }}>I.E.P. Augusto Wiese</span>
        </header>

        {/* Página */}
        <main style={{ flex:1, overflowY:'auto', padding:24, background:C.bg }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;

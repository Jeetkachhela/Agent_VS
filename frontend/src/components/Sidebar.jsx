import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Users, 
  FileEdit, 
  Map as MapIcon, 
  MessageSquare, 
  LogOut,
  ChevronRight,
  Sun,
  Moon,
  Database
} from 'lucide-react'

const Sidebar = ({ role }) => {
    const navigate = useNavigate()
    const user = JSON.parse(localStorage.getItem('user')) || { name: 'User' }
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark')

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme)
        localStorage.setItem('theme', theme)
    }, [theme])

    const handleLogout = () => {
        localStorage.removeItem('user')
        localStorage.removeItem('token')
        navigate('/login')
    }

    const menuItems = {
        SUPER_ADMIN: [
            { name: 'Overview', icon: <LayoutDashboard size={20} />, path: '/super-admin' },
            { name: 'Manage Admins', icon: <Users size={20} />, path: '/super-admin/admins' },
            { name: 'Manage Agents', icon: <Users size={20} />, path: '/super-admin/agents' },
            { name: 'Data Hub', icon: <Database size={20} />, path: '/super-admin/data' },
            { name: 'Global Map', icon: <MapIcon size={20} />, path: '/super-admin/map' },
            { name: 'Support AI', icon: <MessageSquare size={20} />, path: '/super-admin/support' },
        ],
        ADMIN_B2C: [
            { name: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/admin' },
            { name: 'Manage Agents', icon: <Users size={20} />, path: '/admin/agents' },
            { name: 'Data Hub', icon: <Database size={20} />, path: '/admin/data' },
            { name: 'Survey Questions', icon: <FileEdit size={20} />, path: '/admin/surveys' },
            { name: 'Live Tracking', icon: <MapIcon size={20} />, path: '/admin/map' },
            { name: 'Support AI', icon: <MessageSquare size={20} />, path: '/admin/support' },
        ],
        AGENT: [
            { name: 'My Visits', icon: <LayoutDashboard size={20} />, path: '/agent' },
            { name: 'New Survey', icon: <FileEdit size={20} />, path: '/agent/new-survey' },
            { name: 'Support AI', icon: <MessageSquare size={20} />, path: '/agent/support' },
        ]
    }

    return (
        <div style={{
            width: '280px',
            height: '100vh',
            background: 'var(--sidebar-bg)',
            backdropFilter: 'blur(20px)',
            borderRight: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            padding: '2rem 1.5rem',
            position: 'fixed'
        }}>
            <div style={{ marginBottom: '3rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', background: '#3b82f6', borderRadius: '10px' }}></div>
                <h3 style={{ margin: 0, fontWeight: 700 }}>Kanan Ops</h3>
            </div>

            <nav style={{ flex: 1 }}>
                {menuItems[role]?.map((item, index) => (
                    <Link 
                        key={index} 
                        to={item.path}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.8rem 1rem',
                            color: 'var(--text-muted)',
                            textDecoration: 'none',
                            borderRadius: '12px',
                            marginBottom: '0.5rem',
                            transition: 'all 0.3s'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.background = 'var(--input-bg)'
                            e.currentTarget.style.color = 'var(--text-primary)'
                        }}
                        onMouseOut={(e) => {
                            if (!window.location.pathname.includes(item.path)) {
                                e.currentTarget.style.background = 'transparent'
                                e.currentTarget.style.color = 'var(--text-muted)'
                            }
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {item.icon}
                            <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>{item.name}</span>
                        </div>
                        <ChevronRight size={14} opacity={0.3} />
                    </Link>
                ))}
            </nav>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
                    <div style={{ 
                        width: '36px', 
                        height: '36px', 
                        borderRadius: '10px', 
                        background: 'linear-gradient(45deg, #3b82f6, #8b5cf6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        color: 'var(--text-primary)'
                    }}>
                        {(user.name || 'U')[0]}
                    </div>
                    <div>
                        <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>{user.name}</p>
                        <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.5 }}>{role.replace('_', ' ')}</p>
                    </div>
                </div>
                
                <button 
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        background: 'var(--input-bg)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-color)',
                        fontSize: '0.9rem',
                        padding: '0.6rem'
                    }}
                >
                    {theme === 'dark' ? <><Sun size={18} /> Light Mode</> : <><Moon size={18} /> Dark Mode</>}
                </button>

                <button 
                    onClick={handleLogout}
                    style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        color: '#ef4444',
                        border: 'none',
                        fontSize: '0.9rem',
                        marginTop: '0.5rem'
                    }}
                >
                    <LogOut size={18} /> Logout
                </button>
            </div>
        </div>
    )
}

export default Sidebar

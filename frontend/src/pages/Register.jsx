import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { User, Lock, Mail, ArrowRight, ShieldCheck, ChevronDown } from 'lucide-react'
import api from '../utils/api'

const Register = () => {
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [role, setRole] = useState('AGENT')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    const handleRegister = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        
        if (password !== confirmPassword) {
            setError('Passwords do not match')
            setLoading(false)
            return
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters')
            setLoading(false)
            return
        }

        try {
            await api.post('auth/register', {
                name,
                email,
                password,
                role,
                is_active: true
            })
            
            navigate('/login')
        } catch (err) {
            setError(err.response?.data?.detail || 'Registration failed. Email may already be in use.')
        } finally {
            setLoading(false)
        }
    }

    const roleInfo = {
        AGENT: { label: 'Field Agent', color: '#3b82f6', desc: 'Conduct surveys & track visits in the field' },
        ADMIN_B2C: { label: 'B2C Administrator', color: '#8b5cf6', desc: 'Manage agents, surveys & view analytics' },
        SUPER_ADMIN: { label: 'Super Admin', color: '#f59e0b', desc: 'Full platform control & user management' }
    }

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '1rem'
        }}>
            <div className="card fade-in" style={{
                maxWidth: '480px',
                width: '100%',
                position: 'relative',
                overflow: 'hidden'
            }}>
                <div style={{
                    position: 'absolute',
                    top: '-50px',
                    right: '-50px',
                    width: '150px',
                    height: '150px',
                    background: `rgba(59, 130, 246, 0.1)`,
                    borderRadius: '50%',
                    filter: 'blur(30px)'
                }}></div>
                <div style={{
                    position: 'absolute',
                    bottom: '-40px',
                    left: '-40px',
                    width: '120px',
                    height: '120px',
                    background: 'rgba(139, 92, 246, 0.08)',
                    borderRadius: '50%',
                    filter: 'blur(25px)'
                }}></div>

                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '2rem'
                }}>
                    <div style={{
                        background: roleInfo[role].color,
                        padding: '10px',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background 0.3s'
                    }}>
                        <ShieldCheck color="white" size={24} />
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>Create Account</h2>
                        <p style={{ margin: 0, opacity: 0.6, fontSize: '0.85rem' }}>Join the Kanan Platform</p>
                    </div>
                </div>

                <form onSubmit={handleRegister}>
                    {/* Role Selection */}
                    <div className="input-group">
                        <label style={{ fontSize: '0.9rem', opacity: 0.8 }}>Register As</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                            {Object.entries(roleInfo).map(([key, info]) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => setRole(key)}
                                    style={{
                                        padding: '0.7rem 0.5rem',
                                        borderRadius: '12px',
                                        border: role === key ? `2px solid ${info.color}` : '2px solid var(--border-color)',
                                        background: role === key ? `${info.color}15` : 'var(--input-bg)',
                                        color: role === key ? info.color : 'var(--text-muted)',
                                        cursor: 'pointer',
                                        fontWeight: role === key ? 700 : 500,
                                        fontSize: '0.78rem',
                                        transition: 'all 0.2s',
                                        textAlign: 'center'
                                    }}
                                >
                                    {info.label}
                                </button>
                            ))}
                        </div>
                        <p style={{ margin: '0.3rem 0 0', fontSize: '0.75rem', opacity: 0.5, color: roleInfo[role].color }}>
                            {roleInfo[role].desc}
                        </p>
                    </div>

                    {/* Name */}
                    <div className="input-group">
                        <label style={{ fontSize: '0.9rem', opacity: 0.8 }}>Full Name</label>
                        <div style={{ position: 'relative' }}>
                            <User size={18} style={{
                                position: 'absolute',
                                left: '12px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                opacity: 0.4
                            }} />
                            <input 
                                id="register-name"
                                type="text" 
                                placeholder="John Doe" 
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                style={{ width: '100%', paddingLeft: '40px' }}
                                required
                            />
                        </div>
                    </div>

                    {/* Email */}
                    <div className="input-group">
                        <label style={{ fontSize: '0.9rem', opacity: 0.8 }}>Email Address</label>
                        <div style={{ position: 'relative' }}>
                            <Mail size={18} style={{
                                position: 'absolute',
                                left: '12px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                opacity: 0.4
                            }} />
                            <input 
                                id="register-email"
                                type="email" 
                                placeholder="name@kanan.com" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                style={{ width: '100%', paddingLeft: '40px' }}
                                required
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div className="input-group">
                        <label style={{ fontSize: '0.9rem', opacity: 0.8, margin: 0 }}>Password</label>
                        <div style={{ position: 'relative', marginTop: '0.5rem' }}>
                            <Lock size={18} style={{
                                position: 'absolute',
                                left: '12px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                opacity: 0.4
                            }} />
                            <input 
                                id="register-password"
                                type="password" 
                                placeholder="••••••••" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                style={{ width: '100%', paddingLeft: '40px' }}
                                required
                            />
                        </div>
                    </div>

                    {/* Confirm Password */}
                    <div className="input-group">
                        <label style={{ fontSize: '0.9rem', opacity: 0.8, margin: 0 }}>Confirm Password</label>
                        <div style={{ position: 'relative', marginTop: '0.5rem' }}>
                            <Lock size={18} style={{
                                position: 'absolute',
                                left: '12px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                opacity: 0.4
                            }} />
                            <input 
                                id="register-confirm-password"
                                type="password" 
                                placeholder="••••••••" 
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                style={{ width: '100%', paddingLeft: '40px' }}
                                required
                            />
                        </div>
                    </div>

                    {error && (
                        <p style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '1rem', background: 'rgba(239, 68, 68, 0.1)', padding: '0.5rem', borderRadius: '8px' }}>
                            {error}
                        </p>
                    )}

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="primary-btn" 
                        style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            marginTop: '1rem',
                            background: `linear-gradient(135deg, ${roleInfo[role].color} 0%, ${roleInfo[role].color}cc 100%)`
                        }}
                    >
                        {loading ? 'Processing...' : `Create ${roleInfo[role].label} Account`}
                        <ArrowRight size={18} />
                    </button>
                    
                    <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem' }}>
                        <span style={{ opacity: 0.5 }}>Already have an account? </span>
                        <Link to="/login" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 600 }}>Login here</Link>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default Register

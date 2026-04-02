import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { User, Lock, ArrowRight, ShieldCheck, ChevronDown } from 'lucide-react'
import api from '../utils/api'

const Login = () => {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [role, setRole] = useState('AGENT') // Default dropdown role
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    const handleLogin = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        
        try {
            // FastAPI OAuth2PasswordRequestForm expects form data, not JSON
            const formData = new URLSearchParams()
            formData.append('username', email)
            formData.append('password', password)

            const loginRes = await api.post('auth/login', formData, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            })
            
            const token = loginRes.data.access_token
            localStorage.setItem('token', token)
            
            // Get user profile to check real role
            const userRes = await api.get('auth/me', {
                headers: { Authorization: `Bearer ${token}` }
            })
            const user = userRes.data
            
            if (user.role.toUpperCase() !== role.toUpperCase()) {
                setError(`Access denied: You are not registered as a ${role.replace('_', ' ')}`)
                localStorage.removeItem('token')
                setLoading(false)
                return
            }

            user.token = token // attach token to user object for easy access
            localStorage.setItem('user', JSON.stringify(user))
            
            switch (user.role.toUpperCase()) {
                case 'SUPER_ADMIN': navigate('/super-admin'); break;
                case 'ADMIN_B2C': navigate('/admin'); break;
                case 'AGENT': navigate('/agent'); break;
                default: navigate('/'); break;
            }
        } catch (err) {
            setError(err.response?.data?.detail || 'System connection error or invalid credentials.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            padding: '1rem'
        }}>
            <div className="card fade-in" style={{
                maxWidth: '450px',
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
                    background: 'rgba(59, 130, 246, 0.1)',
                    borderRadius: '50%',
                    filter: 'blur(30px)'
                }}></div>

                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '2.5rem'
                }}>
                    <div style={{
                        background: '#3b82f6',
                        padding: '10px',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <ShieldCheck color="white" size={24} />
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>Kanan Survey</h2>
                        <p style={{ margin: 0, opacity: 0.6, fontSize: '0.85rem' }}>Agent Management System</p>
                    </div>
                </div>

                <form onSubmit={handleLogin}>
                    <div className="input-group">
                        <label style={{ fontSize: '0.9rem', opacity: 0.8 }}>Login As</label>
                        <div style={{ position: 'relative' }}>
                            <select 
                                value={role} 
                                onChange={(e) => setRole(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.8rem 1rem',
                                    background: 'var(--input-bg)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '12px',
                                    color: 'var(--text-primary)',
                                    appearance: 'none',
                                    outline: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                <option value="AGENT">Agent</option>
                                <option value="ADMIN_B2C">Admin (B2C)</option>
                                <option value="SUPER_ADMIN">Super Admin</option>
                            </select>
                            <ChevronDown size={18} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4, pointerEvents: 'none' }} />
                        </div>
                    </div>

                    <div className="input-group">
                        <label style={{ fontSize: '0.9rem', opacity: 0.8 }}>Email Address</label>
                        <div style={{ position: 'relative' }}>
                            <User size={18} style={{
                                position: 'absolute',
                                left: '12px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                opacity: 0.4
                            }} />
                            <input 
                                type="email" 
                                placeholder="name@kanan.com" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                style={{ width: '100%', paddingLeft: '40px' }}
                                required
                            />
                        </div>
                    </div>

                    <div className="input-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label style={{ fontSize: '0.9rem', opacity: 0.8, margin: 0 }}>Password</label>
                            <Link to="/forgot-password" style={{ color: '#3b82f6', fontSize: '0.8rem', textDecoration: 'none' }}>Forgot Password?</Link>
                        </div>
                        <div style={{ position: 'relative', marginTop: '0.5rem' }}>
                            <Lock size={18} style={{
                                position: 'absolute',
                                left: '12px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                opacity: 0.4
                            }} />
                            <input 
                                type="password" 
                                placeholder="••••••••" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
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
                            marginTop: '1.5rem'
                        }}
                    >
                        {loading ? 'Processing...' : 'Secure Login'}
                        <ArrowRight size={18} />
                    </button>
                    
                    <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem' }}>
                        <span style={{ opacity: 0.5 }}>New field agent? </span>
                        <Link to="/register" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 600 }}>Create an account</Link>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default Login

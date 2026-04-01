import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Lock, Mail, ArrowRight, ShieldCheck, CheckCircle2, KeyRound } from 'lucide-react'
import api from '../utils/api'

const ForgotPassword = () => {
    const [step, setStep] = useState(1)
    const [email, setEmail] = useState('')
    const [otp, setOtp] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [loading, setLoading] = useState(false)

    const handleRequestOTP = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        
        try {
            await api.post('/auth/forgot-password', { email })
            setStep(2)
        } catch (err) {
            setError(err.response?.data?.detail || 'Error requesting OTP. Ensure email is correct.')
        } finally {
            setLoading(false)
        }
    }

    const handleReset = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        setSuccess('')

        try {
            const res = await api.post('/auth/reset-password', {
                email,
                otp,
                new_password: newPassword
            })
            setSuccess(res.data.message || 'Password updated successfully. You can now login.')
        } catch (err) {
            setError(err.response?.data?.detail || 'System connection error or invalid OTP.')
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
                        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>Reset Password</h2>
                        <p style={{ margin: 0, opacity: 0.6, fontSize: '0.85rem' }}>Secure account recovery</p>
                    </div>
                </div>

                {success ? (
                    <div className="fade-in" style={{ textAlign: 'center' }}>
                        <div style={{
                            background: 'rgba(34, 197, 94, 0.1)',
                            color: '#22c55e',
                            padding: '1rem',
                            borderRadius: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '12px',
                            marginBottom: '2rem'
                        }}>
                            <CheckCircle2 size={32} />
                            <span>{success}</span>
                        </div>
                        <Link to="/login" className="primary-btn" style={{ textDecoration: 'none', display: 'inline-block', width: '100%' }}>
                            Return to Login
                        </Link>
                    </div>
                ) : step === 1 ? (
                    <form onSubmit={handleRequestOTP} className="fade-in">
                        <p style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '1.5rem' }}>
                            Enter your email address to receive a secure 6-digit OTP code for password reset.
                        </p>
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
                                    type="email" 
                                    placeholder="name@kanan.com" 
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
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
                            {loading ? 'Sending...' : 'Send OTP'}
                            <ArrowRight size={18} />
                        </button>
                        
                        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem' }}>
                            <Link to="/login" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 600 }}>Back to Login</Link>
                        </div>
                    </form>
                ) : (
                    <form onSubmit={handleReset} className="fade-in">
                        <p style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '1.5rem', color: '#10b981' }}>
                            OTP has been sent to {email}. Please enter it below.
                        </p>
                        <div className="input-group">
                            <label style={{ fontSize: '0.9rem', opacity: 0.8 }}>6-Digit OTP</label>
                            <div style={{ position: 'relative' }}>
                                <KeyRound size={18} style={{
                                    position: 'absolute',
                                    left: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    opacity: 0.4
                                }} />
                                <input 
                                    type="text" 
                                    placeholder="123456" 
                                    maxLength="6"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                    style={{ width: '100%', paddingLeft: '40px', letterSpacing: '4px', fontWeight: 'bold' }}
                                    required
                                />
                            </div>
                        </div>

                        <div className="input-group">
                            <label style={{ fontSize: '0.9rem', opacity: 0.8, margin: 0 }}>New Password</label>
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
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
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
                            {loading ? 'Processing...' : 'Verify & Reset'}
                            <CheckCircle2 size={18} />
                        </button>
                        
                        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem' }}>
                            <button 
                                type="button" 
                                onClick={() => { setStep(1); setOtp(''); setError(''); }}
                                style={{ background: 'none', border: 'none', color: '#3b82f6', textDecoration: 'none', fontWeight: 600, cursor: 'pointer' }}
                            >
                                Use a different email
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    )
}

export default ForgotPassword

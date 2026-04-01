import React, { useState, useEffect } from 'react'
import { Save, Camera, ArrowLeft, Send, CheckCircle, MessageSquare, X, Bot } from 'lucide-react'
import api from '../utils/api'

const NewSurvey = () => {
    const [questions, setQuestions] = useState([])
    const [phase, setPhase] = useState('pre_meeting')
    const [formData, setFormData] = useState({
        client_name: '',
        client_contact: '',
        responses: {}
    })
    const [images, setImages] = useState([])
    const [submitted, setSubmitted] = useState(false)
    const [loading, setLoading] = useState(false)
    const [showChat, setShowChat] = useState(false)
    const [chatMsg, setChatMsg] = useState('')
    const [chatHistory, setChatHistory] = useState([
        { role: 'bot', text: 'Hello! I am your Kanan Field Assistant. How can I help you today?' }
    ])
    const [chatLoading, setChatLoading] = useState(false)

    const user = JSON.parse(localStorage.getItem('user'))

    useEffect(() => {
        fetchQuestions()
    }, [phase])

    const fetchQuestions = async () => {
        try {
            const res = await api.get(`/surveys/questions?phase=${phase}`)
            setQuestions(res.data)
        } catch (err) {
            console.error(err)
        }
    }

    const handleInputChange = (id, value) => {
        setFormData({
            ...formData,
            responses: { ...formData.responses, [id]: value }
        })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        
        // Basic frontend validation for contact number
        if (!/^\d{10}$/.test(formData.client_contact)) {
            alert('Contact must be exactly 10 digits (no dashes or country codes)')
            return
        }

        if (images.length === 0) {
            alert('At least one meeting photo is required.')
            return
        }

        setLoading(true)
        
        try {
            const data = new FormData()
            data.append('agent_id', user.id || 1) // Fallback for demo
            data.append('client_name', formData.client_name)
            data.append('client_contact', formData.client_contact)
            data.append('responses', JSON.stringify(formData.responses))
            
            images.forEach(img => {
                data.append('images', img)
            })

            await api.post('/surveys/submit', data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })
            setSubmitted(true)
        } catch (err) {
            alert('Submission failed')
        } finally {
            setLoading(false)
        }
    }

    const handleSendChat = async (e) => {
        e.preventDefault()
        if (!chatMsg.trim()) return
        
        const userMsg = { role: 'user', text: chatMsg }
        setChatHistory([...chatHistory, userMsg])
        setChatMsg('')
        setChatLoading(true)

        try {
            const res = await api.post('/chatbot/chat', { message: chatMsg })
            setChatHistory(prev => [...prev, { role: 'bot', text: res.data.response }])
        } catch (err) {
            setChatHistory(prev => [...prev, { role: 'bot', text: 'Sorry, I am having trouble connecting to Gemini.' }])
        } finally {
            setChatLoading(false)
        }
    }

    if (submitted) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                <div className="card fade-in" style={{ textAlign: 'center', maxWidth: '400px' }}>
                    <CheckCircle size={64} color="#10b981" style={{ marginBottom: '1.5rem' }} />
                    <h2>Survey Submitted!</h2>
                    <p style={{ opacity: 0.6, marginBottom: '2rem' }}>Great job. Your visit data has been successfully recorded and sent to the management team.</p>
                    <button className="primary-btn" onClick={() => { setSubmitted(false); setFormData({ client_name: '', client_contact: '', responses: {} }); setImages([]); }}>Start New Visit</button>
                </div>
            </div>
        )
    }

    return (
        <div className="fade-in">
                <header style={{ marginBottom: '3rem' }}>
                    <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 700 }}>New Agent Visit</h1>
                    <p style={{ margin: 0, opacity: 0.5 }}>Fill out the survey requirements for your current meeting</p>
                </header>

                <div className="card" style={{ maxWidth: '800px' }}>
                    <div style={{ display: 'flex', gap: '2rem', marginBottom: '2.5rem', borderBottom: '1px solid var(--input-bg)', paddingBottom: '1rem' }}>
                        <button 
                            onClick={() => setPhase('pre_meeting')}
                            style={{ background: 'transparent', border: 'none', color: phase === 'pre_meeting' ? '#3b82f6' : 'white', fontWeight: phase === 'pre_meeting' ? 700 : 400, borderBottom: phase === 'pre_meeting' ? '2px solid #3b82f6' : 'none', paddingBottom: '10px', borderRadius: 0 }}
                        >
                            1. Pre-Meeting
                        </button>
                        <button 
                            onClick={() => setPhase('post_meeting')}
                            style={{ background: 'transparent', border: 'none', color: phase === 'post_meeting' ? '#3b82f6' : 'white', fontWeight: phase === 'post_meeting' ? 700 : 400, borderBottom: phase === 'post_meeting' ? '2px solid #3b82f6' : 'none', paddingBottom: '10px', borderRadius: 0 }}
                        >
                            2. Post-Meeting
                        </button>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            <div className="input-group">
                                <label>Client Name</label>
                                <input 
                                    type="text" 
                                    placeholder="Enter full name"
                                    value={formData.client_name}
                                    onChange={(e) => setFormData({...formData, client_name: e.target.value})}
                                    required 
                                />
                            </div>
                            <div className="input-group">
                                <label>Client Contact (10 Digits)</label>
                                <input 
                                    type="text" 
                                    placeholder="Enter 10 digit number"
                                    maxLength={10}
                                    value={formData.client_contact}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, '') // Only allow numbers
                                        setFormData({...formData, client_contact: val})
                                    }}
                                    required 
                                />
                                {formData.client_contact && formData.client_contact.length !== 10 && (
                                    <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px' }}>
                                        Must be exactly 10 digits
                                    </span>
                                )}
                            </div>
                        </div>

                        <div style={{ marginTop: '2rem' }}>
                            <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>{phase === 'pre_meeting' ? 'Observation Details' : 'Meeting Summary'}</h3>
                            {questions.map(q => (
                                <div key={q.id} className="input-group">
                                    <label>{q.text}</label>
                                    {q.type === 'textarea' ? (
                                        <textarea 
                                            rows="3"
                                            style={{ 
                                                background: 'var(--input-bg)', 
                                                border: '1px solid var(--border-color)', 
                                                borderRadius: '12px', 
                                                padding: '1rem', 
                                                color: 'var(--text-primary)',
                                                fontFamily: 'inherit'
                                            }}
                                            onChange={(e) => handleInputChange(q.id, e.target.value)}
                                        />
                                    ) : (
                                        <input 
                                            type="text" 
                                            onChange={(e) => handleInputChange(q.id, e.target.value)}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="input-group" style={{ marginTop: '2rem' }}>
                            <label>Meeting Photos (Upload at least one)</label>
                            <div style={{ 
                                border: '2px dashed var(--border-color)', 
                                borderRadius: '16px', 
                                padding: '2rem', 
                                textAlign: 'center',
                                background: 'var(--border-color)',
                                cursor: 'pointer'
                            }} onClick={() => document.getElementById('file-upload').click()}>
                                <Camera size={32} opacity={0.3} style={{ marginBottom: '1rem' }} />
                                <p style={{ margin: 0, opacity: 0.5 }}>Click to take or upload photos</p>
                                <input 
                                    id="file-upload"
                                    type="file" 
                                    multiple 
                                    hidden 
                                    onChange={(e) => setImages(Array.from(e.target.files))}
                                />
                            </div>
                            {images.length > 0 && (
                                <div style={{ display: 'flex', gap: '10px', marginTop: '1rem' }}>
                                    {images.map((img, i) => (
                                        <div key={i} style={{ fontSize: '0.8rem', opacity: 0.6 }}>{img.name}</div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <button 
                            type="submit" 
                            disabled={loading}
                            className="primary-btn" 
                            style={{ width: '100%', marginTop: '3rem', padding: '1rem', display: 'flex', gap: '8px', justifyContent: 'center' }}
                        >
                            {loading ? 'Submitting...' : 'Upload & Submit Survey'}
                            <Send size={18} />
                        </button>
                    </form>
                </div>

                {/* Floating Chat Button */}
                <button 
                    onClick={() => setShowChat(!showChat)}
                    style={{
                        position: 'fixed',
                        bottom: '30px',
                        right: '30px',
                        width: '60px',
                        height: '60px',
                        borderRadius: '30px',
                        background: '#3b82f6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 8px 32px rgba(59, 130, 246, 0.4)',
                        border: 'none',
                        zIndex: 1000,
                        cursor: 'pointer'
                    }}
                >
                    {showChat ? <X color="white" /> : <MessageSquare color="white" />}
                </button>

                {/* Chat Window */}
                {showChat && (
                    <div className="card fade-in" style={{
                        position: 'fixed',
                        bottom: '100px',
                        right: '30px',
                        width: '350px',
                        height: '500px',
                        display: 'flex',
                        flexDirection: 'column',
                        zIndex: 1000,
                        padding: '0',
                        overflow: 'hidden'
                    }}>
                        <div style={{ background: '#3b82f6', padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Bot size={20} color="white" />
                            <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>Kanan Assistant</h4>
                        </div>
                        
                        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {chatHistory.map((m, i) => (
                                <div key={i} style={{
                                    alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                                    background: m.role === 'user' ? '#3b82f6' : 'var(--input-bg)',
                                    padding: '0.8rem 1rem',
                                    borderRadius: '16px',
                                    maxWidth: '80%',
                                    fontSize: '0.9rem'
                                }}>
                                    {m.text}
                                </div>
                            ))}
                            {chatLoading && <div style={{ opacity: 0.5, fontSize: '0.8rem' }}>AI is thinking...</div>}
                        </div>

                        <form onSubmit={handleSendChat} style={{ padding: '1rem', borderTop: '1px solid var(--input-bg)', display: 'flex', gap: '8px' }}>
                            <input 
                                type="text" 
                                placeholder="Ask Kanan Bot..."
                                value={chatMsg}
                                onChange={(e) => setChatMsg(e.target.value)}
                                style={{ flex: 1, padding: '0.6rem 1rem' }}
                            />
                            <button type="submit" disabled={chatLoading} style={{ padding: '0.6rem', display: 'flex', alignItems: 'center' }}>
                                <Send size={18} />
                            </button>
                        </form>
                    </div>
                )}
        </div>
    )
}

export default NewSurvey

import React, { useState } from 'react'
import api from '../utils/api'

const SupportAI = () => {
    const [messages, setMessages] = useState([])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSend = async (e) => {
        e.preventDefault()
        if (!input.trim()) return
        
        const userMsg = input.trim()
        setMessages(prev => [...prev, { role: 'user', text: userMsg }])
        setInput('')
        setLoading(true)

        try {
            const res = await api.post('/chatbot/chat', { message: userMsg })
            setMessages(prev => [...prev, { role: 'bot', text: res.data.response }])
        } catch (err) {
            const errMsg = err.response?.data?.response || err.response?.data?.detail || 'Sorry, I am currently offline. Please check your connection and try again.'
            setMessages(prev => [...prev, { role: 'bot', text: errMsg }])
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fade-in card" style={{ padding: '2rem', height: '600px', display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ margin: '0 0 1rem 0' }}>Support AI</h2>
            <div style={{ flex: 1, background: 'var(--border-color)', borderRadius: '12px', padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px dashed var(--border-color)' }}>
                {messages.length === 0 ? (
                    <div style={{ margin: 'auto', opacity: 0.5, textAlign: 'center' }}>
                        Chatbot integration active.<br/>Ask me any question about the platform or your data.
                    </div>
                ) : (
                    messages.map((m, i) => (
                        <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', background: m.role === 'user' ? '#3b82f6' : 'var(--border-color)', padding: '0.8rem 1.2rem', borderRadius: '12px', maxWidth: '80%' }}>
                            {m.text}
                        </div>
                    ))
                )}
                {loading && <div style={{ alignSelf: 'flex-start', opacity: 0.5, fontSize: '0.9rem' }}>Typing...</div>}
            </div>
            <form onSubmit={handleSend} style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <input 
                    type="text" 
                    placeholder="Ask a question..." 
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    style={{ flex: 1, padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--input-bg)', color: 'var(--text-primary)' }} 
                    disabled={loading}
                />
                <button type="submit" className="primary-btn" style={{ padding: '0 1.5rem' }} disabled={loading}>Send</button>
            </form>
        </div>
    )
}

export default SupportAI

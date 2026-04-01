import React, { useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, LineElement, PointElement, ArcElement, Filler } from 'chart.js'
import { Bar, Line, Doughnut } from 'react-chartjs-2'
import Sidebar from '../components/Sidebar'
import NotificationBell from '../components/NotificationBell'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, LineElement, PointElement, ArcElement, Filler)
import { Plus, Trash2, Search, FileEdit, Users, Map as MapIcon, Download, Image as ImageIcon, User, Phone, Clock, FileText } from 'lucide-react'
import api from '../utils/api'
import AgentMap from '../components/AgentMap'
import DataHub from '../components/DataHub'
import SupportAI from '../components/SupportAI'

// --- Sub-components ---
const Overview = ({ metrics, questionsCount }) => {
    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { labels: { color: '#64748b', font: { weight: 500 } } }
        },
        scales: {
            x: { ticks: { color: '#64748b' }, grid: { color: 'rgba(100, 116, 139, 0.15)' } },
            y: { ticks: { color: '#64748b' }, grid: { color: 'rgba(100, 116, 139, 0.15)' } }
        }
    }

    const doughnutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'bottom', labels: { color: '#64748b', padding: 20, font: { weight: 500 } } }
        },
        cutout: '70%',
        borderWidth: 0
    }

    return (
        <div className="fade-in">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem' }}>
                    <Users size={24} color="#3b82f6" style={{ marginBottom: '1rem' }} />
                    <h4 style={{ margin: 0, opacity: 0.6, fontSize: '0.9rem' }}>Field Agents</h4>
                    <p style={{ margin: '0.5rem 0', fontSize: '2rem', fontWeight: 700 }}>
                        {metrics.distribution_data?.[0] || 0} <span style={{ fontSize: '1rem', fontWeight: 400, opacity: 0.6 }}>/ {metrics.total_agents || 0} Active</span>
                    </p>
                    <div style={{ fontSize: '0.8rem', color: (metrics.distribution_data?.[0] === metrics.total_agents) ? '#10b981' : '#f59e0b' }}>
                        {metrics.distribution_data?.[0]} active session controllers
                    </div>
                </div>
                <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem' }}>
                    <FileEdit size={24} color="#8b5cf6" style={{ marginBottom: '1rem' }} />
                    <h4 style={{ margin: 0, opacity: 0.6, fontSize: '0.9rem' }}>Active Survey Questions</h4>
                    <p style={{ margin: '0.5rem 0', fontSize: '2rem', fontWeight: 700 }}>{questionsCount}</p>
                    <div style={{ fontSize: '0.8rem', color: '#3b82f6' }}>Pre/Post Meeting defined</div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '3rem' }}>
                {/* 7-Day Trend Line Chart */}
                <div className="card" style={{ height: '400px', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ margin: '0 0 1.5rem 0' }}>Survey Submission Throughput (7 Days)</h3>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <Line 
                            data={{
                                labels: metrics.trend_labels || [],
                                datasets: [{
                                    label: 'Daily Field Submissions',
                                    data: metrics.trend_data || [],
                                    borderColor: '#3b82f6',
                                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                                    fill: true,
                                    tension: 0.4,
                                    pointBackgroundColor: '#3b82f6',
                                    pointBorderColor: '#fff',
                                    pointHoverBackgroundColor: '#fff',
                                    pointHoverBorderColor: '#3b82f6'
                                }]
                            }} 
                            options={commonOptions} 
                        />
                    </div>
                </div>

                {/* Health Health Distribution Doughnut */}
                <div className="card" style={{ height: '400px', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ margin: '0 0 1.5rem 0', textAlign: 'center' }}>Agent Roster Activity</h3>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <Doughnut 
                            data={{
                                labels: ['Active Agents', 'Inactive/Suspended'],
                                datasets: [{
                                    data: metrics.distribution_data || [0, 0],
                                    backgroundColor: ['#3b82f6', '#ef4444'],
                                    hoverBackgroundColor: ['#60a5fa', '#f87171']
                                }]
                            }} 
                            options={doughnutOptions} 
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}

const ManageSurveys = ({ questions, deleteQuestion, showModal, setShowModal, newQuestion, setNewQuestion, handleCreateQuestion }) => (
    <div className="fade-in card" style={{ padding: '0' }}>
        <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--input-bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>Active Survey Questions</h3>
            <button onClick={() => setShowModal(true)} className="primary-btn" style={{ padding: '0.6rem 1rem', display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.9rem', background: '#8b5cf6' }}>
                <Plus size={16} /> Add Question
            </button>
        </div>
        <div style={{ padding: '1rem' }}>
            {questions.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', opacity: 0.3 }}>
                    <p>No questions defined yet</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {questions.map(q => (
                        <div key={q.id} style={{
                            background: 'var(--border-color)', padding: '1.2rem', borderRadius: '12px',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}>
                            <div>
                                <span style={{ 
                                    fontSize: '0.7rem', textTransform: 'uppercase', 
                                    background: q.phase === 'pre_meeting' ? '#3b82f6' : '#8b5cf6',
                                    padding: '2px 6px', borderRadius: '4px', marginRight: '10px'
                                }}>
                                    {q.phase.replace('_', ' ')}
                                </span>
                                <span style={{ fontWeight: 500 }}>{q.text}</span>
                                <div style={{ fontSize: '0.8rem', opacity: 0.5, marginTop: '4px' }}>Type: {q.type}</div>
                            </div>
                            <button onClick={() => deleteQuestion(q.id)} style={{ color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                                <Trash2 size={18} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>

        {showModal && (
            <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
            }}>
                <div className="card fade-in" style={{ maxWidth: '500px', width: '100%' }}>
                    <h2 style={{ marginBottom: '1.5rem' }}>Add Survey Question</h2>
                    <form onSubmit={handleCreateQuestion}>
                        <div className="input-group">
                            <label>Question Text</label>
                            <input type="text" placeholder="e.g. How was the initial contact?" value={newQuestion.text} onChange={(e) => setNewQuestion({...newQuestion, text: e.target.value})} required />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className="input-group">
                                <label>Input Type</label>
                                <select 
                                    style={{ background: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '0.8rem', color: 'var(--text-primary)' }}
                                    value={newQuestion.type} onChange={(e) => setNewQuestion({...newQuestion, type: e.target.value})}
                                >
                                    <option value="text">Short Text</option>
                                    <option value="textarea">Long Text</option>
                                    <option value="select">Selection</option>
                                    <option value="image">Image Upload</option>
                                </select>
                            </div>
                            <div className="input-group">
                                <label>Meeting Phase</label>
                                <select 
                                    style={{ background: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '0.8rem', color: 'var(--text-primary)' }}
                                    value={newQuestion.phase} onChange={(e) => setNewQuestion({...newQuestion, phase: e.target.value})}
                                >
                                    <option value="pre_meeting">Pre-Meeting</option>
                                    <option value="post_meeting">Post-Meeting</option>
                                </select>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                            <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, background: 'var(--input-bg)' }}>Cancel</button>
                            <button type="submit" className="primary-btn" style={{ flex: 1 }}>Save Question</button>
                        </div>
                    </form>
                </div>
            </div>
        )}
    </div>
)

const SubmissionsHistory = ({ submissions, questions }) => (
    <div className="fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: 0 }}>Recent Agent Submissions</h3>
            <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>{submissions.length} Total</span>
        </div>
        
        {submissions.length === 0 ? (
            <div className="card" style={{ padding: '3rem', textAlign: 'center', opacity: 0.3 }}>
                <FileText size={48} style={{ marginBottom: '1rem', margin: '0 auto' }} />
                <p>No surveys submitted yet.</p>
            </div>
        ) : (
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
                gap: '1.5rem' 
            }}>
                {submissions.map(sub => {
                    const responses = typeof sub.responses === 'string' ? JSON.parse(sub.responses) : sub.responses;
                    
                    return (
                        <div key={sub.id} className="card" style={{ 
                            padding: '1.5rem', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: '1rem',
                            border: '1px solid rgba(59, 130, 246, 0.1)',
                            transition: 'all 0.3s ease',
                            cursor: 'default'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    <div style={{ 
                                        width: '40px', 
                                        height: '40px', 
                                        borderRadius: '10px', 
                                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center',
                                        color: 'var(--text-primary)',
                                        fontWeight: 700
                                    }}>
                                        {sub.client_name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h4 style={{ margin: 0, fontSize: '1.1rem' }}>{sub.client_name}</h4>
                                        <div style={{ fontSize: '0.8rem', opacity: 0.5, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                            <Phone size={12} /> {sub.client_contact}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ fontSize: '0.7rem', background: 'var(--input-bg)', padding: '4px 8px', borderRadius: '6px', opacity: 0.6 }}>
                                    #{sub.id}
                                </div>
                            </div>

                            <div style={{ background: 'var(--border-color)', padding: '1rem', borderRadius: '12px', fontSize: '0.85rem' }}>
                                <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ opacity: 0.5, display: 'flex', alignItems: 'center', gap: '6px' }}><User size={14} /> Agent</span>
                                    <span style={{ fontWeight: 500 }}>ID: {sub.agent_id}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ opacity: 0.5, display: 'flex', alignItems: 'center', gap: '6px' }}><Clock size={14} /> Timestamp</span>
                                    <span style={{ fontWeight: 500 }}>{new Date(sub.timestamp + (sub.timestamp.endsWith('Z') ? '' : 'Z')).toLocaleDateString()} {new Date(sub.timestamp + (sub.timestamp.endsWith('Z') ? '' : 'Z')).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                            </div>

                            {/* Responses Snippet */}
                            <div style={{ flex: 1 }}>
                                <h5 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Key Insights</h5>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {Object.entries(responses || {}).slice(0, 2).map(([qid, val]) => {
                                        const question = questions.find(q => q.id === parseInt(qid));
                                        return (
                                            <div key={qid} style={{ fontSize: '0.85rem' }}>
                                                <div style={{ opacity: 0.4, fontSize: '0.75rem', marginBottom: '2px' }}>{question ? question.text : `Q${qid}`}</div>
                                                <div style={{ fontWeight: 500 }}>{val}</div>
                                            </div>
                                        );
                                    })}
                                    {Object.keys(responses || {}).length > 2 && (
                                        <div style={{ fontSize: '0.75rem', color: '#3b82f6', cursor: 'pointer', marginTop: '4px' }}>+ {Object.keys(responses).length - 2} more details</div>
                                    )}
                                </div>
                            </div>

                            {sub.image_paths && sub.image_paths.length > 0 && (
                                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                                    {sub.image_paths.map((img, idx) => (
                                        <div key={idx} style={{ 
                                            position: 'relative', 
                                            minWidth: '60px', 
                                            height: '60px', 
                                            borderRadius: '8px', 
                                            overflow: 'hidden',
                                            border: '1px solid var(--border-color)'
                                        }}>
                                            <img 
                                                src={`http://localhost:8000/static/${img}`} 
                                                alt="survey" 
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        )}
    </div>
)

const ManageAgents = ({ agents, deleteAgent, toggleStatus, showAgentModal, setShowAgentModal, agentFormData, setAgentFormData, handleCreateAgent, loading }) => {
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('ALL')
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')

    const filteredAgents = agents.filter(agent => {
        if (searchTerm && !agent.name.toLowerCase().includes(searchTerm.toLowerCase()) && !agent.email.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        if (statusFilter === 'ACTIVE' && !agent.is_active) return false;
        if (statusFilter === 'INACTIVE' && agent.is_active) return false;
        if (dateFrom || dateTo) {
            const agentDate = new Date(agent.created_at || new Date())
            if (dateFrom && agentDate < new Date(dateFrom)) return false;
            if (dateTo && agentDate > new Date(new Date(dateTo).getTime() + 86400000)) return false;
        }
        return true;
    })

    return (
    <div className="fade-in card" style={{ padding: '0' }}>
        <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <h3 style={{ margin: 0 }}>Field Agents</h3>
            
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
                    <input type="text" placeholder="Search name or email..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ padding: '0.5rem 1rem 0.5rem 2.2rem', fontSize: '0.85rem', width: '200px' }} />
                </div>
                
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                    <option value="ALL">All Status</option>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                </select>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ padding: '0.5rem', fontSize: '0.85rem' }} title="Joined After" />
                    <span>-</span>
                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ padding: '0.5rem', fontSize: '0.85rem' }} title="Joined Before" />
                </div>

                <button onClick={() => setShowAgentModal(true)} className="primary-btn" style={{ padding: '0.6rem 1rem', display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.9rem' }}>
                    <Plus size={18} /> Add Agent
                </button>
            </div>
        </div>
        <div style={{ padding: '0 1rem', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', opacity: 0.5, fontSize: '0.85rem' }}>
                        <th style={{ padding: '1.5rem' }}>NAME</th>
                        <th style={{ padding: '1.5rem' }}>EMAIL</th>
                        <th style={{ padding: '1.5rem' }}>STATUS</th>
                        <th style={{ padding: '1.5rem' }}>JOINED</th>
                        <th style={{ padding: '1.5rem' }}>ACTIONS</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredAgents.map((agent) => (
                        <tr key={agent.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={16} color="#3b82f6" /></div>
                                <span style={{ fontWeight: 500 }}>{agent.name}</span>
                            </td>
                            <td style={{ padding: '1.2rem', opacity: 0.8 }}>{agent.email}</td>
                            <td style={{ padding: '1.2rem' }}>
                                <button onClick={() => toggleStatus(agent.id)} style={{ background: agent.is_active ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: agent.is_active ? '#10b981' : '#ef4444', padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.2s ease' }} title={agent.is_active ? 'Click to deactivate' : 'Click to activate'}>
                                    {agent.is_active ? '● Active' : '○ Inactive'}
                                </button>
                            </td>
                            <td style={{ padding: '1.2rem', opacity: 0.7, fontSize: '0.9rem' }}>
                                {new Date(agent.created_at).toLocaleDateString()}
                            </td>
                            <td style={{ padding: '1.2rem' }}>
                                <button onClick={() => deleteAgent(agent.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '5px' }} title="Delete Agent">
                                    <Trash2 size={18} />
                                </button>
                            </td>
                        </tr>
                    ))}
                    {filteredAgents.length === 0 && !loading && (
                        <tr><td colSpan="5" style={{ padding: '3rem', textAlign: 'center', opacity: 0.4 }}><p>No field agents found matching filters.</p></td></tr>
                    )}
                </tbody>
            </table>
        </div>

        {showAgentModal && (
            <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
            }}>
                <div className="card fade-in" style={{ maxWidth: '400px', width: '100%' }}>
                    <h2 style={{ marginBottom: '1.5rem' }}>Add New Field Agent</h2>
                    <form onSubmit={handleCreateAgent}>
                        <div className="input-group">
                            <label>Full Name</label>
                            <input type="text" value={agentFormData.name} onChange={(e) => setAgentFormData({...agentFormData, name: e.target.value})} required />
                        </div>
                        <div className="input-group">
                            <label>Email Address</label>
                            <input type="email" value={agentFormData.email} onChange={(e) => setAgentFormData({...agentFormData, email: e.target.value})} required />
                        </div>
                        <div className="input-group">
                            <label>Password</label>
                            <input type="password" value={agentFormData.password} onChange={(e) => setAgentFormData({...agentFormData, password: e.target.value})} required />
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                            <button type="button" onClick={() => setShowAgentModal(false)} style={{ flex: 1, background: 'var(--input-bg)' }}>Cancel</button>
                            <button type="submit" className="primary-btn" style={{ flex: 1 }}>Create Agent</button>
                        </div>
                    </form>
                </div>
            </div>
        )}
    </div>
    )
}

const GlobalMap = () => (
    <div className="fade-in" style={{ height: '75vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
            <MapIcon size={20} color="#3b82f6" />
            <h3 style={{ margin: 0 }}>Live Field Activity</h3>
        </div>
        <div style={{ flex: 1, position: 'relative', borderRadius: '24px', overflow: 'hidden' }}>
            <AgentMap />
        </div>
    </div>
)

// --- Main Container ---
const AdminDashboard = () => {
    const [questions, setQuestions] = useState([])
    const [metrics, setMetrics] = useState({ total_agents: 0, trend_labels: [], trend_data: [], distribution_data: [] })
    const [submissions, setSubmissions] = useState([])
    const [agents, setAgents] = useState([])
    
    // UI states
    const [showQuestionModal, setShowQuestionModal] = useState(false)
    const [showAgentModal, setShowAgentModal] = useState(false)
    const [loading, setLoading] = useState(true)

    const [newQuestion, setNewQuestion] = useState({ text: '', type: 'text', phase: 'pre_meeting', options: [] })
    const [agentFormData, setAgentFormData] = useState({ name: '', email: '', password: '', role: 'AGENT' })

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            const qRes = await api.get('/surveys/questions')
            setQuestions(qRes.data)
            const metricsRes = await api.get('/metrics/admin')
            setMetrics(metricsRes.data)
            const subRes = await api.get('/surveys/submissions')
            setSubmissions(subRes.data.reverse())
            const agentRes = await api.get('/agents/')
            setAgents(agentRes.data.filter(a => a.role === 'AGENT'))
        } catch (err) { } finally { setLoading(false) }
    }

    const handleCreateQuestion = async (e) => {
        e.preventDefault()
        try {
            await api.post('/surveys/questions', newQuestion)
            setShowQuestionModal(false)
            setNewQuestion({ text: '', type: 'text', phase: 'pre_meeting', options: [] })
            fetchData()
        } catch (err) { alert('Error creating question') }
    }

    const deleteQuestion = async (id) => {
        if (!window.confirm('Delete this question?')) return
        try {
            await api.delete(`/surveys/questions/${id}`)
            fetchData()
        } catch (err) { alert('Error deleting') }
    }

    const handleCreateAgent = async (e) => {
        e.preventDefault()
        try {
            const res = await api.post('/agents/', agentFormData)
            setAgents([...agents, res.data])
            setShowAgentModal(false)
            setAgentFormData({ name: '', email: '', password: '', role: 'agent' })
        } catch (err) { alert('Failed to create agent') }
    }

    const deleteAgent = async (id) => {
        if (!window.confirm('Are you sure you want to delete this agent?')) return
        try {
            await api.delete(`/agents/${id}`)
            setAgents(agents.filter(a => a.id !== id))
        } catch (err) { alert('Failed to delete agent') }
    }

    const toggleAgentStatus = async (id) => {
        try {
            const res = await api.patch(`/agents/${id}/status`)
            setAgents(agents.map(a => a.id === id ? res.data : a))
        } catch (err) { alert(err.response?.data?.detail || 'Failed to toggle status') }
    }



    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: 'transparent' }}>
            <Sidebar role="ADMIN_B2C" />
            
            <main style={{ marginLeft: '280px', flex: 1, padding: '3rem', width: 'calc(100% - 280px)' }}>
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 700 }}>Admin Portal</h1>
                        <p style={{ margin: 0, opacity: 0.5 }}>Manage questions, agents, and track field visits</p>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <NotificationBell />
                    </div>
                </header>

                <Routes>
                    <Route path="/" element={<Overview metrics={metrics} questionsCount={questions.length} />} />
                    <Route path="agents" element={<ManageAgents agents={agents} deleteAgent={deleteAgent} toggleStatus={toggleAgentStatus} showAgentModal={showAgentModal} setShowAgentModal={setShowAgentModal} agentFormData={agentFormData} setAgentFormData={setAgentFormData} handleCreateAgent={handleCreateAgent} loading={loading} />} />
                    <Route path="surveys" element={<>
                        <ManageSurveys questions={questions} deleteQuestion={deleteQuestion} showModal={showQuestionModal} setShowModal={setShowQuestionModal} newQuestion={newQuestion} setNewQuestion={setNewQuestion} handleCreateQuestion={handleCreateQuestion} />
                        <div style={{ marginTop: '3rem' }}><SubmissionsHistory submissions={submissions} questions={questions} /></div>
                    </>} />
                    <Route path="map" element={<GlobalMap />} />
                    <Route path="support" element={<SupportAI />} />
                    <Route path="data" element={<DataHub />} />
                </Routes>
            </main>
        </div>
    )
}

export default AdminDashboard

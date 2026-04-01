import React, { useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, LineElement, PointElement, ArcElement, Filler } from 'chart.js'
import { Bar, Line, Doughnut } from 'react-chartjs-2'
import Sidebar from '../components/Sidebar'
import NotificationBell from '../components/NotificationBell'
import AgentMap from '../components/AgentMap'
import SupportAI from '../components/SupportAI'
import DataHub from '../components/DataHub'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, LineElement, PointElement, ArcElement, Filler)
import { Plus, Trash2, Search, Filter, Mail, User as UserIcon, Users, Map as MapIcon, Download } from 'lucide-react'
import api from '../utils/api'

// Sub-components for nested routing
const Overview = ({ metrics }) => {
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem' }}>
                    <h4 style={{ margin: 0, opacity: 0.6, fontSize: '0.9rem' }}>Total Admins</h4>
                    <p style={{ margin: '0.5rem 0', fontSize: '2rem', fontWeight: 700 }}>{metrics.total_admins}</p>
                </div>
                <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem' }}>
                    <h4 style={{ margin: 0, opacity: 0.6, fontSize: '0.9rem' }}>Total Agents</h4>
                    <p style={{ margin: '0.5rem 0', fontSize: '2rem', fontWeight: 700 }}>
                        {metrics.agent_status_data?.[0] || 0} <span style={{ fontSize: '1rem', fontWeight: 400, opacity: 0.6 }}>/ {metrics.total_agents || 0} Active</span>
                    </p>
                </div>
                <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem' }}>
                    <h4 style={{ margin: 0, opacity: 0.6, fontSize: '0.9rem' }}>Active Surveys</h4>
                    <p style={{ margin: '0.5rem 0', fontSize: '2rem', fontWeight: 700 }}>{metrics.active_surveys}</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                {/* 7-Day Trend Line Chart */}
                <div className="card" style={{ height: '400px', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ margin: '0 0 1.5rem 0' }}>Survey Throughput (7 Days)</h3>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <Line 
                            data={{
                                labels: metrics.trend_labels || [],
                                datasets: [{
                                    label: 'Global Submissions',
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

                {/* Role Distribution Doughnut Chart */}
                <div className="card" style={{ height: '400px', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ margin: '0 0 1.5rem 0', textAlign: 'center' }}>Staffing Hierarchy</h3>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <Doughnut 
                            data={{
                                labels: ['Administrators', 'Field Agents'],
                                datasets: [{
                                    data: [metrics.total_admins, metrics.total_agents],
                                    backgroundColor: ['#8b5cf6', '#3b82f6'],
                                    hoverBackgroundColor: ['#a78bfa', '#60a5fa']
                                }]
                            }} 
                            options={doughnutOptions} 
                        />
                    </div>
                </div>

                {/* Status Distribution Doughnut Chart */}
                <div className="card" style={{ height: '400px', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ margin: '0 0 1.5rem 0', textAlign: 'center' }}>Account Status</h3>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <Doughnut 
                            data={{
                                labels: ['Active Accounts', 'Inactive/Disabled'],
                                datasets: [{
                                    data: metrics.distribution_data || [0, 0],
                                    backgroundColor: ['#10b981', '#ef4444'],
                                    hoverBackgroundColor: ['#34d399', '#f87171']
                                }]
                            }} 
                            options={doughnutOptions} 
                        />
                    </div>
                </div>
            </div>

            {/* Health Health Distribution */}
            <div className="card" style={{ width: '100%', maxWidth: '500px', height: '350px', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ margin: '0 0 1.5rem 0', textAlign: 'center' }}>Workforce Roster Status</h3>
                <div style={{ flex: 1, position: 'relative' }}>
                    <Doughnut 
                        data={{
                            labels: ['Active Members', 'Inactive Members'],
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
    )
}

const ManageAgents = ({ agents, deleteAgent, toggleStatus, setShowModal, loading, title = "Agent Management" }) => {
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
            <h3 style={{ margin: 0 }}>{title}</h3>
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

                <button onClick={() => setShowModal(true)} className="primary-btn" style={{ padding: '0.6rem 1rem', display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.9rem' }}>
                    <Plus size={18} /> Add New
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
                                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <UserIcon size={16} color="#3b82f6" />
                                </div>
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
                                <button onClick={() => deleteAgent(agent.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '5px' }} title="Delete Account">
                                    <Trash2 size={18} />
                                </button>
                            </td>
                        </tr>
                    ))}
                    {filteredAgents.length === 0 && !loading && (
                        <tr>
                            <td colSpan="5" style={{ padding: '3rem', textAlign: 'center', opacity: 0.3 }}>
                                <Users size={48} style={{ marginBottom: '1rem', marginLeft: 'auto', marginRight: 'auto', display: 'block' }} />
                                <p>No members found matching filters</p>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    </div>
    )
}

const GlobalMap = () => (
    <div className="fade-in" style={{ height: '75vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
            <MapIcon size={20} color="#3b82f6" />
            <h3 style={{ margin: 0 }}>Real-time Global Tracking</h3>
        </div>
        <div style={{ flex: 1, position: 'relative', borderRadius: '24px', overflow: 'hidden' }}>
            <AgentMap />
        </div>
    </div>
)


const SuperAdminDashboard = () => {
    const [agents, setAgents] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'AGENT' })
    const [metrics, setMetrics] = useState({ 
        total_admins: 0, total_agents: 0, active_surveys: 0,
        trend_labels: [], trend_data: [],
        distribution_data: [], role_distribution_data: []
    })

    useEffect(() => {
        fetchAgents()
        fetchMetrics()
    }, [])

    const fetchMetrics = async () => {
        try {
            const res = await api.get('/metrics/superadmin')
            setMetrics(res.data)
        } catch (err) { }
    }

    const fetchAgents = async () => {
        try {
            const res = await api.get('/agents/')
            setAgents(res.data)
        } catch (err) { } finally { setLoading(false) }
    }

    const handleCreate = async (e) => {
        e.preventDefault()
        try {
            const res = await api.post('/agents/', formData)
            setAgents([...agents, res.data])
            setShowModal(false)
            setFormData({ name: '', email: '', password: '', role: 'AGENT' })
        } catch (err) {
            alert('Failed to create user')
        }
    }

    const deleteAgent = async (id) => {
        if (!window.confirm('Are you sure you want to delete this user?')) return
        try {
            await api.delete(`/agents/${id}`)
            setAgents(agents.filter(a => a.id !== id))
        } catch (err) {
            alert('Failed to delete user')
        }
    }

    const toggleAgentStatus = async (id) => {
        try {
            const res = await api.patch(`/agents/${id}/status`)
            setAgents(agents.map(a => a.id === id ? res.data : a))
        } catch (err) { alert(err.response?.data?.detail || 'Failed to toggle status') }
    }

    const handleExport = async (format) => {
        try {
            const res = await api.get(`/surveys/export?format=${format}`, { responseType: 'blob' })
            const url = window.URL.createObjectURL(new Blob([res.data]))
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', `survey_export.${format === 'excel' ? 'xlsx' : 'csv'}`)
            document.body.appendChild(link)
            link.click()
        } catch (err) { alert('Export failed') }
    }

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: 'transparent' }}>
            <Sidebar role="SUPER_ADMIN" />
            
            <main style={{ marginLeft: '280px', flex: 1, padding: '3rem', width: 'calc(100% - 280px)' }}>
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 700 }}>Super Admin Portal</h1>
                        <p style={{ margin: 0, opacity: 0.5 }}>Manage your organization's administrators and global agents</p>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <NotificationBell />
                    </div>
                </header>

                <Routes>
                    <Route path="/" element={<Overview metrics={metrics} />} />
                    <Route path="admins" element={<ManageAgents agents={agents.filter(a => a.role !== 'AGENT')} deleteAgent={deleteAgent} toggleStatus={toggleAgentStatus} setShowModal={setShowModal} loading={loading} title="Administrator Management" />} />
                    <Route path="agents" element={<ManageAgents agents={agents.filter(a => a.role === 'AGENT')} deleteAgent={deleteAgent} toggleStatus={toggleAgentStatus} setShowModal={setShowModal} loading={loading} title="Field Agents Management" />} />
                    <Route path="map" element={<GlobalMap />} />
                    <Route path="support" element={<SupportAI />} />
                    <Route path="data" element={<DataHub />} />
                </Routes>

                {showModal && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                    }}>
                        <div className="card fade-in" style={{ maxWidth: '400px', width: '100%' }}>
                            <h2 style={{ marginBottom: '1.5rem' }}>Add New User</h2>
                            <form onSubmit={handleCreate}>
                                <div className="input-group">
                                    <label>Role</label>
                                    <select 
                                        style={{ background: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '0.8rem', color: 'var(--text-primary)' }}
                                        value={formData.role} 
                                        onChange={(e) => setFormData({...formData, role: e.target.value})}
                                    >
                                        <option value="AGENT">Field Agent</option>
                                        <option value="ADMIN_B2C">B2C Administrator</option>
                                    </select>
                                </div>
                                <div className="input-group">
                                    <label>Full Name</label>
                                    <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
                                </div>
                                <div className="input-group">
                                    <label>Email Address</label>
                                    <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required />
                                </div>
                                <div className="input-group">
                                    <label>Password</label>
                                    <input type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} required />
                                </div>
                                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                                    <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, background: 'var(--input-bg)' }}>Cancel</button>
                                    <button type="submit" className="primary-btn" style={{ flex: 1 }}>Create</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </main>
        </div>
    )
}

export default SuperAdminDashboard

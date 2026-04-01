import React, { useState } from 'react'
import { Upload, Download, FileSpreadsheet, Loader, CheckCircle, AlertTriangle, Users, ClipboardList } from 'lucide-react'
import api from '../utils/api'

const DataHub = () => {
    const [activeTab, setActiveTab] = useState('agents')
    const [file, setFile] = useState(null)
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState(null)

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0])
            setResult(null)
        }
    }

    const handleImport = async () => {
        if (!file) return
        setLoading(true)
        setResult(null)
        
        const formData = new FormData()
        formData.append('file', file)
        
        const endpoint = activeTab === 'agents' ? '/agents/import' : '/surveys/import'
        
        try {
            const res = await api.post(endpoint, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })
            setResult({ 
                type: res.data.type || 'success', 
                message: res.data.message,
                warnings: res.data.warnings || []
            })
            setFile(null)
            document.getElementById('csv-upload').value = ''
        } catch (err) {
            setResult({ 
                type: 'error', 
                message: err.response?.data?.detail || `Failed to import ${activeTab}. Ensure file format is valid.` 
            })
        } finally {
            setLoading(false)
        }
    }

    const handleExport = async (format) => {
        const endpoint = activeTab === 'agents' ? `/agents/export?format=${format}` : `/surveys/export?format=${format}`
        const filename = activeTab === 'agents' ? 'kanan_staff_export' : 'kanan_surveys_export'
        
        try {
            const response = await api.get(endpoint, { responseType: 'blob' })
            const url = window.URL.createObjectURL(new Blob([response.data]))
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', `${filename}.${format === 'csv' ? 'csv' : 'xlsx'}`)
            document.body.appendChild(link)
            link.click()
            link.remove()
        } catch (err) {
            alert('Export failed. Ensure backend dependencies are correctly configured.')
        }
    }

    return (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                <button 
                    onClick={() => { setActiveTab('agents'); setResult(null); setFile(null); }}
                    style={{ 
                        background: activeTab === 'agents' ? 'var(--input-bg)' : 'transparent',
                        borderColor: activeTab === 'agents' ? 'var(--border-color)' : 'transparent',
                        display: 'flex', alignItems: 'center', gap: '8px', padding: '0.8rem 1.5rem',
                        color: activeTab === 'agents' ? '#3b82f6' : 'var(--text-muted)'
                    }}
                >
                    <Users size={18} /> Manage Field Agents
                </button>
                <button 
                    onClick={() => { setActiveTab('surveys'); setResult(null); setFile(null); }}
                    style={{ 
                        background: activeTab === 'surveys' ? 'var(--input-bg)' : 'transparent',
                        borderColor: activeTab === 'surveys' ? 'var(--border-color)' : 'transparent',
                        display: 'flex', alignItems: 'center', gap: '8px', padding: '0.8rem 1.5rem',
                        color: activeTab === 'surveys' ? '#10b981' : 'var(--text-muted)'
                    }}
                >
                    <ClipboardList size={18} /> Historical Surveys
                </button>
            </div>

            <div className="card" style={{ padding: '0' }}>
                <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Upload size={20} color={activeTab === 'agents' ? "#3b82f6" : "#10b981"} />
                    <h3 style={{ margin: 0 }}>
                        {activeTab === 'agents' ? 'Bulk Import Field Agents' : 'Bulk Import Survey Submissions'}
                    </h3>
                </div>
                <div style={{ padding: '2rem' }}>
                    <p style={{ opacity: 0.6, marginBottom: '2rem', fontSize: '0.9rem' }}>
                        {activeTab === 'agents' 
                            ? 'Upload a .CSV or .XLSX spreadsheet to bulk-create workforce accounts. Columns: Email, Name, Role, Password.'
                            : 'Upload a spreadsheet of historical surveys. Must contain an "Agent" column mapping exactly to an existing database Agent Name. Prepend dynamic question columns with "Q_" (e.g., Q_14).'
                        }
                    </p>
                    
                    <div style={{ 
                        border: '2px dashed var(--border-color)', 
                        borderRadius: '16px', 
                        padding: '3rem', 
                        textAlign: 'center',
                        background: file ? 'var(--input-bg)' : 'transparent',
                        transition: 'all 0.3s ease'
                    }}>
                        <input 
                            type="file" 
                            id="csv-upload" 
                            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
                            style={{ display: 'none' }} 
                            onChange={handleFileChange}
                        />
                        
                        {!file ? (
                            <label htmlFor="csv-upload" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                                <FileSpreadsheet size={48} opacity={0.3} />
                                <div><strong style={{ color: activeTab === 'agents' ? '#3b82f6' : '#10b981' }}>Click to Browse</strong> or Drag and Drop</div>
                                <div style={{ fontSize: '0.8rem', opacity: 0.5 }}>.CSV or .XLSX allowed</div>
                            </label>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
                                <FileSpreadsheet size={48} color={activeTab === 'agents' ? '#3b82f6' : '#10b981'} />
                                <div style={{ fontWeight: 600 }}>{file.name}</div>
                                <div style={{ fontSize: '0.8rem', opacity: 0.5 }}>{(file.size / 1024).toFixed(2)} KB</div>
                                <div style={{ display: 'flex', gap: '10px', marginTop: '1rem' }}>
                                    <button onClick={() => { setFile(null); document.getElementById('csv-upload').value = '' }} style={{ background: 'transparent', color: '#ef4444' }}>
                                        Remove
                                    </button>
                                    <button onClick={handleImport} className="primary-btn" disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: activeTab === 'surveys' ? '#10b981' : '' }}>
                                        {loading ? <Loader size={16} className="spin" /> : <Upload size={16} />} 
                                        {loading ? 'Processing...' : 'Execute Import'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {result && (
                        <div style={{ 
                            marginTop: '1.5rem', 
                            padding: '1.2rem', 
                            borderRadius: '12px', 
                            background: result.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : result.type === 'partial' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            border: `1px solid ${result.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : result.type === 'partial' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                            color: result.type === 'success' ? '#10b981' : result.type === 'partial' ? '#f59e0b' : '#ef4444'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 600, marginBottom: result.warnings?.length ? '10px' : '0' }}>
                                {result.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                                {result.message}
                            </div>
                            
                            {result.warnings && result.warnings.length > 0 && (
                                <ul style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '0.85rem', opacity: 0.9 }}>
                                    {result.warnings.map((warn, i) => (
                                        <li key={i} style={{ marginBottom: '4px' }}>{warn}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="card" style={{ padding: '0' }}>
                <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Download size={20} color="#8b5cf6" />
                    <h3 style={{ margin: 0 }}>Dataset Export</h3>
                </div>
                <div style={{ padding: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h4 style={{ margin: '0 0 5px 0' }}>
                            {activeTab === 'agents' ? 'Export Active Workforce Roster' : 'Export Centralized Survey Datasets'}
                        </h4>
                        <p style={{ margin: 0, opacity: 0.6, fontSize: '0.9rem' }}>
                            {activeTab === 'agents' 
                                ? 'Download a complete flat-file representation of all administrative and field agents.'
                                : 'Dump all historical insights into standardized static arrays for local analysis.'
                            }
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button onClick={() => handleExport('csv')} style={{ display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--border-color)' }}>
                            <Download size={16} /> Export CSV
                        </button>
                        <button onClick={() => handleExport('excel')} className="primary-btn" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#10b981' }}>
                            <FileSpreadsheet size={16} /> Export Excel
                        </button>
                    </div>
                </div>
            </div>
            
            <style>{`
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { 100% { transform: rotate(360deg); } }
            `}</style>
        </div>
    )
}

export default DataHub

import React, { useState } from 'react'
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom'
import { MapPin, FileText, MessageSquare, LogOut, ShieldCheck } from 'lucide-react'
import api from '../utils/api'
import useTracking from '../hooks/useTracking'
import NewSurvey from './NewSurvey'
import SupportAI from '../components/SupportAI'

import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'

// Automatically handle map sizing and re-centering
const PersonalMapController = ({ center }) => {
    const map = useMap()
    React.useEffect(() => {
        if (!map || !map.getContainer()) return;
        const observer = new ResizeObserver(() => {
            setTimeout(() => { if (map) map.invalidateSize() }, 50)
        })
        observer.observe(map.getContainer())
        return () => observer.disconnect()
    }, [map])
    React.useEffect(() => {
        if (center && center[0] && center[1]) {
            map.setView(center, map.getZoom(), { animate: true })
        }
    }, [center, map])
    return null
}

const MyVisits = ({ lastLocation }) => {
    const user = JSON.parse(localStorage.getItem('user')) || {}
    const [history, setHistory] = useState([])
    const [surveyCount, setSurveyCount] = useState(0)

    // Fetch dynamic metrics
    React.useEffect(() => {
        const fetchMetrics = async () => {
            try {
                const res = await api.get('/metrics/agent')
                setSurveyCount(res.data.survey_count)
            } catch (err) {
                console.error('Failed to fetch metrics', err)
            }
        }
        fetchMetrics()
    }, [])

    // Append new locations to draw the local trail
    React.useEffect(() => {
        if (lastLocation && lastLocation.lat) {
            setHistory(prev => {
                // Prevent duplicate polling pushing the same coordinates over and over
                if (prev.length > 0) {
                    const last = prev[prev.length - 1];
                    if (last.lat === lastLocation.lat && last.lng === lastLocation.lng) return prev;
                }
                return [...prev, lastLocation]
            })
        }
    }, [lastLocation])

    return (
        <div className="fade-in">
            <h1 style={{ fontWeight: 700, margin: 0, fontSize: '2rem' }}>Welcome back, {user.name}</h1>
            <p style={{ opacity: 0.6, fontSize: '1rem', marginTop: '0.5rem' }}>View your active visits and performance.</p>
            
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '1.5rem',
                marginTop: '2rem',
            }}>
                <div className="card" style={{ padding: '2rem' }}>
                    <h3 style={{ margin: 0, opacity: 0.7 }}>Surveys Completed</h3>
                    <p style={{ fontSize: '3rem', fontWeight: 700, margin: '1rem 0 0', color: '#3b82f6' }}>{surveyCount}</p>
                </div>
                <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ margin: 0, opacity: 0.7 }}>Live Tracking Status</h3>
                    <p style={{ fontSize: '1.5rem', fontWeight: 700, margin: '1rem 0 0', color: lastLocation ? '#10b981' : '#ef4444' }}>
                        {lastLocation ? 'GPS Active' : 'Waiting for GPS...'}
                    </p>
                </div>
            </div>

            <div className="card" style={{ marginTop: '2rem', padding: '0', overflow: 'hidden', height: '500px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--input-bg)' }}>
                    <h3 style={{ margin: 0 }}>My Real-Time Route Tracing</h3>
                </div>
                <div style={{ flex: 1, position: 'relative' }}>
                    {lastLocation ? (
                        <MapContainer center={[lastLocation.lat, lastLocation.lng]} zoom={15} style={{ height: '100%', width: '100%' }}>
                            <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution='&copy; OpenStreetMap'
                            />
                            <PersonalMapController center={[lastLocation.lat, lastLocation.lng]} />
                            <Marker position={[lastLocation.lat, lastLocation.lng]}>
                                <Popup>You are here</Popup>
                            </Marker>
                            {history.length > 1 && (
                                <Polyline 
                                    positions={history.map(h => [h.lat, h.lng])} 
                                    color="#3b82f6" 
                                    weight={5} 
                                    opacity={0.8}
                                />
                            )}
                        </MapContainer>
                    ) : (
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
                            Acquiring satellite fix... Please allow Location permissions.
                        </div>
                    )}
                </div>
            </div>

        </div>
    )
}


const AgentDashboard = () => {
    // Enable tracking
    const lastLocation = useTracking(true)
    const navigate = useNavigate()
    const location = useLocation()
    
    const handleLogout = () => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        navigate('/login')
    }

    const isActive = (path) => location.pathname === `/agent${path}`

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            {/* Sidebar */}
            <aside style={{ width: '280px', background: 'var(--border-color)', borderRight: '1px solid var(--input-bg)', display: 'flex', flexDirection: 'column', padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '3rem' }}>
                    <div style={{ background: '#3b82f6', padding: '10px', borderRadius: '12px' }}>
                        <ShieldCheck size={20} />
                    </div>
                    <div>
                        <h3 style={{ margin: 0, fontWeight: 700 }}>Agent UI</h3>
                        <p style={{ margin: 0, opacity: 0.5, fontSize: '0.8rem' }}>Field Operations</p>
                    </div>
                </div>

                <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                    <Link to="/agent" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '1rem', borderRadius: '12px', background: isActive('') ? 'rgba(59, 130, 246, 0.1)' : 'transparent', color: isActive('') ? '#3b82f6' : 'var(--text-primary)', textDecoration: 'none', transition: 'all 0.2s', fontWeight: isActive('') ? 600 : 400 }}>
                        <MapPin size={20} /> My Visits
                    </Link>
                    <Link to="/agent/new-survey" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '1rem', borderRadius: '12px', background: isActive('/new-survey') ? 'rgba(59, 130, 246, 0.1)' : 'transparent', color: isActive('/new-survey') ? '#3b82f6' : 'var(--text-primary)', textDecoration: 'none', transition: 'all 0.2s', fontWeight: isActive('/new-survey') ? 600 : 400 }}>
                        <FileText size={20} /> New Survey
                    </Link>
                    <Link to="/agent/support" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '1rem', borderRadius: '12px', background: isActive('/support') ? 'rgba(59, 130, 246, 0.1)' : 'transparent', color: isActive('/support') ? '#3b82f6' : 'var(--text-primary)', textDecoration: 'none', transition: 'all 0.2s', fontWeight: isActive('/support') ? 600 : 400 }}>
                        <MessageSquare size={20} /> Support AI
                    </Link>
                </nav>

                <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '1rem', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', cursor: 'pointer', transition: 'all 0.2s', fontWeight: 600, width: '100%', justifyContent: 'center' }}>
                    <LogOut size={20} /> Sign Out
                </button>
            </aside>

            {/* Main Content */}
            <main style={{ flex: 1, padding: '3rem', overflowY: 'auto' }}>
                <Routes>
                    <Route path="/" element={<MyVisits lastLocation={lastLocation} />} />
                    <Route path="new-survey" element={<NewSurvey />} />
                    <Route path="support" element={<SupportAI />} />
                </Routes>
            </main>
        </div>
    )
}

export default AgentDashboard

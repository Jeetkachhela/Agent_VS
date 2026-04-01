import React, { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, LayersControl } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import api from '../utils/api'

// Custom marker icon based on agent role
const AGENT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6']

const agentIcon = (name, index) => {
    // Add small offset to index to handle "multiple agents in same area"
    const offset = 0.0001 * index
    const bgColor = AGENT_COLORS[index % AGENT_COLORS.length]
    
    return L.divIcon({
        className: 'custom-icon',
        html: `<div style="
            background: ${bgColor}; 
            color: white; 
            padding: 5px 10px; 
            border-radius: 20px; 
            font-size: 10px; 
            font-weight: 700;
            box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            border: 2px solid white;
            white-space: nowrap;
        ">${name}</div>`,
        iconSize: [60, 20],
        iconAnchor: [30, 20]
    })
}

// Automatically handle map sizing and re-centering
const MapController = ({ center, agents }) => {
    const map = useMap()
    
    // Robust resize observer for conditional rendering (React Router tabs)
    useEffect(() => {
        if (!map || !map.getContainer()) return;
        
        const observer = new ResizeObserver(() => {
            // Debounce invalidateSize to prevent infinite loops
            setTimeout(() => {
                if (map) map.invalidateSize()
            }, 50)
        })
        observer.observe(map.getContainer())
        return () => observer.disconnect()
    }, [map])

    // Fit bounds only when agents are first loaded
    const [initialFit, setInitialFit] = useState(false)
    useEffect(() => {
        if (agents && agents.length > 0 && !initialFit) {
            const bounds = L.latLngBounds(agents.map(a => [a.lat, a.lng]))
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 })
            setInitialFit(true)
        }
    }, [agents, map, initialFit])

    // Re-center when center prop changes (used for tracing)
    useEffect(() => {
        if (center && center[0] && center[1]) {
            map.setView(center, map.getBounds().contains(center) ? map.getZoom() : 15, { animate: true, duration: 1 })
        }
    }, [center, map])
    
    return null
}

const AgentMap = ({ selectedAgentId = null }) => {
    const [agents, setAgents] = useState([])
    const [history, setHistory] = useState([])
    const [center, setCenter] = useState([20.5937, 78.9629]) // Default India
    const [tracingAgentId, setTracingAgentId] = useState(selectedAgentId)

    useEffect(() => {
        const fetchActive = async () => {
            try {
                const res = await api.get('/locations/active')
                setAgents(res.data)
                if (res.data.length > 0 && !tracingAgentId && !selectedAgentId) {
                    setCenter([res.data[0].lat, res.data[0].lng])
                }
            } catch (err) {
                console.error(err)
            }
        }
        
        fetchActive()
        const interval = setInterval(fetchActive, 3000) // Poll every 3s for "Live" feel
        return () => clearInterval(interval)
    }, [tracingAgentId, selectedAgentId])

    useEffect(() => {
        let interval;
        if (tracingAgentId) {
            const fetchHistory = async () => {
                try {
                    const res = await api.get(`/locations/history/${tracingAgentId}`)
                    setHistory(res.data)
                    if (res.data.length > 0) {
                         const latest = res.data[res.data.length-1]
                         setCenter([latest.lat, latest.lng])
                    }
                } catch (err) {
                    console.error(err)
                }
            }
            fetchHistory()
            interval = setInterval(fetchHistory, 3000) // Sync trail polling to 3s
        } else {
            setHistory([])
        }
        return () => {
            if (interval) clearInterval(interval)
        }
    }, [tracingAgentId])

    return (
        <div style={{ height: '100%', width: '100%', borderRadius: '24px', overflow: 'hidden', border: '1px solid var(--border-color)', position: 'relative' }}>
            <div style={{ 
                position: 'absolute', 
                top: 20, 
                left: '50%', 
                transform: 'translateX(-50%)', 
                zIndex: 1000,
                background: 'var(--card-bg)',
                backdropFilter: 'blur(10px)',
                padding: '8px 16px',
                borderRadius: '30px',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#3b82f6',
                fontSize: '0.8rem',
                fontWeight: 600,
                boxShadow: '0 4px 15px rgba(0,0,0,0.5)'
            }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6', boxShadow: '0 0 10px #3b82f6' }}></div>
                LIVE SYNC ACTIVE • Refreshing every 3s
            </div>
            {tracingAgentId && (
                <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 1000 }}>
                    <button 
                        onClick={() => setTracingAgentId(null)}
                        style={{ background: '#ef4444', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        Stop Tracing
                    </button>
                </div>
            )}
            <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%', minHeight: '500px' }}>
                <LayersControl position="topright">
                    <LayersControl.BaseLayer checked name="OpenStreetMap (Standard)">
                        <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        />
                    </LayersControl.BaseLayer>
                    <LayersControl.BaseLayer name="World Imagery (Satellite)">
                        <TileLayer
                            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                            attribution='Tiles &copy; Esri'
                        />
                    </LayersControl.BaseLayer>
                    <LayersControl.BaseLayer name="CartoDB (Dark Mode)">
                        <TileLayer
                            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                        />
                    </LayersControl.BaseLayer>
                    <LayersControl.BaseLayer name="World Topographic">
                        <TileLayer
                            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}"
                            attribution='Tiles &copy; Esri'
                        />
                    </LayersControl.BaseLayer>
                </LayersControl>
                
                <MapController center={center} agents={agents} />

                {agents.map((agent, i) => (
                    <Marker 
                        key={agent.agent_id} 
                        position={[agent.lat + (0.0001 * i), agent.lng + (0.0001 * i)]} 
                        icon={agentIcon(agent.agent_name, i)}
                    >
                        <Popup>
                            <div style={{ color: 'black', textAlign: 'center' }}>
                                <strong style={{ fontSize: '1.1rem' }}>{agent.agent_name}</strong><br />
                                Updated: {new Date(agent.timestamp + (String(agent.timestamp).endsWith('Z') ? '' : 'Z')).toLocaleTimeString()}<br />
                                <button 
                                    onClick={() => setTracingAgentId(agent.agent_id)}
                                    style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', marginTop: '10px', width: '100%' }}
                                >
                                    Trace Route
                                </button>
                            </div>
                        </Popup>
                    </Marker>
                ))}

                {history.length > 1 && (
                    <Polyline 
                        positions={history.map(h => [h.lat, h.lng])} 
                        color="#3b82f6" 
                        weight={5} 
                        opacity={0.8}
                    />
                )}
            </MapContainer>
        </div>
    )
}

export default AgentMap

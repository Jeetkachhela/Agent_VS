import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Clock } from 'lucide-react';
import api from '../utils/api';

const NotificationBell = () => {
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const fetchNotifications = async () => {
        const user = JSON.parse(localStorage.getItem('user'))
        if (!user || user.role === 'AGENT') return; // Field agents do not have notification access
        
        try {
            const res = await api.get('/notifications/');
            setNotifications(res.data);
        } catch (err) {
            // Silently fail on 403 since it just means role scope leak during hot reload
            if (err.response && err.response.status !== 403) {
                console.error('Failed to fetch notifications', err);
            }
        }
    };

    useEffect(() => {
        fetchNotifications();
        // Poll every 10 seconds for real-time feel
        const interval = setInterval(fetchNotifications, 10000);
        return () => clearInterval(interval);
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const markAsRead = async (id, e) => {
        e.stopPropagation();
        try {
            await api.post(`/notifications/${id}/read`);
            setNotifications(notifications.filter(n => n.id !== id));
        } catch (err) {
            console.error('Failed to mark read', err);
        }
    };

    const timeAgo = (dateString) => {
        const diff = Math.floor((new Date() - new Date(dateString)) / 60000);
        if (diff < 1) return 'Just now';
        if (diff < 60) return `${diff}m ago`;
        if (diff < 1440) return `${Math.floor(diff/60)}h ago`;
        return `${Math.floor(diff/1440)}d ago`;
    };

    return (
        <div style={{ position: 'relative', zIndex: 9999 }} ref={dropdownRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    background: 'var(--input-bg)',
                    border: '1px solid var(--border-color)',
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    cursor: 'pointer',
                    color: 'var(--text-primary)' // hard override
                }}
            >
                <div style={{ display: 'flex' }}>
                    <Bell size={20} strokeWidth={2.5} />
                </div>
                {notifications.length > 0 && (
                    <span style={{
                        position: 'absolute',
                        top: '-2px',
                        right: '-2px',
                        background: '#ef4444',
                        color: 'white',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 0 0 2px var(--app-bg)'
                    }}>
                        {notifications.length > 9 ? '9+' : notifications.length}
                    </span>
                )}
            </button>

            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: '50px',
                    right: '0',
                    width: '320px',
                    background: 'var(--card-bg)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '16px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                    zIndex: 1000,
                    overflow: 'hidden',
                    animation: 'fadeIn 0.2s ease-out'
                }}>
                    <div style={{ padding: '1rem', borderBottom: '1px solid var(--input-bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4 style={{ margin: 0 }}>Notifications</h4>
                        <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>{notifications.length} unread</span>
                    </div>

                    <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                        {notifications.length === 0 ? (
                            <div style={{ padding: '3rem 1rem', textAlign: 'center', opacity: 0.5 }}>
                                <Bell size={32} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                                <p style={{ margin: 0 }}>You're all caught up!</p>
                            </div>
                        ) : (
                            notifications.map(n => (
                                <div key={n.id} style={{ 
                                    padding: '1rem', 
                                    borderBottom: '1px solid var(--border-color)',
                                    display: 'flex',
                                    gap: '12px',
                                    background: 'rgba(59, 130, 246, 0.05)',
                                    alignItems: 'flex-start',
                                    transition: 'background 0.2s'
                                }}>
                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6', marginTop: '6px', flexShrink: 0 }}></div>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', lineHeight: '1.4' }}>{n.message}</p>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.75rem', opacity: 0.5, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Clock size={12} /> {timeAgo(n.created_at)}
                                            </span>
                                            <button 
                                                onClick={(e) => markAsRead(n.id, e)}
                                                style={{ 
                                                    background: 'transparent', 
                                                    border: 'none', 
                                                    color: '#3b82f6', 
                                                    fontSize: '0.75rem', 
                                                    cursor: 'pointer',
                                                    padding: 0,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}
                                            >
                                                <Check size={12} /> Mark Read
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;

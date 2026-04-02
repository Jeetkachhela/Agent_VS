import axios from 'axios'

const rawBaseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
// Ensure no trailing slash (which can break some axios request concatenation)
const baseURL = rawBaseURL.endsWith('/') ? rawBaseURL.slice(0, -1) : rawBaseURL

const api = axios.create({
    baseURL
})

api.interceptors.request.use((config) => {
    try {
        const token = localStorage.getItem('token')
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
    } catch (e) {
        // Corrupted localStorage — clear it silently
        localStorage.removeItem('user')
        localStorage.removeItem('token')
    }
    return config
})

// Auto-redirect to login on 401 (expired/invalid token)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            localStorage.removeItem('user')
            localStorage.removeItem('token')
            if (window.location.pathname !== '/login') {
                window.location.href = '/login'
            }
        }
        return Promise.reject(error)
    }
)

export default api

import { useEffect, useState } from 'react'
import api from '../utils/api'

const useTracking = (isActive) => {
    const [lastLocation, setLastLocation] = useState(null)

    useEffect(() => {
        if (!isActive) return

        const updatePosition = async (position) => {
            const { latitude, longitude } = position.coords
            try {
                await api.post(`/locations/update?lat=${latitude}&lng=${longitude}`)
                setLastLocation({ lat: latitude, lng: longitude })
            } catch (err) {
                console.error('Tracking update failed', err)
            }
        }

        const handleError = (error) => {
            console.error('Geolocation error', error)
        }

        // Standard geolocation
        const watchId = navigator.geolocation.watchPosition(updatePosition, handleError, {
            enableHighAccuracy: true,
            maximumAge: 10000,
            timeout: 5000
        })

        return () => navigator.geolocation.clearWatch(watchId)
    }, [isActive])

    return lastLocation
}

export default useTracking

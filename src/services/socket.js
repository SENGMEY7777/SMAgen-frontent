import { io } from 'socket.io-client'
import { apiBaseUrl } from '@/services/api'
import { STORAGE_KEYS } from '@/config/constants'

/**
 * Creates and configures a Socket.IO client instance connected to the backend.
 */
export function createSocketClient() {
  const token = localStorage.getItem(STORAGE_KEYS.TOKEN) || ''
  if (!token) {
    return null
  }

  let socketUrl = window.location.origin
  if (apiBaseUrl.startsWith('http://') || apiBaseUrl.startsWith('https://')) {
    const parsed = new URL(apiBaseUrl)
    socketUrl = `${parsed.protocol}//${parsed.host}`
  }

  return io(socketUrl, {
    path: '/socket.io',
    auth: { token },
    transports: ['polling', 'websocket'],
    reconnectionAttempts: 2,
    timeout: 6000,
  })
}

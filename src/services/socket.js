import { io } from 'socket.io-client'
import { apiBaseUrl } from './api'
import { STORAGE_KEYS } from '../constants'

/**
 * Creates and configures a Socket.IO client instance connected to the backend.
 */
export function createSocketClient() {
  let socketUrl = window.location.origin
  if (apiBaseUrl.startsWith('http://') || apiBaseUrl.startsWith('https://')) {
    const parsed = new URL(apiBaseUrl)
    socketUrl = `${parsed.protocol}//${parsed.host}`
  }

  const token = localStorage.getItem(STORAGE_KEYS.TOKEN) || ''

  return io(socketUrl, {
    path: '/socket.io',
    auth: { token },
    transports: ['websocket', 'polling'],
  })
}

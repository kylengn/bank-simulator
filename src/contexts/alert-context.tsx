'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'

export interface Alert {
  id: string
  title?: string
  message: string
  type: 'error' | 'success' | 'warning' | 'info'
  duration?: number
}

interface AlertContextType {
  alerts: Alert[]
  showAlert: (alert: Omit<Alert, 'id'>) => void
  hideAlert: (id: string) => void
  clearAllAlerts: () => void
}

const AlertContext = createContext<AlertContextType | undefined>(undefined)

export function AlertProvider({ children }: { children: ReactNode }) {
  const [alerts, setAlerts] = useState<Alert[]>([])

  const showAlert = (alertData: Omit<Alert, 'id'>) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 11)
    const alert: Alert = { ...alertData, id }

    setAlerts(prev => [...prev, alert])

    const defaultDuration = alertData.type === 'error' ? 5000 : 3000
    const duration = alertData.duration ?? defaultDuration

    if (duration > 0) {
      setTimeout(() => {
        hideAlert(id)
      }, duration)
    }
  }

  const hideAlert = (id: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id))
  }

  const clearAllAlerts = () => {
    setAlerts([])
  }

  return (
    <AlertContext.Provider value={{ alerts, showAlert, hideAlert, clearAllAlerts }}>
      {children}
    </AlertContext.Provider>
  )
}

export function useAlert() {
  const context = useContext(AlertContext)
  if (context === undefined) {
    throw new Error('useAlert must be used within an AlertProvider')
  }
  return context
}

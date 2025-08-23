'use client'

import { useAlert } from '@/contexts/alert-context'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react'

export function GlobalAlertDialog() {
  const { alerts, hideAlert } = useAlert()

  const currentAlert = alerts[alerts.length - 1]

  if (!currentAlert) return null

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-6 w-6 text-green-600" />
      case 'error':
        return <XCircle className="h-6 w-6 text-red-600" />
      case 'warning':
        return <AlertTriangle className="h-6 w-6 text-yellow-600" />
      case 'info':
        return <Info className="h-6 w-6 text-blue-600" />
      default:
        return <Info className="h-6 w-6 text-gray-600" />
    }
  }

  const getTitle = (type: string, customTitle?: string) => {
    if (customTitle) return customTitle

    switch (type) {
      case 'success':
        return 'Success'
      case 'error':
        return 'Error'
      case 'warning':
        return 'Warning'
      case 'info':
        return 'Information'
      default:
        return 'Notification'
    }
  }

  return (
    <AlertDialog open={true} onOpenChange={() => hideAlert(currentAlert.id)}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {getIcon(currentAlert.type)}
            {getTitle(currentAlert.type, currentAlert.title)}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {currentAlert.message}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex justify-end">
          <AlertDialogAction onClick={() => hideAlert(currentAlert.id)}>
            OK
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}

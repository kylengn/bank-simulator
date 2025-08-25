'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { supabase } from '../../../utils/supabase/client'
import { toast } from 'sonner'

type Props = {
  runId: string
  onUploaded: (file: { url: string; mime: string; duration: number }) => void
  disabled?: boolean
}

export default function AudioRecorder({ runId, onUploaded, disabled = false }: Props) {
  const [rec, setRec] = useState<MediaRecorder | null>(null)
  const chunks = useRef<BlobPart[]>([])
  const startAt = useRef<number>(0)
  const [isRecording, setIsRecording] = useState<boolean>(false)


  async function start() {
    if (disabled) return

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      chunks.current = []
      recorder.ondataavailable = (e) => chunks.current.push(e.data)
      recorder.onstop = async () => {
        const blob = new Blob(chunks.current, { type: 'audio/webm' })
        const duration = Date.now() - startAt.current
        const filePath = `runs/${runId}/${Date.now()}.webm`

        const { error } = await supabase.storage
          .from('media')
          .upload(filePath, blob, { contentType: 'audio/webm', upsert: false })

        if (error) {
          console.error('Storage upload error:', error)
          toast.error('Failed to upload media', {
            description: `${error.message}. Please set up the 'media' storage bucket in Supabase.`
          })

          // Fallback: Create a blob URL for local playback
          const blobUrl = URL.createObjectURL(blob)
          onUploaded({ url: blobUrl, mime: 'audio/webm', duration })
          return
        }

        const { data } = supabase.storage.from('media').getPublicUrl(filePath)
        onUploaded({ url: data.publicUrl, mime: 'audio/webm', duration })
      }
      recorder.start()
      startAt.current = Date.now()
      setRec(recorder)
      setIsRecording(true)
    } catch (error) {
      toast.error('Failed to access microphone', {
        description: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  function stop() {
    rec?.stop()
    rec?.stream.getTracks().forEach((t) => t.stop())
    setIsRecording(false)
  }

  return (
    <Button
      variant={isRecording ? 'destructive' : 'secondary'}
      onClick={isRecording ? stop : start}
      disabled={disabled}
    >
      {isRecording ? 'Stop' : 'Record'}
    </Button>
  )

}
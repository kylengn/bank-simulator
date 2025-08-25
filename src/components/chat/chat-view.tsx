import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Message } from '@/lib/types'
import TtsToggle from './tts-toggle'
import MessageItem from './message-item'

interface ChatViewProps {
  messages: Message[]
  className?: string
}

export default function ChatView({ messages, className }: ChatViewProps) {
  const speakRef = useRef(false)
  const endRef = useRef<HTMLDivElement | null>(null)
  const lastSpokenMessageId = useRef<string | null>(null)

  function handleToggle(v: boolean) {
    speakRef.current = v
  }

  useEffect(() => {
    if (!speakRef.current) return
    const last = messages[messages.length - 1]
    if (last && last.role === 'customer' && last.content) {
      if (lastSpokenMessageId.current !== last.id) {
        lastSpokenMessageId.current = last.id
        // Add delay to prevent audio cutoff at the start
        setTimeout(() => {
          const u = new SpeechSynthesisUtterance(last.content)
          window.speechSynthesis.speak(u)
        }, 500)
      }
    }
  }, [messages])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex justify-end">
        <TtsToggle onChange={handleToggle} />
      </div>

      <div className="border rounded-md p-3 h-[50vh] overflow-y-auto space-y-3">
        {messages.map((m) => (
          <MessageItem key={m.id} message={m} />
        ))}
        <div ref={endRef} />
      </div>
    </div>
  )
}

'use client'

import React, { useState } from "react";
import { supabase } from "../../../utils/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import AudioRecorder from "./audio-recorder";

interface ComposerProps {
  runId: string;
  currentStep?: number;
  disabled?: boolean;
  onMessageSent?: (content: string, kind: 'text' | 'audio') => void;
  skipDirectInsert?: boolean;
}

export default function Composer({ runId, currentStep = 0, disabled = false, onMessageSent, skipDirectInsert = false }: ComposerProps) {
  const [text, setText] = useState<string>('');

  async function sendText() {
    if (!text.trim() || disabled) return

    const messageText = text
    setText('')

    if (skipDirectInsert) {
      onMessageSent?.(messageText, 'text')
      return
    }

    try {
      const response = await fetch(`/api/simulate/${runId}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: messageText,
          kind: 'text',
          step_no: currentStep
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send message')
      }

      toast.success('Message sent')
      onMessageSent?.(messageText, 'text')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error('Failed to send message', {
        description: errorMessage
      })
    }
  }

  async function handleAudioUploaded({ url, mime, duration }: { url: string, mime: string, duration: number }) {
    const { error } = await supabase.from('messages').insert([
      {
        run_id: runId,
        role: 'agent',
        content: 'Voice message',
        kind: 'audio',
        attachment_url: url,
        mime_type: mime,
        duration_ms: duration,
        step_no: currentStep
      }
    ])

    if (error) {
      toast.error('Failed to send audio message', {
        description: error.message
      })
      return
    }

    toast.success('Audio message sent')

    onMessageSent?.('Voice message', 'audio')
  }

  return (
    <div className="flex gap-2">
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={disabled ? "Disabled" : "Type a message..."}
        disabled={disabled}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            void sendText()
          }
        }}
      />
      <Button onClick={sendText} disabled={disabled || !text.trim()}>
        Send
      </Button>
      <AudioRecorder runId={runId} onUploaded={handleAudioUploaded} disabled={disabled} />
    </div>
  );
}

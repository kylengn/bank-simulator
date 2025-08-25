'use client'

import { useParams, useRouter } from "next/navigation"
import React, { useEffect, useMemo, useRef, useState } from "react"
import { supabase } from "../../../../utils/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Message, Run } from "@/lib/types"
import { getOpener } from "@/lib/flow"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import type { RealtimeChannel } from "@supabase/supabase-js"
import ChatView from "@/components/chat/chat-view"
import Composer from "@/components/chat/composer"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/components/auth/auth-provider"
import { Spinner } from "@/components/ui/spinner"
import { RotateCw } from "lucide-react"

export default function RunPage() {
  const { runId } = useParams() as { runId: string }
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [run, setRun] = useState<Run | null>(null)
  const [msgs, setMsgs] = useState<Message[]>([])
  const [input, setInput] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)
  const [sending, setSending] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [useMultimediaInput, setUseMultimediaInput] = useState<boolean>(false)

  const seedingRef = useRef<boolean>(false)

  const msgMapRef = useRef<Map<string, Message>>(new Map())

  function rebuildFromMap() {
    const list = Array.from(msgMapRef.current.values())
    list.sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? ''))
    setMsgs(list)
  }

  function upsertMessages(newMsgs: Message | Message[]) {
    const arr = Array.isArray(newMsgs) ? newMsgs : [newMsgs]
    for (const m of arr) {
      if (!m?.id) continue
      msgMapRef.current.set(m.id, m)
    }
    rebuildFromMap()
  }

  const currentStep = useMemo(() => {
    const withStep = msgs.filter((m) => typeof m.step_no === 'number') as Array<Message & { step_no: number }>
    if (withStep.length === 0) return 0
    return Math.max(...withStep.map((m) => m.step_no))
  }, [msgs])

  useEffect(() => {
    if (authLoading || !user) {
      if (!authLoading && !user) {
        router.replace('/auth')
      }
      return
    }

    ; (async () => {
      seedingRef.current = false


      const { data: runData, error: runErr } = await supabase
        .from('runs')
        .select('id, persona, scenario, status, started_at')
        .eq('id', runId)
        .single()

      if (runErr) {
        setError(runErr.message)
        toast.error('Run failed')
        setLoading(false)
        return
      }
      setRun(runData as Run)


      const { data: msgData, error: msgErr } = await supabase
        .from('messages')
        .select('id, run_id, role, content, step_no, created_at')
        .eq('run_id', runId)
        .order('created_at', { ascending: true })

      if (msgErr) {
        setError(msgErr.message)
        setLoading(false)
        return
      }


      if (!msgData || msgData.length === 0) {
        if (!seedingRef.current) {
          seedingRef.current = true
          await seedConversation(runData as Run)

          const { data: seedData } = await supabase
            .from('messages')
            .select('id, run_id, role, content, step_no, created_at')
            .eq('run_id', runId)
            .order('created_at', { ascending: true })
          setMsgs((seedData ?? []) as Message[])
          msgMapRef.current.clear()
            ; (seedData ?? []).forEach((m: Message) => msgMapRef.current.set(m.id, m))
          rebuildFromMap()
          seedingRef.current = false
        }
      } else {
        setMsgs(msgData as Message[])
        msgMapRef.current.clear()
          ; (msgData ?? []).forEach((m: Message) => msgMapRef.current.set(m.id, m))
        rebuildFromMap()
      }

      setLoading(false)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId, user, authLoading])

  useEffect(() => {
    if (!runId) return
    const channel: RealtimeChannel = supabase.channel(`run-${runId}`)

    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `run_id=eq.${runId}` },
      (payload) => {
        const m = payload.new as Message
        upsertMessages(m)
      }
    )

    channel.on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'runs', filter: `id=eq.${runId}` },
      (payload) => {
        const next = payload.new as Partial<Run>
        setRun((prev) => (prev ? { ...prev, ...next } as Run : prev))
      }
    )

    channel.subscribe()

    return () => {
      channel.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId])


  async function seedConversation(r: Run) {
    const { data: existingMsgs } = await supabase
      .from('messages')
      .select('id')
      .eq('run_id', r.id)
      .limit(1)

    if (existingMsgs && existingMsgs.length > 0) {
      return
    }

    const opener = getOpener(r.scenario)
    const { error } = await supabase.from('messages').insert([
      { run_id: r.id, role: 'system', content: 'Simulation started', step_no: 0 },
      { run_id: r.id, role: 'customer', content: opener, step_no: 0 },
    ])
    if (error) setError(error.message)
  }


  async function sendMessage(messageText: string) {
    if (!messageText.trim() || !run || sending) return
    setSending(true)
    setError(null)

    try {
      const response = await fetch(`/api/simulate/${run.id}/message`, {
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

      if (result.agentMessage) {
        upsertMessages(result.agentMessage as Message)
      }
      if (result.customerMessage) {
        upsertMessages(result.customerMessage as Message)
      }

      if (result.flowResult && result.flowResult.isDone) {
        setRun(prev => prev ? { ...prev, status: 'ended' } : prev)
        toast.success('Simulation complete')
      }

      setInput('')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setError(errorMessage)
      toast.error('Send failed', {
        description: errorMessage
      })
    } finally {
      setSending(false)
    }
  }

  async function send() {
    await sendMessage(input.trim())
  }


  async function handleComposerMessage(content: string, kind: 'text' | 'audio') {
    if (kind === 'audio') {
      return
    }

    await sendMessage(content)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void send()
    }
  }

  async function endRunManually() {
    if (!run) return
    const { error } = await supabase
      .from('runs')
      .update({ status: 'ended', ended_at: new Date().toISOString() })
      .eq('id', run.id)

    if (error) {
      setError(error.message)
      toast.error('Failed to end run')
      return
    }

    setRun({ ...run, status: 'ended' })
    toast.success('Run ended')
  }

  if (authLoading || loading) {
    return (
      <Spinner />
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="container mx-auto p-6">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Simulation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <div className="text-sm text-red-600">{error}</div>}

          {!loading && run && (
            <>
              <div className="text-sm text-muted-foreground">
                <div className="flex flex-wrap items-center gap-2">
                  <span>Run:</span>
                  <span className="font-mono">{run.id}</span>
                  <Separator orientation="vertical" className="h-4" />
                  <span>{run.persona}</span>
                  <Separator orientation="vertical" className="h-4" />
                  <span>{run.scenario}</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      onClick={() => router.push('/simulate')}
                      title="Pick a new persona/scenario"
                    >
                      New simulation
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={endRunManually}
                      disabled={run.status === 'ended'}
                      title="Mark this simulation as ended"
                    >
                      End run
                    </Button>
                  </div>
                  <Badge variant={run.status === 'ended' ? 'destructive' : 'default'} className={cn('rounded-full text-[10px] h-fit py-1 px-1.5 font-semibold', run.status !== 'ended' && "animate-pulse")}>
                    {run.status.toUpperCase()}
                  </Badge>
                </div>

              </div>

              <ChatView messages={msgs} />

              <div className="space-y-3">
                <div className="text-xs text-muted-foreground">
                  You&apos;re on <strong>step {currentStep}</strong>. Hint: use keywords defined for this step in the rules.
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="multimedia-input"
                      checked={useMultimediaInput}
                      onCheckedChange={setUseMultimediaInput}
                      disabled={run?.status === 'ended'}
                    />
                    <Label htmlFor="multimedia-input" className="text-sm">
                      {useMultimediaInput ? 'Multimedia input (text + audio)' : 'Simple text input'}
                    </Label>
                  </div>
                </div>

                {useMultimediaInput ? (
                  <div className="space-y-2">
                    <Composer
                      runId={runId}
                      currentStep={currentStep}
                      disabled={run?.status === 'ended'}
                      onMessageSent={handleComposerMessage}
                      skipDirectInsert={true}
                    />
                    <div className="flex justify-start">
                      <Button
                        variant="secondary"
                        onClick={() => window.location.reload()}
                        title="Quick reset if the UI gets out of sync"
                      >
                        <RotateCw className="h-4 w-4" />
                        <span>Refresh</span>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <Textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={
                        run?.status === 'ended'
                          ? 'Run has ended. Start a new simulation to continue.'
                          : 'Type your reply… (Enter to send, Shift+Enter for a new line)'
                      }
                      onKeyDown={onKeyDown}
                      disabled={run?.status === 'ended'}
                    />

                    <div className="flex gap-2">
                      <Button onClick={send} disabled={sending || !input.trim() || run?.status === 'ended'}>
                        {sending ? 'Sending…' : 'Send'}
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => window.location.reload()}
                        title="Quick reset if the UI gets out of sync"
                      >
                        <RotateCw className="h-4 w-4" />
                        <span>Refresh</span>
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

'use client'

import { useParams, useRouter } from "next/navigation"
import React, { useEffect, useMemo, useRef, useState } from "react"
import { supabase } from "../../../../utils/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Message, Run } from "@/lib/types"
import { evaluateNext, getOpener } from "@/lib/flow"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export default function RunPage() {
  const { runId } = useParams() as { runId: string }
  const router = useRouter()
  const [run, setRun] = useState<Run | null>(null)
  const [msgs, setMsgs] = useState<Message[]>([])
  const [input, setInput] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)
  const [sending, setSending] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const endRef = useRef<HTMLDivElement | null>(null)
  const seedingRef = useRef<boolean>(false)
  const scrollToBottom = () => endRef.current?.scrollIntoView({ behavior: 'smooth' })

  const currentStep = useMemo(() => {
    const withStep = msgs.filter((m) => typeof m.step_no === 'number') as Array<Message & { step_no: number }>
    if (withStep.length === 0) return 0
    return Math.max(...withStep.map((m) => m.step_no))
  }, [msgs])

  useEffect(() => {
    ; (async () => {
      seedingRef.current = false

      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) {
        router.replace('/auth')
        return
      }


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
          seedingRef.current = false
        }
      } else {
        setMsgs(msgData as Message[])
      }

      setLoading(false)
      setTimeout(scrollToBottom, 0)
    })()
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


  async function send() {
    const text = input.trim()
    if (!text || !run || sending) return
    setSending(true)
    setError(null)

    const { error: insErr } = await supabase.from('messages').insert([
      { run_id: run.id, role: 'agent', content: text, step_no: currentStep }
    ])
    if (insErr) {
      setError(insErr.message)
      toast.error('Send failed')
      setSending(false)
      return
    }

    const { reply, nextStep, isDone } = evaluateNext({
      scenario: run.scenario,
      currentStep,
      agentText: text,
    })

    const { error: custErr } = await supabase.from('messages').insert([
      { run_id: run.id, role: 'customer', content: reply, step_no: nextStep }
    ])
    if (custErr) {
      setError(custErr.message)
      toast.error('Customer reply failed')
      setSending(false)
      return
    }

    if (isDone) {
      await supabase
        .from('runs')
        .update({ status: 'ended', ended_at: new Date().toISOString() })
        .eq('id', run.id)

      toast.success('Simulation complete')
    }

    const { data: newMsgs, error: reloadErr } = await supabase
      .from('messages')
      .select('id, run_id, role, content, step_no, created_at')
      .eq('run_id', run.id)
      .order('created_at', { ascending: true })

    if (reloadErr) {
      setError(reloadErr.message)
      toast.error('Reload failed')
    }
    setMsgs((newMsgs ?? []) as Message[])

    setInput('')
    setSending(false)
    setTimeout(scrollToBottom, 0)
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


  return (
    <div className="container mx-auto p-6">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Simulation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <div className="text-sm text-red-600">{error}</div>}
          {loading && (
            <div className="space-y-2">
              <Skeleton className="h-4 w-52" />
              <Skeleton className="h-72 w-full" />
            </div>
          )}

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

              <div className="border rounded-lg p-3 h-[50vh] overflow-y-auto space-y-3">
                {msgs.map((m) => (
                  <div
                    key={m.id}
                    className={[
                      'rounded-md p-3 text-sm',
                      m.role === 'agent' ? 'bg-primary/10 ml-auto max-w-[80%]' : '',
                      m.role === 'customer' ? 'bg-muted max-w-[80%]' : '',
                      m.role === 'system' ? 'bg-accent/20 text-muted-foreground text-xs text-center' : '',
                    ].join(' ')}
                    style={{ wordBreak: 'break-word' }}
                  >
                    {m.role !== 'system' && (
                      <div className="text-[10px] uppercase tracking-wide mb-1 text-muted-foreground">
                        {m.role} {typeof m.step_no === 'number' ? `(step ${m.step_no})` : ''}
                      </div>
                    )}
                    <div className={m.role === 'system' ? 'italic' : ''}>{m.content}</div>
                  </div>
                ))}
                <div ref={endRef} />
              </div>

              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">
                  You’re on <strong>step {currentStep}</strong>. Hint: use keywords defined for this step in the rules.
                </div>
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
                    Refresh
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

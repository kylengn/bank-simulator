'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { supabase } from '../../../utils/supabase/client'
import { Message, Run } from '@/lib/types'

export default function DebugPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [runs, setRuns] = useState<Run[]>([])
  const [selectedRun, setSelectedRun] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loadingRuns, setLoadingRuns] = useState(false)
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ; (async () => {
      const { data } = await supabase.auth.getUser()
      setUserEmail(data.user?.email ?? null)
      await loadRuns()
    })()
  }, [])

  async function loadRuns() {
    setLoadingRuns(true)
    setError(null)
    const { data, error } = await supabase
      .from('runs')
      .select('id, persona, scenario, status, started_at')
      .order('started_at', { ascending: false })
    if (error) setError(error.message)
    setRuns(data ?? [])
    setLoadingRuns(false)
  }

  async function loadMessages(runId: string) {
    setLoadingMsgs(true)
    setError(null)
    const { data, error } = await supabase
      .from('messages')
      .select('id, role, content, created_at')
      .eq('run_id', runId)
      .order('created_at', { ascending: true })
    if (error) setError(error.message)
    setMessages(data ?? [])
    setSelectedRun(runId)
    setLoadingMsgs(false)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Debug / Preview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>Signed in as: {userEmail ?? 'not signed in (go to /auth)'}</div>
          <div className="flex gap-2">
            <Button onClick={loadRuns} disabled={loadingRuns}>
              {loadingRuns ? 'Loading runs…' : 'Refresh Runs'}
            </Button>
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Your Runs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {runs.length === 0 && (
              <div className="text-sm text-muted-foreground">
                No runs yet. Insert one in Supabase Table Editor or wait for Step 4.
              </div>
            )}
            {runs.map((r) => (
              <div key={r.id} className="flex items-start justify-between border rounded-lg p-3">
                <div>
                  <div className="font-medium">{r.persona}</div>
                  <div className="text-sm text-muted-foreground">{r.scenario}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(r.started_at).toLocaleString()}
                  </div>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => loadMessages(r.id)}
                  disabled={loadingMsgs && selectedRun === r.id}
                >
                  {loadingMsgs && selectedRun === r.id ? 'Loading…' : 'View messages'}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Messages {selectedRun ? `for ${selectedRun}` : ''}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {selectedRun == null && (
              <div className="text-sm text-muted-foreground">Select a run to see messages.</div>
            )}
            {messages.map((m) => (
              <div key={m.id} className="rounded-lg border p-3">
                <div className="text-xs uppercase tracking-wide">{m.role}</div>
                <div className="whitespace-pre-wrap">{m.content}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {new Date(m.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

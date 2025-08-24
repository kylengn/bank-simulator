'use client'

import { PERSONAS, SCENARIOS } from "@/lib/personas";
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { supabase } from "../../../utils/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export default function SimulatePickerPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [persona, setPersona] = useState<string>(PERSONAS[0])
  const [scenario, setScenario] = useState<string>(SCENARIOS[0])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ; (async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) {
        router.replace('/auth')
        return
      }
      setUserId(data.user.id)
    })()
  }, [router])

  function randomize() {
    const p = PERSONAS[Math.floor(Math.random() * PERSONAS.length)]
    const s = SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)]
    setPersona(p)
    setScenario(s)
  }

  async function startSimulation() {
    if (!userId) {
      setError('You are not signed in. Redirecting to /auth...')
      router.replace('/auth')
      return
    }
    setLoading(true)
    setError(null)

    const { data, error } = await supabase
      .from('runs')
      .insert([
        {
          user_id: userId,
          persona,
          scenario,
          status: 'active'
        }
      ])
      .select('id')
      .single()

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push(`/simulate/${data.id}`)
  }

  return (
    <div className="container mx-auto p-6">
      <Card className="max-w-xl mx-auto">
        <CardHeader>
          <CardTitle>Start a new simulation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Persona</Label>
            <Select value={persona} onValueChange={setPersona}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a persona" />
              </SelectTrigger>
              <SelectContent>
                {PERSONAS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Scenario</Label>
            <Select value={scenario} onValueChange={setScenario}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a scenario" />
              </SelectTrigger>
              <SelectContent>
                {SCENARIOS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}

          <div className="flex gap-2">
            <Button variant="secondary" onClick={randomize}>Randomize</Button>
            <Button variant="secondary" onClick={startSimulation} disabled={loading}>
              {loading ? 'Starting...' : 'Start new simulation'}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Tip: RLS is on. You must be signed in; the insert includes your <code>user_id</code>.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
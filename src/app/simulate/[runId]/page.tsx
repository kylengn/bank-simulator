'use client'

import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { createClient } from "../../../../utils/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Run } from "@/lib/types"

export default function RunPage() {
  const params = useParams() as { runId: string }
  const runId = params.runId
  const [run, setRun] = useState<Run | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ; (async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('runs')
        .select('id, persona, scenario, status, started_at')
        .eq('id', runId)
        .single()

      if (error) setError(error.message)
      setRun(data)
    })()
  }, [runId])


  return (
    <div className="container mx-auto p-6">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Simulation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {error && <div className="text-sm text-red-600">{error}</div>}
          {!run && !error && <div>Loading run…</div>}
          {run && (
            <>
              <div className="text-sm text-muted-foreground">Run ID: {run.id}</div>
              <div className="text-lg font-semibold">{run.persona}</div>
              <div className="text-base">{run.scenario}</div>
              <div className="text-xs text-muted-foreground">
                {new Date(run.started_at).toLocaleString()} • {run.status}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

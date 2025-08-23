'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

import { SCENARIOS } from '@/lib/personas'
import { SCENARIO_FLOWS, evaluateNext, getOpener } from '@/lib/flow'

export default function RulesDebugPage() {
  const [scenario, setScenario] = useState<(typeof SCENARIOS)[number]>(SCENARIOS[0])
  const [step, setStep] = useState(0)
  const [agentText, setAgentText] = useState('')
  const [log, setLog] = useState<string[]>([`customer: ${getOpener(scenario)}`])

  function reset() {
    setStep(0)
    setAgentText('')
    setLog([`customer: ${getOpener(scenario)}`])
  }

  function tryMessage() {
    if (!agentText.trim()) return
    const res = evaluateNext({ scenario, currentStep: step, agentText })
    setLog((prev) => [
      ...prev,
      `agent: ${agentText}`,
      `customer: ${res.reply}`,
      res.isDone ? '(done)' : `(next step: ${res.nextStep})`,
    ])
    setStep(res.nextStep)
    setAgentText('')
  }

  return (
    <div className="container mx-auto p-6 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>Rules Engine Playground</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Scenario</Label>
            <Select
              value={scenario}
              onValueChange={(v) => {
                setScenario(v as keyof typeof SCENARIO_FLOWS)
                setStep(0)
                setLog([`customer: ${getOpener(v as keyof typeof SCENARIO_FLOWS)}`])
                setAgentText('')
              }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SCENARIOS.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Your next message</Label>
            <Textarea
              value={agentText}
              onChange={(e) => setAgentText(e.target.value)}
              placeholder="Type what you'd say to the customer…"
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={tryMessage}>Send</Button>
            <Button variant="secondary" onClick={reset}>Reset</Button>
          </div>

          <div className="space-y-2">
            <Label>Conversation log</Label>
            <div className="border rounded p-3 text-sm whitespace-pre-wrap">
              {log.join('\n')}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

import { SCENARIOS } from './personas'

export type Run = {
  id: string
  persona: string
  scenario: typeof SCENARIOS[number]
  status: 'active' | 'ended' | 'aborted'
  started_at: string
}

export type Message = {
  id: string
  run_id: string
  role: 'agent' | 'customer' | 'system'
  content: string
  step_no: number | null
  created_at: string
  // Multimedia fields (optional for backward compatibility)
  kind?: 'text' | 'audio' | 'video'
  attachment_url?: string
  mime_type?: string
  duration_ms?: number
}

export type Run = {
  id: string
  persona: string
  scenario: string
  status: string
  started_at: string
}

export type Message = {
  id: string
  role: 'agent' | 'customer' | 'system'
  content: string
  created_at: string
}

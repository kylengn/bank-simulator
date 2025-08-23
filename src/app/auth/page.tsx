'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '../../../utils/supabase/client'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    setLoading(true)
    const { error } = await createClient().auth.signInWithOtp({ email })
    if (error) alert(error.message)
    else alert('Check your email for the login link!')
    setLoading(false)
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle>Sign In</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Enter your email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button className="w-full" onClick={handleLogin} disabled={loading}>
            {loading ? 'Sending...' : 'Send Magic Link'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

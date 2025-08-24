'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '../../../utils/supabase/client'
import { useAlert } from '@/contexts/alert-context'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const { showAlert } = useAlert()

  async function handleLogin() {
    if (!email.trim()) {
      showAlert({
        type: 'warning',
        title: 'Invalid Email',
        message: 'Please enter a valid email address'
      })
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    })

    if (error) {
      showAlert({
        type: 'error',
        title: 'Authentication Error',
        message: error.message
      })
    } else {
      showAlert({
        type: 'success',
        title: 'Magic Link Sent',
        message: 'Check your email for the login link!'
      })
    }
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

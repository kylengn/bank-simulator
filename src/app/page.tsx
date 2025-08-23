'use client'

import { Button } from '@/components/ui/button'
import { createClient } from '../../utils/supabase/client'

export default function Home() {
  async function handleSignOut() {
    await createClient().auth.signOut()
    window.location.reload()
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-2xl font-bold">Welcome to BankSim</h1>
      <Button onClick={handleSignOut} className="mt-4">
        Sign Out
      </Button>
    </main>
  )
}

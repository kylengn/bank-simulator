'use client'

import { useAuth } from '@/components/auth/auth-provider'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function Home() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      router.replace('/simulate')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <Spinner />
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold">Welcome to Bank Simulator</h1>
        <p className="text-xl text-gray-600 max-w-2xl">
          Experience realistic banking scenarios and interactions in a safe, simulated environment.
        </p>
        <Button
          onClick={() => router.push('/auth')}
          className="mt-8 rounded"
        >
          Get Started
        </Button>
      </div>
    </main>
  )
}

'use client'

import { useAuth } from './auth-provider'
import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { LogIn, LogOut, User } from 'lucide-react'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'

export function AuthHeader() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  if (pathname.startsWith('/auth')) {
    return null
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      toast.success('Signed out successfully')
      router.push('/auth')
    } catch (error) {
      toast.error('Error signing out')
      console.error('Sign out error:', error)
    }
  }

  if (loading) {
    return (
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold">Bank Simulator</h1>
            </div>
            <div className='flex gap-2'>
              <Skeleton className="h-8 w-40 animate-pulse rounded" />
              <Skeleton className="h-8 w-24 animate-pulse rounded" />
            </div>
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold">Bank Simulator</h1>
          </div>

          {user ? (
            <div className="flex items-center space-x-4">
              <Card className="hidden md:block px-3 py-1.5 rounded">
                <div className="flex items-center space-x-2 text-sm">
                  <User className="h-4 w-4" />
                  <span>{user.email}</span>
                </div>
              </Card>
              <Button
                variant="default"
                size="sm"
                onClick={handleSignOut}
                className="flex items-center rounded"
              >
                <LogOut className="h-4 w-4" />
                <span className='hidden md:block'>Sign Out</span>
              </Button>
            </div>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={() => router.push('/auth')}
              className="flex items-center rounded"
            >
              <LogIn className="h-4 w-4" />
              Sign In
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}

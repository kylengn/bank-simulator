'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function AuthCodeError() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle className="text-red-600">Authentication Error</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            {`Sorry, we couldn't sign you in. The link you clicked may be invalid or expired.`}
          </p>
          <Link href="/auth">
            <Button className="w-full">
              Try Again
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}

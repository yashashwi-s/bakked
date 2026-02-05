'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Input, Button } from '@/components/ui'
import { isAuthenticated, setSession } from '@/lib/utils'

// Warm up the backend on page load (reduces cold start)
const warmupBackend = () => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  fetch(`${apiUrl}/`).catch(() => {}) // Fire and forget
}

export default function LoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)

  // Check if already authenticated + warm up backend
  useEffect(() => {
    warmupBackend() // Start warming up immediately
    
    if (isAuthenticated()) {
      router.replace('/dashboard')
    } else {
      setChecking(false)
    }
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Call backend to verify password
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      const data = await res.json()

      if (data.valid) {
        setSession()
        router.replace('/dashboard')
      } else {
        setError('Invalid password')
      }
    } catch {
      setError('Connection error')
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Bakked</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter password to continue
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={error}
            autoFocus
          />
          
          <Button
            type="submit"
            disabled={!password || loading}
            className="w-full"
          >
            {loading ? 'Verifying...' : 'Continue'}
          </Button>
        </form>
      </div>
    </div>
  )
}

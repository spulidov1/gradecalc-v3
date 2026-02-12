'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setMessage(error.message)
      } else {
        router.push('/calculator')
      }
    } else if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setMessage(error.message)
      } else {
        setMessage('Check your email to confirm your account')
      }
    } else if (mode === 'reset') {
      const { error } = await supabase.auth.resetPasswordForEmail(email)
      if (error) {
        setMessage(error.message)
      } else {
        setMessage('Check your email for reset instructions')
        setMode('signin')
      }
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-bg">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="font-display text-6xl font-black text-accent uppercase tracking-wider mb-2">
            Grade Calc
          </h1>
          <p className="font-mono text-xs text-text3 uppercase tracking-widest">
            Invert · Slope · Structure
          </p>
        </div>

        {/* Form */}
        <div className="bg-surface2 border border-border rounded-lg p-8">
          <h2 className="font-display text-2xl font-bold text-text uppercase tracking-wide mb-6">
            {mode === 'signin' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Reset Password'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-mono text-xs text-text3 uppercase tracking-wider mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-surface border-2 border-border rounded-md px-4 py-3 text-text font-mono focus:border-accent focus:outline-none transition-colors"
                placeholder="you@example.com"
                required
              />
            </div>

            {mode !== 'reset' && (
              <div>
                <label className="block font-mono text-xs text-text3 uppercase tracking-wider mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-surface border-2 border-border rounded-md px-4 py-3 text-text font-mono focus:border-accent focus:outline-none transition-colors"
                  placeholder="••••••••"
                  required
                />
              </div>
            )}

            {message && (
              <div className={`p-3 rounded-md text-sm font-mono ${
                message.includes('error') || message.includes('Invalid') 
                  ? 'bg-accent-red/10 border border-accent-red/50 text-accent-red' 
                  : 'bg-accent-green/10 border border-accent-green/50 text-accent-green'
              }`}>
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent hover:bg-accent/90 disabled:bg-surface2 disabled:text-text3 text-black font-display text-lg font-black uppercase tracking-wide py-3 rounded-md transition-colors"
            >
              {loading ? 'Loading...' : mode === 'signin' ? 'Sign In' : mode === 'signup' ? 'Sign Up' : 'Send Reset Link'}
            </button>
          </form>

          {/* Links */}
          <div className="mt-6 space-y-2 text-center">
            {mode === 'signin' && (
              <>
                <button
                  onClick={() => setMode('signup')}
                  className="block w-full text-sm font-mono text-text2 hover:text-accent transition-colors"
                >
                  Don't have an account? <span className="font-bold text-accent">Sign Up</span>
                </button>
                <button
                  onClick={() => setMode('reset')}
                  className="block w-full text-sm font-mono text-text2 hover:text-accent transition-colors"
                >
                  Forgot password?
                </button>
              </>
            )}
            {mode === 'signup' && (
              <button
                onClick={() => setMode('signin')}
                className="block w-full text-sm font-mono text-text2 hover:text-accent transition-colors"
              >
                Already have an account? <span className="font-bold text-accent">Sign In</span>
              </button>
            )}
            {mode === 'reset' && (
              <button
                onClick={() => setMode('signin')}
                className="block w-full text-sm font-mono text-text2 hover:text-accent transition-colors"
              >
                Back to <span className="font-bold text-accent">Sign In</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

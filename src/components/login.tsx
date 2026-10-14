import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase'

const CODE_LENGTH = 6
const EMAIL_KEY = 'pisada:last-email'

function rememberedEmail() {
  try {
    return localStorage.getItem(EMAIL_KEY) ?? ''
  } catch {
    return ''
  }
}

// Two steps: type your email -> get a 6-digit code by email -> type the code.
export function Login() {
  const [email, setEmail] = useState(rememberedEmail)
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault()
    setBusy(true)
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim() })
    setBusy(false)
    if (error) {
      toast.error(error.message)
      return
    }
    try {
      localStorage.setItem(EMAIL_KEY, email.trim())
    } catch {
      // Not important: it only pre-fills the email next time
    }
    setCode('')
    setStep('code')
    toast.success('Code sent. Check your email.')
  }

  async function verify(token: string) {
    setBusy(true)
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token,
      type: 'email',
    })
    setBusy(false)
    if (error) {
      toast.error(error.message)
      setCode('')
    }
    // On success, useSession() sees the new session and the app switches screens
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col justify-center p-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Pisada</CardTitle>
          <CardDescription>
            {step === 'email'
              ? 'Log in with a code sent to your email.'
              : `Enter the ${CODE_LENGTH}-digit code sent to ${email.trim()}.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'email' ? (
            <form onSubmit={sendCode} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11"
                />
              </div>
              <Button type="submit" size="lg" className="h-11" disabled={busy}>
                {busy ? 'Sending…' : 'Send code'}
              </Button>
            </form>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <InputOTP
                maxLength={CODE_LENGTH}
                value={code}
                onChange={setCode}
                onComplete={verify}
                disabled={busy}
                autoFocus
                inputMode="numeric"
                autoComplete="one-time-code"
              >
                <InputOTPGroup>
                  {Array.from({ length: CODE_LENGTH }, (_, i) => (
                    <InputOTPSlot key={i} index={i} className="size-11 text-lg" />
                  ))}
                </InputOTPGroup>
              </InputOTP>
              <div className="flex w-full justify-between">
                <Button variant="ghost" onClick={() => setStep('email')} disabled={busy}>
                  Change email
                </Button>
                <Button variant="ghost" onClick={() => sendCode()} disabled={busy}>
                  Send a new code
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  )
}

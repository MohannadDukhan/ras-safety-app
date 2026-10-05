import { useState, type SubmitEvent } from 'react'
import { supabase } from './supabase'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) {
        setErrorMessage(
          error.code === 'invalid_credentials'
            ? 'Email or password is incorrect.'
            : 'Sign-in failed. Please try again or contact your administrator.',
        )
      } else {
        setPassword('')
      }
    } catch {
      setErrorMessage('Unable to connect. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <p className="entry-description">Sign in with your RAS account.</p>
      <form className="login-form" onSubmit={handleSubmit} aria-busy={isSubmitting}>
        <fieldset disabled={isSubmitting}>
          <div className="form-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="form-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          {errorMessage && <p className="error-message" role="alert">{errorMessage}</p>}
          <button className="app-button" type="submit">
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </fieldset>
      </form>
    </>
  )
}

export default LoginForm

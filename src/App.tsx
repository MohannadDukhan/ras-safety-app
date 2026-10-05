import { useEffect, useState } from 'react'
import rasLogo from './assets/ras-logo.webp'
import LoginForm from './LoginForm'
import FramerHome from './FramerHome'
import { supabase } from './supabase'
import './App.css'

type Profile = {
  full_name: string
  role: 'admin' | 'framer'
}

function App() {
  // undefined means Supabase has not restored the initial session yet.
  const [userId, setUserId] = useState<string | null | undefined>(undefined)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [logoutError, setLogoutError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    let previousUserId: string | null | undefined

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!active) return

        const nextUserId = session?.user.id ?? null
        if (nextUserId !== previousUserId) {
          previousUserId = nextUserId
          setProfile(null)
          setProfileError(null)
          setLogoutError(null)
        }
        setUserId(nextUserId)
      },
    )

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!userId) return

    let cancelled = false

    async function loadProfile() {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, role')
          .eq('id', userId)
          .maybeSingle()

        if (cancelled) return

        if (error) {
          setProfileError('Unable to load your profile. Please log out and try signing in again.')
        } else if (!data) {
          setProfileError('Your account has no application profile. Contact your administrator.')
        } else if (data.role !== 'admin' && data.role !== 'framer') {
          setProfileError('Your account has an unsupported role. Contact your administrator.')
        } else {
          setProfile({ full_name: data.full_name, role: data.role })
        }
      } catch {
        if (!cancelled) {
          setProfileError('Unable to load your profile. Please log out and try signing in again.')
        }
      }
    }

    void loadProfile()

    return () => {
      cancelled = true
    }
  }, [userId])

  async function handleLogout() {
    setIsSigningOut(true)
    setLogoutError(null)

    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' })
      if (error) setLogoutError('Unable to log out. Please try again.')
    } catch {
      setLogoutError('Unable to log out. Please try again.')
    } finally {
      setIsSigningOut(false)
    }
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-content">
          <img className="ras-logo" src={rasLogo} alt="RAS" />
          <span className="company-name">Ron Anderson &amp; Sons</span>
        </div>
      </header>

      <main className="app-main">
        <section className="entry-panel" aria-labelledby="app-title">
          <p className="entry-label">Safety on every site</p>
          <h1 id="app-title">RAS Site Safety</h1>

          {userId === undefined ? (
            <p role="status">Checking your session...</p>
          ) : userId === null ? (
            <LoginForm />
          ) : (
            <>
              {profileError ? (
                <p className="error-message" role="alert">{profileError}</p>
              ) : profile ? (
                <>
                  <p className="role-label">{profile.role === 'admin' ? 'Admin' : 'Framer'}</p>
                  <h2>Welcome, {profile.full_name}</h2>
                  {profile.role === 'admin' ? (
                    <p className="entry-description">Admin dashboard coming next</p>
                  ) : (
                    <FramerHome key={userId} userId={userId} />
                  )}
                </>
              ) : (
                <p role="status">Loading your profile...</p>
              )}

              {logoutError && <p className="error-message" role="alert">{logoutError}</p>}
              <button
                className="app-button logout-button"
                type="button"
                onClick={handleLogout}
                disabled={isSigningOut}
              >
                {isSigningOut ? 'Logging out...' : 'Log out'}
              </button>
            </>
          )}
        </section>
      </main>
    </div>
  )
}

export default App

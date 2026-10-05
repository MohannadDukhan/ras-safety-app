import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'
import SubmissionDetails from './SubmissionDetails'

type SubmissionSummary = {
  id: string
  form_date: string
  created_at: string
  sites: { name: string } | null
}

function FramerSubmissions({ userId }: { userId: string }) {
  const [submissions, setSubmissions] = useState<SubmissionSummary[] | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (!selectedId) heading.current?.focus()
  }, [selectedId])

  useEffect(() => {
    let cancelled = false

    async function loadSubmissions() {
      try {
        const { data, error } = await supabase
          .from('submissions')
          .select('id, form_date, created_at, sites(name)')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .overrideTypes<SubmissionSummary[], { merge: false }>()

        if (cancelled) return
        if (error) throw error
        setSubmissions(data ?? [])
      } catch {
        if (!cancelled) {
          setErrorMessage('Unable to load your submissions. Return to the form and open My submissions again to try again.')
        }
      }
    }

    void loadSubmissions()
    return () => { cancelled = true }
  }, [userId])

  if (selectedId) {
    return <SubmissionDetails key={selectedId} submissionId={selectedId} userId={userId} onBack={() => setSelectedId(null)} />
  }

  return (
    <section className="submission-history" aria-labelledby="history-title">
      <h3 id="history-title" ref={heading} tabIndex={-1}>My submissions</h3>
      {errorMessage ? (
        <p className="error-message" role="alert">{errorMessage}</p>
      ) : submissions === null ? (
        <p role="status">Loading your submissions...</p>
      ) : submissions.length === 0 ? (
        <p>No previous submissions. Use New safety form to submit your first one.</p>
      ) : (
        <>
          <p>Submission times are shown in your local time.</p>
          <ul className="submission-list">
            {submissions.map((submission) => (
              <li className="submission-card" key={submission.id}>
                <h4>{submission.sites?.name ?? 'Site unavailable'}</h4>
                <dl className="submission-summary">
                  <div>
                    <dt>Form date</dt>
                    <dd><time dateTime={submission.form_date}>{new Date(`${submission.form_date}T00:00:00`).toLocaleDateString()}</time></dd>
                  </div>
                  <div>
                    <dt>Submitted</dt>
                    <dd><time dateTime={submission.created_at}>{new Date(submission.created_at).toLocaleString()}</time></dd>
                  </div>
                  <div><dt>Status</dt><dd>Submitted</dd></div>
                </dl>
                <button
                  className="app-button"
                  type="button"
                  onClick={() => setSelectedId(submission.id)}
                  aria-label={`View submission for ${submission.sites?.name ?? 'site unavailable'} on ${submission.form_date}`}
                >
                  View submission
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

export default FramerSubmissions

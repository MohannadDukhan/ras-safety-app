import { useEffect, useState } from 'react'
import { supabase } from './supabase'

type TodaySummary = {
  date: string
  sites: { id: string; name: string; count: number }[]
}

function AdminSummary() {
  const [summary, setSummary] = useState<TodaySummary | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadSummary() {
      try {
        const today = new Date()
        const month = String(today.getMonth() + 1).padStart(2, '0')
        const day = String(today.getDate()).padStart(2, '0')
        const date = `${today.getFullYear()}-${month}-${day}`

        const { data: sites, error: sitesError } = await supabase
          .from('sites')
          .select('id, name')
          .order('name')
        if (cancelled) return
        if (sitesError) throw sitesError

        const siteCounts = await Promise.all((sites ?? []).map(async (site) => {
          const { count, error } = await supabase
            .from('submissions')
            .select('id', { count: 'exact', head: true })
            .eq('form_date', date)
            .eq('site_id', site.id)
          if (error) throw error
          if (count === null) throw new Error('Submission count unavailable')
          return { id: site.id, name: site.name, count }
        }))

        if (!cancelled) setSummary({ date, sites: siteCounts })
      } catch {
        if (!cancelled) setErrorMessage('Unable to load today’s summary. Refresh the page to try again.')
      }
    }

    void loadSummary()
    return () => { cancelled = true }
  }, [])

  const total = summary?.sites.reduce((sum, site) => sum + site.count, 0) ?? 0

  return (
    <section className="admin-summary" aria-labelledby="summary-title">
      <h4 id="summary-title">Today’s submissions</h4>
      {errorMessage ? (
        <p className="error-message" role="alert">{errorMessage}</p>
      ) : summary === null ? (
        <p role="status">Loading today’s summary...</p>
      ) : (
        <>
          <p className="admin-summary-date">
            Form date: <time dateTime={summary.date}>{new Date(`${summary.date}T00:00:00`).toLocaleDateString()}</time>
          </p>
          <p className="admin-summary-total" role="status">
            Today: <strong>{total}</strong> {total === 1 ? 'submission' : 'submissions'}
          </p>
          {total === 0 && <p>No submissions today.</p>}
          <dl className="admin-site-counts">
            {summary.sites.map((site) => (
              <div key={site.id}>
                <dt>{site.name}</dt>
                <dd>{site.count} {site.count === 1 ? 'submission' : 'submissions'}</dd>
              </div>
            ))}
          </dl>
        </>
      )}
    </section>
  )
}

export default AdminSummary

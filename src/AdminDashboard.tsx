import { useEffect, useState, type SubmitEvent } from 'react'
import { supabase } from './supabase'
import SubmissionDetails from './SubmissionDetails'
import AdminSummary from './AdminSummary'

type FilterOptions = {
  sites: { id: string; name: string }[]
  workers: { id: string; full_name: string }[]
}

type SubmissionSummary = {
  id: string
  form_date: string
  created_at: string
  sites: { name: string } | null
  profiles: { full_name: string } | null
}

const emptyFilters = { siteId: '', workerId: '', fromDate: '', toDate: '' }

function AdminDashboard() {
  const [options, setOptions] = useState<FilterOptions | null>(null)
  const [optionError, setOptionError] = useState<string | null>(null)
  const [filters, setFilters] = useState(emptyFilters)
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters)
  const [filterError, setFilterError] = useState<string | null>(null)
  const [submissions, setSubmissions] = useState<SubmissionSummary[] | null>(null)
  const [queryError, setQueryError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadOptions() {
      try {
        const [sites, workers] = await Promise.all([
          supabase.from('sites').select('id, name').order('name'),
          supabase.from('profiles').select('id, full_name').order('full_name'),
        ])
        if (cancelled) return
        if (sites.error || workers.error) throw sites.error ?? workers.error
        setOptions({ sites: sites.data ?? [], workers: workers.data ?? [] })
      } catch {
        if (!cancelled) setOptionError('Unable to load site and worker filters. Refresh the page to try again.')
      }
    }

    void loadOptions()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadSubmissions() {
      try {
        let query = supabase
          .from('submissions')
          .select('id, form_date, created_at, sites(name), profiles(full_name)')
          .order('created_at', { ascending: false })

        if (appliedFilters.siteId) query = query.eq('site_id', appliedFilters.siteId)
        if (appliedFilters.workerId) query = query.eq('user_id', appliedFilters.workerId)
        if (appliedFilters.fromDate) query = query.gte('form_date', appliedFilters.fromDate)
        if (appliedFilters.toDate) query = query.lte('form_date', appliedFilters.toDate)

        const { data, error } = await query.overrideTypes<SubmissionSummary[], { merge: false }>()
        if (cancelled) return
        if (error) throw error
        setSubmissions(data ?? [])
      } catch {
        if (!cancelled) setQueryError('Unable to load submissions. Apply the filters again to retry.')
      }
    }

    void loadSubmissions()
    return () => { cancelled = true }
  }, [appliedFilters])

  function applyFilters(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (filters.fromDate && filters.toDate && filters.fromDate > filters.toDate) {
      setFilterError('From date must be on or before to date.')
      return
    }
    setFilterError(null)
    setQueryError(null)
    setSubmissions(null)
    setAppliedFilters({ ...filters })
  }

  function clearFilters() {
    setFilters(emptyFilters)
    setFilterError(null)
    setQueryError(null)
    setSubmissions(null)
    setAppliedFilters({ ...emptyFilters })
  }

  if (selectedId) {
    return (
      <SubmissionDetails
        key={selectedId}
        submissionId={selectedId}
        onBack={() => setSelectedId(null)}
        backLabel="Back to dashboard"
      />
    )
  }

  return (
    <section className="admin-dashboard" aria-labelledby="dashboard-title">
      <h3 id="dashboard-title">Admin dashboard</h3>
      <AdminSummary />
      <p>Date filters use the form date. Submission times are shown in your local time.</p>

      {optionError ? (
        <p className="error-message" role="alert">{optionError}</p>
      ) : options === null && <p role="status">Loading filters...</p>}

      <form className="admin-filters" onSubmit={applyFilters}>
        {filterError && <p className="error-message" id="filter-error" role="alert">{filterError}</p>}
        <fieldset disabled={options === null}>
          <legend>Filter submissions</legend>
          <div className="admin-filter-fields">
            <div className="form-field">
              <label htmlFor="admin-site">Job site</label>
              <select id="admin-site" value={filters.siteId} onChange={(event) => setFilters({ ...filters, siteId: event.target.value })}>
                <option value="">All sites</option>
                {options?.sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="admin-worker">Worker</label>
              <select id="admin-worker" value={filters.workerId} onChange={(event) => setFilters({ ...filters, workerId: event.target.value })}>
                <option value="">All workers</option>
                {options?.workers.map((worker) => <option key={worker.id} value={worker.id}>{worker.full_name}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="admin-from">From date</label>
              <input id="admin-from" type="date" value={filters.fromDate} aria-invalid={Boolean(filterError)} aria-describedby={filterError ? 'filter-error' : undefined} onChange={(event) => setFilters({ ...filters, fromDate: event.target.value })} />
            </div>
            <div className="form-field">
              <label htmlFor="admin-to">To date</label>
              <input id="admin-to" type="date" value={filters.toDate} aria-invalid={Boolean(filterError)} aria-describedby={filterError ? 'filter-error' : undefined} onChange={(event) => setFilters({ ...filters, toDate: event.target.value })} />
            </div>
          </div>
          <div className="admin-filter-actions">
            <button className="app-button" type="submit">Apply filters</button>
            <button className="app-button" type="button" onClick={clearFilters}>Clear filters</button>
          </div>
        </fieldset>
      </form>

      {queryError ? (
        <p className="error-message" role="alert">{queryError}</p>
      ) : submissions === null ? (
        <p role="status">Loading submissions...</p>
      ) : submissions.length === 0 ? (
        <p role="status">{Object.values(appliedFilters).some(Boolean) ? 'No submissions match these filters.' : 'No submissions yet.'}</p>
      ) : (
        <table className="admin-submissions-table" role="table">
          <caption>Safety submissions</caption>
          <thead>
            <tr>
              <th scope="col">Worker</th>
              <th scope="col">Job site</th>
              <th scope="col">Form date</th>
              <th scope="col">Submitted</th>
              <th scope="col">Status</th>
              <th scope="col">Review</th>
            </tr>
          </thead>
          <tbody>
            {submissions.map((submission) => (
              <tr key={submission.id}>
                <td><span className="table-cell-label" aria-hidden="true">Worker</span>{submission.profiles?.full_name ?? 'Worker unavailable'}</td>
                <td><span className="table-cell-label" aria-hidden="true">Job site</span>{submission.sites?.name ?? 'Site unavailable'}</td>
                <td><span className="table-cell-label" aria-hidden="true">Form date</span><time dateTime={submission.form_date}>{new Date(`${submission.form_date}T00:00:00`).toLocaleDateString()}</time></td>
                <td><span className="table-cell-label" aria-hidden="true">Submitted</span><time dateTime={submission.created_at}>{new Date(submission.created_at).toLocaleString()}</time></td>
                <td><span className="table-cell-label" aria-hidden="true">Status</span>Submitted</td>
                <td>
                  <button
                    className="app-button"
                    type="button"
                    onClick={() => setSelectedId(submission.id)}
                    aria-label={`View submission by ${submission.profiles?.full_name ?? 'worker unavailable'} for ${submission.sites?.name ?? 'site unavailable'} on ${submission.form_date}`}
                  >
                    View details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}

export default AdminDashboard

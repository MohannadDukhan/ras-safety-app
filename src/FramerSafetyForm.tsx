import { useEffect, useState, type SubmitEvent } from 'react'
import { supabase } from './supabase'

type Site = {
  id: string
  name: string
}

const emptyChecklist = {
  ppe_worn: false,
  fall_protection: false,
  ladders_scaffolding_inspected: false,
  tools_cords_good_condition: false,
  hazards_identified: false,
}

const confirmations = [
  { name: 'ppe_worn', label: 'Required PPE is being worn' },
  { name: 'fall_protection', label: 'Fall protection is in place where required' },
  { name: 'ladders_scaffolding_inspected', label: 'Ladders and scaffolding have been inspected' },
  { name: 'tools_cords_good_condition', label: 'Tools and electrical cords are in good condition' },
  { name: 'hazards_identified', label: 'Site hazards have been identified and addressed' },
] as const

function FramerSafetyForm({ userId }: { userId: string }) {
  const [sites, setSites] = useState<Site[] | null>(null)
  const [siteError, setSiteError] = useState<string | null>(null)
  const [siteId, setSiteId] = useState('')
  const [formDate, setFormDate] = useState(() => {
    const today = new Date()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    return `${today.getFullYear()}-${month}-${day}`
  })
  const [checklist, setChecklist] = useState(emptyChecklist)
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadSites() {
      try {
        const { data, error } = await supabase
          .from('sites')
          .select('id, name')
          .order('name')

        if (cancelled) return

        if (error) {
          setSiteError('Unable to load job sites. Refresh the page to try again.')
        } else {
          setSites(data ?? [])
        }
      } catch {
        if (!cancelled) {
          setSiteError('Unable to load job sites. Refresh the page to try again.')
        }
      }
    }

    void loadSites()

    return () => {
      cancelled = true
    }
  }, [])

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) return

    setErrorMessage(null)
    setSubmitted(false)

    if (!sites?.some((site) => site.id === siteId) || !formDate
      || !Object.values(checklist).every((confirmed) => confirmed)) {
      setErrorMessage('Select a job site and date, and confirm all five safety items before submitting.')
      return
    }

    setIsSubmitting(true)

    try {
      const { error } = await supabase.from('submissions').insert({
        user_id: userId,
        site_id: siteId,
        form_date: formDate,
        ...checklist,
        notes: notes.trim() || null,
      })

      if (error) {
        setErrorMessage('Unable to submit your safety form. Your answers have been kept. Please try again.')
      } else {
        setChecklist(emptyChecklist)
        setNotes('')
        setSubmitted(true)
      }
    } catch {
      setErrorMessage('Unable to submit your safety form. Your answers have been kept. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (siteError) {
    return <p className="error-message" role="alert">{siteError}</p>
  }

  if (sites === null) {
    return <p role="status">Loading job sites...</p>
  }

  if (sites.length === 0) {
    return <p role="status">No job sites are available. Contact your administrator.</p>
  }

  return (
    <form className="safety-form" onSubmit={handleSubmit} aria-busy={isSubmitting}>
      {errorMessage && <p className="error-message" role="alert">{errorMessage}</p>}
      {submitted && <p className="success-message" role="status">Safety form submitted successfully.</p>}

      <fieldset className="safety-form-fields" disabled={isSubmitting}>
        <div className="form-field">
          <label htmlFor="site">Job site</label>
          <select id="site" name="site_id" required value={siteId} onChange={(event) => setSiteId(event.target.value)}>
            <option value="">Select a job site</option>
            {sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="form-date">Form date</label>
          <input id="form-date" name="form_date" type="date" required value={formDate} onChange={(event) => setFormDate(event.target.value)} />
        </div>

        <fieldset className="safety-checklist" aria-describedby="checklist-instructions">
          <legend>Safety confirmations</legend>
          <p id="checklist-instructions">All five confirmations are required. Check each item only after you have confirmed it.</p>
          {confirmations.map(({ name, label }) => (
            <label className="checkbox-field" key={name}>
              <input
                name={name}
                type="checkbox"
                required
                checked={checklist[name]}
                onChange={(event) => setChecklist({ ...checklist, [name]: event.target.checked })}
              />
              <span>{label}</span>
            </label>
          ))}
        </fieldset>

        <div className="form-field">
          <label htmlFor="notes">Notes (optional)</label>
          <textarea id="notes" name="notes" rows={4} value={notes} onChange={(event) => setNotes(event.target.value)} />
        </div>

        <button className="app-button" type="submit">
          {isSubmitting ? 'Submitting...' : 'Submit safety form'}
        </button>
      </fieldset>
    </form>
  )
}

export default FramerSafetyForm

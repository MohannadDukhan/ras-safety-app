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

const photoTypes = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
const maxPhotoSize = 5 * 1024 * 1024

function validatePhotos(files: File[]) {
  if (files.length === 0) return 'Choose at least one photo.'
  if (files.length > 10) return 'Choose no more than 10 photos in total.'
  if (files.some((file) => !Object.hasOwn(photoTypes, file.type))) {
    return 'Photos must be JPEG, PNG, or WebP images.'
  }
  if (files.some((file) => file.size > maxPhotoSize)) return 'Each photo must be 5 MB or smaller.'
  if (files.some((file) => file.size === 0)) return 'Empty files cannot be uploaded. Choose another photo.'
  return null
}

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
  const [photos, setPhotos] = useState<File[]>([])
  const [progressMessage, setProgressMessage] = useState('')

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

    const photoError = validatePhotos(photos)
    if (photoError) {
      setErrorMessage(photoError)
      return
    }

    setIsSubmitting(true)
    setProgressMessage('Saving safety form...')
    let failureMessage = 'Unable to save your safety form. Your answers and photos are kept. Please try again.'

    try {
      const { data: submission, error: submissionError } = await supabase
        .from('submissions')
        .insert({
          user_id: userId,
          site_id: siteId,
          form_date: formDate,
          ...checklist,
          notes: notes.trim() || null,
        })
        .select('id')
        .single()
      if (submissionError) throw submissionError

      const bucket = supabase.storage.from('submission-photos')
      const photoRecords: { submission_id: string; storage_path: string }[] = []
      failureMessage = 'Your safety form was saved, but photo uploads could not be completed. Some photos may already have uploaded. Your answers and photos are kept. Submitting again will create a new submission.'
      for (const [index, file] of photos.entries()) {
        setProgressMessage(`Uploading photo ${index + 1} of ${photos.length}...`)
        const extension = photoTypes[file.type as keyof typeof photoTypes]
        const path = `${userId}/${submission.id}/${crypto.randomUUID()}.${extension}`
        const { error } = await bucket.upload(path, file, {
          contentType: file.type,
        })
        if (error) throw error
        photoRecords.push({ submission_id: submission.id, storage_path: path })
      }

      setProgressMessage('Finishing submission...')
      failureMessage = 'Your safety form and photos were saved, but the photo records could not be saved. Your answers and photos are kept. Submitting again will create a new submission.'
      const { error } = await supabase.from('submission_photos').insert(photoRecords)
      if (error) throw error

      setChecklist(emptyChecklist)
      setNotes('')
      setPhotos([])
      setSubmitted(true)
    } catch {
      setErrorMessage(failureMessage)
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

        <div className="form-field">
          <label htmlFor="photos">Photos (required)</label>
          <p className="photo-help" id="photo-help">Choose 1–10 JPEG, PNG, or WebP photos. Maximum 5 MB per photo. Choose again to add more photos.</p>
          <input
            id="photos"
            name="photos"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            required={photos.length === 0}
            aria-describedby="photo-help photo-count"
            onChange={(event) => {
              const selected = Array.from(event.target.files ?? [])
              // Files stay in React state; reset the picker for the next selection.
              event.currentTarget.value = ''
              if (selected.length === 0) return

              const combined = [...photos, ...selected]
              const photoError = validatePhotos(combined)
              setErrorMessage(photoError)
              setSubmitted(false)
              if (photoError) return

              setPhotos(combined)
            }}
          />
          <p className="photo-help" id="photo-count" role="status">
            {photos.length} {photos.length === 1 ? 'photo' : 'photos'} selected
          </p>
        </div>
      </fieldset>

      <button className="app-button safety-submit" type="submit" disabled={isSubmitting}>
        {isSubmitting ? progressMessage : 'Submit safety form'}
      </button>
    </form>
  )
}

export default FramerSafetyForm

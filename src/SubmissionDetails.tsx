import { useEffect, useState } from 'react'
import { supabase } from './supabase'

type Submission = {
  id: string
  form_date: string
  created_at: string
  ppe_worn: boolean
  fall_protection: boolean
  ladders_scaffolding_inspected: boolean
  tools_cords_good_condition: boolean
  hazards_identified: boolean
  notes: string | null
  sites: { name: string } | null
  profiles: { full_name: string } | null
  submission_photos: { id: string; storage_path: string }[]
}

type Photo = { id: string; url: string | null }

function SubmissionDetails({ submissionId, userId, onBack }: {
  submissionId: string
  userId: string
  onBack: () => void
}) {
  const [submission, setSubmission] = useState<Submission | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [photos, setPhotos] = useState<Photo[] | null>(null)
  const [photoError, setPhotoError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadSubmission() {
      try {
        const { data, error } = await supabase
          .from('submissions')
          .select(`
            id, form_date, created_at, ppe_worn, fall_protection,
            ladders_scaffolding_inspected, tools_cords_good_condition,
            hazards_identified, notes, sites(name), profiles(full_name),
            submission_photos(id, storage_path)
          `)
          .eq('id', submissionId)
          .eq('user_id', userId)
          .maybeSingle()
          .overrideTypes<Submission | null, { merge: false }>()

        if (cancelled) return
        if (error) throw error
        if (!data) {
          setErrorMessage('This submission is unavailable or you do not have access to it.')
          return
        }
        setSubmission(data)

        if (data.submission_photos.length === 0) {
          setPhotos([])
          return
        }

        // Signing uses the current session and Storage RLS. URLs expire in one hour.
        try {
          const { data: signedPhotos, error: signingError } = await supabase.storage
            .from('submission-photos')
            .createSignedUrls(data.submission_photos.map((photo) => photo.storage_path), 3600)

          if (cancelled) return
          if (signingError) throw signingError
          setPhotos(data.submission_photos.map((photo) => {
            const signedPhoto = signedPhotos.find((signed) => signed.path === photo.storage_path)
            return { id: photo.id, url: signedPhoto?.error ? null : signedPhoto?.signedUrl || null }
          }))
        } catch {
          if (!cancelled) {
            setPhotoError('Unable to load photos. Return to the list and reopen this submission to try again.')
          }
        }
      } catch {
        if (!cancelled) {
          setErrorMessage('Unable to load this submission. Return to the list and try again.')
        }
      }
    }

    void loadSubmission()
    return () => { cancelled = true }
  }, [submissionId, userId])

  return (
    <section className="submission-details" aria-labelledby="details-title">
      <button className="app-button" type="button" onClick={onBack}>Back to my submissions</button>
      <h3 id="details-title">Submission details</h3>
      {errorMessage ? (
        <p className="error-message" role="alert">{errorMessage}</p>
      ) : submission === null ? (
        <p role="status">Loading submission...</p>
      ) : (
        <>
          <dl className="submission-summary">
            <div><dt>Worker</dt><dd>{submission.profiles?.full_name ?? 'Worker unavailable'}</dd></div>
            <div><dt>Job site</dt><dd>{submission.sites?.name ?? 'Site unavailable'}</dd></div>
            <div>
              <dt>Form date</dt>
              <dd><time dateTime={submission.form_date}>{new Date(`${submission.form_date}T00:00:00`).toLocaleDateString()}</time></dd>
            </div>
            <div>
              <dt>Submitted (local time)</dt>
              <dd><time dateTime={submission.created_at}>{new Date(submission.created_at).toLocaleString()}</time></dd>
            </div>
            <div><dt>Status</dt><dd>Submitted</dd></div>
          </dl>

          <h4>Safety confirmations</h4>
          <ul className="submission-checklist">
            {[
              { label: 'Required PPE is being worn', confirmed: submission.ppe_worn },
              { label: 'Fall protection is in place where required', confirmed: submission.fall_protection },
              { label: 'Ladders and scaffolding have been inspected', confirmed: submission.ladders_scaffolding_inspected },
              { label: 'Tools and electrical cords are in good condition', confirmed: submission.tools_cords_good_condition },
              { label: 'Site hazards have been identified and addressed', confirmed: submission.hazards_identified },
            ].map(({ label, confirmed }) => (
              <li key={label}><span>{label}</span><strong>{confirmed ? 'Confirmed' : 'Not confirmed'}</strong></li>
            ))}
          </ul>

          <h4>Notes</h4>
          <p className="submission-notes">{submission.notes?.trim() ? submission.notes : 'No notes provided.'}</p>

          <h4>Photos</h4>
          {photoError ? (
            <p className="error-message" role="alert">{photoError}</p>
          ) : photos === null ? (
            <p role="status">Loading photos...</p>
          ) : photos.length === 0 ? (
            <p>No photos are attached to this submission.</p>
          ) : (
            <div className="submission-photos">
              {photos.map((photo, index) => (
                <figure key={photo.id}>
                  {photo.url ? (
                    <>
                      <a href={photo.url} target="_blank" rel="noopener noreferrer">
                        <img
                          src={photo.url}
                          alt={`Safety photo ${index + 1} for ${submission.sites?.name ?? 'this site'}`}
                          loading="lazy"
                          onError={() => setPhotos((current) => current?.map((item) => item.id === photo.id ? { ...item, url: null } : item) ?? null)}
                        />
                      </a>
                      <figcaption>Photo {index + 1} · Open full size</figcaption>
                    </>
                  ) : (
                    <p className="error-message" role="alert">Photo {index + 1} could not be loaded. Reopen this submission to try again.</p>
                  )}
                </figure>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  )
}

export default SubmissionDetails

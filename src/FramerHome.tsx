import { useState } from 'react'
import FramerSafetyForm from './FramerSafetyForm'
import FramerSubmissions from './FramerSubmissions'

function FramerHome({ userId }: { userId: string }) {
  const [view, setView] = useState<'form' | 'history'>('form')

  return (
    <>
      <nav className="framer-navigation" aria-label="Framer views">
        <button className="app-button" type="button" aria-pressed={view === 'form'} onClick={() => setView('form')}>
          New safety form
        </button>
        <button className="app-button" type="button" aria-pressed={view === 'history'} onClick={() => setView('history')}>
          My submissions
        </button>
      </nav>

      {/* Keep an unfinished form intact while the worker views their history. */}
      <div hidden={view !== 'form'}>
        <FramerSafetyForm userId={userId} />
      </div>
      {view === 'history' && <FramerSubmissions userId={userId} />}
    </>
  )
}

export default FramerHome

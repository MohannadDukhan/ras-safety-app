import rasLogo from './assets/ras-logo.webp'
import './App.css'

function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-content">
          <img className="ras-logo" src={rasLogo} alt="RAS" />
          <span className="company-name">Ron Anderson &amp; Sons</span>
        </div>
      </header>

      <main className="app-main">
        <div className="welcome">
          <p className="welcome-label">Safety on every site</p>
          <h1>RAS Site Safety</h1>
          <p className="welcome-description">
            The site safety application for RAS crews and administrators.
          </p>
        </div>
      </main>
    </div>
  )
}

export default App

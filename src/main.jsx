import React from 'react'
import { createRoot } from 'react-dom/client'
import PlanetPlannerPage from './PlanetPlannerPage.jsx'
import './styles.css'

createRoot(document.getElementById('root')).render(
  <PlanetPlannerPage onHome={() => { window.location.href = 'https://jaglab.org' }} />
)

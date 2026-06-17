import React, { useMemo, useState } from 'react'
import { ArrowLeft, LocateFixed, Orbit, Search } from 'lucide-react'
import * as Astronomy from 'astronomy-engine'

const DEFAULT_LOCATION = { lat: 39.7392, lon: -104.9903, label: 'Denver, Colorado' }
const planets = [
  { name: 'Mercury', color: '#d9d9d9' },
  { name: 'Venus', color: '#a7c8ff' },
  { name: 'Mars', color: '#ff6633' },
  { name: 'Jupiter', color: '#00a86b' },
  { name: 'Saturn', color: '#d6a84f' }
]
const allPlanets = [...planets, { name: 'Earth', color: '#65a7ff' }]
const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December']

function isLeapYear(year) { return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 }
function dayDate(year, day, hour) { return new Date(year, 0, day + 1, hour, 0, 0) }
function bodyFor(name) { return Astronomy.Body[name] }
function altitudeFor(planetName, lat, lon, date) {
  const observer = new Astronomy.Observer(Number(lat), Number(lon), 0)
  const time = Astronomy.MakeTime(date)
  const equ = Astronomy.Equator(bodyFor(planetName), time, observer, true, true)
  return Astronomy.Horizon(time, observer, equ.ra, equ.dec, 'normal').altitude
}
function helioPosition(name, date) {
  const v = Astronomy.HelioVector(name, Astronomy.MakeTime(date))
  return { x: v.x, y: v.y, z: v.z }
}
function marsEarthDistance(date) {
  const mars = helioPosition('Mars', date)
  const earth = helioPosition('Earth', date)
  return Math.sqrt((mars.x-earth.x)**2 + (mars.y-earth.y)**2 + (mars.z-earth.z)**2)
}
async function geocode(query) {
  const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`)
  if (!response.ok) throw new Error('Location search failed')
  const data = await response.json()
  if (!data?.[0]) throw new Error('Location not found')
  return { lat: Number(data[0].lat), lon: Number(data[0].lon), label: data[0].display_name.split(',').slice(0, 3).join(',') }
}
async function reverseGeocode(lat, lon) {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`)
    const data = await response.json()
    return data?.display_name?.split(',').slice(0, 3).join(',') || `${lat.toFixed(4)}°, ${lon.toFixed(4)}°`
  } catch { return `${lat.toFixed(4)}°, ${lon.toFixed(4)}°` }
}
function monthDayRange(year, month) {
  const start = Math.floor((new Date(year, month, 1) - new Date(year, 0, 1)) / 86400000)
  const end = Math.floor((new Date(year, month + 1, 0) - new Date(year, 0, 1)) / 86400000)
  return { start, end }
}
function pathFromPoints(points, width, height) {
  const pad = 26
  return points.map((p, i) => {
    const x = pad + (p.day / (points.length - 1)) * (width - pad * 2)
    const y = pad + ((90 - p.altitude) / 180) * (height - pad * 2)
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
}
function bestWindow(points) {
  const visible = points.filter(p => p.altitude > 20).sort((a, b) => b.altitude - a.altitude)[0]
  if (!visible) return 'No strong window'
  return `${visible.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · ${visible.altitude.toFixed(0)}°`
}
function calculateYear(location, year, hour) {
  const days = isLeapYear(year) ? 366 : 365
  const data = {}
  for (const planet of planets) {
    data[planet.name] = Array.from({ length: days }, (_, day) => {
      const date = dayDate(year, day, hour)
      return { day, date, altitude: altitudeFor(planet.name, location.lat, location.lon, date) }
    })
  }
  return data
}

function AltitudeChart({ data, year, month }) {
  const width = 980, height = 360
  const pad = 26
  const days = data.Mars.length - 1
  const { start, end } = monthDayRange(year, month)
  const monthX = pad + (start / days) * (width - pad * 2)
  const monthW = Math.max(8, ((end - start + 1) / days) * (width - pad * 2))
  return <div className="tool-panel planet-chart-react">
    <div className="tool-panel-title"><span>Planet altitude by day</span><span>{monthNames[month]} highlighted</span></div>
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Planet altitude chart">
      <rect x={monthX} y="26" width={monthW} height={height - 52} className="selected-month-band" />
      {[-30, 0, 30, 60, 90].map(alt => <g key={alt}><line x1="26" x2={width-26} y1={26 + ((90-alt)/180)*(height-52)} y2={26 + ((90-alt)/180)*(height-52)} className="chart-grid"/><text x="4" y={31 + ((90-alt)/180)*(height-52)}>{alt}°</text></g>)}
      <line x1="26" x2={width-26} y1={26 + ((90-0)/180)*(height-52)} y2={26 + ((90-0)/180)*(height-52)} className="horizon-line" />
      {planets.map(planet => <path key={planet.name} d={pathFromPoints(data[planet.name], width, height)} fill="none" stroke={planet.color} strokeWidth="3" />)}
    </svg>
    <div className="planet-legend">{planets.map(p => <span key={p.name}><i style={{ background: p.color }} />{p.name}<em>{bestWindow(data[p.name])}</em></span>)}</div>
  </div>
}

function MonthlySnapshot({ data, year, month }) {
  const { start, end } = monthDayRange(year, month)
  return <section className="monthly-snapshot">{planets.map(planet => {
    const monthPoints = data[planet.name].slice(start, end + 1)
    const monthBest = monthPoints.reduce((winner, point) => point.altitude > winner.altitude ? point : winner, monthPoints[0])
    const annualBest = data[planet.name].reduce((winner, point) => point.altitude > winner.altitude ? point : winner, data[planet.name][0])
    const visibleDays = monthPoints.filter(point => point.altitude > 20).length
    return <article className="summary-card month-card" key={planet.name}>
      <span style={{ color: planet.color }}>{planet.name}</span>
      <strong>{monthBest.altitude.toFixed(0)}°</strong>
      <em>{monthNames[month]} best: {monthBest.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</em>
      <dl className="planet-card-details">
        <div><dt>Annual best</dt><dd>{annualBest.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · {annualBest.altitude.toFixed(0)}°</dd></div>
        <div><dt>Usable nights</dt><dd>{visibleDays} above 20°</dd></div>
      </dl>
    </article>
  })}</section>
}

function SolarSystem({ year, month }) {
  const date = new Date(year, month, 1)
  const size = 760
  const center = size / 2
  const radii = { Mercury: 58, Venus: 100, Earth: 142, Mars: 184, Jupiter: 266, Saturn: 348 }
  return <div className="tool-panel solar-system-react">
    <div className="tool-panel-title"><span>Solar-system position</span><span>{monthNames[month]} {year}</span></div>
    <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Solar system visualization">
      <circle cx={center} cy={center} r="14" fill="#ffd166" />
      {allPlanets.map(planet => {
        const r = radii[planet.name]
        const pos = helioPosition(planet.name, date)
        const angle = Math.atan2(pos.y, pos.x)
        const x = center + r * Math.cos(angle)
        const y = center + r * Math.sin(angle)
        return <g key={planet.name}>
          <circle cx={center} cy={center} r={r} className="orbit-line" />
          <circle cx={x} cy={y} r={planet.name === 'Jupiter' || planet.name === 'Saturn' ? 8 : 6} fill={planet.color} />
          <text x={x + 10} y={y + 4}>{planet.name}</text>
        </g>
      })}
    </svg>
    <p className="distance-note">Mars–Earth distance: <strong>{marsEarthDistance(date).toFixed(2)} AU</strong></p>
  </div>
}

export default function PlanetPlannerPage({ onHome }) {
  const [location, setLocation] = useState(DEFAULT_LOCATION)
  const [query, setQuery] = useState('')
  const [year, setYear] = useState(new Date().getFullYear())
  const [hour, setHour] = useState(20)
  const [month, setMonth] = useState(0)
  const [status, setStatus] = useState('Ready. Defaulting to Denver at 8 PM local time.')
  const [busy, setBusy] = useState(false)

  const data = useMemo(() => calculateYear(location, Number(year), Number(hour)), [location, year, hour])

  async function runSearch() {
    if (!query.trim()) return
    setBusy(true); setStatus('Finding observing location…')
    try {
      const loc = await geocode(query)
      setLocation(loc); setQuery(''); setStatus(`Planner updated for ${loc.label}.`)
    } catch (error) { setStatus(error.message) }
    finally { setBusy(false) }
  }
  function detectLocation() {
    if (!navigator.geolocation) { setStatus('Browser geolocation is not available.'); return }
    setBusy(true); setStatus('Waiting for browser location permission…')
    navigator.geolocation.getCurrentPosition(async position => {
      const lat = position.coords.latitude, lon = position.coords.longitude
      const label = await reverseGeocode(lat, lon)
      setLocation({ lat, lon, label }); setStatus(`Planner updated for ${label}.`); setBusy(false)
    }, error => { setStatus(error.message); setBusy(false) })
  }

  return <main className="tool-page planet-tool-page">
    <div className="tool-nav"><button className="button" onClick={onHome}><ArrowLeft size={15}/> Project index</button><a className="button" href="https://github.com/jagbanana/jg-planet-planner" target="_blank" rel="noreferrer">Source repo</a></div>
    <header className="tool-hero compact">
      <p className="kicker">ASTRO-006 / REACT_PORT</p>
      <h1>Planet Planner</h1>
      <p className="lede">Find the best nights and times for Mercury, Venus, Mars, Jupiter, and Saturn from your observing location.</p>
    </header>

    <section className="planner-workbench">
      <aside className="planner-sidebar tool-panel">
        <div className="tool-panel-title"><span>Controls</span><span>Live</span></div>
        <div className="location-readout stacked"><strong>{location.label}</strong><span>{location.lat.toFixed(4)}°, {location.lon.toFixed(4)}°</span></div>
        <label className="field-label">Observing site</label>
        <input className="control-input" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && runSearch()} placeholder="City, address, dark-sky site…"/>
        <div className="control-button-grid"><button className="button primary" onClick={runSearch} disabled={busy}><Search size={15}/> Search</button><button className="button" onClick={detectLocation} disabled={busy}><LocateFixed size={15}/> Detect</button></div>
        <label className="field-label">Year</label>
        <select className="control-input" value={year} onChange={e => setYear(e.target.value)}>{Array.from({ length: 4 }, (_, i) => new Date().getFullYear() + i).map(y => <option key={y} value={y}>{y}</option>)}</select>
        <label className="field-label">Observation time <span>{(Number(hour)%12 || 12)}:00 {Number(hour) >= 12 ? 'PM' : 'AM'}</span></label>
        <input className="control-range" type="range" min="0" max="23" value={hour} onChange={e => setHour(e.target.value)} />
        <label className="field-label">Month focus <span><Orbit size={14}/>{monthNames[month]}</span></label>
        <input className="control-range" type="range" min="0" max="11" value={month} onChange={e => setMonth(Number(e.target.value))} />
        <div className="month-pills">{monthNames.map((name, i) => <button key={name} className={i === month ? 'active' : ''} onClick={() => setMonth(i)}>{name.slice(0, 3)}</button>)}</div>
        <p className="status-line">{status}</p>
      </aside>
      <section className="planner-output">
        <MonthlySnapshot data={data} year={Number(year)} month={Number(month)}/>
        <AltitudeChart data={data} year={Number(year)} month={Number(month)}/>
        <SolarSystem year={Number(year)} month={Number(month)}/>
      </section>
    </section>
  </main>
}

# JG Planet Planner

A standalone React planner for finding useful planetary observing windows by location, year, time, and month.

Live version: <https://jaglab.org/planet-planner>

## Features

- Search by city, address, landmark, or dark-sky site
- Optional browser geolocation
- Altitude curves for Mercury, Venus, Mars, Jupiter, and Saturn
- Month-focused cards showing selected-month best, annual best, and usable nights above 20°
- Solar-system position visualization
- Mars-Earth distance indicator
- Responsive two-column planning layout

## How it works

This app runs entirely in the browser:

- Planetary calculations: [Astronomy Engine](https://github.com/cosinekitty/astronomy)
- Geocoding: [OpenStreetMap Nominatim](https://nominatim.openstreetmap.org/)
- UI: React + Vite

Altitude calculations are based on the selected observer latitude/longitude, year, and hour. The month control focuses the dashboard on a specific month while preserving the annual altitude context.

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
npm run preview
```

The production build outputs static files to `dist/` and can be hosted on Cloudflare Pages, Netlify, GitHub Pages, or any static host.

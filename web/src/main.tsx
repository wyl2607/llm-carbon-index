import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import Layout from './App.tsx'
import Overview from './pages/Overview.tsx'
import Rankings from './pages/Rankings.tsx'
import Regions from './pages/Regions.tsx'
import Recommendations from './pages/Recommendations.tsx'
import Methodology from './pages/Methodology.tsx'

// Hash routing (/#/rankings) needs no SPA 404 fallback and works under the
// GitHub Pages base path (vite.config.ts) with zero server config.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Overview />} />
          <Route path="rankings" element={<Rankings />} />
          <Route path="regions" element={<Regions />} />
          <Route path="recommendations" element={<Recommendations />} />
          <Route path="methodology" element={<Methodology />} />
        </Route>
      </Routes>
    </HashRouter>
  </StrictMode>,
)

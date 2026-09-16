import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Tasks from './pages/Tasks.jsx'
import Blocks from './pages/Blocks.jsx'
import Opportunities from './pages/Opportunities.jsx'
import Optimizer from './pages/Optimizer.jsx'
import WhatIf from './pages/WhatIf.jsx'
import Replan from './pages/Replan.jsx'
import WeeklyPlan from './pages/WeeklyPlan.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />}>
          <Route index element={<Dashboard />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="blocks" element={<Blocks />} />
          <Route path="opportunities" element={<Opportunities />} />
          <Route path="optimizer" element={<Optimizer />} />
          <Route path="whatif" element={<WhatIf />} />
          <Route path="replan" element={<Replan />} />
          <Route path="weekly" element={<WeeklyPlan />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)

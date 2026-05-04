import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Add from './pages/Add'
import Insights from './pages/Insights'
import Settings from './pages/Settings'
import Goals from './pages/Goals'
import ManageCategories from './pages/ManageCategories'
import Stats from './pages/Stats'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="add" element={<Add />} />
          <Route path="insights" element={<Insights />} />
          <Route path="settings" element={<Settings />} />
          <Route path="goals" element={<Goals />} />
          <Route path="manage-categories" element={<ManageCategories />} />
          <Route path="stats" element={<Stats />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

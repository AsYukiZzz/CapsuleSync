import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Home from '@/pages/Home'
import Login from '@/pages/Login'
import DocDetail from '@/pages/DocDetail'
import Audit from '@/pages/Audit'
import AuthGate from '@/components/AuthGate'

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<AuthGate />}>
          <Route path="/" element={<Home />} />
          <Route path="/docs/:id" element={<DocDetail />} />
          <Route path="/audit" element={<Audit />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

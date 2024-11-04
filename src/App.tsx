import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom'
import { supabase } from './utils/supabaseClient'
import Navbar from './components/Navbar'
import CampaignCreation from './components/CampaignCreation'
import CampaignList from './components/CampaignList'
import BulkDialing from './components/BulkDialing'
import CampaignAnalytics from './components/CampaignAnalytics'
import Settings from './components/Settings'
import Auth from './components/Auth'
import PricingPage from './components/PricingPage'
import LandingPage from './components/LandingPage'

function App() {
  const [session, setSession] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
  }, [])

  return (
    <Router>
      <div className="min-h-screen bg-gray-100 flex">
        {session && <Navbar />}
        <div className={`flex-grow ${session ? 'ml-16' : ''} transition-all duration-300`}>
          <Routes>
            <Route
              path="/"
              element={
                session ? (
                  <Navigate to="/campaigns" replace />
                ) : (
                  <LandingPage />
                )
              }
            />
            <Route
              path="/campaigns"
              element={
                session ? (
                  <CampaignList />
                ) : (
                  <Navigate to="/auth" replace />
                )
              }
            />
            <Route
              path="/create"
              element={
                session ? (
                  <CampaignCreation />
                ) : (
                  <Navigate to="/auth" replace />
                )
              }
            />
            <Route
              path="/campaign/:id"
              element={
                session ? (
                  <BulkDialing />
                ) : (
                  <Navigate to="/auth" replace />
                )
              }
            />
            <Route
              path="/campaign/:id/analytics"
              element={
                session ? (
                  <CampaignAnalytics />
                ) : (
                  <Navigate to="/auth" replace />
                )
              }
            />
            <Route
              path="/pricing"
              element={
                session ? (
                  <PricingPage />
                ) : (
                  <Navigate to="/auth" replace />
                )
              }
            />
            <Route
              path="/settings"
              element={
                session ? (
                  <Settings />
                ) : (
                  <Navigate to="/auth" replace />
                )
              }
            />
            <Route
              path="/auth"
              element={
                !session ? (
                  <Auth />
                ) : (
                  <Navigate to="/campaigns" replace />
                )
              }
            />
          </Routes>
        </div>
      </div>
    </Router>
  )
}

export default App
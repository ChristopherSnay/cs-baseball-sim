/// <reference types="vite/client" />
// React default import not required with the JSX transform
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from '@mui/material/styles'
import { CssBaseline, AppBar, Toolbar, Box, Typography } from '@mui/material'
import { theme } from './theme'
import { GameProvider } from './context/GameContext'
import { Home } from './pages/Home'
import { Draft } from './pages/Draft'
import { Season } from './pages/Season'

function AppContent() {
  // AppContent intentionally minimal — it renders the app routes and header.
  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <AppBar position="sticky">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            ⚾ Diamond Sim
          </Typography>
          <Typography variant="body2">
            {window.location.pathname === '/' ? 'Home' : window.location.pathname === '/draft' ? 'Draft' : 'Season'}
          </Typography>
        </Toolbar>
      </AppBar>

      <Box sx={{ bgcolor: 'background.default', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/draft" element={<Draft />} />
          <Route path="/season" element={<Season />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Box>
    </Box>
  )
}

export default function App() {
  const basename = import.meta.env.MODE === 'production' ? '/cs-baseball-sim' : '/'
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router basename={basename}>
        <GameProvider>
          <AppContent />
        </GameProvider>
      </Router>
    </ThemeProvider>
  )
}

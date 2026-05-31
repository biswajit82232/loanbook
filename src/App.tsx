import { Layout } from './components/Layout'
import { DetailRouter } from './components/DetailRouter'
import { Toast } from './components/Toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import { LoanBookProvider, useLoanBook } from './context/LoanBookContext'
import { NavigationProvider, useNavigation } from './context/NavigationContext'
import { Dashboard } from './pages/Dashboard'
import { Loans } from './pages/Loans'
import { Borrowers } from './pages/Borrowers'
import { Partners } from './pages/Partners'
import { Payments } from './pages/Payments'
import { Reports } from './pages/Reports'
import { Settings } from './pages/Settings'
import { Login } from './pages/Login'
import { AppLoading } from './components/AppLoading'

function PageContent() {
  const { page, detail } = useNavigation()

  if (detail) {
    return <DetailRouter route={detail} />
  }

  switch (page) {
    case 'dashboard':
      return <Dashboard />
    case 'loans':
      return <Loans />
    case 'borrowers':
      return <Borrowers />
    case 'partners':
      return <Partners />
    case 'payments':
      return <Payments />
    case 'reports':
      return <Reports />
    case 'settings':
      return <Settings />
    default:
      return <Dashboard />
  }
}

function AppMain() {
  const { dataLoading, dataReady, loadProgress } = useLoanBook()

  if (dataLoading || !dataReady) {
    return (
      <AppLoading percent={loadProgress.percent} label={loadProgress.label} />
    )
  }

  return (
    <NavigationProvider>
      <Layout>
        <PageContent />
      </Layout>
      <Toast />
    </NavigationProvider>
  )
}

function AppGate() {
  const { session, loading, isConfigured, loadProgress } = useAuth()

  if (loading) {
    return (
      <AppLoading percent={loadProgress.percent} label={loadProgress.label} />
    )
  }

  if (isConfigured && !session) {
    return <Login />
  }

  return (
    <LoanBookProvider>
      <AppMain />
    </LoanBookProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppGate />
    </AuthProvider>
  )
}

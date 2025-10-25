
import { BrowserRouter, Routes, Route, Navigate} from 'react-router-dom';
import { useEffect } from 'react';
import Layout from './components/Layout';
import AuthGuard from './components/AuthGuard';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import AIHistoryPage from './pages/AIHistoryPage';
import DoorsPage from './pages/DoorsPage';
import WindowsPage from './pages/WindowsPage';
import SettingsPage from './pages/SettingsPage';
import CasesPage from './pages/CasesPage';
import OpenCasesPage from './pages/OpenCasesPage';
import PendingCasesPage from './pages/PendingCasesPage';
import FollowUpCasesPage from './pages/FollowUpCasesPage';
import ClosedCasesPage from './pages/ClosedCasesPage';
import AlertCasesPage from './pages/AlertCasesPage';
import NewCasePage from './pages/NewCasePage';
import CaseDetailPage from './pages/CaseDetailPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CallPage from './pages/CallPage';
import AllCasesDashboardPage from './pages/AllCasesDashboardPage';
import ErrorBoundary from './components/ErrorBoundary';
import FAQsPage from './pages/FAQsPage';
import UserManagementPage from './pages/UserManagementPage';
import DocumentManagementPage from './pages/DocumentManagementPage';
import { UserProvider } from './contexts/UserContext';
import { ChatProvider } from './contexts/ChatContext';
import { ConnectProvider } from './contexts/ConnectContext';
import { CallProvider } from './contexts/CallContext';
import { TabProvider } from './contexts/TabContext';
import { PageStateProvider } from './contexts/PageStateContext';
import IncomingCallNotification from './components/IncomingCallNotification';
import './styles/index.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';


function App() {
  const queryClient = new QueryClient();

  useEffect(() => {
    const pageEntries = performance.getEntriesByType('navigation');
    if (pageEntries.length > 0 && pageEntries[0].type === 'reload') {
      if (window.location.pathname !== '/home') {
        window.location.href = '/home';
      }
    }
  }, []);

  return (
    <ErrorBoundary>
      <UserProvider>
        <ChatProvider>
          <ConnectProvider>
            <CallProvider>
              <BrowserRouter>
                <QueryClientProvider client={queryClient}>
                  <PageStateProvider>
                    <TabProvider>
                    <IncomingCallNotification />
                    <Routes>
                      {/* Public routes */}
                      <Route path="/login" element={<LoginPage />} />
                      <Route path="/" element={<Navigate to="/login" replace />} />
                      
                      {/* Protected routes with Layout */}
                      <Route element={<Layout />}>
                        <Route path="/home" element={<AuthGuard><HomePage /></AuthGuard>} />
                        <Route path="/ai-history" element={<AuthGuard><AIHistoryPage /></AuthGuard>} />
                        <Route path="/doors" element={<AuthGuard><DoorsPage /></AuthGuard>} />
                        <Route path="/windows" element={<AuthGuard><WindowsPage /></AuthGuard>} />
                        <Route path="/settings" element={<AuthGuard><SettingsPage /></AuthGuard>} />
                        
                        {/* Cases routes with ErrorBoundary */}
                        <Route path="/cases" element={<AuthGuard><ErrorBoundary><CasesPage /></ErrorBoundary></AuthGuard>} />
                        <Route path="/cases/open" element={<AuthGuard><ErrorBoundary><OpenCasesPage /></ErrorBoundary></AuthGuard>} />
                        <Route path="/cases/pending" element={<AuthGuard><ErrorBoundary><PendingCasesPage /></ErrorBoundary></AuthGuard>} />
                        <Route path="/cases/follow-up" element={<AuthGuard><ErrorBoundary><FollowUpCasesPage /></ErrorBoundary></AuthGuard>} />
                        <Route path="/cases/closed" element={<AuthGuard><ErrorBoundary><ClosedCasesPage /></ErrorBoundary></AuthGuard>} />
                        <Route path="/cases/alert" element={<AuthGuard><ErrorBoundary><AlertCasesPage /></ErrorBoundary></AuthGuard>} />
                        <Route path="/cases/new" element={<AuthGuard><ErrorBoundary><NewCasePage /></ErrorBoundary></AuthGuard>} />
                        <Route path="/cases/dashboard" element={<AuthGuard><ErrorBoundary><AllCasesDashboardPage /></ErrorBoundary></AuthGuard>} />
                        <Route path="/cases/:id" element={<AuthGuard><ErrorBoundary><CaseDetailPage /></ErrorBoundary></AuthGuard>} />
                        
                        {/* Call and Product routes */}
                        <Route path="/call/:callId" element={<AuthGuard><CallPage /></AuthGuard>} />
                        <Route path="/product-detail/:id" element={<AuthGuard><ProductDetailPage /></AuthGuard>} />
                        <Route path="/product/:id" element={<AuthGuard><ProductDetailPage /></AuthGuard>} />
                        <Route path="/faqs" element={<AuthGuard><FAQsPage /></AuthGuard>} />
                        <Route path="/management/users" element={<AuthGuard><UserManagementPage /></AuthGuard>} />
                        <Route path="/management/documents" element={<AuthGuard><DocumentManagementPage /></AuthGuard>} />
                      </Route>
                    </Routes>
                    </TabProvider>
                  </PageStateProvider>
                </QueryClientProvider>
              </BrowserRouter>
            </CallProvider>
          </ConnectProvider>
        </ChatProvider>
      </UserProvider>
    </ErrorBoundary>
  );
}

export default App;

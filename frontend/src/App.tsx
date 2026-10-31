import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Header } from './components/Header';
import { ReportPage } from './pages/report/ReportPage';
import { TrackingPage } from './pages/report/TrackingPage';
import { ConsolePage } from './pages/console/ConsolePage';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { seedDemoData } from './lib/api';
import { isAdminAuthenticated, removeAdminSession } from './lib/auth';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
});

export function AppContent() {
  const [currentRoute, setCurrentRoute] = useState<'report' | 'console' | 'tracking' | 'login'>('report');
  const [trackingToken, setTrackingToken] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(isAdminAuthenticated());
  const [isSeeding, setIsSeeding] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync with browser URL pathname or hash (e.g. /report, /console, /r/xyz, /login)
  useEffect(() => {
    const handleLocation = () => {
      const path = window.location.pathname;
      const authed = isAdminAuthenticated();
      setIsAuthenticated(authed);

      if (path.startsWith('/r/')) {
        const token = path.replace('/r/', '');
        setTrackingToken(token);
        setCurrentRoute('tracking');
      } else if (path === '/console') {
        // Protected Admin Route
        if (!authed) {
          window.history.replaceState({}, '', '/login');
          setCurrentRoute('login');
        } else {
          setCurrentRoute('console');
        }
      } else if (path === '/login') {
        if (authed) {
          window.history.replaceState({}, '', '/console');
          setCurrentRoute('console');
        } else {
          setCurrentRoute('login');
        }
      } else {
        // Public Citizen Report Portal
        setCurrentRoute('report');
      }
    };

    handleLocation();
    window.addEventListener('popstate', handleLocation);

    // Listen for 401 unauthorized events from API layer
    const onUnauthorized = () => {
      setIsAuthenticated(false);
      removeAdminSession();
      window.history.pushState({}, '', '/login');
      setCurrentRoute('login');
      setToastMessage('Session expired. Please log in again to access Control Room.');
      setTimeout(() => setToastMessage(null), 3500);
    };

    window.addEventListener('ares:unauthorized', onUnauthorized);

    return () => {
      window.removeEventListener('popstate', handleLocation);
      window.removeEventListener('ares:unauthorized', onUnauthorized);
    };
  }, []);

  const navigateTo = (route: 'report' | 'console' | 'login') => {
    if (route === 'console') {
      if (!isAdminAuthenticated()) {
        window.history.pushState({}, '', '/login');
        setCurrentRoute('login');
      } else {
        window.history.pushState({}, '', '/console');
        setCurrentRoute('console');
      }
    } else if (route === 'login') {
      window.history.pushState({}, '', '/login');
      setCurrentRoute('login');
    } else {
      window.history.pushState({}, '', '/report');
      setCurrentRoute('report');
    }
  };

  const navigateToTracking = (token: string) => {
    setTrackingToken(token);
    window.history.pushState({}, '', `/r/${token}`);
    setCurrentRoute('tracking');
  };

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    window.history.pushState({}, '', '/console');
    setCurrentRoute('console');
    setToastMessage('Welcome, Administrator. Control Room authenticated.');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleLogout = () => {
    removeAdminSession();
    setIsAuthenticated(false);
    queryClient.clear();
    window.history.pushState({}, '', '/login');
    setCurrentRoute('login');
    setToastMessage('Administrator successfully logged out.');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSeed = async () => {
    setIsSeeding(true);
    try {
      await seedDemoData();
      queryClient.invalidateQueries();
      setToastMessage('ARES database successfully initialized with active incidents!');
      setTimeout(() => setToastMessage(null), 3500);
    } catch (e: any) {
      console.error('Seed failed:', e);
      setToastMessage('Failed to seed incident data: Admin access required');
      setTimeout(() => setToastMessage(null), 3000);
    } finally {
      setIsSeeding(false);
    }
  };

  const isConsole = currentRoute === 'console';

  return (
    <div className={`bg-[#F9FAFB] text-[#111827] flex flex-col font-sans ${isConsole ? 'h-screen overflow-hidden' : 'min-h-screen'}`}>
      <Header
        currentRoute={currentRoute}
        onRouteChange={navigateTo}
        isAuthenticated={isAuthenticated}
        onLogout={handleLogout}
        onSeedData={handleSeed}
        isSeeding={isSeeding}
      />

      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-xl border border-slate-700 animate-bounce">
          {toastMessage}
        </div>
      )}

      <main className={`flex-1 flex flex-col min-h-0 ${isConsole ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        {currentRoute === 'console' && (
          isAuthenticated ? (
            <ConsolePage role="coordinator" />
          ) : (
            <AdminLoginPage
              onLoginSuccess={handleLoginSuccess}
              onNavigateToPublic={() => navigateTo('report')}
            />
          )
        )}
        {currentRoute === 'login' && (
          <AdminLoginPage
            onLoginSuccess={handleLoginSuccess}
            onNavigateToPublic={() => navigateTo('report')}
          />
        )}
        {currentRoute === 'report' && <ReportPage onNavigateToTracking={navigateToTracking} />}
        {currentRoute === 'tracking' && (
          <TrackingPage
            token={trackingToken}
            onBackToReport={() => navigateTo('report')}
          />
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

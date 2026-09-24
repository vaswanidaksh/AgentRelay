import { createContext, useContext, useState, useCallback, useMemo } from 'react';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
const SessionContext = createContext(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export function SessionProvider({ children }) {
  // Current session object (null when no session is active)
  const [session, setSession] = useState(null);

  // Driver information for the active session
  const [driver, setDriver] = useState(null);

  // Queue of pending redirect requests
  const [redirectQueue, setRedirectQueue] = useState([]);

  // List of diffs / instructions produced during the session
  const [diffs, setDiffs] = useState([]);

  // Convenience flag
  const hasActiveSession = !!session && session.status === 'ACTIVE';

  // ---------------------------------------------------------------------------
  // Placeholder setters — full logic will be implemented in later phases.
  // These are structural so consumers can depend on the API shape now.
  // ---------------------------------------------------------------------------

  const updateSession = useCallback((sessionData) => {
    setSession(sessionData);
  }, []);

  const updateDriver = useCallback((driverData) => {
    setDriver(driverData);
  }, []);

  const addRedirect = useCallback((redirect) => {
    setRedirectQueue((prev) => [...prev, redirect]);
  }, []);

  const resolveRedirect = useCallback((redirectId, status) => {
    setRedirectQueue((prev) =>
      prev.map((r) => (r.id === redirectId ? { ...r, status } : r)),
    );
  }, []);

  const addDiff = useCallback((diff) => {
    setDiffs((prev) => [...prev, diff]);
  }, []);

  const clearSession = useCallback(() => {
    setSession(null);
    setDriver(null);
    setRedirectQueue([]);
    setDiffs([]);
  }, []);

  const value = useMemo(
    () => ({
      session,
      driver,
      redirectQueue,
      diffs,
      hasActiveSession,
      updateSession,
      updateDriver,
      addRedirect,
      resolveRedirect,
      addDiff,
      clearSession,
    }),
    [
      session,
      driver,
      redirectQueue,
      diffs,
      hasActiveSession,
      updateSession,
      updateDriver,
      addRedirect,
      resolveRedirect,
      addDiff,
      clearSession,
    ],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error('useSession must be used within a <SessionProvider>');
  }
  return ctx;
}

export default SessionContext;

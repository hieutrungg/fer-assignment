import { createContext, useContext, useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { readSession, signIn, signOut } from "./services/authService";

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [session, setSession] = useState(readSession);

  useEffect(() => {
    const syncSession = () => setSession(readSession());
    window.addEventListener("storage", syncSession);
    return () => window.removeEventListener("storage", syncSession);
  }, []);

  return (
    <SessionContext.Provider value={{
      session,
      async login(email, password) {
        const next = await signIn(email, password);
        setSession(next);
        return next;
      },
      logout() {
        signOut();
        setSession(null);
      },
    }}>
      {children}
    </SessionContext.Provider>
  );
}

export const useSession = () => useContext(SessionContext);
export const homeFor = (session) => session.role === "teacher" ? "/words" : "/assignments";

export function RequireSession({ role }) {
  const { session } = useSession();
  const location = useLocation();
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (role && session.role !== role) return <Navigate to={homeFor(session)} replace />;
  return <Outlet />;
}

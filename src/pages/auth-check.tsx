// src/pages/AuthCheck.tsx
import { useKeycloakAuth } from "@/contexts/KeycloakAuthContext";

export default function AuthCheck() {
  const { isAuthenticated, user, login, logout, getUserGroups } = useKeycloakAuth();
  const tp: any = user?.profile;

  return (
    <div style={{padding:20, fontFamily:"monospace"}}>
      <h2>AuthCheck</h2>
      <div>authenticated: {String(!!isAuthenticated)}</div>
      <div>token: {isAuthenticated ? "yes" : "no"}</div>
      <div>email: {tp?.email ?? "-"}</div>
      <div>sub: {tp?.sub ?? "-"}</div>
      <div>groups: {Array.isArray(tp?.groups) ? tp.groups.join(", ") : "-"}</div>

      <div style={{marginTop:16}}>
        <button onClick={() => login()}>Login</button>
        <button onClick={() => logout()} style={{marginLeft:8}}>Logout</button>
      </div>

      <div style={{marginTop:16}}>
        <div>normalized groups: {getUserGroups().join(', ') || '-'}</div>
      </div>
    </div>
  );
}

// src/pages/AuthCheck.tsx
import { keycloak } from "@/lib/keycloak";

export default function AuthCheck() {
  const tp: any = keycloak.tokenParsed;

  return (
    <div style={{padding:20, fontFamily:"monospace"}}>
      <h2>AuthCheck</h2>
      <div>authenticated: {String(!!keycloak.authenticated)}</div>
      <div>token: {keycloak.token ? "yes" : "no"}</div>
      <div>email: {tp?.email ?? "-"}</div>
      <div>sub: {tp?.sub ?? "-"}</div>
      <div>groups: {Array.isArray(tp?.groups) ? tp.groups.join(", ") : "-"}</div>

      <div style={{marginTop:16}}>
        <button onClick={() => keycloak.login({
          redirectUri: window.location.origin + "/auth-check",
          scope: "openid profile email groups"
        })}>Login</button>

        <button onClick={() => keycloak.logout({
          redirectUri: window.location.origin + "/auth-check"
        })} style={{marginLeft:8}}>Logout</button>
      </div>
    </div>
  );
}

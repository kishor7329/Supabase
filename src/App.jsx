import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import Chat from "./Chat";

export default function App() {
  const [session, setSession] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = async () => {
    const { data } = await supabase
      .from("login_logs")
      .select("*")
      .order("logged_in_at", { ascending: false })
      .limit(50);
    setLogs(data ?? []);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      // Log once per browser session, not on every token refresh
      if (event === "SIGNED_IN" && s && !sessionStorage.getItem("logged")) {
        sessionStorage.setItem("logged", "1");
        setTimeout(async () => {
          await supabase.functions.invoke("log-login");
          loadLogs();
        }, 0);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) loadLogs();
  }, [session]);

  const login = () =>
    supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
  const logout = async () => {
    sessionStorage.removeItem("logged");
    await supabase.auth.signOut();
  };

  if (loading) return <p>Loading...</p>;
  if (!session)
    return (
      <div style={{ textAlign: "center", marginTop: 120 }}>
        <h1>Welcome</h1>
        <button onClick={login}>Sign in with Google</button>
      </div>
    );

  return (
    <div style={{ maxWidth: 900, margin: "24px auto", padding: 16 }}>
      <header style={{ display: "flex", justifyContent: "space-between" }}>
        <h2>
          Hi, {session.user.user_metadata?.full_name ?? session.user.email}
        </h2>
        <button onClick={logout}>Logout</button>
      </header>

      <h3>Login history</h3>
      <table
        border="1"
        cellPadding="6"
        style={{ width: "100%", borderCollapse: "collapse" }}
      >
        <thead>
          <tr>
            <th>User</th>
            <th>Email</th>
            <th>Logged in at</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((l) => (
            <tr key={l.id}>
              <td>{l.full_name ?? "-"}</td>
              <td>{l.email}</td>
              <td>{new Date(l.logged_in_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 style={{ marginTop: 32 }}>Gemini Chatbot</h3>
      <Chat />
    </div>
  );
}

import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import Notes from "./Notes";
import Chat from "./Chat";

export default function App() {
  const [session, setSession] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

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
      // log once per browser session, not on every token refresh
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

  const googleLogin = () =>
    supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
  const emailSignUp = async () => {
    const { error } = await supabase.auth.signUp({ email, password });
    setMsg(error ? error.message : "Signed up. Now click Login.");
  };
  const emailSignIn = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setMsg(error ? error.message : "");
  };
  const logout = async () => {
    sessionStorage.removeItem("logged");
    await supabase.auth.signOut();
  };
  const sayHello = async () => {
    const { data } = await supabase.functions.invoke("hello", {
      body: { name: session.user.email },
    });
    alert(data?.message);
  };

  if (loading) return <p>Loading...</p>;

  if (!session)
    return (
      <div style={{ maxWidth: 360, margin: "80px auto", textAlign: "center" }}>
        <h1>Welcome</h1>
        <button onClick={googleLogin}>Sign in with Google</button>
        <hr style={{ margin: "24px 0" }} />
        <p>
          <small>Or use email (handy for testing two users)</small>
        </p>
        <input
          placeholder="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <br />
        <input
          placeholder="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <br />
        <button onClick={emailSignUp}>Sign up</button>
        <button onClick={emailSignIn}>Login</button>
        <p style={{ color: "crimson" }}>{msg}</p>
      </div>
    );

  return (
    <div style={{ maxWidth: 900, margin: "24px auto", padding: 16 }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2>
          Hi, {session.user.user_metadata?.full_name ?? session.user.email}
        </h2>
        <div>
          <button onClick={sayHello}>Call hello function</button>{" "}
          <button onClick={logout}>Logout</button>
        </div>
      </header>

      <h3>My notes (Task 1: RLS + RPC)</h3>
      <Notes />

      <h3 style={{ marginTop: 32 }}>Login history (Task 2)</h3>
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

      <h3 style={{ marginTop: 32 }}>Gemini Chatbot (Task 3)</h3>
      <Chat />
    </div>
  );
}

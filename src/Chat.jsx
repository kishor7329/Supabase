import { useState, useRef, useEffect } from "react";
import { supabase } from "./supabaseClient";

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);

  // load saved history when the page opens
  useEffect(() => {
    supabase
      .from("chat_messages")
      .select("role, content")
      .order("id")
      .then(({ data }) => setMessages(data ?? []));
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;

    const userMsg = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setBusy(true);

    // save the user's message
    await supabase.from("chat_messages").insert(userMsg);

    // ask Gemini through the edge function (full history gives it context)
    const { data, error } = await supabase.functions.invoke("chat", {
      body: { messages: next },
    });

    let reply;
    if (error) {
      let detail = error.message;
      try {
        detail = JSON.stringify(await error.context.json());
      } catch {}
      reply = "Error: " + detail;
    } else if (data?.error) {
      reply = "Error: " + data.error;
    } else {
      reply = data.reply;
      // save only real answers, not errors
      await supabase
        .from("chat_messages")
        .insert({ role: "assistant", content: reply });
    }

    setMessages([...next, { role: "assistant", content: reply }]);
    setBusy(false);
  };

  const clearChat = async () => {
    await supabase.from("chat_messages").delete().neq("id", 0);
    setMessages([]);
  };

  return (
    <div style={{ border: "1px solid #ccc", borderRadius: 8, padding: 12 }}>
      <div style={{ height: 320, overflowY: "auto" }}>
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              textAlign: m.role === "user" ? "right" : "left",
              margin: "8px 0",
            }}
          >
            <span
              style={{
                display: "inline-block",
                padding: "8px 12px",
                borderRadius: 12,
                whiteSpace: "pre-wrap",
                background: m.role === "user" ? "#1f4e79" : "#eee",
                color: m.role === "user" ? "#fff" : "#000",
              }}
            >
              {m.content}
            </span>
          </div>
        ))}
        {busy && (
          <p>
            <i>Gemini is typing...</i>
          </p>
        )}
        <div ref={endRef} />
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <input
          style={{ flex: 1, padding: 8 }}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask Gemini anything..."
        />
        <button onClick={send} disabled={busy}>
          Send
        </button>
        <button onClick={clearChat} disabled={busy}>
          Clear
        </button>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

export default function Notes() {
  const [notes, setNotes] = useState([]);
  const [text, setText] = useState("");
  const [count, setCount] = useState(null);

  const load = async () => {
    const { data } = await supabase.from("notes").select("*").order("id");
    setNotes(data ?? []);
    const { data: c } = await supabase.rpc("count_my_notes"); // RPC call
    setCount(c);
  };

  useEffect(() => {
    load();
  }, []);

  const add = async () => {
    if (!text.trim()) return;
    await supabase.from("notes").insert({ content: text });
    setText("");
    load();
  };

  const remove = async (id) => {
    await supabase.from("notes").delete().eq("id", id);
    load();
  };

  return (
    <div style={{ border: "1px solid #ccc", borderRadius: 8, padding: 12 }}>
      <p>
        Total notes (from RPC): <b>{count}</b>
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          style={{ flex: 1, padding: 8 }}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Write a note"
        />
        <button onClick={add}>Add</button>
      </div>
      <ul>
        {notes.map((n) => (
          <li key={n.id}>
            {n.content} <button onClick={() => remove(n.id)}>x</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

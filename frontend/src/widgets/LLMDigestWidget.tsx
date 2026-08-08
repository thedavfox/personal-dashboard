import { useState } from "react";

interface Props {
  data: { result?: string; error?: string } | undefined;
  prompt: string | null;
  onSavePrompt: (prompt: string) => void;
}

export function LLMDigestWidget({ data, prompt, onSavePrompt }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(prompt ?? "");

  if (editing) {
    return (
      <div className="llm-digest-edit">
        <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={6} />
        <div className="edit-actions">
          <button
            onClick={() => {
              onSavePrompt(draft);
              setEditing(false);
            }}
          >
            Save
          </button>
          <button onClick={() => setEditing(false)}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="llm-digest">
      <button className="edit-prompt-btn" onClick={() => setEditing(true)}>
        Edit prompt
      </button>
      {!data && <p className="widget-empty">Waiting for next scheduled run…</p>}
      {data?.error && <p className="widget-error">{data.error}</p>}
      {data?.result && <div className="llm-result">{data.result}</div>}
    </div>
  );
}

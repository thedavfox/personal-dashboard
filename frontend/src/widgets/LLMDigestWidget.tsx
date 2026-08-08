import { useState } from "react";

interface Article {
  title: string;
  url: string;
  summary: string;
}

interface Props {
  data: { articles?: Article[]; error?: string } | undefined;
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
      {data?.articles && data.articles.length === 0 && !data.error && (
        <p className="widget-empty">No relevant articles found.</p>
      )}
      {data?.articles && data.articles.length > 0 && (
        <ul className="digest-list">
          {data.articles.map((article, i) => (
            <li key={i}>
              <a href={article.url} target="_blank" rel="noopener noreferrer">
                {article.title}
              </a>
              <p>{article.summary}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

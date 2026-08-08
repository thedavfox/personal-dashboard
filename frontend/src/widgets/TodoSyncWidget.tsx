interface Task {
  id: number;
  title: string;
  completed: boolean;
  due_date: string | null;
}

export function TodoSyncWidget({ data }: { data: { tasks?: Task[]; error?: string } | undefined }) {
  if (!data) return <p className="widget-empty">Loading tasks…</p>;
  if (data.error) return <p className="widget-error">{data.error}</p>;

  return (
    <ul className="todo-list">
      {(data.tasks ?? []).map((task) => (
        <li key={task.id} className={task.completed ? "done" : ""}>
          <input type="checkbox" checked={task.completed} readOnly />
          <span>{task.title}</span>
          {task.due_date && <span className="due-date">{task.due_date}</span>}
        </li>
      ))}
    </ul>
  );
}

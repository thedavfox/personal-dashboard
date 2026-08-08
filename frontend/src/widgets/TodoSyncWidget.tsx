interface Task {
  id: number;
  taskName: string;
  status: string;
  dueDate: string | null;
}

export function TodoSyncWidget({ data }: { data: { tasks?: Task[]; error?: string } | undefined }) {
  if (!data) return <p className="widget-empty">Loading tasks…</p>;
  if (data.error) return <p className="widget-error">{data.error}</p>;

  return (
    <ul className="todo-list">
      {(data.tasks ?? []).map((task) => {
        const done = task.status === "complete";
        return (
          <li key={task.id} className={done ? "done" : ""}>
            <input type="checkbox" checked={done} readOnly />
            <span>{task.taskName}</span>
            {task.dueDate && <span className="due-date">{task.dueDate}</span>}
          </li>
        );
      })}
    </ul>
  );
}

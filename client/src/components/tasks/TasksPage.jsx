import { useEffect, useState } from 'react';
import { tasksApi } from '../../api.js';
import TaskProgressBar from './TaskProgressBar.jsx';
import TaskFilter from './TaskFilter.jsx';
import TaskList from './TaskList.jsx';
import TaskForm from './TaskForm.jsx';
import './TaskList.css';

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [view, setView] = useState('stav');
  const [editingTask, setEditingTask] = useState(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    tasksApi.list().then(setTasks);
  }, []);

  const assignees = [...new Set(tasks.map((t) => t.prirazeno).filter(Boolean))].sort();

  const filtered = tasks.filter((t) =>
    !assigneeFilter || t.prirazeno === assigneeFilter
  );

  async function handleSave(data) {
    if (editingTask) {
      const updated = await tasksApi.update(editingTask.id, data);
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } else {
      const created = await tasksApi.create(data);
      setTasks((prev) => [...prev, created]);
    }
    setShowForm(false);
    setEditingTask(null);
  }

  async function handleDelete(id) {
    await tasksApi.remove(id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  async function handleStatusChange(task, stav) {
    const updated = await tasksApi.update(task.id, { ...task, stav });
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }

  function openEdit(task) {
    setEditingTask(task);
    setShowForm(true);
  }

  function openAdd() {
    setEditingTask(null);
    setShowForm(true);
  }

  return (
    <div>
      <TaskProgressBar tasks={tasks} />
      <div className="page-header">
        <TaskFilter
          assignee={assigneeFilter}
          onAssigneeChange={setAssigneeFilter}
          assignees={assignees}
          view={view}
          onViewChange={setView}
        />
        <button className="btn" onClick={openAdd}>+ Přidat úkol</button>
      </div>
      <TaskList
        tasks={filtered}
        view={view}
        onEdit={openEdit}
        onDelete={handleDelete}
        onStatusChange={handleStatusChange}
      />
      {showForm && (
        <TaskForm
          task={editingTask}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditingTask(null); }}
        />
      )}
    </div>
  );
}

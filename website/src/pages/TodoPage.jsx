import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Check, Pencil, Plus, Trash2 } from 'lucide-react'
import { createTodo, deleteTodo, updateTodo } from '../lib/todosApi'
import { ConfirmDialog, Modal, PageHeader } from '../components/ui'
import { usePersistentState } from '../hooks/usePersistentState'

export function TodoPage({ tasks, setTasks, createIntent }) {
  const [newTask, setNewTask] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [filter, setFilter] = usePersistentState('starwaves.todo.filter', 'all')
  const [taskFormOpen, setTaskFormOpen] = useState(false)
  const [taskSaving, setTaskSaving] = useState(false)
  const [taskError, setTaskError] = useState('')
  const [deleteRequested, setDeleteRequested] = useState(null)

  const [editingTask, setEditingTask] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDueDate, setEditDueDate] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')

  useEffect(() => {
    if (createIntent?.type === 'todo') setTaskFormOpen(true)
  }, [createIntent?.requestId, createIntent?.type])

  const visibleTasks = useMemo(() => {
    if (filter === 'active') return tasks.filter((task) => !task.completed)
    if (filter === 'completed') return tasks.filter((task) => task.completed)
    return tasks
  }, [filter, tasks])

  const addTask = async (event) => {
    event.preventDefault()
    const title = newTask.trim()
    if (!title) return
    setTaskSaving(true)
    setTaskError('')
    try {
      const created = await createTodo({ title, dueDate })
      setTasks((current) => [created, ...current])
      setNewTask('')
      setDueDate('')
      setTaskFormOpen(false)
    } catch (error) {
      setTaskError(error.message)
    } finally {
      setTaskSaving(false)
    }
  }

  const openEditModal = (task) => {
    setEditingTask(task)
    setEditTitle(task.title || '')
    setEditDueDate(task.dueDate || '')
    setEditError('')
  }

  const saveTaskEdit = async (event) => {
    event.preventDefault()
    if (!editingTask) return
    const title = editTitle.trim()
    if (!title) return
    setEditSaving(true)
    setEditError('')
    try {
      const updated = await updateTodo(editingTask.id, { title, dueDate: editDueDate })
      setTasks((current) =>
        current.map((item) => (item.id === editingTask.id ? updated : item)),
      )
      setEditingTask(null)
    } catch (error) {
      setEditError(error.message)
    } finally {
      setEditSaving(false)
    }
  }

  const toggleTask = async (id) => {
    const task = tasks.find((item) => item.id === id)
    if (!task) return
    setTaskError('')
    try {
      const updated = await updateTodo(id, { completed: !task.completed })
      setTasks((current) =>
        current.map((item) => (item.id === id ? updated : item)),
      )
    } catch (error) {
      setTaskError(error.message)
    }
  }

  const removeTask = async () => {
    const task = deleteRequested
    if (!task) return
    setDeleteRequested(null)
    setTaskError('')
    try {
      await deleteTodo(task.id)
      setTasks((current) => current.filter((item) => item.id !== task.id))
    } catch (error) {
      setTaskError(error.message)
    }
  }

  return (
    <section className="todo-page">
      <PageHeader
        eyebrow="Tasks"
        title="Todo List"
        className="todo-page-heading"
        actions={
          <button
            className="primary-button todo-add-trigger"
            onClick={() => setTaskFormOpen(true)}
          >
            <Plus size={17} />
            Add task
          </button>
        }
      />

      <div className="todo-container">
        {taskError && <div className="todo-api-error" role="alert">{taskError}</div>}
        <div className="todo-filters" aria-label="Filter tasks">
          {['all', 'active', 'completed'].map((item) => (
            <button
              className={filter === item ? 'active' : ''}
              key={item}
              onClick={() => setFilter(item)}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="todo-list">
          {visibleTasks.length ? (
            visibleTasks.map((task) => (
              <div
              className={`todo-item ${task.completed ? 'completed' : ''}`}
              data-record-id={task.id}
                key={task.id}
              >
                <button
                  className="todo-check"
                  onClick={() => toggleTask(task.id)}
                  aria-label={`${task.completed ? 'Mark active' : 'Complete'} ${task.title}`}
                >
                  {task.completed && <Check size={14} />}
                </button>
                <div className="todo-item-copy">
                  <span>{task.title}</span>
                  {task.dueDate && (
                    <small>
                      <CalendarDays size={12} />
                      {new Date(`${task.dueDate}T00:00:00`).toLocaleDateString(
                        undefined,
                        { day: 'numeric', month: 'short', year: 'numeric' },
                      )}
                    </small>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                  <button
                    className="todo-delete"
                    onClick={() => openEditModal(task)}
                    aria-label={`Edit ${task.title}`}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    className="todo-delete"
                    onClick={() => setDeleteRequested(task)}
                    aria-label={`Delete ${task.title}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="todo-empty">
              <Check size={21} />
              <p>No tasks here.</p>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={taskFormOpen}
        onClose={() => setTaskFormOpen(false)}
        className="todo-modal"
        subtitle="New task"
        title="What needs to be done?"
      >
        <form className="todo-modal-form" onSubmit={addTask}>
          <label htmlFor="task-title">Task name</label>
          <input
            id="task-title"
            value={newTask}
            onChange={(event) => setNewTask(event.target.value)}
            placeholder="Enter a task"
            data-modal-initial-focus
            disabled={taskSaving}
          />
          <label htmlFor="task-date">Due date (optional)</label>
          <input
            id="task-date"
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            disabled={taskSaving}
          />
          {taskError && <div className="todo-api-error" role="alert">{taskError}</div>}
          <div className="todo-modal-actions">
            <button
              className="secondary-button"
              type="button"
              onClick={() => setTaskFormOpen(false)}
              disabled={taskSaving}
            >
              Cancel
            </button>
            <button className="primary-button" type="submit" disabled={taskSaving}>
              <Plus size={17} />
              {taskSaving ? 'Saving…' : 'Add task'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(editingTask)}
        onClose={() => setEditingTask(null)}
        className="todo-modal"
        subtitle="Edit task"
        title="Update details"
      >
        <form className="todo-modal-form" onSubmit={saveTaskEdit}>
          <label htmlFor="edit-task-title-input">Task name</label>
          <input
            id="edit-task-title-input"
            value={editTitle}
            onChange={(event) => setEditTitle(event.target.value)}
            placeholder="Enter task name"
            data-modal-initial-focus
            disabled={editSaving}
            required
          />
          <label htmlFor="edit-task-date-input">Due date (optional)</label>
          <input
            id="edit-task-date-input"
            type="date"
            value={editDueDate}
            onChange={(event) => setEditDueDate(event.target.value)}
            disabled={editSaving}
          />
          {editError && <div className="todo-api-error" role="alert">{editError}</div>}
          <div className="todo-modal-actions">
            <button
              className="secondary-button"
              type="button"
              onClick={() => setEditingTask(null)}
              disabled={editSaving}
            >
              Cancel
            </button>
            <button className="primary-button" type="submit" disabled={editSaving}>
              {editSaving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog
        isOpen={Boolean(deleteRequested)}
        title="Delete task?"
        message={deleteRequested ? `“${deleteRequested.title}” will be permanently deleted.` : ''}
        confirmLabel="Delete task"
        onCancel={() => setDeleteRequested(null)}
        onConfirm={removeTask}
      />
    </section>
  )
}

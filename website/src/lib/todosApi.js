import { getStoredAuthToken } from './authApi'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api/v1'

async function request(path = '', options = {}) {
  const token = getStoredAuthToken()
  if (!token) throw new Error('Sign in to access your todo list.')
  const response = await fetch(`${API_URL}/todos${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
  })
  if (!response.ok) {
    const failure = await response.json().catch(() => null)
    throw new Error(failure?.detail || 'The todo database is unavailable.')
  }
  return response.status === 204 ? null : response.json()
}

function fromApi(todo) {
  return {
    id: todo.id,
    title: todo.title,
    completed: todo.completed,
    dueDate: todo.due_date ?? '',
  }
}

export async function loadTodos() {
  const todos = await request()
  return todos.map(fromApi)
}

export async function createTodo(todo) {
  const created = await request('', {
    method: 'POST',
    body: JSON.stringify({
      title: todo.title,
      completed: false,
      due_date: todo.dueDate || null,
    }),
  })
  return fromApi(created)
}

export async function updateTodo(todoId, changes) {
  const payload = {}
  if ('title' in changes) payload.title = changes.title
  if ('completed' in changes) payload.completed = changes.completed
  if ('dueDate' in changes) payload.due_date = changes.dueDate || null
  const updated = await request(`/${encodeURIComponent(todoId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  return fromApi(updated)
}

export function deleteTodo(todoId) {
  return request(`/${encodeURIComponent(todoId)}`, { method: 'DELETE' })
}

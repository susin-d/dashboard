import { apiRequest } from './request'

const BASE_PATH = '/todos'
const ERROR_MESSAGE = 'The todo database is unavailable.'
const TOKEN_MESSAGE = 'Sign in to access your todo list.'

function request(path = '', options = {}) {
  return apiRequest(path, {
    basePath: BASE_PATH,
    errorMessage: ERROR_MESSAGE,
    missingTokenMessage: TOKEN_MESSAGE,
    ...options,
  })
}

export function mapTodoFromApi(todo) {
  return {
    id: todo.id,
    title: todo.title,
    completed: todo.completed,
    dueDate: todo.due_date ?? '',
  }
}

export async function loadTodos() {
  const todos = await request()
  const items = Array.isArray(todos) ? todos : todos.items ?? []
  return items.map(mapTodoFromApi)
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
  return mapTodoFromApi(created)
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
  return mapTodoFromApi(updated)
}

export function deleteTodo(todoId) {
  return request(`/${encodeURIComponent(todoId)}`, { method: 'DELETE' })
}

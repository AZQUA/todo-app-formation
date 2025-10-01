let todos = [];

async function loadTodos() {
  try {
    const response = await fetch('/api/todos');
    if (!response.ok) throw new Error('Erreur chargement');
    todos = await response.json();
    renderTodos();
  } catch (err) {
    showError('Erreur: ' + err.message);
  }
}

function renderTodos() {
  const list = document.getElementById('todoList');
  list.innerHTML = '';
  todos.forEach(todo => {
    const li = document.createElement('li');
    li.className = todo.completed ? 'done' : '';
    li.innerHTML = `
      <span>${todo.title}</span>
      <div>
        <button onclick="toggleDone(${todo.id})" ${todo.completed ? 'disabled' : ''}>Done</button>
        <button onclick="deleteTodo(${todo.id})" style="background: #f44336; margin-left: 5px;">Supprimer</button>
      </div>
    `;
    list.appendChild(li);
  });
}

async function addTask() {
  const input = document.getElementById('taskInput');
  const title = input.value.trim();
  if (!title) {
    showError('Titre requis');
    return;
  }
  try {
    const response = await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title })
    });
    if (!response.ok) throw new Error('Erreur ajout');
    input.value = '';
    hideError();
    loadTodos();  // Refresh la liste
  } catch (err) {
    showError('Erreur ajout: ' + err.message);
  }
}

async function toggleDone(id) {
  try {
    const response = await fetch(`/api/todos/${id}`, { method: 'PUT' });
    if (!response.ok) throw new Error('Erreur update');
    loadTodos();
  } catch (err) {
    showError('Erreur: ' + err.message);
  }
}

async function deleteTodo(id) {
  if (!confirm('Supprimer cette tâche ?')) return;
  try {
    const response = await fetch(`/api/todos/${id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Erreur suppression');
    loadTodos();
  } catch (err) {
    showError('Erreur: ' + err.message);
  }
}

function showError(msg) {
  const errorEl = document.getElementById('errorMsg');
  errorEl.textContent = msg;
  errorEl.style.display = 'block';
}

function hideError() {
  document.getElementById('errorMsg').style.display = 'none';
}

// Chargement initial + événement Enter
loadTodos();
document.getElementById('taskInput').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') addTask();
});
// Global State
let tasks = JSON.parse(localStorage.getItem('student_tasks')) || [];
let theme = localStorage.getItem('theme') || 'light';

// DOM References
const taskForm = document.getElementById('taskForm');
const taskTitleInput = document.getElementById('taskTitle');
const taskCategoryInput = document.getElementById('taskCategory');
const taskDueDateInput = document.getElementById('taskDueDate');
const taskPriorityInput = document.getElementById('taskPriority');
const taskList = document.getElementById('taskList');

const searchInput = document.getElementById('searchInput');
const statusFilter = document.getElementById('statusFilter');
const sortOption = document.getElementById('sortOption');
const themeToggleBtn = document.getElementById('themeToggle');

// Apply Initial Theme
document.documentElement.setAttribute('data-theme', theme);

// --- 1. LOCAL STORAGE & STATS ---
function saveAndRender() {
  localStorage.setItem('student_tasks', JSON.stringify(tasks));
  renderTasks();
  updateStats();
}

function updateStats() {
  const total = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const pending = total - completed;

  document.getElementById('totalTasks').textContent = total;
  document.getElementById('completedTasks').textContent = completed;
  document.getElementById('pendingTasks').textContent = pending;
}

// --- 2. ADD TASK ---
taskForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const newTask = {
    id: Date.now().toString(),
    title: taskTitleInput.value.trim(),
    category: taskCategoryInput.value,
    dueDate: taskDueDateInput.value,
    priority: taskPriorityInput.value,
    completed: false
  };

  tasks.push(newTask);
  taskForm.reset();
  saveAndRender();
});

// --- 3. RENDER TASKS WITH FILTERS, SORTING, & OVERDUE HIGHLIGHT ---
function renderTasks() {
  taskList.innerHTML = '';

  let filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchInput.value.toLowerCase());
    const matchesStatus = statusFilter.value === 'All' ? true :
      statusFilter.value === 'Completed' ? task.completed : !task.completed;
    return matchesSearch && matchesStatus;
  });

  // Sorting
  filteredTasks.sort((a, b) => {
    if (sortOption.value === 'dueDate') {
      return new Date(a.dueDate) - new Date(b.dueDate);
    } else {
      const priorityOrder = { High: 1, Medium: 2, Low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
  });

  const today = new Date().toISOString().split('T')[0];

  filteredTasks.forEach(task => {
    const li = document.createElement('li');
    li.className = `task-item ${task.completed ? 'completed' : ''}`;
    li.draggable = true;
    li.dataset.id = task.id;

    const isOverdue = !task.completed && task.dueDate < today;
    if (isOverdue) li.classList.add('overdue');

    li.innerHTML = `
      <div>
        <input type="checkbox" ${task.completed ? 'checked' : ''} class="toggle-check">
        <span class="task-title-text">${escapeHTML(task.title)}</span>
        <span class="badge badge-category">${task.category}</span>
        <span class="badge badge-priority-${task.priority}">${task.priority}</span>
        <small style="margin-left:8px; opacity:0.8;">📅 ${task.dueDate} ${isOverdue ? '⚠️ OVERDUE' : ''}</small>
      </div>
      <div class="task-actions">
        <button class="edit-btn">✏️</button>
        <button class="delete-btn">🗑️</button>
      </div>
    `;

    // Event Handlers for Item Controls
    li.querySelector('.toggle-check').addEventListener('change', () => toggleTask(task.id));
    li.querySelector('.delete-btn').addEventListener('click', () => deleteTask(task.id));
    li.querySelector('.edit-btn').addEventListener('click', () => editTask(task.id));

    // Drag and Drop Listeners
    addDragListeners(li);

    taskList.appendChild(li);
  });
}

// --- 4. EDIT, DELETE, TOGGLE ---
function toggleTask(id) {
  tasks = tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
  saveAndRender();
}

function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  saveAndRender();
}

function editTask(id) {
  const task = tasks.find(t => t.id === id);
  const newTitle = prompt('Edit Task Name:', task.title);
  if (newTitle !== null && newTitle.trim() !== '') {
    task.title = newTitle.trim();
    saveAndRender();
  }
}

// Security helper against XSS
function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

// --- 5. SEARCH & FILTER EVENTS ---
searchInput.addEventListener('input', renderTasks);
statusFilter.addEventListener('change', renderTasks);
sortOption.addEventListener('change', renderTasks);

// --- 6. DARK MODE TOGGLE ---
themeToggleBtn.addEventListener('click', () => {
  theme = theme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  themeToggleBtn.textContent = theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
});

// --- 7. DRAG AND DROP REORDERING ---
let draggedItem = null;

function addDragListeners(item) {
  item.addEventListener('dragstart', () => {
    draggedItem = item;
    setTimeout(() => item.classList.add('dragging'), 0);
  });

  item.addEventListener('dragend', () => {
    item.classList.remove('dragging');
    draggedItem = null;
    // Reorder array based on DOM positions
    const newOrderIds = [...taskList.querySelectorAll('.task-item')].map(el => el.dataset.id);
    tasks.sort((a, b) => newOrderIds.indexOf(a.id) - newOrderIds.indexOf(b.id));
    localStorage.setItem('student_tasks', JSON.stringify(tasks));
  });
}

taskList.addEventListener('dragover', (e) => {
  e.preventDefault();
  const afterElement = getDragAfterElement(taskList, e.clientY);
  if (afterElement == null) {
    taskList.appendChild(draggedItem);
  } else {
    taskList.insertBefore(draggedItem, afterElement);
  }
});

function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll('.task-item:not(.dragging)')];
  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// Initial Load
renderTasks();
updateStats();
// Расширенная система управления складом
// Новые глобальные переменные
let selectedTasks = new Set();
let currentFilters = {};
let savedFilters = [];
let tasksStats = {};
let autoRefreshInterval = null;

// Инициализация расширенного функционала
document.addEventListener('DOMContentLoaded', function() {
    startAutoRefresh();
    loadSavedFilters();
    loadTasksStats();
});

// Автоматическое обновление данных каждые 30 секунд
function startAutoRefresh() {
    autoRefreshInterval = setInterval(() => {
        loadData();
        loadTasksStats();
    }, 30000);
}

// Загрузка статистики заданий
async function loadTasksStats() {
    try {
        const response = await fetch(`${API_URL}/tasks/stats`);
        if (response.ok) {
            tasksStats = await response.json();
            updateTabCounters();
        }
    } catch (error) {
        console.error('Ошибка загрузки статистики:', error);
    }
}

// Обновление счетчиков в вкладках
function updateTabCounters() {
    const tasksCounter = document.getElementById('tasksCounter');
    const receptionsCounter = document.getElementById('receptionsCounter');
    const archiveCounter = document.getElementById('archiveCounter');
    
    if (tasksStats.total_tasks !== undefined) {
        tasksCounter.textContent = tasksStats.total_tasks;
        tasksCounter.style.display = tasksStats.total_tasks > 0 ? 'inline' : 'none';
        
        // Красный счетчик для просроченных заданий
        if (tasksStats.overdue_count > 0) {
            tasksCounter.style.background = 'var(--danger)';
            tasksCounter.title = `${tasksStats.overdue_count} просроченных заданий`;
        } else {
            tasksCounter.style.background = '';
            tasksCounter.title = '';
        }
    }
    
    if (receptions.length > 0) {
        receptionsCounter.textContent = receptions.length;
        receptionsCounter.style.display = 'inline';
    } else {
        receptionsCounter.style.display = 'none';
    }
    
    if (archivedTasks.length > 0) {
        archiveCounter.textContent = archivedTasks.length;
        archiveCounter.style.display = 'inline';
    } else {
        archiveCounter.style.display = 'none';
    }
}

// Расширенное отображение заданий с чекбоксами и новыми полями
function renderTasksExtended() {
    const content = document.getElementById('content');
    
    if (tasks.length === 0) {
        content.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📋</div>
                <h3>Нет активных заданий</h3>
                <p>Создайте первое задание, нажав кнопку "Создать задание"</p>
                <button class="btn btn-primary" onclick="openTaskModal()">
                    <span>➕</span> Создать первое задание
                </button>
            </div>
        `;
        return;
    }

    content.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th style="width: 40px;">
                        <input type="checkbox" class="checkbox" id="selectAll" onchange="toggleSelectAll()">
                    </th>
                    <th onclick="sortTable('number')">
                        Номер <span class="sort-indicator">${getSortIndicator('number')}</span>
                    </th>
                    <th onclick="sortTable('name')">
                        Наименование <span class="sort-indicator">${getSortIndicator('name')}</span>
                    </th>
                    <th onclick="sortTable('priority')">
                        Приоритет <span class="sort-indicator">${getSortIndicator('priority')}</span>
                    </th>
                    <th onclick="sortTable('responsible')">
                        Ответственный <span class="sort-indicator">${getSortIndicator('responsible')}</span>
                    </th>
                    <th onclick="sortTable('due_date')">
                        Срок <span class="sort-indicator">${getSortIndicator('due_date')}</span>
                    </th>
                    <th onclick="sortTable('status')">
                        Статус <span class="sort-indicator">${getSortIndicator('status')}</span>
                    </th>
                    <th onclick="sortTable('created_date')">
                        Дата создания <span class="sort-indicator">${getSortIndicator('created_date')}</span>
                    </th>
                    <th style="width: 120px;">Действия</th>
                </tr>
            </thead>
            <tbody>
                ${tasks.map((task, index) => {
                    const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'готово';
                    const rowClass = isOverdue ? 'overdue-row' : '';
                    
                    return `
                        <tr class="${rowClass}" ondblclick="editTask(${task.id})" 
                            style="animation: fadeInUp 0.3s ease ${index * 0.05}s both">
                            <td onclick="event.stopPropagation()">
                                <input type="checkbox" class="checkbox task-checkbox" 
                                       value="${task.id}" onchange="toggleTaskSelection(${task.id})">
                            </td>
                            <td><strong>${escapeHtml(task.number)}</strong></td>
                            <td>
                                ${escapeHtml(task.name)}
                                ${task.attachments ? '<span style="color: var(--info);">📎</span>' : ''}
                            </td>
                            <td>${getPriorityBadge(task.priority)}</td>
                            <td>${escapeHtml(task.responsible || '—')}</td>
                            <td>
                                ${task.due_date ? formatDate(task.due_date) : '—'}
                                ${isOverdue ? '<span class="overdue-indicator">⚠️</span>' : ''}
                            </td>
                            <td>${getStatusBadge(task.status)}</td>
                            <td>${formatDate(task.created_date)}</td>
                            <td onclick="event.stopPropagation()">
                                <div class="action-buttons">
                                    <button class="btn-icon" onclick="editTask(${task.id})" title="Редактировать">
                                        ✏️
                                    </button>
                                    <button class="btn-icon" onclick="deleteTask(${task.id})" title="Удалить">
                                        🗑️
                                    </button>
                                    <button class="btn-icon" onclick="viewHistory(${task.id})" title="История">
                                        📜
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
    
    updateCheckboxStates();
}

// Получение бейджа приоритета
function getPriorityBadge(priority) {
    return `<span class="priority priority-${priority}">${escapeHtml(priority)}</span>`;
}

// Управление выделением заданий
function toggleTaskSelection(taskId) {
    if (selectedTasks.has(taskId)) {
        selectedTasks.delete(taskId);
    } else {
        selectedTasks.add(taskId);
    }
    updateBulkActions();
    updateCheckboxStates();
}

function toggleSelectAll() {
    const selectAllCheckbox = document.getElementById('selectAll');
    const taskCheckboxes = document.querySelectorAll('.task-checkbox');
    
    if (selectAllCheckbox.checked) {
        taskCheckboxes.forEach(checkbox => {
            const taskId = parseInt(checkbox.value);
            selectedTasks.add(taskId);
            checkbox.checked = true;
        });
    } else {
        selectedTasks.clear();
        taskCheckboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
    }
    
    updateBulkActions();
}

function selectAllTasks() {
    tasks.forEach(task => selectedTasks.add(task.id));
    updateBulkActions();
    updateCheckboxStates();
}

function clearSelection() {
    selectedTasks.clear();
    updateBulkActions();
    updateCheckboxStates();
}

function updateCheckboxStates() {
    const selectAllCheckbox = document.getElementById('selectAll');
    const taskCheckboxes = document.querySelectorAll('.task-checkbox');
    
    if (selectAllCheckbox) {
        const allSelected = taskCheckboxes.length > 0 && 
                           Array.from(taskCheckboxes).every(cb => selectedTasks.has(parseInt(cb.value)));
        selectAllCheckbox.checked = allSelected;
    }
    
    taskCheckboxes.forEach(checkbox => {
        checkbox.checked = selectedTasks.has(parseInt(checkbox.value));
    });
}

function updateBulkActions() {
    const bulkActions = document.getElementById('bulkActions');
    const selectedCount = document.getElementById('selectedCount');
    
    if (selectedTasks.size > 0) {
        bulkActions.classList.add('show');
        selectedCount.textContent = selectedTasks.size;
    } else {
        bulkActions.classList.remove('show');
    }
}

// Массовые операции
async function applyBulkUpdate() {
    if (selectedTasks.size === 0) {
        showToast('warning', 'Предупреждение', 'Не выбрано ни одного задания');
        return;
    }
    
    const statusSelect = document.getElementById('bulkStatusSelect');
    const prioritySelect = document.getElementById('bulkPrioritySelect');
    
    const updateData = {
        task_ids: Array.from(selectedTasks)
    };
    
    if (statusSelect.value) updateData.status = statusSelect.value;
    if (prioritySelect.value) updateData.priority = prioritySelect.value;
    
    if (!statusSelect.value && !prioritySelect.value) {
        showToast('warning', 'Предупреждение', 'Выберите что нужно изменить');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/tasks/bulk-update`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        });
        
        if (!response.ok) {
            throw new Error('Ошибка массового обновления');
        }
        
        const result = await response.json();
        showToast('success', 'Успешно', result.message);
        
        clearSelection();
        statusSelect.value = '';
        prioritySelect.value = '';
        loadData();
        
    } catch (error) {
        console.error('Ошибка:', error);
        showToast('error', 'Ошибка', 'Не удалось выполнить массовое обновление');
    }
}

async function bulkDeleteTasks() {
    if (selectedTasks.size === 0) {
        showToast('warning', 'Предупреждение', 'Не выбрано ни одного задания');
        return;
    }
    
    const confirmed = await showConfirmDialog(
        'Массовое удаление',
        `Вы действительно хотите удалить ${selectedTasks.size} заданий? Это действие нельзя отменить.`
    );
    
    if (!confirmed) return;
    
    try {
        const response = await fetch(`${API_URL}/tasks/bulk-delete`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(Array.from(selectedTasks))
        });
        
        if (!response.ok) {
            throw new Error('Ошибка массового удаления');
        }
        
        const result = await response.json();
        showToast('success', 'Успешно', result.message);
        
        clearSelection();
        loadData();
        
    } catch (error) {
        console.error('Ошибка:', error);
        showToast('error', 'Ошибка', 'Не удалось выполнить массовое удаление');
    }
}

// Расширенные фильтры
function toggleFilters() {
    const filtersPanel = document.getElementById('filtersPanel');
    const filtersToggle = document.getElementById('filtersToggle');
    
    if (filtersPanel.classList.contains('show')) {
        filtersPanel.classList.remove('show');
        filtersToggle.innerHTML = '<span>🔍</span> Фильтры';
    } else {
        filtersPanel.classList.add('show');
        filtersToggle.innerHTML = '<span>🔍</span> Скрыть фильтры';
        setupFiltersPanel();
    }
}

function setupFiltersPanel() {
    const filtersGrid = document.getElementById('filtersGrid');
    
    if (currentTab === 0) {
        filtersGrid.innerHTML = `
            <div class="filter-group">
                <label class="filter-label">Статус</label>
                <select class="filter-select" id="filterStatus">
                    <option value="">Все статусы</option>
                    <option value="в разработке">В разработке</option>
                    <option value="подготовлено">Подготовлено</option>
                    <option value="отправлено">Отправлено</option>
                    <option value="выполняется">Выполняется</option>
                    <option value="остановлено">Остановлено</option>
                    <option value="готово">Готово</option>
                </select>
            </div>
            <div class="filter-group">
                <label class="filter-label">Приоритет</label>
                <select class="filter-select" id="filterPriority">
                    <option value="">Все приоритеты</option>
                    <option value="низкий">Низкий</option>
                    <option value="средний">Средний</option>
                    <option value="высокий">Высокий</option>
                    <option value="срочный">Срочный</option>
                </select>
            </div>
            <div class="filter-group">
                <label class="filter-label">Ответственный</label>
                <input type="text" class="filter-input" id="filterResponsible" placeholder="Имя ответственного">
            </div>
            <div class="filter-group">
                <label class="filter-label">Просроченные</label>
                <select class="filter-select" id="filterOverdue">
                    <option value="">Все задания</option>
                    <option value="true">Только просроченные</option>
                    <option value="false">Не просроченные</option>
                </select>
            </div>
        `;
    }
    
    // Заполняем текущие значения фильтров
    Object.keys(currentFilters).forEach(key => {
        const element = document.getElementById(`filter${key.charAt(0).toUpperCase() + key.slice(1)}`);
        if (element) {
            element.value = currentFilters[key] || '';
        }
    });
}

function applyFilters() {
    currentFilters = {};
    
    const filterElements = document.querySelectorAll('#filtersGrid .filter-select, #filtersGrid .filter-input');
    filterElements.forEach(element => {
        const filterName = element.id.replace('filter', '').toLowerCase();
        if (element.value) {
            currentFilters[filterName] = element.value;
        }
    });
    
    loadData();
    showToast('info', 'Фильтры', 'Фильтры применены');
}

function clearFilters() {
    currentFilters = {};
    const filterElements = document.querySelectorAll('#filtersGrid .filter-select, #filtersGrid .filter-input');
    filterElements.forEach(element => {
        element.value = '';
    });
    loadData();
    showToast('info', 'Фильтры', 'Фильтры очищены');
}

// Сохранение и загрузка фильтров
async function saveCurrentFilter() {
    if (Object.keys(currentFilters).length === 0) {
        showToast('warning', 'Предупреждение', 'Нет активных фильтров для сохранения');
        return;
    }
    
    const name = prompt('Введите название для фильтра:');
    if (!name) return;
    
    try {
        const response = await fetch(`${API_URL}/filters`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: name,
                filter_data: JSON.stringify(currentFilters)
            })
        });
        
        if (!response.ok) {
            throw new Error('Ошибка сохранения фильтра');
        }
        
        showToast('success', 'Успешно', 'Фильтр сохранен');
        loadSavedFilters();
        
    } catch (error) {
        console.error('Ошибка:', error);
        showToast('error', 'Ошибка', 'Не удалось сохранить фильтр');
    }
}

async function loadSavedFilters() {
    try {
        const response = await fetch(`${API_URL}/filters`);
        if (response.ok) {
            savedFilters = await response.json();
            updateSavedFiltersSelect();
        }
    } catch (error) {
        console.error('Ошибка загрузки сохраненных фильтров:', error);
    }
}

function updateSavedFiltersSelect() {
    const select = document.getElementById('savedFilters');
    if (!select) return;
    
    select.innerHTML = '<option value="">Сохраненные фильтры</option>';
    savedFilters.forEach(filter => {
        const option = document.createElement('option');
        option.value = filter.id;
        option.textContent = filter.name;
        select.appendChild(option);
    });
}

function loadSavedFilter() {
    const select = document.getElementById('savedFilters');
    const filterId = select.value;
    
    if (!filterId) return;
    
    const filter = savedFilters.find(f => f.id == filterId);
    if (filter) {
        currentFilters = JSON.parse(filter.filter_data);
        setupFiltersPanel();
        loadData();
        showToast('info', 'Фильтр', `Применен фильтр "${filter.name}"`);
    }
}

// Экспорт новых функций
window.toggleFilters = toggleFilters;
window.applyFilters = applyFilters;
window.clearFilters = clearFilters;
window.saveCurrentFilter = saveCurrentFilter;
window.loadSavedFilter = loadSavedFilter;
window.toggleTaskSelection = toggleTaskSelection;
window.toggleSelectAll = toggleSelectAll;
window.selectAllTasks = selectAllTasks;
window.clearSelection = clearSelection;
window.applyBulkUpdate = applyBulkUpdate;
window.bulkDeleteTasks = bulkDeleteTasks;
window.renderTasksExtended = renderTasksExtended; 
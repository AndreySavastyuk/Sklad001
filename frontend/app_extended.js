// Глобальные переменные
let currentTab = 0;
let tasks = [];
let receptions = [];
let archivedTasks = [];
let sortColumn = 'created_date';
let sortOrder = 'desc';
let editingItem = null;
let selectedTasks = new Set();
let currentFilters = {};
let savedFilters = [];
let tasksStats = {};
let autoRefreshInterval = null;

// API конфигурация
const API_BASE_URL = window.location.origin;
const API_URL = `${API_BASE_URL}/api`;

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    loadData();
    loadSavedFilters();
    updateToolbar();
    startAutoRefresh();
    
    // Добавляем анимацию для логотипа
    const logoIcon = document.querySelector('.logo-icon');
    if (logoIcon) {
        setInterval(() => {
            logoIcon.style.transform = 'rotate(-5deg) scale(1.1)';
            setTimeout(() => {
                logoIcon.style.transform = 'rotate(-5deg) scale(1)';
            }, 200);
        }, 5000);
    }
});

// Автоматическое обновление данных
function startAutoRefresh() {
    autoRefreshInterval = setInterval(() => {
        loadData();
        loadTasksStats();
    }, 30000); // Каждые 30 секунд
}

// Переключение вкладок
function switchTab(tabIndex) {
    currentTab = tabIndex;
    
    // Обновление активной вкладки
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach((tab, index) => {
        if (index === tabIndex) {
            tab.classList.add('active');
            tab.style.transform = 'scale(1.05)';
            setTimeout(() => {
                tab.style.transform = 'scale(1)';
            }, 200);
        } else {
            tab.classList.remove('active');
        }
    });

    // Сброс выделения и поиска
    clearSelection();
    document.getElementById('searchInput').value = '';
    
    // Обновление панели инструментов
    updateToolbar();
    
    // Загрузка данных
    loadData();
}

// Обновление панели инструментов
function updateToolbar() {
    const toolbarButtons = document.getElementById('toolbarButtons');
    toolbarButtons.innerHTML = '';

    if (currentTab === 0) {
        toolbarButtons.innerHTML = `
            <button class="btn btn-primary" onclick="openTaskModal()">
                <span>➕</span> Создать задание
            </button>
            <button class="btn btn-secondary" onclick="importExcel()">
                <span>📥</span> Импорт Excel
            </button>
            <button class="btn btn-secondary" onclick="toggleGrouping()">
                <span>📊</span> Группировка
            </button>
        `;
    } else if (currentTab === 1) {
        toolbarButtons.innerHTML = `
            <button class="btn btn-primary" onclick="openReceptionModal()">
                <span>➕</span> Добавить приемку
            </button>
        `;
    }
    
    // Анимация появления кнопок
    const buttons = toolbarButtons.querySelectorAll('.btn');
    buttons.forEach((btn, index) => {
        btn.style.opacity = '0';
        btn.style.transform = 'translateY(20px)';
        setTimeout(() => {
            btn.style.transition = 'all 0.3s ease';
            btn.style.opacity = '1';
            btn.style.transform = 'translateY(0)';
        }, index * 100);
    });
}

// Загрузка данных
async function loadData() {
    showLoading();
    
    try {
        let url = '';
        const params = new URLSearchParams();
        
        // Добавляем фильтры
        Object.keys(currentFilters).forEach(key => {
            if (currentFilters[key]) {
                params.append(key, currentFilters[key]);
            }
        });
        
        params.append('sort_by', sortColumn);
        params.append('sort_order', sortOrder);
        
        if (currentTab === 0) {
            params.append('archived', 'false');
            url = `${API_URL}/tasks?${params.toString()}`;
        } else if (currentTab === 1) {
            url = `${API_URL}/receptions?${params.toString()}`;
        } else if (currentTab === 2) {
            params.set('archived', 'true');
            url = `${API_URL}/tasks?${params.toString()}`;
        }

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();

        if (currentTab === 0) {
            tasks = data;
            renderTasks();
        } else if (currentTab === 1) {
            receptions = data;
            renderReceptions();
        } else if (currentTab === 2) {
            archivedTasks = data;
            renderArchivedTasks();
        }
        
        // Обновляем счетчики
        updateTabCounters();
        
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        showError(`Не удалось загрузить данные: ${error.message}`);
    }
}

// Загрузка статистики
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
        
        // Показываем красный счетчик для просроченных заданий
        if (tasksStats.overdue_count > 0) {
            tasksCounter.style.background = 'var(--danger)';
            tasksCounter.title = `${tasksStats.overdue_count} просроченных заданий`;
        } else {
            tasksCounter.style.background = '';
            tasksCounter.title = '';
        }
    }
    
    receptionsCounter.textContent = receptions.length;
    receptionsCounter.style.display = receptions.length > 0 ? 'inline' : 'none';
    
    archiveCounter.textContent = archivedTasks.length;
    archiveCounter.style.display = archivedTasks.length > 0 ? 'inline' : 'none';
}

// Отображение заданий с расширенным функционалом
function renderTasks() {
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
    
    // Обновляем состояние чекбоксов
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
        
        // Сбрасываем выделение и перезагружаем данные
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

// Модальное окно для задания с расширенными полями
function openTaskModal(task = null) {
    editingItem = task;
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    
    modalTitle.textContent = task ? 'Редактирование задания' : 'Создание задания';
    
    modalBody.innerHTML = `
        <form id="taskForm" onsubmit="return false;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div class="form-group">
                    <label class="form-label">Номер задания <span class="required">*</span></label>
                    <input type="text" 
                           class="form-control" 
                           id="taskNumber" 
                           value="${task?.number || ''}" 
                           ${task ? 'disabled' : ''}
                           placeholder="2023/001"
                           required>
                </div>
                <div class="form-group">
                    <label class="form-label">Приоритет</label>
                    <select class="form-control" id="taskPriority">
                        <option value="низкий" ${task?.priority === 'низкий' ? 'selected' : ''}>Низкий</option>
                        <option value="средний" ${task?.priority === 'средний' ? 'selected' : ''}>Средний</option>
                        <option value="высокий" ${task?.priority === 'высокий' ? 'selected' : ''}>Высокий</option>
                        <option value="срочный" ${task?.priority === 'срочный' ? 'selected' : ''}>Срочный</option>
                    </select>
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label">Наименование <span class="required">*</span></label>
                <input type="text" 
                       class="form-control" 
                       id="taskName" 
                       value="${task?.name || ''}"
                       placeholder="Название изделия"
                       required>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div class="form-group">
                    <label class="form-label">Ответственный</label>
                    <input type="text" 
                           class="form-control" 
                           id="taskResponsible" 
                           value="${task?.responsible || ''}"
                           placeholder="Иванов И.И.">
                </div>
                <div class="form-group">
                    <label class="form-label">Срок выполнения</label>
                    <input type="date" 
                           class="form-control" 
                           id="taskDueDate" 
                           value="${task?.due_date ? task.due_date.split('T')[0] : ''}">
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label">Описание</label>
                <textarea class="form-control" 
                          id="taskDescription" 
                          placeholder="Подробное описание задания..."
                          rows="4">${task?.description || ''}</textarea>
            </div>
            
            <div class="form-group">
                <label class="form-label">Статус</label>
                <select class="form-control" id="taskStatus">
                    <option value="в разработке" ${task?.status === 'в разработке' ? 'selected' : ''}>В разработке</option>
                    <option value="подготовлено" ${task?.status === 'подготовлено' ? 'selected' : ''}>Подготовлено</option>
                    <option value="отправлено" ${task?.status === 'отправлено' ? 'selected' : ''}>Отправлено (на планшет)</option>
                    <option value="выполняется" ${task?.status === 'выполняется' ? 'selected' : ''}>Выполняется</option>
                    <option value="остановлено" ${task?.status === 'остановлено' ? 'selected' : ''}>Остановлено</option>
                    <option value="готово" ${task?.status === 'готово' ? 'selected' : ''}>Готово</option>
                </select>
            </div>
            
            <div class="form-group">
                <label class="form-label">Прикрепленные файлы</label>
                <div class="file-upload" onclick="selectFiles()" ondrop="handleFileDrop(event)" ondragover="handleFileDragOver(event)">
                    <div>📎 Нажмите или перетащите файлы сюда</div>
                    <div class="text-small text-muted">Поддерживаются: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG</div>
                </div>
                <div class="file-list" id="fileList"></div>
                <input type="file" id="fileInput" multiple style="display: none;" onchange="handleFileSelect(event)">
            </div>
        </form>
    `;
    
    openModal();
    
    // Фокус на первом поле
    setTimeout(() => {
        const field = document.getElementById(task ? 'taskName' : 'taskNumber');
        field.focus();
    }, 300);
}

// Остальные функции (renderReceptions, renderArchivedTasks, saveData, etc.) 
// остаются такими же, но с добавлением поддержки новых полей

// Экспорт функций для глобального использования
window.switchTab = switchTab;
window.openTaskModal = openTaskModal;
window.openReceptionModal = openReceptionModal;
window.editTask = editTask;
window.deleteTask = deleteTask;
window.viewHistory = viewHistory;
window.createFromArchived = createFromArchived;
window.handleSearchKeyPress = handleSearchKeyPress;
window.performSearch = performSearch;
window.sortTable = sortTable;
window.saveData = saveData;
window.closeModal = closeModal;
window.handleModalClick = handleModalClick;
window.importExcel = importExcel;
window.loadData = loadData;
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
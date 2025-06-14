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
    updateToolbar();
    loadSavedFilters();
    loadTasksStats();
    startAutoRefresh();
    
    // Автоматическая архивация каждые 24 часа
    setInterval(archiveOldTasks, 24 * 60 * 60 * 1000);
    
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

// Переключение вкладок
function switchTab(tabIndex) {
    currentTab = tabIndex;
    
    // Обновление активной вкладки с анимацией
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach((tab, index) => {
        if (index === tabIndex) {
            tab.classList.add('active');
            // Добавляем эффект пульсации при переключении
            tab.style.transform = 'scale(1.05)';
            setTimeout(() => {
                tab.style.transform = 'scale(1)';
            }, 200);
        } else {
            tab.classList.remove('active');
        }
    });

    // Сброс поиска
    document.getElementById('searchInput').value = '';
    
    // Обновление панели инструментов
    updateToolbar();
    
    // Загрузка данных с анимацией
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
        `;
    } else if (currentTab === 1) {
        toolbarButtons.innerHTML = `
            <button class="btn btn-primary" onclick="openReceptionModal()">
                <span>➕</span> Добавить приемку
            </button>
        `;
    }
    
    // Добавляем анимацию появления кнопок
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
        if (currentTab === 0) {
            url = `${API_URL}/tasks?archived=false&sort_by=${sortColumn}&sort_order=${sortOrder}`;
        } else if (currentTab === 1) {
            url = `${API_URL}/receptions`;
        } else if (currentTab === 2) {
            url = `${API_URL}/tasks?archived=true&sort_by=${sortColumn}&sort_order=${sortOrder}`;
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
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        showError(`Не удалось загрузить данные: ${error.message}`);
    }
}

// Отображение заданий
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
}

// Работа с модальным окном
function openModal() {
    const modal = document.getElementById('modal');
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
    
    // Анимация появления содержимого
    const modalContent = modal.querySelector('.modal-content');
    modalContent.style.animation = 'none';
    setTimeout(() => {
        modalContent.style.animation = '';
    }, 10);
}

function closeModal() {
    const modal = document.getElementById('modal');
    modal.classList.remove('show');
    document.body.style.overflow = '';
    editingItem = null;
}

function handleModalClick(event) {
    if (event.target === event.currentTarget) {
        closeModal();
    }
}

// Диалог подтверждения
function showConfirmDialog(title, message) {
    return new Promise((resolve) => {
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');
        const modalFooter = document.getElementById('modalFooter');
        
        modalTitle.textContent = title;
        modalBody.innerHTML = `<p style="font-size: 1.1rem; line-height: 1.6;">${message}</p>`;
        
        modalFooter.innerHTML = `
            <button class="btn btn-secondary" onclick="closeModal(); window.confirmResolve(false)">Отмена</button>
            <button class="btn btn-danger" onclick="closeModal(); window.confirmResolve(true)">
                <span>🗑️</span> Удалить
            </button>
        `;
        
        window.confirmResolve = resolve;
        openModal();
    });
}

// Тост уведомления
function showToast(type, title, message) {
    const toast = document.getElementById('toast');
    const toastIcon = document.getElementById('toastIcon');
    const toastTitle = document.getElementById('toastTitle');
    const toastMessage = document.getElementById('toastMessage');

    // Сброс классов
    toast.className = 'toast';
    
    // Установка типа
    toast.classList.add(`toast-${type}`);
    
    // Иконки для разных типов
    const icons = {
        success: '✅',
        error: '❌',
        info: 'ℹ️',
        warning: '⚠️'
    };
    
    toastIcon.textContent = icons[type] || icons.info;
    toastTitle.textContent = title;
    toastMessage.textContent = message;
    
    // Показ уведомления
    toast.classList.add('show');
    
    // Автоматическое скрытие через 3 секунды
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Импорт Excel
function importExcel() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls';
    input.onchange = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            showToast('info', 'Импорт', 'Загрузка файла...');
            
            const response = await fetch(`${API_URL}/tasks/import`, {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.detail || 'Ошибка импорта');
            }
            
            showToast('success', 'Импорт завершен', 
                `Создано: ${result.created}, Ошибок: ${result.errors.length}`);
            
            if (result.errors.length > 0) {
                console.warn('Ошибки импорта:', result.errors);
                // Показываем детали ошибок
                setTimeout(() => {
                    showErrorDetails(result.errors);
                }, 500);
            }
            
            loadData();
        } catch (error) {
            console.error('Ошибка импорта:', error);
            showToast('error', 'Ошибка', error.message || 'Не удалось импортировать файл');
        }
    };
    input.click();
}

// Показ деталей ошибок импорта
function showErrorDetails(errors) {
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    const modalFooter = document.getElementById('modalFooter');
    
    modalTitle.textContent = 'Ошибки при импорте';
    
    modalBody.innerHTML = `
        <div style="max-height: 400px; overflow-y: auto;">
            <p class="mb-2">Обнаружены следующие ошибки:</p>
            <ul style="list-style: none; padding: 0;">
                ${errors.map(error => `
                    <li style="padding: 0.75rem; background: rgba(239, 68, 68, 0.05); border-left: 3px solid var(--danger); margin-bottom: 0.5rem; border-radius: var(--radius);">
                        ${escapeHtml(error)}
                    </li>
                `).join('')}
            </ul>
        </div>
    `;
    
    modalFooter.innerHTML = '<button class="btn btn-primary" onclick="closeModal()">Понятно</button>';
    
    openModal();
}

// Архивация старых заданий
async function archiveOldTasks() {
    try {
        const response = await fetch(`${API_URL}/tasks/archive`, {
            method: 'POST'
        });
        const result = await response.json();
        
        if (result.archived_count > 0) {
            console.log(`Архивировано заданий: ${result.archived_count}`);
            if (currentTab === 0 || currentTab === 2) {
                loadData();
            }
        }
    } catch (error) {
        console.error('Ошибка архивации:', error);
    }
}

// Горячие клавиши
document.addEventListener('keydown', function(event) {
    // Escape - закрыть модальное окно
    if (event.key === 'Escape') {
        const modal = document.getElementById('modal');
        if (modal.classList.contains('show')) {
            closeModal();
        }
    }
    
    // Ctrl+N - создать новую запись
    if (event.ctrlKey && event.key === 'n') {
        event.preventDefault();
        if (currentTab === 0) {
            openTaskModal();
        } else if (currentTab === 1) {
            openReceptionModal();
        }
    }
    
    // Ctrl+F - фокус на поиск
    if (event.ctrlKey && event.key === 'f') {
        event.preventDefault();
        const searchInput = document.getElementById('searchInput');
        searchInput.focus();
        searchInput.select();
    }
    
    // Alt+1,2,3 - переключение вкладок
    if (event.altKey) {
        if (event.key === '1') {
            event.preventDefault();
            switchTab(0);
        } else if (event.key === '2') {
            event.preventDefault();
            switchTab(1);
        } else if (event.key === '3') {
            event.preventDefault();
            switchTab(2);
        }
    }
});

// Добавляем стиль для маленького спиннера
const style = document.createElement('style');
style.textContent = `
    .spinner-small {
        display: inline-block;
        width: 1rem;
        height: 1rem;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        border-top-color: white;
        animation: spin 0.6s linear infinite;
    }
    
    .btn-danger {
        background: linear-gradient(135deg, var(--danger) 0%, #dc2626 100%);
        color: white;
    }
    
    .btn-danger:hover {
        background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
    }
`;
document.head.appendChild(style);

// Инициализация подсказок при наведении
document.addEventListener('DOMContentLoaded', function() {
    // Добавляем подсказки для кнопок действий
    const actionButtons = document.querySelectorAll('.btn-icon');
    actionButtons.forEach(button => {
        button.addEventListener('mouseenter', function() {
            this.style.transform = 'scale(1.1)';
        });
        button.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
        });
    });
});

// Экспорт для глобального использования
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

// Автоматическое обновление данных
function startAutoRefresh() {
    autoRefreshInterval = setInterval(() => {
        loadData();
        loadTasksStats();
    }, 30000);
}

// Загрузка статистики заданий
async function loadTasksStats() {
    try {
        const response = await fetch(`${API_URL}/tasks-stats`);
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
    
    if (tasksCounter && tasksStats.total_tasks !== undefined) {
        tasksCounter.textContent = tasksStats.total_tasks;
        tasksCounter.style.display = tasksStats.total_tasks > 0 ? 'inline' : 'none';
        
        if (tasksStats.overdue_count > 0) {
            tasksCounter.style.background = 'var(--danger)';
            tasksCounter.title = `${tasksStats.overdue_count} просроченных заданий`;
        } else {
            tasksCounter.style.background = '';
            tasksCounter.title = '';
        }
    }
    
    if (receptionsCounter) {
        receptionsCounter.textContent = receptions.length;
        receptionsCounter.style.display = receptions.length > 0 ? 'inline' : 'none';
    }
    
    if (archiveCounter) {
        archiveCounter.textContent = archivedTasks.length;
        archiveCounter.style.display = archivedTasks.length > 0 ? 'inline' : 'none';
    }
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
    
    if (selectAllCheckbox && selectAllCheckbox.checked) {
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
    
    if (bulkActions && selectedCount) {
        if (selectedTasks.size > 0) {
            bulkActions.classList.add('show');
            selectedCount.textContent = selectedTasks.size;
        } else {
            bulkActions.classList.remove('show');
        }
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
    
    if (statusSelect && statusSelect.value) updateData.status = statusSelect.value;
    if (prioritySelect && prioritySelect.value) updateData.priority = prioritySelect.value;
    
    if (!updateData.status && !updateData.priority) {
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
        if (statusSelect) statusSelect.value = '';
        if (prioritySelect) prioritySelect.value = '';
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
    
    if (filtersPanel && filtersToggle) {
        if (filtersPanel.classList.contains('show')) {
            filtersPanel.classList.remove('show');
            filtersToggle.innerHTML = '<span>🔍</span> Фильтры';
        } else {
            filtersPanel.classList.add('show');
            filtersToggle.innerHTML = '<span>🔍</span> Скрыть фильтры';
            setupFiltersPanel();
        }
    }
}

function setupFiltersPanel() {
    const filtersGrid = document.getElementById('filtersGrid');
    
    if (filtersGrid && currentTab === 0) {
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
        
        // Заполняем текущие значения фильтров
        Object.keys(currentFilters).forEach(key => {
            const element = document.getElementById(`filter${key.charAt(0).toUpperCase() + key.slice(1)}`);
            if (element) {
                element.value = currentFilters[key] || '';
            }
        });
    }
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
    if (!select) return;
    
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
                            <td>${getPriorityBadge(task.priority || 'средний')}</td>
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
    
    // Добавляем стили анимации
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
    `;
    document.head.appendChild(style);
}

// Отображение приемок
function renderReceptions() {
    const content = document.getElementById('content');
    
    if (receptions.length === 0) {
        content.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📦</div>
                <h3>Нет записей о приемке</h3>
                <p>Добавьте первую запись о приемке товаров</p>
                <button class="btn btn-primary" onclick="openReceptionModal()">
                    <span>➕</span> Добавить приемку
                </button>
            </div>
        `;
        return;
    }

    content.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th onclick="sortTable('date')">
                        Дата <span class="sort-indicator">${getSortIndicator('date')}</span>
                    </th>
                    <th>Номер заказа</th>
                    <th>Обозначение</th>
                    <th>Наименование</th>
                    <th>Количество</th>
                    <th>№ маршрутной карты</th>
                    <th>Статус</th>
                </tr>
            </thead>
            <tbody>
                ${receptions.map((reception, index) => `
                    <tr style="animation: fadeInUp 0.3s ease ${index * 0.05}s both">
                        <td>${formatDate(reception.date)}</td>
                        <td><strong>${escapeHtml(reception.order_number)}</strong></td>
                        <td>${escapeHtml(reception.designation)}</td>
                        <td>${escapeHtml(reception.name)}</td>
                        <td>${escapeHtml(reception.quantity)}</td>
                        <td>${escapeHtml(reception.route_card_number)}</td>
                        <td>${getStatusBadge(reception.status)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// Отображение архива
function renderArchivedTasks() {
    const content = document.getElementById('content');
    
    if (archivedTasks.length === 0) {
        content.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🗄️</div>
                <h3>Архив пуст</h3>
                <p>Завершенные задания попадут сюда через 7 дней</p>
            </div>
        `;
        return;
    }

    content.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>Номер</th>
                    <th>Наименование</th>
                    <th>Статус</th>
                    <th>Дата создания</th>
                    <th>Дата завершения</th>
                    <th style="width: 120px;">Действия</th>
                </tr>
            </thead>
            <tbody>
                ${archivedTasks.map((task, index) => `
                    <tr ondblclick="viewHistory(${task.id})"
                        style="animation: fadeInUp 0.3s ease ${index * 0.05}s both">
                        <td><strong>${escapeHtml(task.number)}</strong></td>
                        <td>${escapeHtml(task.name)}</td>
                        <td>${getStatusBadge(task.status)}</td>
                        <td>${formatDate(task.created_date)}</td>
                        <td>${task.completed_date ? formatDate(task.completed_date) : '—'}</td>
                        <td onclick="event.stopPropagation()">
                            <div class="action-buttons">
                                <button class="btn-icon" onclick="viewHistory(${task.id})" title="История">
                                    📜
                                </button>
                                <button class="btn-icon" onclick="createFromArchived(${task.id})" title="Создать на основе">
                                    ➕
                                </button>
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// Модальное окно для задания
function openTaskModal(task = null) {
    editingItem = task;
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    
    modalTitle.textContent = task ? 'Редактирование задания' : 'Создание задания';
    
    modalBody.innerHTML = `
        <form id="taskForm" onsubmit="return false;">
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
                <label class="form-label">Наименование <span class="required">*</span></label>
                <input type="text" 
                       class="form-control" 
                       id="taskName" 
                       value="${task?.name || ''}"
                       placeholder="Название изделия"
                       required>
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
        </form>
    `;
    
    openModal();
    // Фокус на первом поле с анимацией
    setTimeout(() => {
        const field = document.getElementById(task ? 'taskName' : 'taskNumber');
        field.focus();
        field.style.transition = 'all 0.3s ease';
        field.style.boxShadow = '0 0 0 4px rgba(99, 102, 241, 0.2)';
        setTimeout(() => {
            field.style.boxShadow = '';
        }, 1000);
    }, 300);
}

// Модальное окно для приемки
function openReceptionModal() {
    editingItem = null;
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    
    modalTitle.textContent = 'Добавление приемки';
    
    modalBody.innerHTML = `
        <form id="receptionForm" onsubmit="return false;">
            <div class="form-group">
                <label class="form-label">Номер заказа <span class="required">*</span></label>
                <input type="text" 
                       class="form-control" 
                       id="orderNumber" 
                       placeholder="2023/001"
                       required>
            </div>
            <div class="form-group">
                <label class="form-label">Обозначение <span class="required">*</span></label>
                <input type="text" 
                       class="form-control" 
                       id="designation" 
                       placeholder="НЗ.КШ.040.25.001"
                       required>
            </div>
            <div class="form-group">
                <label class="form-label">Наименование <span class="required">*</span></label>
                <input type="text" 
                       class="form-control" 
                       id="receptionName" 
                       placeholder="Корпус"
                       required>
            </div>
            <div class="form-group">
                <label class="form-label">Количество <span class="required">*</span></label>
                <input type="text" 
                       class="form-control" 
                       id="quantity" 
                       placeholder="20 шт."
                       required>
            </div>
            <div class="form-group">
                <label class="form-label">Номер маршрутной карты <span class="required">*</span></label>
                <input type="text" 
                       class="form-control" 
                       id="routeCardNumber" 
                       placeholder="1243"
                       required>
            </div>
            <div class="form-group">
                <label class="form-label">Статус</label>
                <select class="form-control" id="receptionStatus">
                    <option value="принят">Принят</option>
                    <option value="есть замечания">Есть замечания</option>
                    <option value="проведен в НП">Проведен в НП</option>
                </select>
            </div>
        </form>
    `;
    
    openModal();
    // Фокус на первом поле
    setTimeout(() => {
        const field = document.getElementById('orderNumber');
        field.focus();
        field.style.transition = 'all 0.3s ease';
        field.style.boxShadow = '0 0 0 4px rgba(99, 102, 241, 0.2)';
        setTimeout(() => {
            field.style.boxShadow = '';
        }, 1000);
    }, 300);
}

// Сохранение данных
async function saveData() {
    // Добавляем визуальную обратную связь
    const saveButton = document.querySelector('.modal-footer .btn-primary');
    saveButton.disabled = true;
    saveButton.innerHTML = '<span class="spinner-small"></span> Сохранение...';
    
    try {
        if (currentTab === 0) {
            // Валидация формы
            const form = document.getElementById('taskForm');
            if (!form.checkValidity()) {
                form.reportValidity();
                saveButton.disabled = false;
                saveButton.innerHTML = 'Сохранить';
                return;
            }

            // Сохранение задания
            const taskData = {
                number: document.getElementById('taskNumber').value.trim(),
                name: document.getElementById('taskName').value.trim(),
                description: document.getElementById('taskDescription').value.trim(),
                status: document.getElementById('taskStatus').value
            };

            let response;
            if (editingItem) {
                // Обновление существующего задания
                response = await fetch(`${API_URL}/tasks/${editingItem.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: taskData.name,
                        description: taskData.description,
                        status: taskData.status
                    })
                });
            } else {
                // Создание нового задания
                response = await fetch(`${API_URL}/tasks`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(taskData)
                });
            }

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Ошибка сохранения');
            }

            showToast('success', 'Успешно', editingItem ? 'Задание обновлено' : 'Задание создано');
        } else if (currentTab === 1) {
            // Валидация формы
            const form = document.getElementById('receptionForm');
            if (!form.checkValidity()) {
                form.reportValidity();
                saveButton.disabled = false;
                saveButton.innerHTML = 'Сохранить';
                return;
            }

            // Сохранение приемки
            const receptionData = {
                order_number: document.getElementById('orderNumber').value.trim(),
                designation: document.getElementById('designation').value.trim(),
                name: document.getElementById('receptionName').value.trim(),
                quantity: document.getElementById('quantity').value.trim(),
                route_card_number: document.getElementById('routeCardNumber').value.trim(),
                status: document.getElementById('receptionStatus').value
            };

            const response = await fetch(`${API_URL}/receptions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(receptionData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Ошибка сохранения');
            }

            showToast('success', 'Успешно', 'Запись о приемке добавлена');
        }

        closeModal();
        loadData();
    } catch (error) {
        console.error('Ошибка:', error);
        showToast('error', 'Ошибка', error.message || 'Не удалось сохранить данные');
        saveButton.disabled = false;
        saveButton.innerHTML = 'Сохранить';
    }
}

// Редактирование задания
async function editTask(taskId) {
    try {
        const response = await fetch(`${API_URL}/tasks/${taskId}`);
        if (!response.ok) {
            throw new Error('Не удалось загрузить задание');
        }
        const task = await response.json();
        openTaskModal(task);
    } catch (error) {
        console.error('Ошибка:', error);
        showToast('error', 'Ошибка', 'Не удалось загрузить задание');
    }
}

// Удаление задания
async function deleteTask(taskId) {
    // Красивое модальное окно подтверждения
    const confirmed = await showConfirmDialog(
        'Удаление задания',
        'Вы действительно хотите удалить это задание? Это действие нельзя отменить.'
    );
    
    if (!confirmed) return;

    try {
        const response = await fetch(`${API_URL}/tasks/${taskId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Ошибка удаления');
        }

        showToast('success', 'Успешно', 'Задание удалено');
        loadData();
    } catch (error) {
        console.error('Ошибка:', error);
        showToast('error', 'Ошибка', 'Не удалось удалить задание');
    }
}

// Просмотр истории
async function viewHistory(taskId) {
    try {
        const response = await fetch(`${API_URL}/tasks/${taskId}/history`);
        if (!response.ok) {
            throw new Error('Не удалось загрузить историю');
        }
        const history = await response.json();

        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');
        const modalFooter = document.getElementById('modalFooter');

        modalTitle.textContent = 'История задания';
        
        modalBody.innerHTML = `
            <div style="max-height: 500px; overflow-y: auto;">
                ${history.length === 0 ? '<p class="text-muted">История изменений пуста</p>' : ''}
                ${history.map((item, index) => `
                    <div style="border-left: 3px solid var(--primary); padding: 1rem 0 1rem 1.5rem; margin-bottom: 1.5rem; position: relative;">
                        <div style="position: absolute; left: -7px; top: 1rem; width: 12px; height: 12px; background: var(--primary); border-radius: 50%; border: 3px solid white;"></div>
                        <div style="display: flex; justify-content: space-between; align-items: start;">
                            <div>
                                <strong style="color: var(--primary);">${escapeHtml(item.action)}</strong>
                                <div class="text-small text-muted mt-1">
                                    ${formatDateTime(item.timestamp)} • ${escapeHtml(item.user)}
                                </div>
                            </div>
                        </div>
                        <div class="mt-1">${escapeHtml(item.details)}</div>
                    </div>
                `).join('')}
            </div>
        `;

        modalFooter.innerHTML = '<button class="btn btn-primary" onclick="closeModal()">Закрыть</button>';

        openModal();
    } catch (error) {
        console.error('Ошибка:', error);
        showToast('error', 'Ошибка', 'Не удалось загрузить историю');
    }
}

// Создание задания на основе архивного
function createFromArchived(taskId) {
    const task = archivedTasks.find(t => t.id === taskId);
    if (task) {
        const newTask = {
            ...task,
            number: `${task.number}-копия-${Date.now()}`,
            status: 'в разработке'
        };
        delete newTask.id;
        openTaskModal(newTask);
    }
}

// Поиск
function handleSearchKeyPress(event) {
    if (event.key === 'Enter') {
        performSearch();
    }
}

async function performSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput.value.trim();

    if (!searchTerm) {
        loadData();
        return;
    }

    // Визуальная обратная связь
    searchInput.style.borderColor = var(--primary);
    searchInput.style.boxShadow = '0 0 0 4px rgba(99, 102, 241, 0.2)';

    showLoading();

    try {
        let url = '';
        if (currentTab === 0) {
            url = `${API_URL}/tasks?archived=false&search=${encodeURIComponent(searchTerm)}`;
        } else if (currentTab === 1) {
            url = `${API_URL}/receptions?search=${encodeURIComponent(searchTerm)}`;
        } else if (currentTab === 2) {
            url = `${API_URL}/tasks?archived=true&search=${encodeURIComponent(searchTerm)}`;
        }

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
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

        if (data.length === 0) {
            showToast('info', 'Поиск', 'Ничего не найдено');
        }
    } catch (error) {
        console.error('Ошибка поиска:', error);
        showToast('error', 'Ошибка', 'Не удалось выполнить поиск');
    } finally {
        // Убираем визуальную обратную связь
        setTimeout(() => {
            searchInput.style.borderColor = '';
            searchInput.style.boxShadow = '';
        }, 500);
    }
}

// Сортировка
function sortTable(column) {
    if (sortColumn === column) {
        sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
        sortColumn = column;
        sortOrder = 'asc';
    }
    loadData();
}

function getSortIndicator(column) {
    if (sortColumn === column) {
        return sortOrder === 'asc' ? '▲' : '▼';
    }
    return '⇅';
}

// Вспомогательные функции
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getStatusBadge(status) {
    const statusMap = {
        'в разработке': 'development',
        'подготовлено': 'prepared',
        'отправлено': 'sent',
        'выполняется': 'in-progress',
        'остановлено': 'stopped',
        'готово': 'done',
        'принят': 'accepted',
        'есть замечания': 'remarks',
        'проведен в НП': 'processed'
    };
    
    const className = statusMap[status] || '';
    return `<span class="status status-${className}">
                <span class="status-dot"></span>
                ${escapeHtml(status)}
            </span>`;
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}

function showLoading() {
    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p class="mt-2">Загрузка данных...</p>
        </div>
    `;
}

function showError(message) {
    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">⚠️</div>
            <h3>Ошибка</h3>
            <p>${escapeHtml(message)}</p>
            <button class="btn btn-primary mt-2" onclick="loadData()">
                Повторить попытку
            </button>
        </div>
    `;
}
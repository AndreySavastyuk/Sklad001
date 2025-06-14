// Глобальные переменные
let currentTab = 0;
let tasks = [];
let receptions = [];
let archivedTasks = [];
let sortColumn = 'created_date';
let sortOrder = 'desc';
let editingItem = null;

// API конфигурация
const API_BASE_URL = window.location.origin;
const API_URL = `${API_BASE_URL}/api`;

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    loadData();
    updateToolbar();
    
    // Автоматическая архивация каждые 24 часа
    setInterval(archiveOldTasks, 24 * 60 * 60 * 1000);
});

// Переключение вкладок
function switchTab(tabIndex) {
    currentTab = tabIndex;
    
    // Обновление активной вкладки
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach((tab, index) => {
        tab.classList.toggle('active', index === tabIndex);
    });

    // Сброс поиска
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
        `;
    } else if (currentTab === 1) {
        toolbarButtons.innerHTML = `
            <button class="btn btn-primary" onclick="openReceptionModal()">
                <span>➕</span> Добавить приемку
            </button>
        `;
    }
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
            </div>
        `;
        return;
    }

    content.innerHTML = `
        <div class="table-wrapper">
            <table>
                <thead>
                    <tr>
                        <th onclick="sortTable('number')">
                            Номер <span class="sort-indicator">${getSortIndicator('number')}</span>
                        </th>
                        <th onclick="sortTable('name')">
                            Наименование <span class="sort-indicator">${getSortIndicator('name')}</span>
                        </th>
                        <th>Описание</th>
                        <th onclick="sortTable('status')">
                            Статус <span class="sort-indicator">${getSortIndicator('status')}</span>
                        </th>
                        <th onclick="sortTable('created_date')">
                            Дата создания <span class="sort-indicator">${getSortIndicator('created_date')}</span>
                        </th>
                        <th style="width: 100px;">Действия</th>
                    </tr>
                </thead>
                <tbody>
                    ${tasks.map(task => `
                        <tr class="clickable" ondblclick="editTask(${task.id})">
                            <td><strong>${escapeHtml(task.number)}</strong></td>
                            <td>${escapeHtml(task.name)}</td>
                            <td>${escapeHtml(task.description || '—')}</td>
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
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
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
            </div>
        `;
        return;
    }

    content.innerHTML = `
        <div class="table-wrapper">
            <table>
                <thead>
                    <tr>
                        <th>Дата</th>
                        <th>Номер заказа</th>
                        <th>Обозначение</th>
                        <th>Наименование</th>
                        <th>Количество</th>
                        <th>№ маршрутной карты</th>
                        <th>Статус</th>
                    </tr>
                </thead>
                <tbody>
                    ${receptions.map(reception => `
                        <tr>
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
        </div>
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
        <div class="table-wrapper">
            <table>
                <thead>
                    <tr>
                        <th>Номер</th>
                        <th>Наименование</th>
                        <th>Статус</th>
                        <th>Дата создания</th>
                        <th>Дата завершения</th>
                        <th style="width: 100px;">Действия</th>
                    </tr>
                </thead>
                <tbody>
                    ${archivedTasks.map(task => `
                        <tr class="clickable" ondblclick="viewHistory(${task.id})">
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
        </div>
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
                       required>
            </div>
            <div class="form-group">
                <label class="form-label">Наименование <span class="required">*</span></label>
                <input type="text" 
                       class="form-control" 
                       id="taskName" 
                       value="${task?.name || ''}"
                       required>
            </div>
            <div class="form-group">
                <label class="form-label">Описание</label>
                <textarea class="form-control" 
                          id="taskDescription" 
                          rows="3">${task?.description || ''}</textarea>
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
    // Фокус на первом поле
    setTimeout(() => {
        document.getElementById(task ? 'taskName' : 'taskNumber').focus();
    }, 100);
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
        document.getElementById('orderNumber').focus();
    }, 100);
}

// Сохранение данных
async function saveData() {
    try {
        if (currentTab === 0) {
            // Валидация формы
            const form = document.getElementById('taskForm');
            if (!form.checkValidity()) {
                form.reportValidity();
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
    if (!confirm('Вы действительно хотите удалить это задание?')) {
        return;
    }

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
            <div style="max-height: 400px; overflow-y: auto;">
                ${history.length === 0 ? '<p class="text-muted">История изменений пуста</p>' : ''}
                ${history.map((item, index) => `
                    <div style="border-bottom: 1px solid var(--border); padding: 1rem 0;">
                        <div style="display: flex; justify-content: space-between; align-items: start;">
                            <div>
                                <strong>${escapeHtml(item.action)}</strong>
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
    return '↕';
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

// Работа с модальным окном
function openModal() {
    const modal = document.getElementById('modal');
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
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
            }
            
            loadData();
        } catch (error) {
            console.error('Ошибка импорта:', error);
            showToast('error', 'Ошибка', error.message || 'Не удалось импортировать файл');
        }
    };
    input.click();
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
        document.getElementById('searchInput').focus();
    }
}); 
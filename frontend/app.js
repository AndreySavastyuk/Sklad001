// Система управления складом - JavaScript в стиле 1С:Предприятие 8.3
const API_BASE_URL = 'http://localhost:8000/api';

// Глобальные переменные
let currentTab = 'tasks';
let selectedRows = new Set();
let sortState = {};
let searchVisible = false;
let currentEditingTask = null;

// Инициализация приложения
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    loadInitialData();
});

// Инициализация приложения
function initializeApp() {
    console.log('Инициализация системы управления складом...');
    updateStatusBar();
    setupHotkeys();
    setupContextMenu();
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Обработка кликов по таблицам
    document.addEventListener('click', handleTableClick);
    
    // Обработка правого клика для контекстного меню
    document.addEventListener('contextmenu', handleContextMenu);
    
    // Скрытие контекстного меню при клике вне его
    document.addEventListener('click', hideContextMenu);
    
    // Обработка поиска
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(performSearch, 300));
    }
}

// Настройка горячих клавиш
function setupHotkeys() {
    document.addEventListener('keydown', function(e) {
        // F1 - Справка
        if (e.key === 'F1') {
            e.preventDefault();
            showHelp();
        }
        
        // F5 - Обновить
        if (e.key === 'F5') {
            e.preventDefault();
            refreshData();
        }
        
        // Insert - Создать задание
        if (e.key === 'Insert') {
            e.preventDefault();
            createTask();
        }
        
        // Delete - Удалить выбранное
        if (e.key === 'Delete' && selectedRows.size > 0) {
            e.preventDefault();
            deleteSelectedTask();
        }
        
        // Enter - Редактировать выбранное
        if (e.key === 'Enter' && selectedRows.size === 1) {
            e.preventDefault();
            editSelectedTask();
        }
        
        // Escape - Закрыть модальные окна
        if (e.key === 'Escape') {
            closeAllModals();
        }
        
        // Ctrl+F - Поиск
        if (e.ctrlKey && e.key === 'f') {
            e.preventDefault();
            toggleSearch();
        }
    });
}

// Настройка контекстного меню
function setupContextMenu() {
    const contextMenu = document.getElementById('contextMenu');
    if (!contextMenu) return;
    
    // Предотвращение закрытия меню при клике по нему
    contextMenu.addEventListener('click', function(e) {
        e.stopPropagation();
    });
}

// Обработка контекстного меню
function handleContextMenu(e) {
    const row = e.target.closest('tr');
    if (!row || !row.parentElement.tagName === 'TBODY') return;
    
    e.preventDefault();
    
    // Выделяем строку, если она не выделена
    if (!row.classList.contains('selected')) {
        clearSelection();
        selectRow(row);
    }
    
    showContextMenu(e.pageX, e.pageY);
}

// Показать контекстное меню
function showContextMenu(x, y) {
    const contextMenu = document.getElementById('contextMenu');
    if (!contextMenu) return;
    
    contextMenu.style.left = x + 'px';
    contextMenu.style.top = y + 'px';
    contextMenu.style.display = 'block';
    
    // Корректировка позиции, если меню выходит за границы экрана
    const rect = contextMenu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
        contextMenu.style.left = (x - rect.width) + 'px';
    }
    if (rect.bottom > window.innerHeight) {
        contextMenu.style.top = (y - rect.height) + 'px';
    }
}

// Скрыть контекстное меню
function hideContextMenu() {
    const contextMenu = document.getElementById('contextMenu');
    if (contextMenu) {
        contextMenu.style.display = 'none';
    }
}

// Обработка кликов по таблице
function handleTableClick(e) {
    const row = e.target.closest('tr');
    if (!row || row.parentElement.tagName !== 'TBODY') return;
    
    // Двойной клик - редактирование
    if (e.detail === 2) {
        editSelectedTask();
        return;
    }
    
    // Одинарный клик - выделение
    if (e.ctrlKey) {
        toggleRowSelection(row);
    } else {
        clearSelection();
        selectRow(row);
    }
    
    updateStatusBar();
}

// Выделение строки
function selectRow(row) {
    row.classList.add('selected');
    const id = row.dataset.id;
    if (id) {
        selectedRows.add(id);
    }
}

// Переключение выделения строки
function toggleRowSelection(row) {
    const id = row.dataset.id;
    if (!id) return;
    
    if (row.classList.contains('selected')) {
        row.classList.remove('selected');
        selectedRows.delete(id);
    } else {
        row.classList.add('selected');
        selectedRows.add(id);
    }
}

// Очистка выделения
function clearSelection() {
    document.querySelectorAll('tr.selected').forEach(row => {
        row.classList.remove('selected');
    });
    selectedRows.clear();
}

// Переключение вкладок
function showTab(tabName) {
    // Обновление активной вкладки
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Скрытие всех вкладок
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.add('hidden');
    });
    
    // Показ выбранной вкладки
    const tabContent = document.getElementById(tabName + 'Tab');
    if (tabContent) {
        tabContent.classList.remove('hidden');
    }
    
    currentTab = tabName;
    clearSelection();
    updateStatusBar();
    
    // Загрузка данных для вкладки
    loadTabData(tabName);
}

// Загрузка данных для вкладки
async function loadTabData(tabName) {
    try {
        switch (tabName) {
            case 'tasks':
                await loadTasks();
                break;
            case 'reception':
                await loadReceptions();
                break;
            case 'archive':
                await loadArchive();
                break;
        }
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        showNotification('Ошибка загрузки данных', 'error');
    }
}

// Загрузка начальных данных
async function loadInitialData() {
    await loadTasks();
    updateStatusBar();
}

// Загрузка заданий
async function loadTasks() {
    try {
        const response = await fetch(`${API_BASE_URL}/tasks`);
        if (!response.ok) throw new Error('Ошибка загрузки заданий');
        
        const tasks = await response.json();
        renderTasksTable(tasks);
        updateStatusBar();
    } catch (error) {
        console.error('Ошибка загрузки заданий:', error);
        showNotification('Ошибка загрузки заданий', 'error');
    }
}

// Отрисовка таблицы заданий
function renderTasksTable(tasks) {
    const tbody = document.getElementById('tasksTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    tasks.forEach(task => {
        const row = document.createElement('tr');
        row.dataset.id = task.id;
        
        const statusClass = getStatusClass(task.status);
        
        row.innerHTML = `
            <td>${task.id}</td>
            <td>${formatDate(task.created_at)}</td>
            <td>${task.order_number}</td>
            <td>${task.designation}</td>
            <td>${task.name}</td>
            <td>${task.quantity}</td>
            <td><span class="status ${statusClass}">${task.status}</span></td>
        `;
        
        tbody.appendChild(row);
    });
}

// Загрузка приемки
async function loadReceptions() {
    try {
        const response = await fetch(`${API_BASE_URL}/receptions`);
        if (!response.ok) throw new Error('Ошибка загрузки приемки');
        
        const receptions = await response.json();
        renderReceptionsTable(receptions);
    } catch (error) {
        console.error('Ошибка загрузки приемки:', error);
        showNotification('Ошибка загрузки приемки', 'error');
    }
}

// Отрисовка таблицы приемки
function renderReceptionsTable(receptions) {
    const tbody = document.getElementById('receptionTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    receptions.forEach(reception => {
        const row = document.createElement('tr');
        row.dataset.id = reception.id;
        
        row.innerHTML = `
            <td>${formatDate(reception.date)}</td>
            <td>${reception.order_number}</td>
            <td>${reception.designation}</td>
            <td>${reception.name}</td>
            <td>${reception.quantity}</td>
            <td>${reception.route_card_number || '-'}</td>
            <td><span class="status status-accepted">${reception.status}</span></td>
        `;
        
        tbody.appendChild(row);
    });
}

// Загрузка архива
async function loadArchive() {
    try {
        const response = await fetch(`${API_BASE_URL}/tasks?archived=true`);
        if (!response.ok) throw new Error('Ошибка загрузки архива');
        
        const archive = await response.json();
        renderArchiveTable(archive);
    } catch (error) {
        console.error('Ошибка загрузки архива:', error);
        showNotification('Ошибка загрузки архива', 'error');
    }
}

// Отрисовка таблицы архива
function renderArchiveTable(archive) {
    const tbody = document.getElementById('archiveTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    archive.forEach(item => {
        const row = document.createElement('tr');
        row.dataset.id = item.id;
        
        row.innerHTML = `
            <td>${item.id}</td>
            <td>${formatDate(item.created_at)}</td>
            <td>${formatDate(item.completed_at)}</td>
            <td>${item.order_number}</td>
            <td>${item.designation}</td>
            <td>${item.name}</td>
            <td>${item.quantity}</td>
        `;
        
        tbody.appendChild(row);
    });
}

// Создание нового задания
function createTask() {
    currentEditingTask = null;
    document.getElementById('taskModalTitle').textContent = 'Создание задания';
    
    // Очистка формы
    document.getElementById('taskForm').reset();
    document.getElementById('status').value = 'В разработке';
    
    showModal('taskModal');
}

// Редактирование выбранного задания
async function editSelectedTask() {
    if (selectedRows.size !== 1) {
        showNotification('Выберите одно задание для редактирования', 'warning');
        return;
    }
    
    const taskId = Array.from(selectedRows)[0];
    
    try {
        const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`);
        if (!response.ok) throw new Error('Ошибка загрузки задания');
        
        const task = await response.json();
        currentEditingTask = task;
        
        // Заполнение формы
        document.getElementById('taskModalTitle').textContent = 'Редактирование задания';
        document.getElementById('orderNumber').value = task.order_number;
        document.getElementById('designation').value = task.designation;
        document.getElementById('name').value = task.name;
        document.getElementById('quantity').value = task.quantity;
        document.getElementById('status').value = task.status;
        document.getElementById('notes').value = task.notes || '';
        
        showModal('taskModal');
    } catch (error) {
        console.error('Ошибка загрузки задания:', error);
        showNotification('Ошибка загрузки задания', 'error');
    }
}

// Дублирование выбранного задания
async function duplicateSelectedTask() {
    if (selectedRows.size !== 1) {
        showNotification('Выберите одно задание для дублирования', 'warning');
        return;
    }
    
    const taskId = Array.from(selectedRows)[0];
    
    try {
        const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`);
        if (!response.ok) throw new Error('Ошибка загрузки задания');
        
        const task = await response.json();
        currentEditingTask = null;
        
        // Заполнение формы данными из выбранного задания
        document.getElementById('taskModalTitle').textContent = 'Дублирование задания';
        document.getElementById('orderNumber').value = task.order_number + '_копия';
        document.getElementById('designation').value = task.designation;
        document.getElementById('name').value = task.name;
        document.getElementById('quantity').value = task.quantity;
        document.getElementById('status').value = 'В разработке';
        document.getElementById('notes').value = task.notes || '';
        
        showModal('taskModal');
    } catch (error) {
        console.error('Ошибка загрузки задания:', error);
        showNotification('Ошибка загрузки задания', 'error');
    }
}

// Удаление выбранных заданий
async function deleteSelectedTask() {
    if (selectedRows.size === 0) {
        showNotification('Выберите задания для удаления', 'warning');
        return;
    }
    
    const count = selectedRows.size;
    const message = count === 1 ? 
        'Вы уверены, что хотите удалить выбранное задание?' :
        `Вы уверены, что хотите удалить ${count} заданий?`;
    
    if (!confirm(message)) return;
    
    try {
        for (const taskId of selectedRows) {
            const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
                method: 'DELETE'
            });
            if (!response.ok) throw new Error(`Ошибка удаления задания ${taskId}`);
        }
        
        showNotification(`Удалено заданий: ${count}`, 'success');
        clearSelection();
        await loadTasks();
    } catch (error) {
        console.error('Ошибка удаления заданий:', error);
        showNotification('Ошибка удаления заданий', 'error');
    }
}

// Сохранение задания
async function saveTask() {
    const form = document.getElementById('taskForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const taskData = {
        order_number: document.getElementById('orderNumber').value,
        designation: document.getElementById('designation').value,
        name: document.getElementById('name').value,
        quantity: parseInt(document.getElementById('quantity').value),
        status: document.getElementById('status').value,
        notes: document.getElementById('notes').value
    };
    
    try {
        let response;
        if (currentEditingTask) {
            // Обновление существующего задания
            response = await fetch(`${API_BASE_URL}/tasks/${currentEditingTask.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(taskData)
            });
        } else {
            // Создание нового задания
            response = await fetch(`${API_BASE_URL}/tasks`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(taskData)
            });
        }
        
        if (!response.ok) throw new Error('Ошибка сохранения задания');
        
        const action = currentEditingTask ? 'обновлено' : 'создано';
        showNotification(`Задание ${action} успешно`, 'success');
        
        closeModal('taskModal');
        await loadTasks();
    } catch (error) {
        console.error('Ошибка сохранения задания:', error);
        showNotification('Ошибка сохранения задания', 'error');
    }
}

// Применение изменений без закрытия модального окна
async function applyTask() {
    await saveTask();
    // Не закрываем модальное окно
}

// Просмотр истории изменений
async function viewTaskHistory() {
    if (selectedRows.size !== 1) {
        showNotification('Выберите одно задание для просмотра истории', 'warning');
        return;
    }
    
    const taskId = Array.from(selectedRows)[0];
    
    try {
        const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/history`);
        if (!response.ok) throw new Error('Ошибка загрузки истории');
        
        const history = await response.json();
        showTaskHistory(history);
    } catch (error) {
        console.error('Ошибка загрузки истории:', error);
        showNotification('Ошибка загрузки истории', 'error');
    }
}

// Показ истории изменений
function showTaskHistory(history) {
    let historyHtml = '<div class="history-container">';
    
    if (history.length === 0) {
        historyHtml += '<p>История изменений пуста</p>';
    } else {
        historyHtml += '<table style="width: 100%; border-collapse: collapse;">';
        historyHtml += '<thead><tr><th>Дата</th><th>Действие</th><th>Изменения</th></tr></thead>';
        historyHtml += '<tbody>';
        
        history.forEach(entry => {
            historyHtml += `
                <tr>
                    <td>${formatDateTime(entry.timestamp)}</td>
                    <td>${entry.action}</td>
                    <td>${entry.changes || '-'}</td>
                </tr>
            `;
        });
        
        historyHtml += '</tbody></table>';
    }
    
    historyHtml += '</div>';
    
    // Создание и показ модального окна для истории
    showCustomModal('История изменений', historyHtml);
}

// Импорт из Excel
function importExcel() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls';
    input.onchange = handleExcelImport;
    input.click();
}

// Обработка импорта Excel
async function handleExcelImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const response = await fetch(`${API_BASE_URL}/tasks/import`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) throw new Error('Ошибка импорта файла');
        
        const result = await response.json();
        showNotification(`Импортировано заданий: ${result.imported_count}`, 'success');
        
        await loadTasks();
    } catch (error) {
        console.error('Ошибка импорта:', error);
        showNotification('Ошибка импорта файла', 'error');
    }
}

// Обновление данных
async function refreshData() {
    showNotification('Обновление данных...', 'info');
    await loadTabData(currentTab);
    updateStatusBar();
    showNotification('Данные обновлены', 'success');
}

// Переключение поиска
function toggleSearch() {
    const searchContainer = document.getElementById('searchContainer');
    if (!searchContainer) return;
    
    searchVisible = !searchVisible;
    
    if (searchVisible) {
        searchContainer.classList.remove('hidden');
        document.getElementById('searchInput').focus();
    } else {
        searchContainer.classList.add('hidden');
        clearSearch();
    }
}

// Выполнение поиска
function performSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    const query = searchInput.value.toLowerCase().trim();
    const rows = document.querySelectorAll(`#${currentTab}TableBody tr`);
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        if (query === '' || text.includes(query)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
    
    updateStatusBar();
}

// Очистка поиска
function clearSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = '';
    }
    
    const rows = document.querySelectorAll(`#${currentTab}TableBody tr`);
    rows.forEach(row => {
        row.style.display = '';
    });
    
    updateStatusBar();
}

// Сортировка таблицы
function sortTable(tableId, columnIndex) {
    const table = document.getElementById(tableId);
    if (!table) return;
    
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const header = table.querySelectorAll('th')[columnIndex];
    
    // Определение направления сортировки
    let direction = 'asc';
    if (header.classList.contains('sort-asc')) {
        direction = 'desc';
    }
    
    // Очистка предыдущих индикаторов сортировки
    table.querySelectorAll('th').forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
    });
    
    // Установка нового индикатора
    header.classList.add(`sort-${direction}`);
    
    // Сортировка строк
    rows.sort((a, b) => {
        const aText = a.cells[columnIndex].textContent.trim();
        const bText = b.cells[columnIndex].textContent.trim();
        
        // Попытка числовой сортировки
        const aNum = parseFloat(aText);
        const bNum = parseFloat(bText);
        
        if (!isNaN(aNum) && !isNaN(bNum)) {
            return direction === 'asc' ? aNum - bNum : bNum - aNum;
        }
        
        // Текстовая сортировка
        return direction === 'asc' ? 
            aText.localeCompare(bText) : 
            bText.localeCompare(aText);
    });
    
    // Перестановка строк в таблице
    rows.forEach(row => tbody.appendChild(row));
}

// Показ модального окна
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('show');
    }
}

// Закрытие модального окна
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
    }
}

// Закрытие всех модальных окон
function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('show');
    });
}

// Показ пользовательского модального окна
function showCustomModal(title, content) {
    // Создание модального окна
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <span>${title}</span>
            </div>
            <div class="modal-body">
                ${content}
            </div>
            <div class="modal-footer">
                <button class="btn" onclick="this.closest('.modal').remove()">Закрыть</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Закрытие по клику вне модального окна
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Обновление статусной строки
function updateStatusBar() {
    const totalRecords = document.querySelectorAll(`#${currentTab}TableBody tr:not([style*="display: none"])`).length;
    const selectedRecords = selectedRows.size;
    const lastUpdate = new Date().toLocaleTimeString();
    
    document.getElementById('totalRecords').textContent = totalRecords;
    document.getElementById('selectedRecords').textContent = selectedRecords;
    document.getElementById('lastUpdate').textContent = lastUpdate;
}

// Показ уведомлений
function showNotification(message, type = 'info') {
    // Создание элемента уведомления
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        border: 1px solid #E0E0E0;
        border-radius: 4px;
        padding: 12px 16px;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        z-index: 2000;
        max-width: 300px;
        font-size: 13px;
        border-left: 4px solid ${getNotificationColor(type)};
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Автоматическое удаление через 3 секунды
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

// Получение цвета уведомления
function getNotificationColor(type) {
    switch (type) {
        case 'success': return '#10b981';
        case 'error': return '#ef4444';
        case 'warning': return '#f59e0b';
        default: return '#06b6d4';
    }
}

// Получение CSS класса для статуса
function getStatusClass(status) {
    const statusMap = {
        'В разработке': 'status-development',
        'Подготовлено': 'status-prepared',
        'Отправлено': 'status-sent',
        'Выполняется': 'status-executing',
        'Остановлено': 'status-stopped',
        'Готово': 'status-completed'
    };
    
    return statusMap[status] || 'status-development';
}

// Форматирование даты
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU');
}

// Форматирование даты и времени
function formatDateTime(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU');
}

// Функция debounce для оптимизации поиска
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Функции для кнопок в шапке
function showSettings() {
    showCustomModal('Настройки', `
        <div class="form-container">
            <div class="form-row">
                <label class="form-label">Сервер API:</label>
                <input type="text" class="form-input" value="${API_BASE_URL}" readonly>
            </div>
            <div class="form-row">
                <label class="form-label">Автообновление:</label>
                <select class="form-select">
                    <option value="30">30 секунд</option>
                    <option value="60" selected>1 минута</option>
                    <option value="300">5 минут</option>
                    <option value="0">Отключено</option>
                </select>
            </div>
            <div class="form-row">
                <label class="form-label">Тема оформления:</label>
                <select class="form-select">
                    <option value="1c" selected>1С:Предприятие</option>
                    <option value="light">Светлая</option>
                    <option value="dark">Темная</option>
                </select>
            </div>
        </div>
    `);
}

function showHelp() {
    showCustomModal('Справка', `
        <div style="line-height: 1.6;">
            <h3>Горячие клавиши:</h3>
            <ul>
                <li><strong>F1</strong> - Показать справку</li>
                <li><strong>F5</strong> - Обновить данные</li>
                <li><strong>Insert</strong> - Создать новое задание</li>
                <li><strong>Delete</strong> - Удалить выбранные задания</li>
                <li><strong>Enter</strong> - Редактировать выбранное задание</li>
                <li><strong>Ctrl+F</strong> - Поиск</li>
                <li><strong>Escape</strong> - Закрыть модальные окна</li>
            </ul>
            
            <h3>Работа с таблицами:</h3>
            <ul>
                <li>Одинарный клик - выделение строки</li>
                <li>Двойной клик - редактирование</li>
                <li>Ctrl+клик - множественное выделение</li>
                <li>Правый клик - контекстное меню</li>
                <li>Клик по заголовку - сортировка</li>
            </ul>
            
            <h3>Статусы заданий:</h3>
            <ul>
                <li><span class="status status-development">В разработке</span> - задание создано</li>
                <li><span class="status status-prepared">Подготовлено</span> - готово к отправке</li>
                <li><span class="status status-sent">Отправлено</span> - отправлено в производство</li>
                <li><span class="status status-executing">Выполняется</span> - в процессе выполнения</li>
                <li><span class="status status-stopped">Остановлено</span> - выполнение приостановлено</li>
                <li><span class="status status-completed">Готово</span> - выполнено</li>
            </ul>
        </div>
    `);
}

function exitApp() {
    if (confirm('Вы уверены, что хотите выйти из приложения?')) {
        window.close();
    }
} 
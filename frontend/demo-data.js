// Демонстрационные данные для тестирования интерфейса
const DEMO_TASKS = [
    {
        id: 1,
        created_at: '2024-01-15T10:30:00Z',
        order_number: 'ЗК-2024-001',
        designation: 'ДСП-16-2400х1200',
        name: 'Плита древесно-стружечная ламинированная',
        quantity: 50,
        status: 'В разработке',
        notes: 'Срочный заказ'
    },
    {
        id: 2,
        created_at: '2024-01-14T14:20:00Z',
        order_number: 'ЗК-2024-002',
        designation: 'МДФ-18-2800х2070',
        name: 'Плита МДФ влагостойкая',
        quantity: 25,
        status: 'Подготовлено',
        notes: ''
    },
    {
        id: 3,
        created_at: '2024-01-13T09:15:00Z',
        order_number: 'ЗК-2024-003',
        designation: 'ФК-15-1525х1525',
        name: 'Фанера березовая ФК',
        quantity: 100,
        status: 'Отправлено',
        notes: 'Доставка до склада'
    },
    {
        id: 4,
        created_at: '2024-01-12T16:45:00Z',
        order_number: 'ЗК-2024-004',
        designation: 'ОСБ-12-2500х1250',
        name: 'Плита ОСБ-3 влагостойкая',
        quantity: 75,
        status: 'Выполняется',
        notes: 'В производстве'
    },
    {
        id: 5,
        created_at: '2024-01-11T11:30:00Z',
        order_number: 'ЗК-2024-005',
        designation: 'ДВП-3.2-2745х1700',
        name: 'Плита древесноволокнистая твердая',
        quantity: 200,
        status: 'Остановлено',
        notes: 'Ожидание материала'
    },
    {
        id: 6,
        created_at: '2024-01-10T13:20:00Z',
        order_number: 'ЗК-2024-006',
        designation: 'ЦСП-20-3200х1250',
        name: 'Плита цементно-стружечная',
        quantity: 30,
        status: 'Готово',
        notes: 'Готово к отгрузке'
    }
];

const DEMO_RECEPTIONS = [
    {
        id: 1,
        date: '2024-01-15T08:00:00Z',
        order_number: 'ПР-2024-001',
        designation: 'БР-40х200х6000',
        name: 'Брус строительный сосна',
        quantity: 120,
        route_card_number: 'МК-001',
        status: 'Принято'
    },
    {
        id: 2,
        date: '2024-01-14T10:30:00Z',
        order_number: 'ПР-2024-002',
        designation: 'ДО-25х150х6000',
        name: 'Доска обрезная сосна',
        quantity: 85,
        route_card_number: 'МК-002',
        status: 'Принято'
    },
    {
        id: 3,
        date: '2024-01-13T15:45:00Z',
        order_number: 'ПР-2024-003',
        designation: 'ВГ-12.5х1200х2500',
        name: 'Вагонка деревянная',
        quantity: 60,
        route_card_number: 'МК-003',
        status: 'На проверке'
    }
];

const DEMO_ARCHIVE = [
    {
        id: 101,
        created_at: '2023-12-20T10:00:00Z',
        completed_at: '2024-01-05T16:30:00Z',
        order_number: 'ЗК-2023-150',
        designation: 'ДСП-16-2800х2070',
        name: 'Плита ДСП ламинированная белая',
        quantity: 40
    },
    {
        id: 102,
        created_at: '2023-12-18T14:20:00Z',
        completed_at: '2024-01-03T12:15:00Z',
        order_number: 'ЗК-2023-149',
        designation: 'МДФ-22-2800х2070',
        name: 'Плита МДФ шлифованная',
        quantity: 35
    }
];

// Функция для загрузки демо-данных
function loadDemoData() {
    console.log('Загрузка демонстрационных данных...');
    
    // Переопределяем функции загрузки данных для работы с демо-данными
    window.loadTasks = async function() {
        renderTasksTable(DEMO_TASKS);
        updateStatusBar();
    };
    
    window.loadReceptions = async function() {
        renderReceptionsTable(DEMO_RECEPTIONS);
    };
    
    window.loadArchive = async function() {
        renderArchiveTable(DEMO_ARCHIVE);
    };
    
    // Переопределяем функции для работы с заданиями
    window.editSelectedTask = async function() {
        if (selectedRows.size !== 1) {
            showNotification('Выберите одно задание для редактирования', 'warning');
            return;
        }
        
        const taskId = parseInt(Array.from(selectedRows)[0]);
        const task = DEMO_TASKS.find(t => t.id === taskId);
        
        if (!task) {
            showNotification('Задание не найдено', 'error');
            return;
        }
        
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
    };
    
    window.saveTask = async function() {
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
        
        if (currentEditingTask) {
            // Обновление существующего задания
            const index = DEMO_TASKS.findIndex(t => t.id === currentEditingTask.id);
            if (index !== -1) {
                DEMO_TASKS[index] = { ...DEMO_TASKS[index], ...taskData };
            }
            showNotification('Задание обновлено успешно', 'success');
        } else {
            // Создание нового задания
            const newTask = {
                id: Math.max(...DEMO_TASKS.map(t => t.id)) + 1,
                created_at: new Date().toISOString(),
                ...taskData
            };
            DEMO_TASKS.unshift(newTask);
            showNotification('Задание создано успешно', 'success');
        }
        
        closeModal('taskModal');
        await loadTasks();
    };
    
    window.deleteSelectedTask = async function() {
        if (selectedRows.size === 0) {
            showNotification('Выберите задания для удаления', 'warning');
            return;
        }
        
        const count = selectedRows.size;
        const message = count === 1 ? 
            'Вы уверены, что хотите удалить выбранное задание?' :
            `Вы уверены, что хотите удалить ${count} заданий?`;
        
        if (!confirm(message)) return;
        
        // Удаление выбранных заданий
        selectedRows.forEach(taskId => {
            const index = DEMO_TASKS.findIndex(t => t.id === parseInt(taskId));
            if (index !== -1) {
                DEMO_TASKS.splice(index, 1);
            }
        });
        
        showNotification(`Удалено заданий: ${count}`, 'success');
        clearSelection();
        await loadTasks();
    };
    
    window.viewTaskHistory = async function() {
        if (selectedRows.size !== 1) {
            showNotification('Выберите одно задание для просмотра истории', 'warning');
            return;
        }
        
        // Демо-история
        const history = [
            {
                timestamp: '2024-01-15T10:30:00Z',
                action: 'Создание',
                changes: 'Задание создано'
            },
            {
                timestamp: '2024-01-15T11:15:00Z',
                action: 'Изменение статуса',
                changes: 'Статус изменен с "В разработке" на "Подготовлено"'
            },
            {
                timestamp: '2024-01-15T14:20:00Z',
                action: 'Изменение количества',
                changes: 'Количество изменено с 45 на 50'
            }
        ];
        
        showTaskHistory(history);
    };
    
    window.importExcel = function() {
        showNotification('Функция импорта Excel доступна только с backend сервером', 'info');
    };
    
    // Загружаем начальные данные
    loadTasks();
}

// Автоматическая загрузка демо-данных при отсутствии backend
document.addEventListener('DOMContentLoaded', function() {
    // Проверяем доступность backend
    fetch(`${API_BASE_URL}/tasks`)
        .then(response => {
            if (!response.ok) throw new Error('Backend недоступен');
        })
        .catch(() => {
            console.log('Backend недоступен, загружаем демо-данные...');
            loadDemoData();
        });
}); 
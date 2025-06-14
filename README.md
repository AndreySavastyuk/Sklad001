# Система управления складом

Современная веб-система управления складом с архитектурой **Frontend + Backend**.

## 🏗️ Архитектура проекта

```
Sklad01/
├── backend/           # FastAPI сервер
│   ├── main.py       # Основной файл API
│   ├── models.py     # Модели данных SQLAlchemy
│   ├── schemas.py    # Pydantic схемы
│   └── requirements.txt
└── frontend/         # Веб-интерфейс
    ├── index.html    # Главная страница
    ├── app.js        # JavaScript логика
    ├── demo-data.js  # Демонстрационные данные
    └── README.md     # Документация frontend
```

## 🎨 Особенности

### Backend (FastAPI)
- ⚡ **FastAPI** - современный, быстрый веб-фреймворк
- 🗄️ **SQLAlchemy** - ORM для работы с базой данных
- 📊 **SQLite** - легкая встроенная база данных
- 🔄 **CORS** - поддержка кросс-доменных запросов
- 📝 **Автоматическая документация** API (Swagger/OpenAPI)
- 📈 **Логирование** всех операций
- 📤 **Импорт Excel** файлов

### Frontend (Vanilla JS)
- 🎨 **Дизайн в стиле 1С:Предприятие 8.3**
- ⌨️ **Горячие клавиши** (F1, F5, Insert, Delete, Enter, Ctrl+F, Escape)
- 🖱️ **Контекстное меню** при правом клике
- 📊 **Интерактивные таблицы** с сортировкой и поиском
- 📱 **Адаптивный дизайн** для разных устройств
- 🔄 **Автоматическое определение** доступности backend
- 🎭 **Демо-режим** с тестовыми данными

## 🚀 Быстрый старт

### 1. Запуск Backend сервера

```bash
# Переход в папку backend
cd backend

# Установка зависимостей
pip install -r requirements.txt

# Запуск сервера
python -m uvicorn main:app --reload
```

Backend будет доступен по адресу: `http://localhost:8000`
API документация: `http://localhost:8000/docs`

### 2. Запуск Frontend

```bash
# Переход в папку frontend
cd frontend

# Запуск локального сервера (опционально)
python -m http.server 8080

# Или просто откройте index.html в браузере
```

Frontend будет доступен по адресу: `http://localhost:8080`

### 3. Демо-режим (без backend)

Если backend недоступен, frontend автоматически переключится в демо-режим с тестовыми данными.

## 📋 Функциональность

### Задания
- ✅ Создание новых заданий
- ✅ Редактирование существующих
- ✅ Дублирование заданий
- ✅ Удаление заданий (одиночное и массовое)
- ✅ Просмотр истории изменений
- ✅ Импорт из Excel файлов
- ✅ Поиск и фильтрация
- ✅ Сортировка по всем столбцам

### Приемка
- ✅ Просмотр списка приемки
- ✅ Фильтрация по дате (по убыванию)
- ✅ Расширенный поиск
- ✅ Сортировка данных

### Архив
- ✅ Автоматическое перемещение готовых заданий
- ✅ Просмотр истории выполненных заданий
- ✅ Создание новых заданий на основе архивных
- ✅ Поиск в архиве

## 🎯 Статусы заданий

| Статус | Цвет | Описание |
|--------|------|----------|
| В разработке | 🔵 Голубой | Задание создано и находится в разработке |
| Подготовлено | 🟢 Светло-зеленый | Задание готово к отправке |
| Отправлено | 🟣 Сиреневый | Задание отправлено в производство |
| Выполняется | 🟡 Хаки | Задание находится в процессе выполнения |
| Остановлено | 🔴 Светло-красный | Выполнение задания приостановлено |
| Готово | 🟢 Зеленый | Задание полностью выполнено |

## 🔌 API Endpoints

### Задания
- `GET /api/tasks` - Получить все задания
- `POST /api/tasks` - Создать новое задание
- `GET /api/tasks/{id}` - Получить задание по ID
- `PUT /api/tasks/{id}` - Обновить задание
- `DELETE /api/tasks/{id}` - Удалить задание
- `GET /api/tasks/{id}/history` - История изменений задания
- `POST /api/tasks/import` - Импорт заданий из Excel
- `POST /api/tasks/archive` - Архивировать готовые задания

### Приемка
- `GET /api/receptions` - Получить все записи приемки
- `POST /api/receptions` - Создать запись приемки

## ⌨️ Горячие клавиши

| Клавиша | Действие |
|---------|----------|
| **F1** | Показать справку |
| **F5** | Обновить данные |
| **Insert** | Создать новое задание |
| **Delete** | Удалить выбранные задания |
| **Enter** | Редактировать выбранное задание |
| **Ctrl+F** | Открыть поиск |
| **Escape** | Закрыть модальные окна |

## 🛠️ Технологии

### Backend
- **Python 3.8+**
- **FastAPI** - веб-фреймворк
- **SQLAlchemy** - ORM
- **Pydantic** - валидация данных
- **Uvicorn** - ASGI сервер
- **Pandas** - обработка Excel файлов
- **OpenPyXL** - работа с Excel

### Frontend
- **HTML5** - разметка
- **CSS3** - стилизация (Grid, Flexbox, градиенты)
- **Vanilla JavaScript** - логика приложения
- **SVG** - иконки
- **Responsive Design** - адаптивность

## 📱 Совместимость

- **Браузеры**: Chrome 80+, Firefox 75+, Safari 13+, Edge 80+
- **Устройства**: Desktop, Tablet, Mobile
- **ОС**: Windows, macOS, Linux

## 🔧 Настройка

### Backend конфигурация
Настройки в `backend/main.py`:
- Порт сервера: `8000`
- База данных: `warehouse.db`
- CORS: разрешены все домены

### Frontend конфигурация
Настройки в `frontend/app.js`:
- API URL: `http://localhost:8000/api`
- Автообновление: каждые 60 секунд
- Демо-режим: автоматическое включение

## 📊 База данных

### Таблицы
- **tasks** - задания производства
- **receptions** - записи приемки
- **task_history** - история изменений заданий

### Схема данных
```sql
-- Задания
CREATE TABLE tasks (
    id INTEGER PRIMARY KEY,
    created_at DATETIME,
    order_number VARCHAR(50),
    designation VARCHAR(100),
    name VARCHAR(200),
    quantity INTEGER,
    status VARCHAR(50),
    notes TEXT
);

-- Приемка
CREATE TABLE receptions (
    id INTEGER PRIMARY KEY,
    date DATETIME,
    order_number VARCHAR(50),
    designation VARCHAR(100),
    name VARCHAR(200),
    quantity INTEGER,
    route_card_number VARCHAR(50),
    status VARCHAR(50)
);

-- История изменений
CREATE TABLE task_history (
    id INTEGER PRIMARY KEY,
    task_id INTEGER,
    timestamp DATETIME,
    action VARCHAR(50),
    changes TEXT,
    FOREIGN KEY (task_id) REFERENCES tasks (id)
);
```

## 🚀 Развертывание

### Локальное развертывание
1. Клонируйте репозиторий
2. Запустите backend сервер
3. Откройте frontend в браузере

### Продакшн развертывание
1. **Backend**: используйте Gunicorn + Nginx
2. **Frontend**: разместите на веб-сервере
3. **База данных**: PostgreSQL для продакшна

## 📝 Лицензия

Проект разработан для внутреннего использования.

## 🤝 Вклад в проект

1. Fork репозитория
2. Создайте feature branch
3. Внесите изменения
4. Создайте Pull Request

---

**Разработано с использованием современных веб-технологий** 🚀 
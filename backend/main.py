from fastapi import FastAPI, Depends, HTTPException, status, Query, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import os
import uvicorn

from models import init_db, get_db, Task, Reception, TaskHistory, UserFilter, create_sample_data, log_task_change, archive_old_tasks
from schemas import (
    TaskCreate, TaskUpdate, TaskBulkUpdate, Task as TaskSchema,
    ReceptionCreate, Reception as ReceptionSchema,
    TaskHistory as TaskHistorySchema,
    UserFilterCreate, UserFilter as UserFilterSchema,
    ArchiveResponse, ErrorResponse
)

# Создание FastAPI приложения
app = FastAPI(
    title="Система управления складом API",
    description="REST API для управления заданиями, приемкой и архивом",
    version="1.0.0"
)

# CORS middleware для работы с фронтендом
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # В продакшене указать конкретные домены
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Статические файлы (фронтенд)
if os.path.exists("../frontend"):
    app.mount("/static", StaticFiles(directory="../frontend"), name="static")

# Инициализация при запуске
@app.on_event("startup")
async def startup_event():
    init_db()
    create_sample_data()
    print("🚀 API сервер запущен!")

# Главная страница - отдаем фронтенд
@app.get("/")
async def read_root():
    if os.path.exists("../frontend/index.html"):
        return FileResponse("../frontend/index.html")
    return {"message": "Система управления складом API", "docs": "/docs"}

# ЗАДАНИЯ
@app.get("/api/tasks", response_model=List[TaskSchema])
async def get_tasks(
    archived: bool = Query(False, description="Получить архивные задания"),
    search: Optional[str] = Query(None, description="Поиск по названию или описанию"),
    status: Optional[str] = Query(None, description="Фильтр по статусу"),
    priority: Optional[str] = Query(None, description="Фильтр по приоритету"),
    responsible: Optional[str] = Query(None, description="Фильтр по ответственному"),
    overdue: Optional[bool] = Query(None, description="Только просроченные задания"),
    sort_by: str = Query("created_date", description="Поле для сортировки"),
    sort_order: str = Query("desc", description="Порядок сортировки (asc/desc)"),
    db: Session = Depends(get_db)
):
    """Получить список заданий"""
    query = db.query(Task).filter(Task.archived == archived)
    
    # Поиск
    if search:
        query = query.filter(
            (Task.name.contains(search)) |
            (Task.description.contains(search)) |
            (Task.number.contains(search)) |
            (Task.responsible.contains(search))
        )
    
    # Фильтры
    if status:
        query = query.filter(Task.status == status)
    if priority:
        query = query.filter(Task.priority == priority)
    if responsible:
        query = query.filter(Task.responsible.contains(responsible))
    
    # Фильтр просроченных заданий
    if overdue:
        query = query.filter(
            Task.due_date < datetime.now(),
            Task.status != "готово"
        )
    
    # Сортировка
    if hasattr(Task, sort_by):
        column = getattr(Task, sort_by)
        if sort_order.lower() == "asc":
            query = query.order_by(column.asc())
        else:
            query = query.order_by(column.desc())
    
    return query.all()

@app.get("/api/tasks/{task_id}", response_model=TaskSchema)
async def get_task(task_id: int, db: Session = Depends(get_db)):
    """Получить задание по ID"""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Задание не найдено"
        )
    return task

@app.post("/api/tasks", response_model=TaskSchema)
async def create_task(task: TaskCreate, db: Session = Depends(get_db)):
    """Создать новое задание"""
    # Проверяем уникальность номера
    existing_task = db.query(Task).filter(Task.number == task.number).first()
    if existing_task:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Задание с номером '{task.number}' уже существует"
        )
    
    db_task = Task(**task.dict())
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    
    # Логируем создание
    log_task_change(
        db, db_task.id, 
        "Создано", 
        f"Создано новое задание '{task.name}'"
    )
    
    return db_task

@app.put("/api/tasks/{task_id}", response_model=TaskSchema)
async def update_task(task_id: int, task_update: TaskUpdate, db: Session = Depends(get_db)):
    """Обновить задание"""
    db_task = db.query(Task).filter(Task.id == task_id).first()
    if not db_task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Задание не найдено"
        )
    
    # Сохраняем старые значения для логирования
    old_values = {
        "name": db_task.name,
        "description": db_task.description,
        "status": db_task.status,
        "priority": db_task.priority,
        "responsible": db_task.responsible,
        "due_date": db_task.due_date,
        "attachments": db_task.attachments
    }
    
    # Обновляем только переданные поля
    update_data = task_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_task, field, value)
    
    # Если статус изменился на "готово", устанавливаем дату завершения
    if task_update.status == "готово" and old_values["status"] != "готово":
        db_task.completed_date = datetime.now()
    
    db_task.updated_date = datetime.now()
    db.commit()
    db.refresh(db_task)
    
    # Логируем изменения
    for field, new_value in update_data.items():
        old_value = old_values.get(field)
        if old_value != new_value:
            log_task_change(
                db, task_id,
                "Обновлено",
                f"Поле '{field}' изменено: '{old_value}' → '{new_value}'",
                field_name=field,
                old_value=str(old_value) if old_value is not None else "",
                new_value=str(new_value) if new_value is not None else "",
                user="Пользователь",
                can_revert=True
            )
    
    return db_task

@app.delete("/api/tasks/{task_id}")
async def delete_task(task_id: int, db: Session = Depends(get_db)):
    """Удалить задание"""
    db_task = db.query(Task).filter(Task.id == task_id).first()
    if not db_task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Задание не найдено"
        )
    
    task_name = db_task.name
    db.delete(db_task)
    db.commit()
    
    return {"message": f"Задание '{task_name}' удалено"}

# МАССОВЫЕ ОПЕРАЦИИ
@app.put("/api/tasks/bulk-update")
async def bulk_update_tasks(bulk_update: TaskBulkUpdate, db: Session = Depends(get_db)):
    """Массовое обновление заданий"""
    if not bulk_update.task_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Не указаны ID заданий для обновления"
        )
    
    # Получаем задания
    tasks = db.query(Task).filter(Task.id.in_(bulk_update.task_ids)).all()
    if not tasks:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Задания не найдены"
        )
    
    updated_count = 0
    update_data = bulk_update.dict(exclude={'task_ids'}, exclude_unset=True)
    
    for task in tasks:
        old_values = {}
        changes = []
        
        for field, new_value in update_data.items():
            if hasattr(task, field):
                old_value = getattr(task, field)
                old_values[field] = old_value
                
                if old_value != new_value:
                    setattr(task, field, new_value)
                    changes.append(f"{field}: '{old_value}' → '{new_value}'")
                    
                    # Если статус изменился на "готово", устанавливаем дату завершения
                    if field == "status" and new_value == "готово" and old_value != "готово":
                        task.completed_date = datetime.now()
        
        if changes:
            task.updated_date = datetime.now()
            updated_count += 1
            
            # Логируем изменения
            log_task_change(
                db, task.id,
                "Массовое обновление",
                f"Изменения: {', '.join(changes)}",
                user="Пользователь"
            )
    
    db.commit()
    
    return {
        "message": f"Обновлено заданий: {updated_count}",
        "updated_count": updated_count
    }

@app.delete("/api/tasks/bulk-delete")
async def bulk_delete_tasks(task_ids: List[int], db: Session = Depends(get_db)):
    """Массовое удаление заданий"""
    if not task_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Не указаны ID заданий для удаления"
        )
    
    tasks = db.query(Task).filter(Task.id.in_(task_ids)).all()
    if not tasks:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Задания не найдены"
        )
    
    deleted_count = len(tasks)
    task_names = [task.name for task in tasks]
    
    for task in tasks:
        db.delete(task)
    
    db.commit()
    
    return {
        "message": f"Удалено заданий: {deleted_count}",
        "deleted_count": deleted_count,
        "deleted_tasks": task_names
    }

# СТАТИСТИКА И СЧЕТЧИКИ
@app.get("/api/tasks-stats")
async def get_tasks_stats(db: Session = Depends(get_db)):
    """Получить статистику по заданиям"""
    from sqlalchemy import func
    
    # Общая статистика
    total_tasks = db.query(Task).filter(Task.archived == False).count()
    
    # По статусам
    status_stats = db.query(
        Task.status,
        func.count(Task.id).label('count')
    ).filter(Task.archived == False).group_by(Task.status).all()
    
    # По приоритетам
    priority_stats = db.query(
        Task.priority,
        func.count(Task.id).label('count')
    ).filter(Task.archived == False).group_by(Task.priority).all()
    
    # Просроченные задания
    overdue_count = db.query(Task).filter(
        Task.archived == False,
        Task.due_date < datetime.now(),
        Task.status != "готово"
    ).count()
    
    return {
        "total_tasks": total_tasks,
        "overdue_count": overdue_count,
        "status_stats": {stat.status: stat.count for stat in status_stats},
        "priority_stats": {stat.priority: stat.count for stat in priority_stats}
    }

# ПОЛЬЗОВАТЕЛЬСКИЕ ФИЛЬТРЫ
@app.get("/api/filters", response_model=List[UserFilterSchema])
async def get_user_filters(db: Session = Depends(get_db)):
    """Получить пользовательские фильтры"""
    return db.query(UserFilter).order_by(UserFilter.created_date.desc()).all()

@app.post("/api/filters", response_model=UserFilterSchema)
async def create_user_filter(filter_data: UserFilterCreate, db: Session = Depends(get_db)):
    """Создать пользовательский фильтр"""
    db_filter = UserFilter(**filter_data.dict())
    db.add(db_filter)
    db.commit()
    db.refresh(db_filter)
    return db_filter

@app.delete("/api/filters/{filter_id}")
async def delete_user_filter(filter_id: int, db: Session = Depends(get_db)):
    """Удалить пользовательский фильтр"""
    db_filter = db.query(UserFilter).filter(UserFilter.id == filter_id).first()
    if not db_filter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Фильтр не найден"
        )
    
    filter_name = db_filter.name
    db.delete(db_filter)
    db.commit()
    
    return {"message": f"Фильтр '{filter_name}' удален"}

# ОТКАТ ИЗМЕНЕНИЙ
@app.post("/api/tasks/{task_id}/revert/{history_id}")
async def revert_task_change(task_id: int, history_id: int, db: Session = Depends(get_db)):
    """Откатить изменение задания"""
    # Проверяем существование задания
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Задание не найдено"
        )
    
    # Проверяем существование записи истории
    history = db.query(TaskHistory).filter(
        TaskHistory.id == history_id,
        TaskHistory.task_id == task_id,
        TaskHistory.can_revert == True
    ).first()
    
    if not history:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Запись истории не найдена или не может быть отменена"
        )
    
    # Откатываем изменение
    if history.field_name and hasattr(task, history.field_name):
        old_value = getattr(task, history.field_name)
        setattr(task, history.field_name, history.old_value)
        task.updated_date = datetime.now()
        
        # Логируем откат
        log_task_change(
            db, task_id,
            "Откат изменения",
            f"Откат поля '{history.field_name}': '{old_value}' → '{history.old_value}'",
            field_name=history.field_name,
            old_value=old_value,
            new_value=history.old_value,
            user="Пользователь"
        )
        
        db.commit()
        db.refresh(task)
        
        return {
            "message": "Изменение успешно отменено",
            "reverted_field": history.field_name,
            "reverted_to": history.old_value
        }
    
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Не удалось отменить изменение"
    )

# ПРИЕМКА
@app.get("/api/receptions", response_model=List[ReceptionSchema])
async def get_receptions(
    search: Optional[str] = Query(None, description="Поиск"),
    status: Optional[str] = Query(None, description="Фильтр по статусу"),
    db: Session = Depends(get_db)
):
    """Получить список приемок"""
    query = db.query(Reception).order_by(Reception.date.desc())
    
    # Поиск
    if search:
        query = query.filter(
            (Reception.name.contains(search)) |
            (Reception.order_number.contains(search)) |
            (Reception.designation.contains(search)) |
            (Reception.route_card_number.contains(search))
        )
    
    # Фильтр по статусу
    if status:
        query = query.filter(Reception.status == status)
    
    return query.all()

@app.post("/api/receptions", response_model=ReceptionSchema)
async def create_reception(reception: ReceptionCreate, db: Session = Depends(get_db)):
    """Создать запись о приемке"""
    db_reception = Reception(**reception.dict())
    db.add(db_reception)
    db.commit()
    db.refresh(db_reception)
    return db_reception

# ИСТОРИЯ
@app.get("/api/tasks/{task_id}/history", response_model=List[TaskHistorySchema])
async def get_task_history(task_id: int, db: Session = Depends(get_db)):
    """Получить историю изменений задания"""
    # Проверяем существование задания
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Задание не найдено"
        )
    
    history = db.query(TaskHistory).filter(
        TaskHistory.task_id == task_id
    ).order_by(TaskHistory.timestamp.desc()).all()
    
    return history

# АРХИВАЦИЯ
@app.post("/api/tasks/archive", response_model=ArchiveResponse)
async def archive_tasks():
    """Архивировать старые готовые задания"""
    count = archive_old_tasks()
    return ArchiveResponse(
        archived_count=count,
        message=f"Архивировано заданий: {count}"
    )

# ИМПОРТ EXCEL
@app.post("/api/tasks/import")
async def import_tasks_excel(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Импорт заданий из Excel файла"""
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Поддерживаются только Excel файлы (.xlsx, .xls)"
        )
    
    try:
        import pandas as pd
        from io import BytesIO
        
        # Читаем Excel файл
        contents = await file.read()
        df = pd.read_excel(BytesIO(contents))
        
        # Ожидаемые колонки
        required_columns = ['номер', 'наименование']
        
        # Проверяем наличие обязательных колонок
        df_columns_lower = [col.lower() for col in df.columns]
        missing_columns = [col for col in required_columns if col not in df_columns_lower]
        
        if missing_columns:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Отсутствуют обязательные колонки: {', '.join(missing_columns)}"
            )
        
        created_count = 0
        errors = []
        
        for index, row in df.iterrows():
            try:
                # Создаем задание
                task_data = {
                    "number": str(row.get('номер', f"AUTO-{index}")),
                    "name": str(row.get('наименование', '')),
                    "description": str(row.get('описание', '')),
                    "status": str(row.get('статус', 'в разработке'))
                }
                
                # Проверяем уникальность номера
                existing = db.query(Task).filter(Task.number == task_data["number"]).first()
                if existing:
                    errors.append(f"Строка {index + 2}: задание с номером '{task_data['number']}' уже существует")
                    continue
                
                db_task = Task(**task_data)
                db.add(db_task)
                db.commit()
                db.refresh(db_task)
                
                log_task_change(
                    db, db_task.id,
                    "Импортировано",
                    f"Задание импортировано из Excel файла '{file.filename}'"
                )
                
                created_count += 1
                
            except Exception as e:
                errors.append(f"Строка {index + 2}: {str(e)}")
                continue
        
        return {
            "message": f"Импорт завершен",
            "created": created_count,
            "errors": errors
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка обработки файла: {str(e)}"
        )

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    ) 
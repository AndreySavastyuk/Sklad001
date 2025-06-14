from fastapi import FastAPI, Depends, HTTPException, status, Query, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import os
import uvicorn

from models import init_db, get_db, Task, Reception, TaskHistory, create_sample_data, log_task_change, archive_old_tasks
from schemas import (
    TaskCreate, TaskUpdate, Task as TaskSchema,
    ReceptionCreate, Reception as ReceptionSchema,
    TaskHistory as TaskHistorySchema,
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
            (Task.number.contains(search))
        )
    
    # Фильтр по статусу
    if status:
        query = query.filter(Task.status == status)
    
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
        "status": db_task.status
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
    changes = []
    for field, new_value in update_data.items():
        if old_values.get(field) != new_value:
            changes.append(f"{field}: '{old_values.get(field)}' → '{new_value}'")
    
    if changes:
        log_task_change(
            db, task_id, 
            "Обновлено", 
            f"Изменения: {', '.join(changes)}"
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
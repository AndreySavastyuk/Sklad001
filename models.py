from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timedelta
import os

# Создаем базу данных
DATABASE_URL = "sqlite:///sklad.db"
engine = create_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Task(Base):
    """Модель для заданий"""
    __tablename__ = "tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String, nullable=False)  # Номер заказа
    designation = Column(String, nullable=False)   # Обозначение
    name = Column(String, nullable=False)          # Наименование
    quantity = Column(String, nullable=False)      # Количество
    status = Column(String, default="в разработке") # Статус
    created_date = Column(DateTime, default=datetime.now)
    updated_date = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    description = Column(Text, default="")         # Описание
    route_card = Column(String, default="")        # Номер маршрутной карты

class Reception(Base):
    """Модель для приемки"""
    __tablename__ = "reception"
    
    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime, default=datetime.now)  # Дата
    order_number = Column(String, nullable=False)  # Номер заказа
    designation = Column(String, nullable=False)   # Обозначение
    name = Column(String, nullable=False)          # Наименование
    quantity = Column(String, nullable=False)      # Количество
    route_card = Column(String, nullable=False)    # Номер маршрутной карты
    status = Column(String, default="принят")      # Статус
    created_date = Column(DateTime, default=datetime.now)

class Archive(Base):
    """Модель для архива заданий"""
    __tablename__ = "archive"
    
    id = Column(Integer, primary_key=True, index=True)
    original_task_id = Column(Integer, nullable=False)  # ID оригинального задания
    order_number = Column(String, nullable=False)
    designation = Column(String, nullable=False)
    name = Column(String, nullable=False)
    quantity = Column(String, nullable=False)
    status = Column(String, nullable=False)
    created_date = Column(DateTime, nullable=False)
    completed_date = Column(DateTime, nullable=False)
    archived_date = Column(DateTime, default=datetime.now)
    description = Column(Text, default="")
    route_card = Column(String, default="")

def init_db():
    """Инициализация базы данных"""
    Base.metadata.create_all(bind=engine)

def get_db():
    """Получение сессии базы данных"""
    db = SessionLocal()
    try:
        return db
    finally:
        pass

def get_all_tasks():
    """Получить все задания"""
    db = get_db()
    try:
        return db.query(Task).all()
    finally:
        db.close()

def get_all_reception():
    """Получить все позиции приемки"""
    db = get_db()
    try:
        return db.query(Reception).order_by(Reception.date.desc()).all()
    finally:
        db.close()

def get_all_archive():
    """Получить все архивные задания"""
    db = get_db()
    try:
        return db.query(Archive).order_by(Archive.archived_date.desc()).all()
    finally:
        db.close()

def create_task(order_number, designation, name, quantity, description="", route_card=""):
    """Создать новое задание"""
    db = get_db()
    try:
        task = Task(
            order_number=order_number,
            designation=designation,
            name=name,
            quantity=quantity,
            description=description,
            route_card=route_card
        )
        db.add(task)
        db.commit()
        db.refresh(task)
        return task
    finally:
        db.close()

def create_reception_item(order_number, designation, name, quantity, route_card, status="принят"):
    """Создать новую позицию приемки"""
    db = get_db()
    try:
        reception = Reception(
            order_number=order_number,
            designation=designation,
            name=name,
            quantity=quantity,
            route_card=route_card,
            status=status
        )
        db.add(reception)
        db.commit()
        db.refresh(reception)
        return reception
    finally:
        db.close()

def update_task_status(task_id, new_status):
    """Обновить статус задания"""
    db = get_db()
    try:
        task = db.query(Task).filter(Task.id == task_id).first()
        if task:
            task.status = new_status
            task.updated_date = datetime.now()
            db.commit()
            
            # Если статус "готово", проверяем нужно ли архивировать через 5 дней
            if new_status == "готово":
                check_and_archive_completed_tasks()
        return task
    finally:
        db.close()

def check_and_archive_completed_tasks():
    """Проверить и архивировать готовые задания старше 5 рабочих дней"""
    db = get_db()
    try:
        # 5 рабочих дней = 7 календарных дней (с учетом выходных)
        cutoff_date = datetime.now() - timedelta(days=7)
        
        completed_tasks = db.query(Task).filter(
            Task.status == "готово",
            Task.updated_date < cutoff_date
        ).all()
        
        for task in completed_tasks:
            # Создаем запись в архиве
            archive_item = Archive(
                original_task_id=task.id,
                order_number=task.order_number,
                designation=task.designation,
                name=task.name,
                quantity=task.quantity,
                status=task.status,
                created_date=task.created_date,
                completed_date=task.updated_date,
                description=task.description,
                route_card=task.route_card
            )
            db.add(archive_item)
            
            # Удаляем из основной таблицы
            db.delete(task)
        
        db.commit()
        return len(completed_tasks)
    finally:
        db.close()

def delete_task(task_id):
    """Удалить задание"""
    db = get_db()
    try:
        task = db.query(Task).filter(Task.id == task_id).first()
        if task:
            db.delete(task)
            db.commit()
            return True
        return False
    finally:
        db.close()

def create_task_from_archive(archive_id):
    """Создать новое задание на основе архивного"""
    db = get_db()
    try:
        archive_item = db.query(Archive).filter(Archive.id == archive_id).first()
        if archive_item:
            new_task = Task(
                order_number=f"{archive_item.order_number}_copy",
                designation=archive_item.designation,
                name=archive_item.name,
                quantity=archive_item.quantity,
                description=f"Создано на основе задания #{archive_item.original_task_id}",
                route_card=archive_item.route_card
            )
            db.add(new_task)
            db.commit()
            db.refresh(new_task)
            return new_task
        return None
    finally:
        db.close() 
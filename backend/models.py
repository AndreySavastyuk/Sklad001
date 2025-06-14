from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from datetime import datetime, timedelta
import os

# Создаем базу данных
DATABASE_URL = "sqlite:///./sklad.db"
engine = create_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Task(Base):
    """Модель для заданий"""
    __tablename__ = "tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    number = Column(String, unique=True, nullable=False)  # Номер задания
    name = Column(String, nullable=False)                 # Наименование
    description = Column(Text, default="")               # Описание
    status = Column(String, default="в разработке")      # Статус
    priority = Column(String, default="средний")         # Приоритет
    responsible = Column(String, default="")             # Ответственный
    due_date = Column(DateTime, nullable=True)           # Срок выполнения
    attachments = Column(Text, default="")               # Прикрепленные файлы (JSON)
    created_date = Column(DateTime, default=datetime.now)
    updated_date = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    completed_date = Column(DateTime, nullable=True)     # Дата завершения
    archived = Column(Boolean, default=False)            # Архивирован ли

class Reception(Base):
    """Модель для приемки"""
    __tablename__ = "reception"
    
    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime, default=datetime.now)        # Дата
    order_number = Column(String, nullable=False)        # Номер заказа
    designation = Column(String, nullable=False)         # Обозначение
    name = Column(String, nullable=False)                # Наименование
    quantity = Column(String, nullable=False)            # Количество
    route_card_number = Column(String, nullable=False)   # Номер маршрутной карты
    status = Column(String, default="принят")            # Статус
    created_date = Column(DateTime, default=datetime.now)

class TaskHistory(Base):
    """История изменений заданий"""
    __tablename__ = "task_history"
    
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, nullable=False)
    action = Column(String, nullable=False)              # Действие
    details = Column(Text, nullable=False)               # Детали изменения
    old_value = Column(Text, default="")                 # Старое значение
    new_value = Column(Text, default="")                 # Новое значение
    field_name = Column(String, default="")              # Название поля
    user = Column(String, default="Система")             # Пользователь
    timestamp = Column(DateTime, default=datetime.now)
    can_revert = Column(Boolean, default=False)          # Можно ли откатить

class UserFilter(Base):
    """Пользовательские фильтры"""
    __tablename__ = "user_filters"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)                # Название фильтра
    filter_data = Column(Text, nullable=False)           # JSON с параметрами фильтра
    user = Column(String, default="Пользователь")        # Пользователь
    created_date = Column(DateTime, default=datetime.now)

def init_db():
    """Инициализация базы данных"""
    Base.metadata.create_all(bind=engine)

def get_db():
    """Получение сессии базы данных"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_sample_data():
    """Создание тестовых данных"""
    from sqlalchemy.orm import Session
    db = SessionLocal()
    
    try:
        # Проверяем, есть ли уже данные
        if db.query(Task).count() > 0:
            return
        
        # Тестовые задания
        sample_tasks = [
            Task(
                number="2023/001",
                name="Корпус",
                description="Изготовление корпуса для станка",
                status="в разработке",
                priority="высокий",
                responsible="Иванов И.И.",
                due_date=datetime.now() + timedelta(days=5)
            ),
            Task(
                number="2023/002", 
                name="Крышка",
                description="Крышка для корпуса",
                status="подготовлено",
                priority="средний",
                responsible="Петров П.П.",
                due_date=datetime.now() + timedelta(days=3)
            ),
            Task(
                number="2023/003",
                name="Основание",
                description="Основание станка", 
                status="выполняется",
                priority="срочный",
                responsible="Сидоров С.С.",
                due_date=datetime.now() - timedelta(days=1)  # Просрочено
            ),
            Task(
                number="2023/004",
                name="Вал",
                description="Приводной вал",
                status="готово",
                priority="низкий",
                responsible="Козлов К.К.",
                completed_date=datetime.now() - timedelta(days=1),
                due_date=datetime.now() - timedelta(days=2)
            ),
            Task(
                number="2023/005",
                name="Подшипник",
                description="Подшипники качения",
                status="отправлено",
                priority="средний",
                responsible="Волков В.В.",
                due_date=datetime.now() + timedelta(days=7)
            )
        ]
        
        for task in sample_tasks:
            db.add(task)
        
        # Тестовые позиции приемки
        sample_receptions = [
            Reception(
                order_number="2023/101",
                designation="НЗ.КШ.040.20.001",
                name="Шестерня",
                quantity="25 шт.",
                route_card_number="1001",
                status="принят"
            ),
            Reception(
                order_number="2023/102",
                designation="НЗ.КШ.040.20.002", 
                name="Втулка",
                quantity="50 шт.",
                route_card_number="1002",
                status="есть замечания"
            ),
            Reception(
                order_number="2023/103",
                designation="НЗ.КШ.040.20.003",
                name="Пружина", 
                quantity="100 шт.",
                route_card_number="1003",
                status="проведен в НП"
            )
        ]
        
        for reception in sample_receptions:
            db.add(reception)
        
        # Архивное задание
        archived_task = Task(
            number="2022/050",
            name="Фланец",
            description="Выполненное задание из архива",
            status="готово",
            created_date=datetime.now() - timedelta(days=30),
            completed_date=datetime.now() - timedelta(days=10),
            archived=True
        )
        db.add(archived_task)
        
        db.commit()
        print("✅ Тестовые данные созданы")
        
    except Exception as e:
        print(f"❌ Ошибка создания тестовых данных: {e}")
        db.rollback()
    finally:
        db.close()

def log_task_change(db: Session, task_id: int, action: str, details: str, 
                   field_name: str = "", old_value: str = "", new_value: str = "", 
                   user: str = "Система", can_revert: bool = False):
    """Логирование изменений задания"""
    history = TaskHistory(
        task_id=task_id,
        action=action,
        details=details,
        field_name=field_name,
        old_value=old_value,
        new_value=new_value,
        user=user,
        can_revert=can_revert
    )
    db.add(history)
    db.commit()

def archive_old_tasks():
    """Архивирование старых заданий"""
    db = SessionLocal()
    try:
        # 5 рабочих дней = 7 календарных дней
        cutoff_date = datetime.now() - timedelta(days=7)
        
        old_tasks = db.query(Task).filter(
            Task.status == "готово",
            Task.completed_date < cutoff_date,
            Task.archived == False
        ).all()
        
        count = 0
        for task in old_tasks:
            task.archived = True
            log_task_change(db, task.id, "Архивирован", f"Автоматическое архивирование задания '{task.name}'")
            count += 1
        
        db.commit()
        return count
        
    except Exception as e:
        print(f"❌ Ошибка архивирования: {e}")
        db.rollback()
        return 0
    finally:
        db.close() 
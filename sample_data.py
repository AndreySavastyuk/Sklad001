"""
Скрипт для добавления тестовых данных в приложение
Запустите этот файл, чтобы заполнить базу данных примерами
"""

from models import *
from datetime import datetime, timedelta

def add_sample_data():
    """Добавление тестовых данных"""
    print("Добавление тестовых данных...")
    
    # Инициализируем базу данных
    init_db()
    
    # Тестовые задания
    sample_tasks = [
        {
            "order_number": "2023/001",
            "designation": "НЗ.КШ.040.25.001",
            "name": "Корпус",
            "quantity": "20 шт.",
            "description": "Изготовление корпуса для станка",
            "route_card": "1243",
            "status": "в разработке"
        },
        {
            "order_number": "2023/002",
            "designation": "НЗ.КШ.040.25.002",
            "name": "Крышка",
            "quantity": "15 шт.",
            "description": "Крышка для корпуса",
            "route_card": "1244",
            "status": "подготовлено"
        },
        {
            "order_number": "2023/003",
            "designation": "НЗ.КШ.040.25.003",
            "name": "Основание",
            "quantity": "10 шт.",
            "description": "Основание станка",
            "route_card": "1245",
            "status": "выполняется"
        },
        {
            "order_number": "2023/004",
            "designation": "НЗ.КШ.040.25.004",
            "name": "Вал",
            "quantity": "5 шт.",
            "description": "Приводной вал",
            "route_card": "1246",
            "status": "готово"
        },
        {
            "order_number": "2023/005",
            "designation": "НЗ.КШ.040.25.005",
            "name": "Подшипник",
            "quantity": "30 шт.",
            "description": "Подшипники качения",
            "route_card": "1247",
            "status": "отправлено"
        }
    ]
    
    # Добавляем задания
    for task_data in sample_tasks:
        create_task(
            task_data["order_number"],
            task_data["designation"],
            task_data["name"],
            task_data["quantity"],
            task_data["description"],
            task_data["route_card"]
        )
        # Обновляем статус если нужно
        if task_data["status"] != "в разработке":
            db = get_db()
            try:
                task = db.query(Task).filter(Task.order_number == task_data["order_number"]).first()
                if task:
                    task.status = task_data["status"]
                    db.commit()
            finally:
                db.close()
    
    # Тестовые позиции приемки
    sample_reception = [
        {
            "order_number": "2023/101",
            "designation": "НЗ.КШ.040.20.001",
            "name": "Шестерня",
            "quantity": "25 шт.",
            "route_card": "1001",
            "status": "принят"
        },
        {
            "order_number": "2023/102",
            "designation": "НЗ.КШ.040.20.002",
            "name": "Втулка",
            "quantity": "50 шт.",
            "route_card": "1002",
            "status": "есть замечания"
        },
        {
            "order_number": "2023/103",
            "designation": "НЗ.КШ.040.20.003",
            "name": "Пружина",
            "quantity": "100 шт.",
            "route_card": "1003",
            "status": "проведен в НП"
        },
        {
            "order_number": "2023/104",
            "designation": "НЗ.КШ.040.20.004",
            "name": "Болт",
            "quantity": "200 шт.",
            "route_card": "1004",
            "status": "принят"
        }
    ]
    
    # Добавляем позиции приемки
    for reception_data in sample_reception:
        create_reception_item(
            reception_data["order_number"],
            reception_data["designation"],
            reception_data["name"],
            reception_data["quantity"],
            reception_data["route_card"],
            reception_data["status"]
        )
    
    # Добавляем архивное задание (для демонстрации)
    db = get_db()
    try:
        archive_item = Archive(
            original_task_id=999,
            order_number="2022/050",
            designation="НЗ.КШ.030.15.001",
            name="Фланец",
            quantity="12 шт.",
            status="готово",
            created_date=datetime.now() - timedelta(days=30),
            completed_date=datetime.now() - timedelta(days=10),
            description="Выполненное задание из архива",
            route_card="0999"
        )
        db.add(archive_item)
        db.commit()
    finally:
        db.close()
    
    print("✅ Тестовые данные успешно добавлены!")
    print("Теперь можно запустить приложение: python main.py")

if __name__ == "__main__":
    add_sample_data() 
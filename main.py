import flet as ft
import pandas as pd
from datetime import datetime
from models import *
import os
import logging
import traceback

# Настройка логирования
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('sklad_app.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class SkladApp:
    def __init__(self, page: ft.Page):
        try:
            logger.info("🚀 Инициализация приложения...")
            self.page = page
            self.page.title = "Система управления складом"
            self.page.theme_mode = ft.ThemeMode.LIGHT
            self.page.window_width = 1200
            self.page.window_height = 800
            
            logger.info("📊 Инициализация базы данных...")
            # Инициализируем базу данных
            init_db()
            logger.info("✅ База данных инициализирована")
            
            logger.info("🎨 Создание основного интерфейса...")
            # Создаем основные компоненты
            self.create_main_layout()
            logger.info("✅ Приложение успешно инициализировано!")
            
        except Exception as e:
            logger.error(f"❌ Ошибка при инициализации приложения: {e}")
            logger.error(f"📍 Трассировка: {traceback.format_exc()}")
            raise
        
    def create_main_layout(self):
        """Создание основного интерфейса"""
        # Создаем вкладки
        self.tabs = ft.Tabs(
            selected_index=0,
            animation_duration=300,
            tabs=[
                ft.Tab(
                    text="Задания",
                    icon=ft.Icons.ASSIGNMENT,
                    content=self.create_tasks_tab()
                ),
                ft.Tab(
                    text="Приемка", 
                    icon=ft.Icons.INVENTORY,
                    content=self.create_reception_tab()
                ),
                ft.Tab(
                    text="Архив",
                    icon=ft.Icons.ARCHIVE,
                    content=self.create_archive_tab()
                )
            ]
        )
        
        self.page.add(self.tabs)
        
    def create_tasks_tab(self):
        """Создание вкладки заданий"""
        # Кнопки управления
        self.create_task_btn = ft.ElevatedButton(
            text="Создать задание",
            icon=ft.Icons.ADD,
            on_click=self.open_create_task_dialog
        )
        
        self.import_excel_btn = ft.ElevatedButton(
            text="Импорт Excel",
            icon=ft.Icons.UPLOAD_FILE,
            on_click=self.import_excel_dialog
        )
        
        # Поиск
        self.task_search = ft.TextField(
            label="Поиск по заданиям",
            prefix_icon=ft.Icons.SEARCH,
            on_change=self.filter_tasks
        )
        
        # Таблица заданий
        self.tasks_table = ft.DataTable(
            columns=[
                ft.DataColumn(ft.Text("ID")),
                ft.DataColumn(ft.Text("Номер заказа")),
                ft.DataColumn(ft.Text("Обозначение")),
                ft.DataColumn(ft.Text("Наименование")),
                ft.DataColumn(ft.Text("Количество")),
                ft.DataColumn(ft.Text("Статус")),
                ft.DataColumn(ft.Text("Дата создания")),
            ],
            rows=[]
        )
        
        self.refresh_tasks_table()
        
        return ft.Column([
            ft.Row([
                self.create_task_btn,
                self.import_excel_btn,
                ft.Container(expand=True),
                self.task_search
            ]),
            ft.Container(
                content=self.tasks_table,
                expand=True,
                border=ft.border.all(1, ft.Colors.OUTLINE),
                border_radius=10,
                padding=10
            )
        ])
    
    def create_reception_tab(self):
        """Создание вкладки приемки"""
        # Кнопка добавления позиции
        self.add_reception_btn = ft.ElevatedButton(
            text="Добавить позицию",
            icon=ft.Icons.ADD,
            on_click=self.open_create_reception_dialog
        )
        
        # Расширенный поиск
        self.reception_search = ft.TextField(
            label="Поиск по приемке",
            prefix_icon=ft.Icons.SEARCH,
            on_change=self.filter_reception
        )
        
        # Фильтры
        self.reception_status_filter = ft.Dropdown(
            label="Фильтр по статусу",
            options=[
                ft.dropdown.Option("все"),
                ft.dropdown.Option("принят"),
                ft.dropdown.Option("есть замечания"),
                ft.dropdown.Option("проведен в НП")
            ],
            value="все",
            on_change=self.filter_reception
        )
        
        # Таблица приемки
        self.reception_table = ft.DataTable(
            columns=[
                ft.DataColumn(ft.Text("Дата")),
                ft.DataColumn(ft.Text("Номер заказа")),
                ft.DataColumn(ft.Text("Обозначение")),
                ft.DataColumn(ft.Text("Наименование")),
                ft.DataColumn(ft.Text("Количество")),
                ft.DataColumn(ft.Text("№ маршрутной карты")),
                ft.DataColumn(ft.Text("Статус")),
            ],
            rows=[]
        )
        
        self.refresh_reception_table()
        
        return ft.Column([
            ft.Row([
                self.add_reception_btn,
                ft.Container(expand=True),
                self.reception_status_filter,
                self.reception_search
            ]),
            ft.Container(
                content=self.reception_table,
                expand=True,
                border=ft.border.all(1, ft.Colors.OUTLINE),
                border_radius=10,
                padding=10
            )
        ])
    
    def create_archive_tab(self):
        """Создание вкладки архива"""
        # Поиск
        self.archive_search = ft.TextField(
            label="Поиск в архиве",
            prefix_icon=ft.Icons.SEARCH,
            on_change=self.filter_archive
        )
        
        # Таблица архива
        self.archive_table = ft.DataTable(
            columns=[
                ft.DataColumn(ft.Text("ID")),
                ft.DataColumn(ft.Text("Номер заказа")),
                ft.DataColumn(ft.Text("Обозначение")),
                ft.DataColumn(ft.Text("Наименование")),
                ft.DataColumn(ft.Text("Количество")),
                ft.DataColumn(ft.Text("Дата архивирования")),
            ],
            rows=[]
        )
        
        self.refresh_archive_table()
        
        return ft.Column([
            ft.Row([
                ft.Container(expand=True),
                self.archive_search
            ]),
            ft.Container(
                content=self.archive_table,
                expand=True,
                border=ft.border.all(1, ft.Colors.OUTLINE),
                border_radius=10,
                padding=10
            )
        ])
    
    def refresh_tasks_table(self):
        """Обновление таблицы заданий"""
        try:
            logger.info("🔄 Обновление таблицы заданий...")
            tasks = get_all_tasks()
            logger.info(f"📊 Получено заданий: {len(tasks)}")
            self.tasks_table.rows.clear()
            
            for i, task in enumerate(tasks):
                logger.debug(f"📝 Обработка задания {i+1}/{len(tasks)}: {task.order_number}")
                # Определяем цвет статуса
                status_color = self.get_status_color(task.status)
                
                row = ft.DataRow(
                    cells=[
                        ft.DataCell(ft.Text(str(task.id))),
                        ft.DataCell(ft.Text(task.order_number)),
                        ft.DataCell(ft.Text(task.designation)),
                        ft.DataCell(ft.Text(task.name)),
                        ft.DataCell(ft.Text(task.quantity)),
                        ft.DataCell(ft.Container(
                            content=ft.Text(task.status, color=ft.Colors.WHITE),
                            bgcolor=status_color,
                            padding=5,
                            border_radius=5
                        )),
                        ft.DataCell(ft.Text(task.created_date.strftime("%d.%m.%Y"))),
                    ],
                    on_select_changed=lambda e, task_id=task.id: self.open_edit_task_dialog(task_id)
                )
                self.tasks_table.rows.append(row)
            
            logger.info("✅ Таблица заданий обновлена успешно")
            self.page.update()
            
        except Exception as e:
            logger.error(f"❌ Ошибка при обновлении таблицы заданий: {e}")
            logger.error(f"📍 Трассировка: {traceback.format_exc()}")
            raise
    
    def refresh_reception_table(self):
        """Обновление таблицы приемки"""
        receptions = get_all_reception()
        self.reception_table.rows.clear()
        
        for reception in receptions:
            row = ft.DataRow(
                cells=[
                    ft.DataCell(ft.Text(reception.date.strftime("%d.%m.%Y"))),
                    ft.DataCell(ft.Text(reception.order_number)),
                    ft.DataCell(ft.Text(reception.designation)),
                    ft.DataCell(ft.Text(reception.name)),
                    ft.DataCell(ft.Text(reception.quantity)),
                    ft.DataCell(ft.Text(reception.route_card)),
                    ft.DataCell(ft.Text(reception.status)),
                ]
            )
            self.reception_table.rows.append(row)
        
        self.page.update()
    
    def refresh_archive_table(self):
        """Обновление таблицы архива"""
        archives = get_all_archive()
        self.archive_table.rows.clear()
        
        for archive in archives:
            row = ft.DataRow(
                cells=[
                    ft.DataCell(ft.Text(str(archive.id))),
                    ft.DataCell(ft.Text(archive.order_number)),
                    ft.DataCell(ft.Text(archive.designation)),
                    ft.DataCell(ft.Text(archive.name)),
                    ft.DataCell(ft.Text(archive.quantity)),
                    ft.DataCell(ft.Text(archive.archived_date.strftime("%d.%m.%Y"))),
                ],
                on_select_changed=lambda e, archive_id=archive.id: self.open_archive_detail_dialog(archive_id)
            )
            self.archive_table.rows.append(row)
        
        self.page.update()
    
    def get_status_color(self, status):
        """Получение цвета для статуса"""
        try:
            colors = {
                "в разработке": ft.Colors.ORANGE,
                "подготовлено": ft.Colors.BLUE,
                "отправлено": ft.Colors.PURPLE,
                "выполняется": ft.Colors.AMBER,
                "остановлено": ft.Colors.RED,
                "готово": ft.Colors.GREEN
            }
            color = colors.get(status, ft.Colors.GREY)
            logger.debug(f"🎨 Цвет для статуса '{status}': {color}")
            return color
        except Exception as e:
            logger.error(f"❌ Ошибка получения цвета для статуса '{status}': {e}")
            return ft.Colors.GREY
    
    def open_create_task_dialog(self, e):
        """Открытие диалога создания задания"""
        order_field = ft.TextField(label="Номер заказа")
        designation_field = ft.TextField(label="Обозначение")
        name_field = ft.TextField(label="Наименование")
        quantity_field = ft.TextField(label="Количество")
        description_field = ft.TextField(label="Описание", multiline=True)
        route_card_field = ft.TextField(label="Номер маршрутной карты")
        
        def save_task(e):
            create_task(
                order_field.value,
                designation_field.value,
                name_field.value,
                quantity_field.value,
                description_field.value,
                route_card_field.value
            )
            self.refresh_tasks_table()
            dialog.open = False
            self.page.update()
        
        dialog = ft.AlertDialog(
            title=ft.Text("Создать задание"),
            content=ft.Column([
                order_field,
                designation_field,
                name_field,
                quantity_field,
                route_card_field,
                description_field
            ], height=400, scroll=ft.ScrollMode.AUTO),
            actions=[
                ft.TextButton("Отмена", on_click=lambda e: setattr(dialog, 'open', False) or self.page.update()),
                ft.ElevatedButton("Сохранить", on_click=save_task)
            ]
        )
        
        self.page.dialog = dialog
        dialog.open = True
        self.page.update()
    
    def open_edit_task_dialog(self, task_id):
        """Открытие диалога редактирования задания"""
        db = get_db()
        task = db.query(Task).filter(Task.id == task_id).first()
        db.close()
        
        if not task:
            return
        
        order_field = ft.TextField(label="Номер заказа", value=task.order_number)
        designation_field = ft.TextField(label="Обозначение", value=task.designation)
        name_field = ft.TextField(label="Наименование", value=task.name)
        quantity_field = ft.TextField(label="Количество", value=task.quantity)
        description_field = ft.TextField(label="Описание", value=task.description, multiline=True)
        route_card_field = ft.TextField(label="Номер маршрутной карты", value=task.route_card)
        
        status_field = ft.Dropdown(
            label="Статус",
            value=task.status,
            options=[
                ft.dropdown.Option("в разработке"),
                ft.dropdown.Option("подготовлено"),
                ft.dropdown.Option("отправлено"),
                ft.dropdown.Option("выполняется"),
                ft.dropdown.Option("остановлено"),
                ft.dropdown.Option("готово")
            ]
        )
        
        def update_task(e):
            db = get_db()
            try:
                task_to_update = db.query(Task).filter(Task.id == task_id).first()
                if task_to_update:
                    task_to_update.order_number = order_field.value
                    task_to_update.designation = designation_field.value
                    task_to_update.name = name_field.value
                    task_to_update.quantity = quantity_field.value
                    task_to_update.description = description_field.value
                    task_to_update.route_card = route_card_field.value
                    task_to_update.status = status_field.value
                    task_to_update.updated_date = datetime.now()
                    db.commit()
            finally:
                db.close()
            
            self.refresh_tasks_table()
            dialog.open = False
            self.page.update()
        
        def delete_task_action(e):
            delete_task(task_id)
            self.refresh_tasks_table()
            dialog.open = False
            self.page.update()
        
        dialog = ft.AlertDialog(
            title=ft.Text(f"Редактировать задание #{task_id}"),
            content=ft.Column([
                order_field,
                designation_field,
                name_field,
                quantity_field,
                route_card_field,
                status_field,
                description_field
            ], height=500, scroll=ft.ScrollMode.AUTO),
            actions=[
                ft.TextButton("Удалить", on_click=delete_task_action, style=ft.ButtonStyle(color=ft.Colors.RED)),
                ft.TextButton("Отмена", on_click=lambda e: setattr(dialog, 'open', False) or self.page.update()),
                ft.ElevatedButton("Сохранить", on_click=update_task)
            ]
        )
        
        self.page.dialog = dialog
        dialog.open = True
        self.page.update()
    
    def open_create_reception_dialog(self, e):
        """Открытие диалога создания позиции приемки"""
        order_field = ft.TextField(label="Номер заказа")
        designation_field = ft.TextField(label="Обозначение")
        name_field = ft.TextField(label="Наименование")
        quantity_field = ft.TextField(label="Количество")
        route_card_field = ft.TextField(label="Номер маршрутной карты")
        
        status_field = ft.Dropdown(
            label="Статус",
            value="принят",
            options=[
                ft.dropdown.Option("принят"),
                ft.dropdown.Option("есть замечания"),
                ft.dropdown.Option("проведен в НП")
            ]
        )
        
        def save_reception(e):
            create_reception_item(
                order_field.value,
                designation_field.value,
                name_field.value,
                quantity_field.value,
                route_card_field.value,
                status_field.value
            )
            self.refresh_reception_table()
            dialog.open = False
            self.page.update()
        
        dialog = ft.AlertDialog(
            title=ft.Text("Добавить позицию в приемку"),
            content=ft.Column([
                order_field,
                designation_field,
                name_field,
                quantity_field,
                route_card_field,
                status_field
            ], height=400, scroll=ft.ScrollMode.AUTO),
            actions=[
                ft.TextButton("Отмена", on_click=lambda e: setattr(dialog, 'open', False) or self.page.update()),
                ft.ElevatedButton("Сохранить", on_click=save_reception)
            ]
        )
        
        self.page.dialog = dialog
        dialog.open = True
        self.page.update()
    
    def open_archive_detail_dialog(self, archive_id):
        """Открытие диалога деталей архива"""
        db = get_db()
        archive_item = db.query(Archive).filter(Archive.id == archive_id).first()
        db.close()
        
        if not archive_item:
            return
        
        def create_from_archive(e):
            new_task = create_task_from_archive(archive_id)
            if new_task:
                self.refresh_tasks_table()
                # Переключаемся на вкладку заданий
                self.tabs.selected_index = 0
                self.page.update()
            dialog.open = False
            self.page.update()
        
        dialog = ft.AlertDialog(
            title=ft.Text(f"Архивное задание #{archive_item.original_task_id}"),
            content=ft.Column([
                ft.Text(f"Номер заказа: {archive_item.order_number}"),
                ft.Text(f"Обозначение: {archive_item.designation}"),
                ft.Text(f"Наименование: {archive_item.name}"),
                ft.Text(f"Количество: {archive_item.quantity}"),
                ft.Text(f"Маршрутная карта: {archive_item.route_card}"),
                ft.Text(f"Статус: {archive_item.status}"),
                ft.Text(f"Дата создания: {archive_item.created_date.strftime('%d.%m.%Y')}"),
                ft.Text(f"Дата завершения: {archive_item.completed_date.strftime('%d.%m.%Y')}"),
                ft.Text(f"Дата архивирования: {archive_item.archived_date.strftime('%d.%m.%Y')}"),
                ft.Text(f"Описание: {archive_item.description}"),
            ], height=400, scroll=ft.ScrollMode.AUTO),
            actions=[
                ft.TextButton("Закрыть", on_click=lambda e: setattr(dialog, 'open', False) or self.page.update()),
                ft.ElevatedButton("Создать задание на основе", on_click=create_from_archive)
            ]
        )
        
        self.page.dialog = dialog
        dialog.open = True
        self.page.update()
    
    def import_excel_dialog(self, e):
        """Диалог импорта Excel"""
        def import_excel(e):
            dialog.open = False
            self.page.update()
            
            info_dialog = ft.AlertDialog(
                title=ft.Text("Импорт Excel"),
                content=ft.Text("Функция импорта Excel будет реализована. Пока что добавьте данные вручную."),
                actions=[ft.TextButton("OK", on_click=lambda e: setattr(info_dialog, 'open', False) or self.page.update())]
            )
            self.page.dialog = info_dialog
            info_dialog.open = True
            self.page.update()
        
        dialog = ft.AlertDialog(
            title=ft.Text("Импорт из Excel"),
            content=ft.Text("Выберите файл Excel для импорта заданий"),
            actions=[
                ft.TextButton("Отмена", on_click=lambda e: setattr(dialog, 'open', False) or self.page.update()),
                ft.ElevatedButton("Выбрать файл", on_click=import_excel)
            ]
        )
        
        self.page.dialog = dialog
        dialog.open = True
        self.page.update()
    
    def filter_tasks(self, e):
        """Фильтрация заданий"""
        self.refresh_tasks_table()
    
    def filter_reception(self, e):
        """Фильтрация приемки"""
        self.refresh_reception_table()
    
    def filter_archive(self, e):
        """Фильтрация архива"""
        self.refresh_archive_table()

def main(page: ft.Page):
    try:
        logger.info("🎯 Запуск основной функции приложения...")
        app = SkladApp(page)
        logger.info("🎉 Приложение успешно запущено!")
    except Exception as e:
        logger.error(f"💥 Критическая ошибка в основной функции: {e}")
        logger.error(f"📍 Полная трассировка: {traceback.format_exc()}")
        # Показываем пользователю дружественное сообщение об ошибке
        page.add(ft.Text(
            f"Ошибка запуска приложения:\n{str(e)}\n\nДетали в файле sklad_app.log",
            color=ft.Colors.RED
        ))

if __name__ == "__main__":
    try:
        logger.info("=" * 50)
        logger.info("🚀 ЗАПУСК СИСТЕМЫ УПРАВЛЕНИЯ СКЛАДОМ")
        logger.info("=" * 50)
        ft.app(target=main)
    except Exception as e:
        logger.error(f"💥 Критическая ошибка при запуске Flet: {e}")
        logger.error(f"📍 Трассировка: {traceback.format_exc()}")
        print(f"\n❌ КРИТИЧЕСКАЯ ОШИБКА: {e}")
        print("📋 Детали ошибки записаны в файл sklad_app.log")
        input("Нажмите Enter для выхода...")

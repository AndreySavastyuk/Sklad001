"""
Утилиты для диагностики и проверки системы
"""

import sys
import os
import logging
import flet as ft
from datetime import datetime

def check_system():
    """Проверка системы и зависимостей"""
    print("🔍 ДИАГНОСТИКА СИСТЕМЫ")
    print("=" * 40)
    
    # Проверка версии Python
    print(f"🐍 Python версия: {sys.version}")
    if sys.version_info < (3, 8):
        print("⚠️  ПРЕДУПРЕЖДЕНИЕ: Рекомендуется Python 3.8 или выше")
    else:
        print("✅ Версия Python подходит")
    
    # Проверка Flet
    try:
        print(f"🎨 Flet версия: {ft.__version__}")
        print("✅ Flet установлен корректно")
        
        # Проверка доступности компонентов Flet
        test_components = [
            ('ft.Icons', hasattr(ft, 'Icons')),
            ('ft.Colors', hasattr(ft, 'Colors')),
            ('ft.Page', hasattr(ft, 'Page')),
            ('ft.app', hasattr(ft, 'app')),
        ]
        
        for component, available in test_components:
            if available:
                print(f"✅ {component} доступен")
            else:
                print(f"❌ {component} НЕ ДОСТУПЕН!")
                
    except Exception as e:
        print(f"❌ Ошибка проверки Flet: {e}")
    
    # Проверка SQLAlchemy
    try:
        import sqlalchemy
        print(f"🗄️  SQLAlchemy версия: {sqlalchemy.__version__}")
        print("✅ SQLAlchemy установлен")
    except ImportError as e:
        print(f"❌ SQLAlchemy не установлен: {e}")
    
    # Проверка других зависимостей
    try:
        import pandas
        print(f"🐼 Pandas версия: {pandas.__version__}")
        print("✅ Pandas установлен")
    except ImportError as e:
        print(f"❌ Pandas не установлен: {e}")
    
    try:
        import openpyxl
        print(f"📊 OpenPyXL версия: {openpyxl.__version__}")
        print("✅ OpenPyXL установлен")
    except ImportError as e:
        print(f"❌ OpenPyXL не установлен: {e}")
    
    # Проверка рабочей директории
    print(f"📁 Рабочая директория: {os.getcwd()}")
    
    # Проверка файлов проекта
    required_files = ['main.py', 'models.py', 'requirements.txt']
    for file in required_files:
        if os.path.exists(file):
            print(f"✅ Файл {file} найден")
        else:
            print(f"❌ Файл {file} НЕ НАЙДЕН!")
    
    # Проверка базы данных
    if os.path.exists('sklad.db'):
        size = os.path.getsize('sklad.db')
        print(f"✅ База данных найдена (размер: {size} байт)")
    else:
        print("⚠️  База данных не найдена (будет создана при запуске)")
    
    print("\n" + "=" * 40)
    print("🏁 ДИАГНОСТИКА ЗАВЕРШЕНА")

def test_flet_minimal():
    """Минимальный тест Flet"""
    print("\n🧪 ТЕСТ FLET...")
    
    def test_app(page: ft.Page):
        page.title = "Тест Flet"
        page.add(ft.Text("Тест успешен! Flet работает."))
        print("✅ Flet UI инициализирован успешно")
    
    try:
        print("🚀 Запуск тестового окна Flet...")
        ft.app(target=test_app)
        print("✅ Тест Flet завершен успешно")
    except Exception as e:
        print(f"❌ Ошибка тестирования Flet: {e}")
        return False
    
    return True

def create_test_log():
    """Создание тестового лога"""
    try:
        logging.basicConfig(
            level=logging.DEBUG,
            format='%(asctime)s - %(levelname)s - %(message)s',
            filename='diagnostic.log',
            filemode='w',
            encoding='utf-8'
        )
        
        logger = logging.getLogger('diagnostic')
        logger.info("Тестовый лог создан успешно")
        logger.debug("Отладочная информация")
        logger.warning("Тестовое предупреждение")
        logger.error("Тестовая ошибка")
        
        print("✅ Тестовый лог создан: diagnostic.log")
        return True
    except Exception as e:
        print(f"❌ Ошибка создания лога: {e}")
        return False

if __name__ == "__main__":
    print(f"📅 Время диагностики: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    check_system()
    create_test_log()
    
    print("\n🎯 Хотите запустить минимальный тест Flet? (y/n)")
    if input().lower() in ['y', 'yes', 'да', 'д']:
        test_flet_minimal()
    
    print("\n📋 Диагностика завершена. Проверьте файлы diagnostic.log и sklad_app.log для деталей.") 
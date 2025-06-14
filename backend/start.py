#!/usr/bin/env python3
"""
Запуск API сервера для системы управления складом
"""

import os
import sys
import uvicorn
from pathlib import Path

# Добавляем текущую директорию в путь
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

def main():
    """Запуск сервера"""
    print("🚀 Запуск системы управления складом...")
    print("📁 Проект: Sklad Management System")
    print("🌐 API документация: http://localhost:8000/docs")
    print("📦 Фронтенд: http://localhost:8000")
    print("=" * 50)
    
    try:
        uvicorn.run(
            "main:app",
            host="0.0.0.0",
            port=8000,
            reload=True,
            log_level="info",
            reload_dirs=[str(current_dir)],
            access_log=True
        )
    except Exception as e:
        print(f"❌ Ошибка запуска сервера: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 
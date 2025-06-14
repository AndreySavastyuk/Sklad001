#!/bin/bash

echo "========================================"
echo "    СИСТЕМА УПРАВЛЕНИЯ СКЛАДОМ"
echo "========================================"
echo ""

echo "Установка зависимостей..."
cd backend
pip install -r requirements.txt

echo ""
echo "Запуск сервера..."
echo "Веб-интерфейс: http://localhost:8000"
echo "API документация: http://localhost:8000/docs"
echo ""

python start.py 
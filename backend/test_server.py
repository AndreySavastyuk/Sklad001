from fastapi import FastAPI
import uvicorn

app = FastAPI(title="Тест API")

@app.get("/")
def read_root():
    return {"message": "Сервер работает!"}

@app.get("/test")
def test():
    return {"status": "ok", "message": "Тестовый эндпоинт работает"}

if __name__ == "__main__":
    print("🚀 Запуск тестового сервера...")
    uvicorn.run(app, host="127.0.0.1", port=8080) 
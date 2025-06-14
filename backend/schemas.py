from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

# Схемы для заданий
class TaskBase(BaseModel):
    number: str
    name: str
    description: Optional[str] = ""
    status: Optional[str] = "в разработке"

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None

class Task(TaskBase):
    id: int
    created_date: datetime
    updated_date: datetime
    completed_date: Optional[datetime] = None
    archived: bool = False
    
    class Config:
        from_attributes = True

# Схемы для приемки
class ReceptionBase(BaseModel):
    order_number: str
    designation: str
    name: str
    quantity: str
    route_card_number: str
    status: Optional[str] = "принят"

class ReceptionCreate(ReceptionBase):
    pass

class Reception(ReceptionBase):
    id: int
    date: datetime
    created_date: datetime
    
    class Config:
        from_attributes = True

# Схемы для истории
class TaskHistoryBase(BaseModel):
    task_id: int
    action: str
    details: str
    user: Optional[str] = "Система"

class TaskHistory(TaskHistoryBase):
    id: int
    timestamp: datetime
    
    class Config:
        from_attributes = True

# Схемы ответов
class TasksResponse(BaseModel):
    tasks: List[Task]
    total: int

class ReceptionsResponse(BaseModel):
    receptions: List[Reception]
    total: int

class ArchiveResponse(BaseModel):
    archived_count: int
    message: str

class ErrorResponse(BaseModel):
    detail: str 
import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: uuid.UUID
    email: EmailStr
    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class WidgetCreate(BaseModel):
    type: str
    config: dict = {}
    prompt: str | None = None
    layout: dict = {"x": 0, "y": 0, "w": 4, "h": 4}


class WidgetUpdate(BaseModel):
    config: dict | None = None
    prompt: str | None = None
    layout: dict | None = None


class WidgetOut(BaseModel):
    id: uuid.UUID
    type: str
    config: dict
    prompt: str | None
    layout: dict
    latest_result: "WidgetResultOut | None" = None
    model_config = {"from_attributes": True}


class DashboardCreate(BaseModel):
    name: str = "My Dashboard"


class DashboardOut(BaseModel):
    id: uuid.UUID
    name: str
    widgets: list[WidgetOut] = []
    model_config = {"from_attributes": True}


class WidgetResultOut(BaseModel):
    data: dict
    generated_at: datetime
    model_config = {"from_attributes": True}


WidgetOut.model_rebuild()

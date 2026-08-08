import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, JSON, String, Text, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def _uuid() -> uuid.UUID:
    return uuid.uuid4()


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    dashboards: Mapped[list["Dashboard"]] = relationship(back_populates="owner", cascade="all, delete-orphan")


class Dashboard(Base):
    __tablename__ = "dashboards"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(255), default="My Dashboard")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    owner: Mapped["User"] = relationship(back_populates="dashboards")
    widgets: Mapped[list["Widget"]] = relationship(back_populates="dashboard", cascade="all, delete-orphan")


class Widget(Base):
    """A single widget instance placed on a dashboard.

    `type` selects the plugin (see app/widgets/registry.py) that knows how to
    fetch data for it. `config` holds type-specific settings (e.g. ticker
    symbols). `prompt` is only used by LLM-backed widgets and is user-editable
    from the UI. `layout` holds grid position/size for react-grid-layout.
    """

    __tablename__ = "widgets"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    dashboard_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("dashboards.id", ondelete="CASCADE"))
    type: Mapped[str] = mapped_column(String(64))
    config: Mapped[dict] = mapped_column(JSON, default=dict)
    prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    layout: Mapped[dict] = mapped_column(JSON, default=lambda: {"x": 0, "y": 0, "w": 4, "h": 4})
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    dashboard: Mapped["Dashboard"] = relationship(back_populates="widgets")
    latest_result: Mapped["WidgetResult | None"] = relationship(
        back_populates="widget", uselist=False, cascade="all, delete-orphan"
    )


class WidgetResult(Base):
    """Cached latest output for a widget, so the UI has something to render
    immediately on load, before the next poll/scheduled run completes."""

    __tablename__ = "widget_results"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    widget_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("widgets.id", ondelete="CASCADE"), unique=True)
    data: Mapped[dict] = mapped_column(JSON, default=dict)
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    widget: Mapped["Widget"] = relationship(back_populates="latest_result")

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth import get_current_user
from app.database import get_db
from app.models import User, Widget
from app.routers.dashboards import _get_owned_dashboard
from app.scheduler import refresh_jobs
from app.schemas import WidgetCreate, WidgetOut, WidgetUpdate
from app.widgets.registry import get_plugin

router = APIRouter(prefix="/dashboards/{dashboard_id}/widgets", tags=["widgets"])


async def _get_widget_with_result(widget_id: uuid.UUID, db: AsyncSession) -> Widget:
    return await db.scalar(
        select(Widget).where(Widget.id == widget_id).options(selectinload(Widget.latest_result))
    )


@router.post("", response_model=WidgetOut, status_code=status.HTTP_201_CREATED)
async def create_widget(
    dashboard_id: uuid.UUID,
    payload: WidgetCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_owned_dashboard(dashboard_id, user, db)  # ownership check
    if get_plugin(payload.type) is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Unknown widget type '{payload.type}'")

    widget = Widget(dashboard_id=dashboard_id, **payload.model_dump())
    db.add(widget)
    await db.commit()
    await refresh_jobs()
    return await _get_widget_with_result(widget.id, db)


@router.patch("/{widget_id}", response_model=WidgetOut)
async def update_widget(
    dashboard_id: uuid.UUID,
    widget_id: uuid.UUID,
    payload: WidgetUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_owned_dashboard(dashboard_id, user, db)  # ownership check
    widget = await db.get(Widget, widget_id)
    if widget is None or widget.dashboard_id != dashboard_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Widget not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(widget, field, value)
    await db.commit()
    return await _get_widget_with_result(widget.id, db)


@router.delete("/{widget_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_widget(
    dashboard_id: uuid.UUID,
    widget_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_owned_dashboard(dashboard_id, user, db)  # ownership check
    widget = await db.get(Widget, widget_id)
    if widget is None or widget.dashboard_id != dashboard_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Widget not found")

    await db.delete(widget)
    await db.commit()
    await refresh_jobs()

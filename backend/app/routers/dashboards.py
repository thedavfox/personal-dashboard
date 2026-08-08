import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth import get_current_user
from app.database import get_db
from app.models import Dashboard, User, Widget
from app.schemas import DashboardCreate, DashboardOut

router = APIRouter(prefix="/dashboards", tags=["dashboards"])


async def _get_owned_dashboard(dashboard_id: uuid.UUID, user: User, db: AsyncSession) -> Dashboard:
    dashboard = await db.scalar(
        select(Dashboard)
        .where(Dashboard.id == dashboard_id)
        .options(selectinload(Dashboard.widgets).selectinload(Widget.latest_result))
    )
    if dashboard is None or dashboard.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Dashboard not found")
    return dashboard


@router.get("", response_model=list[DashboardOut])
async def list_dashboards(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.scalars(
        select(Dashboard)
        .where(Dashboard.user_id == user.id)
        .options(selectinload(Dashboard.widgets).selectinload(Widget.latest_result))
    )
    return result.all()


@router.post("", response_model=DashboardOut, status_code=status.HTTP_201_CREATED)
async def create_dashboard(
    payload: DashboardCreate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    dashboard = Dashboard(user_id=user.id, name=payload.name)
    db.add(dashboard)
    await db.commit()
    await db.refresh(dashboard, attribute_names=["widgets"])
    return dashboard


@router.get("/{dashboard_id}", response_model=DashboardOut)
async def get_dashboard(
    dashboard_id: uuid.UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    return await _get_owned_dashboard(dashboard_id, user, db)


@router.delete("/{dashboard_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_dashboard(
    dashboard_id: uuid.UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    dashboard = await _get_owned_dashboard(dashboard_id, user, db)
    await db.delete(dashboard)
    await db.commit()

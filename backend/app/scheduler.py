import logging
from datetime import datetime

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select

from app.database import async_session
from app.models import Dashboard, Widget, WidgetResult
from app.websocket import manager
from app.widgets.registry import get_plugin

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler()


async def _run_widget(widget_id) -> None:
    async with async_session() as db:
        widget = await db.get(Widget, widget_id)
        if widget is None:
            return

        plugin = get_plugin(widget.type)
        if plugin is None:
            return

        try:
            data = await plugin.fetch(widget)
        except Exception as e:
            logger.exception("widget %s (%s) fetch failed", widget.id, widget.type)
            data = {"error": f"Unexpected error: {e}"}

        result = await db.scalar(select(WidgetResult).where(WidgetResult.widget_id == widget.id))
        if result is None:
            result = WidgetResult(widget_id=widget.id, data=data)
            db.add(result)
        else:
            result.data = data
        await db.commit()

        dashboard = await db.get(Dashboard, widget.dashboard_id)
        await manager.send_widget_update(dashboard.user_id, widget.id, data)


async def _schedule_all_widgets() -> None:
    """(Re)reads all widgets from the DB and makes sure each has a recurring
    job at its plugin's update interval. Called on startup; call again after
    widgets are created/deleted to keep jobs in sync."""
    async with async_session() as db:
        widgets = (await db.scalars(select(Widget))).all()

    existing_job_ids = {job.id for job in scheduler.get_jobs()}
    seen = set()
    for widget in widgets:
        plugin = get_plugin(widget.type)
        if plugin is None:
            continue
        job_id = f"widget:{widget.id}"
        seen.add(job_id)
        if job_id not in existing_job_ids:
            scheduler.add_job(
                _run_widget,
                "interval",
                seconds=plugin.update_interval_seconds,
                args=[widget.id],
                id=job_id,
                next_run_time=datetime.now(),  # fire immediately, then on the configured interval
            )

    for job_id in existing_job_ids - seen:
        scheduler.remove_job(job_id)


def start() -> None:
    scheduler.start()


async def refresh_jobs() -> None:
    await _schedule_all_widgets()


def trigger_now(widget_id) -> None:
    """Reschedules a widget's existing job to fire immediately, without
    disturbing its normal recurring interval. Used when a widget's config or
    prompt changes, so edits show up right away instead of on the next
    scheduled tick."""
    job = scheduler.get_job(f"widget:{widget_id}")
    if job:
        scheduler.modify_job(job.id, next_run_time=datetime.now())

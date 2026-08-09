from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.auth import decode_access_token
from app.database import Base, engine
from app.routers import auth, dashboards, widgets
from app.scheduler import refresh_jobs, scheduler
from app.websocket import manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # No migration tool wired up yet — additive, idempotent column adds
        # for fields introduced after the table already existed in dev/prod.
        await conn.execute(text("ALTER TABLE widgets ADD COLUMN IF NOT EXISTS title VARCHAR(255)"))

    scheduler.start()
    await refresh_jobs()
    yield
    scheduler.shutdown()


app = FastAPI(title="Personal Dashboard API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server; add prod origin once deployed
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(dashboards.router)
app.include_router(widgets.router)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str):
    user_id = decode_access_token(token)
    if user_id is None:
        await websocket.close(code=4401)
        return

    await manager.connect(user_id, websocket)
    try:
        while True:
            # Client doesn't need to send anything; this just keeps the
            # connection open and detects disconnects.
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(user_id, websocket)

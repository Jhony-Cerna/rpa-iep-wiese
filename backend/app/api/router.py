from fastapi import APIRouter
from app.api.routes import auth, users, requests, dashboard, actualizacion, consultas, entrevistas, reclamos, quejas

api_router = APIRouter()
api_router.include_router(auth.router,          prefix="/auth",          tags=["auth"])
api_router.include_router(users.router,         prefix="/users",         tags=["users"])
api_router.include_router(requests.router,      prefix="/requests",      tags=["requests"])
api_router.include_router(dashboard.router,     prefix="/dashboard",     tags=["dashboard"])
api_router.include_router(actualizacion.router, prefix="/actualizacion", tags=["actualizacion"])
api_router.include_router(consultas.router,     prefix="/consultas",     tags=["consultas"])
api_router.include_router(entrevistas.router,   prefix="/entrevistas",   tags=["entrevistas"])
api_router.include_router(reclamos.router,      prefix="/reclamos",      tags=["reclamos"])
api_router.include_router(quejas.router,        prefix="/quejas",        tags=["quejas"])


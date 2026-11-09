from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime as dt

from app.api import deps
from app.db.models import Request, RequestHistory, DetalleQueja

router = APIRouter()

# ─────────────────────────────────────────────
# SCHEMAS locales
# ─────────────────────────────────────────────
class QuejaCreate(BaseModel):
    # Identificación (puede ser anónimo)
    es_anonimo: bool = False
    nombre_solicitante: Optional[str] = None
    correo_solicitante: str                     # Requerido aunque sea anónimo para notificar
    telefono_solicitante: Optional[str] = None

    # Clasificación
    tipo: str                                   # Queja | Sugerencia
    categoria: str                              # Atención al público | Comunicación | Infraestructura | Procesos | Otro
    area_relacionada: Optional[str] = None
    prioridad: str = "Normal"

    # Contenido
    asunto: str
    descripcion: str
    observaciones: Optional[str] = None

class QuejaEvaluacion(BaseModel):
    evaluacion: str                             # Texto de evaluación interna
    accion_propuesta: Optional[str] = None      # Acción a tomar

class QuejaRespuesta(BaseModel):
    respuesta_final: str                        # Respuesta al solicitante

class QuejaEstado(BaseModel):
    estado: str
    comentario: Optional[str] = None
    area_responsable: Optional[str] = None


TIPOS = ["Queja", "Sugerencia"]
CATEGORIAS = ["Atención al público", "Comunicación", "Infraestructura", "Procesos", "Otro"]
ESTADOS = [
    "Recibida", "En revisión", "Evaluada", "En atención",
    "Respondida", "Cerrada", "Archivada"
]


def _generar_codigo(db: Session) -> str:
    """Genera código único tipo QUE-2026-0001."""
    year = dt.utcnow().year
    total = db.query(Request).filter(
        Request.tipo_solicitud == "Queja o Sugerencia"
    ).count()
    counter = total + 1
    codigo = f"QUE-{year}-{counter:04d}"
    while db.query(Request).filter(Request.codigo == codigo).first():
        counter += 1
        codigo = f"QUE-{year}-{counter:04d}"
    return codigo


def _solicitud_a_dict(r: Request, ocultar_datos: bool = False) -> dict:
    det = r.detalle_queja
    es_anonimo = det.es_anonimo if det else False

    return {
        "id": r.id,
        "codigo": r.codigo,
        "tipo_solicitud": r.tipo_solicitud,
        # Si es anónimo, ocultar nombre pero mantener correo para notificaciones
        "nombre_solicitante": "Anónimo" if (es_anonimo and ocultar_datos) else r.nombre_solicitante,
        "correo_solicitante": r.correo_solicitante if not ocultar_datos else ("—" if es_anonimo else r.correo_solicitante),
        "telefono_solicitante": None if (es_anonimo and ocultar_datos) else r.telefono_solicitante,
        "prioridad": r.prioridad,
        "asunto": r.asunto,
        "descripcion": r.descripcion,
        "estado": r.estado,
        "area_responsable": r.area_responsable,
        "observaciones": r.observaciones,
        "fecha_recepcion": r.fecha_recepcion.isoformat() if r.fecha_recepcion else None,
        "fecha_primera_respuesta": r.fecha_primera_respuesta.isoformat() if r.fecha_primera_respuesta else None,
        "fecha_atencion": r.fecha_atencion.isoformat() if r.fecha_atencion else None,
        "fecha_cierre": r.fecha_cierre.isoformat() if r.fecha_cierre else None,
        "detalle": {
            "tipo": det.tipo,
            "es_anonimo": det.es_anonimo,
            "categoria": det.categoria,
            "area_relacionada": det.area_relacionada,
            "evaluacion": det.evaluacion,
            "accion_propuesta": det.accion_propuesta,
            "respuesta_final": det.respuesta_final,
        } if det else {
            "tipo": "Sugerencia",
            "es_anonimo": False,
            "categoria": "General",
            "area_relacionada": r.area_responsable or "Secretaría",
            "evaluacion": None,
            "accion_propuesta": None,
            "respuesta_final": None,
        },
    }


# ─────────────────────────────────────────────
# ENDPOINTS
# ─────────────────────────────────────────────

@router.get("/list")
def listar_quejas(db: Session = Depends(deps.get_db)):
    """Lista todas las quejas y sugerencias activas/POS-TEST (muestra datos anónimos de forma protegida)."""
    reqs = (
        db.query(Request)
        .filter(
            Request.tipo_solicitud == "Queja o Sugerencia",
            (Request.codigo.is_(None)) | (~Request.codigo.like("PRE-%")),
        )
        .order_by(Request.fecha_recepcion.desc())
        .all()
    )
    # En el listado, ocultar datos de anónimos
    return [_solicitud_a_dict(r, ocultar_datos=True) for r in reqs]


@router.get("/{solicitud_id}")
def obtener_queja(solicitud_id: int, db: Session = Depends(deps.get_db)):
    """Obtiene una queja/sugerencia con su historial. Muestra datos reales para gestión interna."""
    r = db.query(Request).filter(
        Request.id == solicitud_id,
        Request.tipo_solicitud == "Queja o Sugerencia"
    ).first()
    if not r:
        raise HTTPException(status_code=404, detail="Queja/Sugerencia no encontrada")

    # En la vista de detalle interna NO se ocultan datos (es para el administrador)
    data = _solicitud_a_dict(r, ocultar_datos=False)
    data["historial"] = [
        {
            "estado_anterior": h.estado_anterior,
            "estado_nuevo": h.estado_nuevo,
            "comentario": h.comentario,
            "area_responsable": h.area_responsable,
            "fecha": h.fecha.isoformat() if h.fecha else None,
            "automatico": h.usuario_id is None,
        }
        for h in sorted(r.historial, key=lambda x: x.fecha or dt.min)
    ]
    return data


@router.post("/")
def crear_queja(payload: QuejaCreate, db: Session = Depends(deps.get_db)):
    """Crea una nueva queja o sugerencia desde el formulario web."""
    now = dt.utcnow()

    # Si es anónimo, usar "Anónimo" como nombre en la BD
    nombre_real = payload.nombre_solicitante if not payload.es_anonimo else "Anónimo"

    solicitud = Request(
        tipo_solicitud="Queja o Sugerencia",
        canal_origen="Manual",
        nombre_solicitante=nombre_real,
        correo_solicitante=payload.correo_solicitante,
        telefono_solicitante=None if payload.es_anonimo else payload.telefono_solicitante,
        asunto=payload.asunto,
        descripcion=payload.descripcion,
        prioridad=payload.prioridad,
        area_responsable=payload.area_relacionada,
        observaciones=payload.observaciones,
        estado="Recibida",
        fecha_recepcion=now,
    )
    db.add(solicitud)
    db.flush()

    solicitud.codigo = _generar_codigo(db)

    detalle = DetalleQueja(
        solicitud_id=solicitud.id,
        tipo=payload.tipo,
        es_anonimo=payload.es_anonimo,
        categoria=payload.categoria,
        area_relacionada=payload.area_relacionada,
    )
    db.add(detalle)

    historial = RequestHistory(
        request_id=solicitud.id,
        estado_nuevo="Recibida",
        comentario=f"{payload.tipo} registrada desde el panel web",
        area_responsable=payload.area_relacionada or "Secretaría",
    )
    db.add(historial)
    db.commit()
    db.refresh(solicitud)

    return {"status": "ok", "id": solicitud.id, "codigo": solicitud.codigo}


@router.put("/{solicitud_id}/evaluar")
def evaluar_queja(
    solicitud_id: int,
    payload: QuejaEvaluacion,
    db: Session = Depends(deps.get_db),
):
    """Registra la evaluación interna y propuesta de acción."""
    r = db.query(Request).filter(Request.id == solicitud_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Queja/Sugerencia no encontrada")

    if not r.detalle_queja:
        det = DetalleQueja(solicitud_id=r.id, tipo="Sugerencia", es_anonimo=False, categoria="General", area_relacionada=r.area_responsable or "Secretaría")
        db.add(det)
        db.flush()
        r.detalle_queja = det
    else:
        det = r.detalle_queja
    det.evaluacion = payload.evaluacion
    det.accion_propuesta = payload.accion_propuesta

    estado_anterior = r.estado
    r.estado = "Evaluada"

    historial = RequestHistory(
        request_id=r.id,
        estado_anterior=estado_anterior,
        estado_nuevo="Evaluada",
        comentario=f"Evaluación registrada. Acción propuesta: {payload.accion_propuesta or 'N/A'}",
    )
    db.add(historial)
    db.commit()
    return {"status": "ok", "estado": r.estado}


@router.put("/{solicitud_id}/responder")
def responder_queja(
    solicitud_id: int,
    payload: QuejaRespuesta,
    db: Session = Depends(deps.get_db),
):
    """Registra la respuesta final al solicitante."""
    r = db.query(Request).filter(Request.id == solicitud_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Queja/Sugerencia no encontrada")

    if not r.detalle_queja:
        det = DetalleQueja(solicitud_id=r.id, tipo="Sugerencia", es_anonimo=False, categoria="General", area_relacionada=r.area_responsable or "Secretaría")
        db.add(det)
        db.flush()
        r.detalle_queja = det
    else:
        det = r.detalle_queja
    det.respuesta_final = payload.respuesta_final

    estado_anterior = r.estado
    r.estado = "Respondida"
    now = dt.utcnow()
    if not r.fecha_primera_respuesta:
        r.fecha_primera_respuesta = now
    r.fecha_atencion = now

    historial = RequestHistory(
        request_id=r.id,
        estado_anterior=estado_anterior,
        estado_nuevo="Respondida",
        comentario=f"Respuesta final: {payload.respuesta_final[:100]}...",
    )
    db.add(historial)
    db.commit()
    return {"status": "ok", "estado": r.estado}


@router.put("/{solicitud_id}/estado")
def cambiar_estado(
    solicitud_id: int,
    payload: QuejaEstado,
    db: Session = Depends(deps.get_db),
):
    """Cambia el estado de una queja/sugerencia."""
    r = db.query(Request).filter(Request.id == solicitud_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Queja/Sugerencia no encontrada")

    estado_anterior = r.estado
    r.estado = payload.estado

    now = dt.utcnow()
    if payload.estado in ("Respondida",) and not r.fecha_primera_respuesta:
        r.fecha_primera_respuesta = now
        r.fecha_atencion = now
    if payload.estado in ("Cerrada", "Archivada"):
        r.fecha_cierre = now
    if payload.area_responsable:
        r.area_responsable = payload.area_responsable

    historial = RequestHistory(
        request_id=r.id,
        estado_anterior=estado_anterior,
        estado_nuevo=payload.estado,
        comentario=payload.comentario or f"Cambio de estado a: {payload.estado}",
        area_responsable=payload.area_responsable,
    )
    db.add(historial)
    db.commit()
    db.refresh(r)
    return {"status": "ok", "estado": r.estado}

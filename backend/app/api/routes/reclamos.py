from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime as dt

from app.api import deps
from app.db.models import Request, RequestHistory, DetalleReclamo

router = APIRouter()

# ─────────────────────────────────────────────
# SCHEMAS locales
# ─────────────────────────────────────────────
class ReclamoCreate(BaseModel):
    nombre_solicitante: str
    correo_solicitante: str
    telefono_solicitante: Optional[str] = None
    prioridad: str = "Normal"
    asunto: str
    categoria: str            # Servicio | Docente | Administrativo | Infraestructura | Otro
    hechos: str               # Descripción detallada del reclamo
    area_responsable: Optional[str] = None
    observaciones: Optional[str] = None

class ReclamoResolucion(BaseModel):
    acciones_realizadas: str
    resolucion: str           # Texto de la resolución/respuesta final

class ReclamoEstado(BaseModel):
    estado: str
    comentario: Optional[str] = None
    area_responsable: Optional[str] = None


CATEGORIAS = ["Servicio", "Docente", "Administrativo", "Infraestructura", "Otro"]
ESTADOS = [
    "Recibido", "En evaluación", "Derivado", "En atención",
    "Pendiente de información", "Resuelto", "Cerrado", "Requiere revisión manual"
]


def _generar_codigo(db: Session) -> str:
    """Genera código único tipo REC-2026-0001."""
    year = dt.utcnow().year
    total = db.query(Request).filter(
        Request.tipo_solicitud == "Reclamo"
    ).count()
    counter = total + 1
    codigo = f"REC-{year}-{counter:04d}"
    while db.query(Request).filter(Request.codigo == codigo).first():
        counter += 1
        codigo = f"REC-{year}-{counter:04d}"
    return codigo


def _solicitud_a_dict(r: Request) -> dict:
    det = r.detalle_reclamo
    return {
        "id": r.id,
        "codigo": r.codigo,
        "tipo_solicitud": r.tipo_solicitud,
        "nombre_solicitante": r.nombre_solicitante,
        "correo_solicitante": r.correo_solicitante,
        "telefono_solicitante": r.telefono_solicitante,
        "prioridad": r.prioridad,
        "asunto": r.asunto,
        "estado": r.estado,
        "area_responsable": r.area_responsable,
        "observaciones": r.observaciones,
        "fecha_recepcion": r.fecha_recepcion.isoformat() if r.fecha_recepcion else None,
        "fecha_primera_respuesta": r.fecha_primera_respuesta.isoformat() if r.fecha_primera_respuesta else None,
        "fecha_atencion": r.fecha_atencion.isoformat() if r.fecha_atencion else None,
        "fecha_cierre": r.fecha_cierre.isoformat() if r.fecha_cierre else None,
        "detalle": {
            "categoria": det.categoria,
            "hechos": det.hechos,
            "documentos_adjuntos": det.documentos_adjuntos,
            "acciones_realizadas": det.acciones_realizadas,
            "resolucion": det.resolucion,
            "fecha_resolucion": det.fecha_resolucion.isoformat() if det.fecha_resolucion else None,
        } if det else {
            "categoria": "General",
            "hechos": r.descripcion or r.asunto,
            "documentos_adjuntos": None,
            "acciones_realizadas": None,
            "resolucion": None,
            "fecha_resolucion": None,
        },
    }


# ─────────────────────────────────────────────
# ENDPOINTS
# ─────────────────────────────────────────────

@router.get("/list")
def listar_reclamos(db: Session = Depends(deps.get_db)):
    """Lista todas las solicitudes activas/POS-TEST de reclamo."""
    reqs = (
        db.query(Request)
        .filter(
            Request.tipo_solicitud == "Reclamo",
            (Request.codigo.is_(None)) | (~Request.codigo.like("PRE-%")),
        )
        .order_by(Request.fecha_recepcion.desc())
        .all()
    )
    return [_solicitud_a_dict(r) for r in reqs]


@router.get("/{solicitud_id}")
def obtener_reclamo(solicitud_id: int, db: Session = Depends(deps.get_db)):
    """Obtiene un reclamo con su historial completo."""
    r = db.query(Request).filter(
        Request.id == solicitud_id,
        Request.tipo_solicitud == "Reclamo"
    ).first()
    if not r:
        raise HTTPException(status_code=404, detail="Reclamo no encontrado")

    data = _solicitud_a_dict(r)
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
def crear_reclamo(payload: ReclamoCreate, db: Session = Depends(deps.get_db)):
    """Crea un nuevo reclamo desde el formulario web."""
    now = dt.utcnow()

    solicitud = Request(
        tipo_solicitud="Reclamo",
        canal_origen="Manual",
        nombre_solicitante=payload.nombre_solicitante,
        correo_solicitante=payload.correo_solicitante,
        telefono_solicitante=payload.telefono_solicitante,
        asunto=payload.asunto,
        prioridad=payload.prioridad,
        area_responsable=payload.area_responsable,
        observaciones=payload.observaciones,
        estado="Recibido",
        fecha_recepcion=now,
    )
    db.add(solicitud)
    db.flush()

    solicitud.codigo = _generar_codigo(db)

    detalle = DetalleReclamo(
        solicitud_id=solicitud.id,
        categoria=payload.categoria,
        hechos=payload.hechos,
    )
    db.add(detalle)

    historial = RequestHistory(
        request_id=solicitud.id,
        estado_nuevo="Recibido",
        comentario="Reclamo registrado desde el panel web",
        area_responsable=payload.area_responsable or "Secretaría",
    )
    db.add(historial)
    db.commit()
    db.refresh(solicitud)

    return {"status": "ok", "id": solicitud.id, "codigo": solicitud.codigo}


@router.put("/{solicitud_id}/resolver")
def resolver_reclamo(
    solicitud_id: int,
    payload: ReclamoResolucion,
    db: Session = Depends(deps.get_db),
):
    """Registra las acciones tomadas y la resolución del reclamo."""
    r = db.query(Request).filter(Request.id == solicitud_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Reclamo no encontrado")

    if not r.detalle_reclamo:
        det = DetalleReclamo(solicitud_id=r.id, categoria="General", hechos=r.descripcion or r.asunto)
        db.add(det)
        db.flush()
        r.detalle_reclamo = det
    else:
        det = r.detalle_reclamo
    det.acciones_realizadas = payload.acciones_realizadas
    det.resolucion = payload.resolucion
    det.fecha_resolucion = dt.utcnow()

    estado_anterior = r.estado
    r.estado = "Resuelto"
    now = dt.utcnow()
    if not r.fecha_primera_respuesta:
        r.fecha_primera_respuesta = now
    r.fecha_atencion = now

    historial = RequestHistory(
        request_id=r.id,
        estado_anterior=estado_anterior,
        estado_nuevo="Resuelto",
        comentario=f"Resolución registrada: {payload.resolucion[:100]}...",
    )
    db.add(historial)
    db.commit()
    return {"status": "ok", "estado": r.estado}


@router.put("/{solicitud_id}/estado")
def cambiar_estado(
    solicitud_id: int,
    payload: ReclamoEstado,
    db: Session = Depends(deps.get_db),
):
    """Cambia el estado de un reclamo."""
    r = db.query(Request).filter(Request.id == solicitud_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Reclamo no encontrado")

    estado_anterior = r.estado
    r.estado = payload.estado

    now = dt.utcnow()
    if payload.estado in ("Resuelto", "Cerrado") and not r.fecha_primera_respuesta:
        r.fecha_primera_respuesta = now
        r.fecha_atencion = now
    if payload.estado == "Cerrado":
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

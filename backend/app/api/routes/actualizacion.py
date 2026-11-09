from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime as dt

from app.api import deps
from app.db.models import Request, RequestHistory, DetalleActualizacion, User

router = APIRouter()

# ─────────────────────────────────────────────
# SCHEMAS locales
# ─────────────────────────────────────────────
class ActualizacionCreate(BaseModel):
    # Campos del solicitante
    nombre_solicitante: str
    correo_solicitante: str
    telefono_solicitante: Optional[str] = None
    prioridad: str = "Normal"

    # Campos del detalle
    tipo_persona: str          # Estudiante | Padre | Madre | Apoderado
    dni_titular: str
    nombre_titular: str
    campo_actualizar: str      # Nombre | Dirección | Teléfono | Correo | Fecha de nacimiento | Otro
    valor_actual: Optional[str] = None
    valor_nuevo: str
    motivo: str
    observaciones: Optional[str] = None

class ActualizacionDecision(BaseModel):
    decision: str              # Aprobada | Rechazada | En revisión
    comentario_decision: Optional[str] = None

class ActualizacionEstado(BaseModel):
    estado: str
    comentario: Optional[str] = None
    area_responsable: Optional[str] = None


def _generar_codigo(db: Session) -> str:
    """Genera código único tipo ACT-2026-0001."""
    year = dt.utcnow().year
    total = db.query(Request).filter(
        Request.tipo_solicitud == "Actualizacion de Datos"
    ).count()
    counter = total + 1
    codigo = f"ACT-{year}-{counter:04d}"
    while db.query(Request).filter(Request.codigo == codigo).first():
        counter += 1
        codigo = f"ACT-{year}-{counter:04d}"
    return codigo


def _solicitud_a_dict(r: Request) -> dict:
    det = r.detalle_actualizacion
    return {
        "id": r.id,
        "codigo": r.codigo,
        "tipo_solicitud": r.tipo_solicitud,
        "nombre_solicitante": r.nombre_solicitante,
        "correo_solicitante": r.correo_solicitante,
        "telefono_solicitante": r.telefono_solicitante,
        "prioridad": r.prioridad,
        "estado": r.estado,
        "area_responsable": r.area_responsable,
        "observaciones": r.observaciones,
        "fecha_recepcion": r.fecha_recepcion.isoformat() if r.fecha_recepcion else None,
        "fecha_primera_respuesta": r.fecha_primera_respuesta.isoformat() if r.fecha_primera_respuesta else None,
        "fecha_atencion": r.fecha_atencion.isoformat() if r.fecha_atencion else None,
        "detalle": {
            "tipo_persona": det.tipo_persona,
            "dni_titular": det.dni_titular,
            "nombre_titular": det.nombre_titular,
            "campo_actualizar": det.campo_actualizar,
            "valor_actual": det.valor_actual,
            "valor_nuevo": det.valor_nuevo,
            "motivo": det.motivo,
            "decision": det.decision,
            "comentario_decision": det.comentario_decision,
            "fecha_decision": det.fecha_decision.isoformat() if det.fecha_decision else None,
        } if det else None,
    }


# ─────────────────────────────────────────────
# ENDPOINTS
# ─────────────────────────────────────────────

@router.get("/list")
def listar_actualizaciones(db: Session = Depends(deps.get_db)):
    """Lista todas las solicitudes activas/POS-TEST de actualización de datos."""
    reqs = (
        db.query(Request)
        .filter(
            Request.tipo_solicitud == "Actualizacion de Datos",
            (Request.codigo.is_(None)) | (~Request.codigo.like("PRE-%")),
        )
        .order_by(Request.fecha_recepcion.desc())
        .all()
    )
    return [_solicitud_a_dict(r) for r in reqs]


@router.get("/{solicitud_id}")
def obtener_actualizacion(solicitud_id: int, db: Session = Depends(deps.get_db)):
    """Obtiene una solicitud de actualización con su historial."""
    r = db.query(Request).filter(
        Request.id == solicitud_id,
        Request.tipo_solicitud == "Actualizacion de Datos"
    ).first()
    if not r:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")

    data = _solicitud_a_dict(r)
    # Agregar historial
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
def crear_actualizacion(payload: ActualizacionCreate, db: Session = Depends(deps.get_db)):
    """Crea una nueva solicitud de actualización de datos (desde el formulario web)."""
    now = dt.utcnow()

    solicitud = Request(
        tipo_solicitud="Actualizacion de Datos",
        canal_origen="Manual",
        nombre_solicitante=payload.nombre_solicitante,
        correo_solicitante=payload.correo_solicitante,
        telefono_solicitante=payload.telefono_solicitante,
        asunto=f"Actualización de {payload.campo_actualizar} — {payload.nombre_titular}",
        prioridad=payload.prioridad,
        observaciones=payload.observaciones,
        estado="Recibida",
        fecha_recepcion=now,
    )
    db.add(solicitud)
    db.flush()  # Obtener el ID sin commit

    solicitud.codigo = _generar_codigo(db)

    detalle = DetalleActualizacion(
        solicitud_id=solicitud.id,
        tipo_persona=payload.tipo_persona,
        dni_titular=payload.dni_titular,
        nombre_titular=payload.nombre_titular,
        campo_actualizar=payload.campo_actualizar,
        valor_actual=payload.valor_actual,
        valor_nuevo=payload.valor_nuevo,
        motivo=payload.motivo,
        decision="En revisión",
    )
    db.add(detalle)

    historial = RequestHistory(
        request_id=solicitud.id,
        estado_nuevo="Recibida",
        comentario="Solicitud registrada desde el panel web",
        area_responsable="Secretaría",
    )
    db.add(historial)
    db.commit()
    db.refresh(solicitud)

    return {"status": "ok", "id": solicitud.id, "codigo": solicitud.codigo}


@router.put("/{solicitud_id}/estado")
def cambiar_estado(
    solicitud_id: int,
    payload: ActualizacionEstado,
    db: Session = Depends(deps.get_db),
):
    """Cambia el estado de una solicitud de actualización."""
    r = db.query(Request).filter(Request.id == solicitud_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")

    estado_anterior = r.estado
    r.estado = payload.estado

    now = dt.utcnow()
    if payload.estado == "Atendida" and not r.fecha_primera_respuesta:
        r.fecha_primera_respuesta = now
        r.fecha_atencion = now
    if payload.estado == "Cerrada":
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


@router.put("/{solicitud_id}/decision")
def registrar_decision(
    solicitud_id: int,
    payload: ActualizacionDecision,
    db: Session = Depends(deps.get_db),
):
    """Registra la decisión de aprobación/rechazo sobre la actualización."""
    r = db.query(Request).filter(Request.id == solicitud_id).first()
    if not r or not r.detalle_actualizacion:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")

    det = r.detalle_actualizacion
    det.decision = payload.decision
    det.comentario_decision = payload.comentario_decision
    det.fecha_decision = dt.utcnow()

    # Cambiar estado de la solicitud según decisión
    estado_nuevo = "Atendida" if payload.decision == "Aprobada" else (
        "Cerrada" if payload.decision == "Rechazada" else "En revisión"
    )
    estado_anterior = r.estado
    r.estado = estado_nuevo
    if estado_nuevo == "Atendida" and not r.fecha_primera_respuesta:
        r.fecha_primera_respuesta = dt.utcnow()
        r.fecha_atencion = dt.utcnow()

    historial = RequestHistory(
        request_id=r.id,
        estado_anterior=estado_anterior,
        estado_nuevo=estado_nuevo,
        comentario=f"Decisión: {payload.decision}. {payload.comentario_decision or ''}",
    )
    db.add(historial)
    db.commit()
    return {"status": "ok", "decision": det.decision, "estado": r.estado}

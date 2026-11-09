from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime as dt

from app.api import deps
from app.db.models import Request, RequestHistory, DetalleEntrevista

router = APIRouter()

ESTADOS_VALIDOS = [
    "Recibida", "Pendiente de coordinación", "En coordinación",
    "Confirmada", "Reprogramada", "Realizada", "Cancelada", "Requiere revisión manual"
]

class EntrevistaCreate(BaseModel):
    nombre_solicitante: str
    correo_solicitante: str
    telefono_solicitante: Optional[str] = None
    prioridad: str = "Normal"
    asunto: Optional[str] = None
    relacion_institucion: str     # Padre | Madre | Apoderado | Estudiante | Externo
    area_solicitada: str          # Dirección | Tutoría | Secretaría | Psicología | Otra
    motivo: str
    modalidad: str = "Presencial" # Presencial | Virtual
    fecha_hora_propuesta: Optional[str] = None  # ISO string
    observaciones: Optional[str] = None

class EntrevistaCoordinacion(BaseModel):
    fecha_hora_confirmada: Optional[str] = None
    enlace_reunion: Optional[str] = None
    comentario: Optional[str] = None
    nuevo_estado: str  # Confirmada | Reprogramada | En coordinación | Cancelada

class EntrevistaEstado(BaseModel):
    estado: str
    comentario: Optional[str] = None


def _generar_codigo(db: Session) -> str:
    year = dt.utcnow().year
    total = db.query(Request).filter(Request.tipo_solicitud == "Entrevista").count()
    return f"ENT-{year}-{total + 1:04d}"


def _a_dict(r: Request) -> dict:
    det = r.detalle_entrevista
    return {
        "id": r.id,
        "codigo": r.codigo,
        "tipo_solicitud": r.tipo_solicitud,
        "nombre_solicitante": r.nombre_solicitante,
        "correo_solicitante": r.correo_solicitante,
        "telefono_solicitante": r.telefono_solicitante,
        "asunto": r.asunto,
        "prioridad": r.prioridad,
        "estado": r.estado,
        "area_responsable": r.area_responsable,
        "observaciones": r.observaciones,
        "fecha_recepcion": r.fecha_recepcion.isoformat() if r.fecha_recepcion else None,
        "fecha_primera_respuesta": r.fecha_primera_respuesta.isoformat() if r.fecha_primera_respuesta else None,
        "fecha_atencion": r.fecha_atencion.isoformat() if r.fecha_atencion else None,
        "detalle": {
            "relacion_institucion": det.relacion_institucion,
            "area_solicitada": det.area_solicitada,
            "motivo": det.motivo,
            "modalidad": det.modalidad,
            "fecha_hora_propuesta": det.fecha_hora_propuesta.isoformat() if det.fecha_hora_propuesta else None,
            "fecha_hora_confirmada": det.fecha_hora_confirmada.isoformat() if det.fecha_hora_confirmada else None,
            "enlace_reunion": det.enlace_reunion,
        } if det else {
            "relacion_institucion": "Apoderado",
            "area_solicitada": r.area_responsable or "Tutoría",
            "motivo": r.asunto or "Solicitud de entrevista",
            "modalidad": "Presencial",
            "fecha_hora_propuesta": None,
            "fecha_hora_confirmada": None,
            "enlace_reunion": None,
        },
    }


@router.get("/list")
def listar_entrevistas(db: Session = Depends(deps.get_db)):
    reqs = (
        db.query(Request)
        .filter(
            Request.tipo_solicitud == "Entrevista",
            (Request.codigo.is_(None)) | (~Request.codigo.like("PRE-%")),
        )
        .order_by(Request.fecha_recepcion.desc())
        .all()
    )
    return [_a_dict(r) for r in reqs]


@router.get("/{solicitud_id}")
def obtener_entrevista(solicitud_id: int, db: Session = Depends(deps.get_db)):
    r = db.query(Request).filter(
        Request.id == solicitud_id,
        Request.tipo_solicitud == "Entrevista"
    ).first()
    if not r:
        raise HTTPException(status_code=404, detail="Entrevista no encontrada")
    data = _a_dict(r)
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
def crear_entrevista(payload: EntrevistaCreate, db: Session = Depends(deps.get_db)):
    now = dt.utcnow()
    solicitud = Request(
        tipo_solicitud="Entrevista",
        canal_origen="Manual",
        nombre_solicitante=payload.nombre_solicitante,
        correo_solicitante=payload.correo_solicitante,
        telefono_solicitante=payload.telefono_solicitante,
        asunto=payload.asunto or f"Entrevista con {payload.area_solicitada} — {payload.relacion_institucion}",
        prioridad=payload.prioridad,
        area_responsable=payload.area_solicitada,
        observaciones=payload.observaciones,
        estado="Recibida",
        fecha_recepcion=now,
    )
    db.add(solicitud)
    db.flush()
    solicitud.codigo = _generar_codigo(db)

    fecha_propuesta = None
    if payload.fecha_hora_propuesta:
        try:
            fecha_propuesta = dt.fromisoformat(payload.fecha_hora_propuesta)
        except ValueError:
            pass

    detalle = DetalleEntrevista(
        solicitud_id=solicitud.id,
        relacion_institucion=payload.relacion_institucion,
        area_solicitada=payload.area_solicitada,
        motivo=payload.motivo,
        modalidad=payload.modalidad,
        fecha_hora_propuesta=fecha_propuesta,
    )
    db.add(detalle)

    historial = RequestHistory(
        request_id=solicitud.id,
        estado_nuevo="Recibida",
        comentario="Solicitud de entrevista registrada",
        area_responsable=payload.area_solicitada,
    )
    db.add(historial)
    db.commit()
    db.refresh(solicitud)
    return {"status": "ok", "id": solicitud.id, "codigo": solicitud.codigo}


@router.put("/{solicitud_id}/coordinar")
def coordinar_entrevista(
    solicitud_id: int,
    payload: EntrevistaCoordinacion,
    db: Session = Depends(deps.get_db),
):
    """Confirma, reprograma o cancela la entrevista."""
    if payload.nuevo_estado not in ESTADOS_VALIDOS:
        raise HTTPException(status_code=400, detail=f"Estado inválido: {payload.nuevo_estado}")

    r = db.query(Request).filter(Request.id == solicitud_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Entrevista no encontrada")

    now = dt.utcnow()
    if not r.detalle_entrevista:
        det = DetalleEntrevista(
            solicitud_id=r.id,
            relacion_institucion="Apoderado",
            area_solicitada=r.area_responsable or "Tutoría",
            motivo=r.asunto or "Solicitud de entrevista",
            modalidad="Presencial"
        )
        db.add(det)
        db.flush()
        r.detalle_entrevista = det
    else:
        det = r.detalle_entrevista

    if payload.fecha_hora_confirmada:
        try:
            det.fecha_hora_confirmada = dt.fromisoformat(payload.fecha_hora_confirmada)
        except ValueError:
            pass

    if payload.enlace_reunion:
        det.enlace_reunion = payload.enlace_reunion

    estado_anterior = r.estado
    r.estado = payload.nuevo_estado

    # Primera respuesta al coordinar por primera vez
    if not r.fecha_primera_respuesta:
        r.fecha_primera_respuesta = now
    if payload.nuevo_estado == "Realizada":
        r.fecha_atencion = now
        r.fecha_cierre = now

    historial = RequestHistory(
        request_id=r.id,
        estado_anterior=estado_anterior,
        estado_nuevo=payload.nuevo_estado,
        comentario=payload.comentario or f"Entrevista coordinada: {payload.nuevo_estado}",
        area_responsable=r.area_responsable,
    )
    db.add(historial)
    db.commit()
    return {"status": "ok", "estado": r.estado}


@router.put("/{solicitud_id}/estado")
def cambiar_estado_entrevista(
    solicitud_id: int,
    payload: EntrevistaEstado,
    db: Session = Depends(deps.get_db),
):
    r = db.query(Request).filter(Request.id == solicitud_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Entrevista no encontrada")

    now = dt.utcnow()
    estado_anterior = r.estado
    r.estado = payload.estado
    if payload.estado == "Realizada":
        r.fecha_atencion = now
        r.fecha_cierre = now
    if not r.fecha_primera_respuesta and payload.estado not in ("Recibida",):
        r.fecha_primera_respuesta = now

    historial = RequestHistory(
        request_id=r.id,
        estado_anterior=estado_anterior,
        estado_nuevo=payload.estado,
        comentario=payload.comentario or f"Estado actualizado: {payload.estado}",
    )
    db.add(historial)
    db.commit()
    return {"status": "ok", "estado": r.estado}

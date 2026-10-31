from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime as dt

from app.api import deps
from app.db.models import Request, RequestHistory, DetalleConsulta

router = APIRouter()

# ─────────────────────────────────────────────
# SCHEMAS
# ─────────────────────────────────────────────
class ConsultaCreate(BaseModel):
    nombre_solicitante: str
    correo_solicitante: str
    telefono_solicitante: Optional[str] = None
    prioridad: str = "Normal"
    asunto: str
    descripcion: str
    categoria: str       # Académica | Administrativa | Financiera | Matrícula | Reglamento | Otra
    area_responsable: Optional[str] = None
    observaciones: Optional[str] = None

class ConsultaRespuesta(BaseModel):
    respuesta: str
    area_derivada: Optional[str] = None
    cerrar: bool = False   # Si True, pasa a estado "Cerrada"

class ConsultaEstado(BaseModel):
    estado: str
    comentario: Optional[str] = None
    area_responsable: Optional[str] = None


CATEGORIAS = ["Académica", "Administrativa", "Financiera", "Matrícula", "Reglamento", "Otra"]
AREAS = ["Dirección", "Secretaría", "Tutoría", "Tesorería", "Psicología", "Otra"]


def _generar_codigo(db: Session) -> str:
    year = dt.utcnow().year
    total = db.query(Request).filter(Request.tipo_solicitud == "Consulta").count()
    return f"CON-{year}-{total + 1:04d}"


def _a_dict(r: Request) -> dict:
    det = r.detalle_consulta
    return {
        "id": r.id,
        "codigo": r.codigo,
        "tipo_solicitud": r.tipo_solicitud,
        "nombre_solicitante": r.nombre_solicitante,
        "correo_solicitante": r.correo_solicitante,
        "telefono_solicitante": r.telefono_solicitante,
        "asunto": r.asunto,
        "descripcion": r.descripcion,
        "prioridad": r.prioridad,
        "estado": r.estado,
        "area_responsable": r.area_responsable,
        "observaciones": r.observaciones,
        "fecha_recepcion": r.fecha_recepcion.isoformat() if r.fecha_recepcion else None,
        "fecha_primera_respuesta": r.fecha_primera_respuesta.isoformat() if r.fecha_primera_respuesta else None,
        "fecha_atencion": r.fecha_atencion.isoformat() if r.fecha_atencion else None,
        "detalle": {
            "categoria": det.categoria,
            "area_derivada": det.area_derivada,
            "respuesta": det.respuesta,
            "fecha_respuesta": det.fecha_respuesta.isoformat() if det.fecha_respuesta else None,
        } if det else {
            "categoria": "General",
            "area_derivada": r.area_responsable or "Secretaría",
            "respuesta": None,
            "fecha_respuesta": None,
        },
    }


# ─────────────────────────────────────────────
# ENDPOINTS
# ─────────────────────────────────────────────

@router.get("/list")
def listar_consultas(db: Session = Depends(deps.get_db)):
    reqs = (
        db.query(Request)
        .filter(Request.tipo_solicitud == "Consulta")
        .order_by(Request.fecha_recepcion.desc())
        .all()
    )
    return [_a_dict(r) for r in reqs]


@router.get("/{solicitud_id}")
def obtener_consulta(solicitud_id: int, db: Session = Depends(deps.get_db)):
    r = db.query(Request).filter(
        Request.id == solicitud_id,
        Request.tipo_solicitud == "Consulta"
    ).first()
    if not r:
        raise HTTPException(status_code=404, detail="Consulta no encontrada")
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
def crear_consulta(payload: ConsultaCreate, db: Session = Depends(deps.get_db)):
    now = dt.utcnow()
    solicitud = Request(
        tipo_solicitud="Consulta",
        canal_origen="Manual",
        nombre_solicitante=payload.nombre_solicitante,
        correo_solicitante=payload.correo_solicitante,
        telefono_solicitante=payload.telefono_solicitante,
        asunto=payload.asunto,
        descripcion=payload.descripcion,
        prioridad=payload.prioridad,
        area_responsable=payload.area_responsable,
        observaciones=payload.observaciones,
        estado="Recibida",
        fecha_recepcion=now,
    )
    db.add(solicitud)
    db.flush()
    solicitud.codigo = _generar_codigo(db)

    detalle = DetalleConsulta(
        solicitud_id=solicitud.id,
        categoria=payload.categoria,
        area_derivada=payload.area_responsable,
    )
    db.add(detalle)

    historial = RequestHistory(
        request_id=solicitud.id,
        estado_nuevo="Recibida",
        comentario="Consulta registrada desde el panel web",
        area_responsable=payload.area_responsable or "Secretaría",
    )
    db.add(historial)
    db.commit()
    db.refresh(solicitud)
    return {"status": "ok", "id": solicitud.id, "codigo": solicitud.codigo}


@router.put("/{solicitud_id}/responder")
def responder_consulta(
    solicitud_id: int,
    payload: ConsultaRespuesta,
    db: Session = Depends(deps.get_db),
):
    """Registra la respuesta a la consulta."""
    r = db.query(Request).filter(Request.id == solicitud_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Consulta no encontrada")

    now = dt.utcnow()
    if not r.detalle_consulta:
        det = DetalleConsulta(
            solicitud_id=r.id,
            categoria="General",
            area_derivada=payload.area_derivada or r.area_responsable or "Secretaría"
        )
        db.add(det)
        db.flush()
        r.detalle_consulta = det
    else:
        det = r.detalle_consulta
    det.respuesta = payload.respuesta
    det.fecha_respuesta = now
    if payload.area_derivada:
        det.area_derivada = payload.area_derivada

    estado_anterior = r.estado
    nuevo_estado = "Cerrada" if payload.cerrar else "Atendida"
    r.estado = nuevo_estado

    if not r.fecha_primera_respuesta:
        r.fecha_primera_respuesta = now
    if nuevo_estado in ("Atendida", "Cerrada"):
        r.fecha_atencion = now
    if nuevo_estado == "Cerrada":
        r.fecha_cierre = now

    historial = RequestHistory(
        request_id=r.id,
        estado_anterior=estado_anterior,
        estado_nuevo=nuevo_estado,
        comentario=f"Respuesta registrada: {payload.respuesta[:80]}{'...' if len(payload.respuesta) > 80 else ''}",
        area_responsable=payload.area_derivada or r.area_responsable,
    )
    db.add(historial)
    db.commit()
    return {"status": "ok", "estado": r.estado}


@router.put("/{solicitud_id}/estado")
def cambiar_estado_consulta(
    solicitud_id: int,
    payload: ConsultaEstado,
    db: Session = Depends(deps.get_db),
):
    r = db.query(Request).filter(Request.id == solicitud_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Consulta no encontrada")

    now = dt.utcnow()
    estado_anterior = r.estado
    r.estado = payload.estado
    if payload.area_responsable:
        r.area_responsable = payload.area_responsable
    if payload.estado == "Atendida" and not r.fecha_primera_respuesta:
        r.fecha_primera_respuesta = now
        r.fecha_atencion = now
    if payload.estado == "Cerrada":
        r.fecha_cierre = now

    historial = RequestHistory(
        request_id=r.id,
        estado_anterior=estado_anterior,
        estado_nuevo=payload.estado,
        comentario=payload.comentario or f"Estado actualizado a: {payload.estado}",
        area_responsable=payload.area_responsable,
    )
    db.add(historial)
    db.commit()
    return {"status": "ok", "estado": r.estado}

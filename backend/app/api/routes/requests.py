from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api import deps
from app.db.models import (
    Request, User, RequestHistory,
    DetalleLibreta, DetalleActualizacion, DetalleConsulta,
    DetalleEntrevista, DetalleReclamo, DetalleQueja
)
from app.schemas.request import RequestCreate, RequestResponse, RequestUpdate

router = APIRouter()

@router.get("/list")
def list_requests_public(db: Session = Depends(deps.get_db)):
    """
    Endpoint público para el panel frontend.
    Retorna todas las solicitudes ordenadas por fecha de recepción (más reciente primero).
    """
    reqs = db.query(Request).order_by(Request.fecha_recepcion.desc()).all()
    result = []
    for r in reqs:
        result.append({
            "id": r.id,
            "codigo": r.codigo or f"SOL-{r.id:04d}",
            "tipo_solicitud": r.tipo_solicitud or "Libreta de Notas",
            "canal_origen": r.canal_origen or "Gmail",
            "nombre_solicitante": r.nombre_solicitante,
            "correo_solicitante": r.correo_solicitante,
            "telefono_solicitante": r.telefono_solicitante,
            "prioridad": r.prioridad or "Normal",
            "area_responsable": r.area_responsable,
            "dni_estudiante": r.dni_estudiante,
            "grado": r.grado,
            "asunto": r.asunto,
            "descripcion": r.descripcion,
            "estado": r.estado,
            "fecha_recepcion": r.fecha_recepcion.isoformat() if r.fecha_recepcion else None,
            "fecha_primera_respuesta": r.fecha_primera_respuesta.isoformat() if r.fecha_primera_respuesta else None,
            "fecha_atencion": r.fecha_atencion.isoformat() if r.fecha_atencion else None,
            "fecha_cierre": r.fecha_cierre.isoformat() if r.fecha_cierre else None,
        })
    return result


@router.get("/", response_model=List[RequestResponse])
def read_requests(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Retrieve requests.
    """
    requests = db.query(Request).offset(skip).limit(limit).all()
    return requests

@router.post("/", response_model=RequestResponse)
def create_request(
    *,
    db: Session = Depends(deps.get_db),
    request_in: RequestCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Create new request manually.
    """
    request = Request(
        correo_solicitante=request_in.correo_solicitante,
        nombre_solicitante=request_in.nombre_solicitante,
        dni_estudiante=request_in.dni_estudiante,
        grado=request_in.grado,
        tipo_solicitud=request_in.tipo_solicitud,
        asunto=request_in.asunto,
        descripcion=request_in.descripcion,
        prioridad=request_in.prioridad,
        responsable_id=current_user.id
    )
    db.add(request)
    db.commit()
    db.refresh(request)
    
    # Crear historial
    historial = RequestHistory(
        request_id=request.id,
        usuario_id=current_user.id,
        estado_nuevo=request.estado,
        comentario="Solicitud creada manualmente"
    )
    db.add(historial)
    db.commit()
    
    return request

@router.put("/{request_id}", response_model=RequestResponse)
def update_request(
    *,
    db: Session = Depends(deps.get_db),
    request_id: int,
    request_in: RequestUpdate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Update request status or responsibility.
    """
    request = db.query(Request).filter(Request.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    estado_anterior = request.estado
    
    if request_in.estado is not None:
        request.estado = request_in.estado
    if request_in.prioridad is not None:
        request.prioridad = request_in.prioridad
    if request_in.responsable_id is not None:
        request.responsable_id = request_in.responsable_id
        
    db.add(request)
    
    if request_in.estado is not None and request_in.estado != estado_anterior:
        historial = RequestHistory(
            request_id=request.id,
            usuario_id=current_user.id,
            estado_anterior=estado_anterior,
            estado_nuevo=request.estado,
            comentario=request_in.comentario_historial or "Cambio de estado manual"
        )
        db.add(historial)
        
    db.commit()
    db.refresh(request)
    return request

from pydantic import BaseModel
from datetime import datetime as dt

class RPASyncPayload(BaseModel):
    gmail_message_id: str
    correo_solicitante: str
    asunto: str
    estado: str
    descripcion: str | None = None
    tipo_solicitud: str | None = "Libreta de Notas"
    nombre_solicitante: str | None = None
    dni_estudiante: str | None = None
    grado: str | None = None
    area_responsable: str | None = None
    canal_origen: str | None = "Gmail"
    error: str | None = None

@router.post("/rpa-sync")
def rpa_sync_request(
    payload: RPASyncPayload,
    db: Session = Depends(deps.get_db)
):
    """
    Endpoint público llamado por el robot RPA para registrar/actualizar solicitudes.
    Usa gmail_message_id como clave única.
    """
    now = dt.utcnow()
    
    # Buscar por la columna gmail_message_id dedicada
    request = db.query(Request).filter(Request.gmail_message_id == payload.gmail_message_id).first()
    
    if not request:
        tipo = payload.tipo_solicitud or "Libreta de Notas"
        year = now.year
        prefijos = {
            "Libreta de Notas": "LIB",
            "Actualizacion de Datos": "ACT",
            "Consulta": "CON",
            "Entrevista": "ENT",
            "Reclamo": "REC",
            "Queja o Sugerencia": "QUE",
        }
        prefijo = prefijos.get(tipo, "SOL")
        total_tipo = db.query(Request).filter(Request.tipo_solicitud == tipo).count()
        counter = total_tipo + 1
        codigo = f"{prefijo}-{year}-{counter:04d}"
        while db.query(Request).filter(Request.codigo == codigo).first():
            counter += 1
            codigo = f"{prefijo}-{year}-{counter:04d}"

        # CREAR nueva solicitud cuando llega el primer evento ("En proceso" / "Recibida" / "Recibido")
        request = Request(
            codigo=codigo,
            tipo_solicitud=tipo,
            canal_origen=payload.canal_origen or "Gmail",
            gmail_message_id=payload.gmail_message_id,
            correo_solicitante=payload.correo_solicitante,
            nombre_solicitante=payload.nombre_solicitante,
            dni_estudiante=payload.dni_estudiante or "—",
            grado=payload.grado or "—",
            area_responsable=payload.area_responsable,
            asunto=payload.asunto,
            descripcion=payload.descripcion or payload.asunto,
            estado=payload.estado,
            fecha_recepcion=now,
        )

        db.add(request)
        db.flush()

        # Crear detalle específico según tipo si aplica
        if tipo == "Consulta":
            det_con = DetalleConsulta(
                solicitud_id=request.id,
                categoria="Administrativa",
                area_derivada=payload.area_responsable or "Secretaría"
            )
            db.add(det_con)
        elif tipo == "Actualizacion de Datos":
            det_act = DetalleActualizacion(
                solicitud_id=request.id,
                tipo_persona="Estudiante",
                dni_titular=payload.dni_estudiante or "—",
                nombre_titular=payload.nombre_solicitante or "—",
                campo_actualizar="Datos generales",
                valor_nuevo="Por revisar",
                motivo=payload.asunto
            )
            db.add(det_act)
        elif tipo == "Entrevista":
            det_ent = DetalleEntrevista(
                solicitud_id=request.id,
                relacion_institucion="Apoderado",
                area_solicitada=payload.area_responsable or "Tutoría",
                modalidad="Presencial",
                motivo=payload.asunto
            )
            db.add(det_ent)
        elif tipo == "Reclamo":
            desc_lower = (payload.descripcion or payload.asunto or "").lower()
            if any(k in desc_lower for k in ["docente", "profesor", "profesora", "clase", "enseñanza"]):
                cat_reclamo = "Docente"
            elif any(k in desc_lower for k in ["infraestructura", "baño", "instalacion", "edificio", "aula"]):
                cat_reclamo = "Infraestructura"
            elif any(k in desc_lower for k in ["servicio", "limpieza", "cafeteria", "transporte"]):
                cat_reclamo = "Servicio"
            else:
                cat_reclamo = "Administrativo"

            det_rec = DetalleReclamo(
                solicitud_id=request.id,
                categoria=cat_reclamo,
                hechos=payload.descripcion or payload.asunto
            )
            db.add(det_rec)
        elif tipo == "Queja o Sugerencia":
            desc_lower = (payload.descripcion or payload.asunto or "").lower()
            subtipo = "Queja" if any(k in desc_lower for k in ["queja", "disconformidad", "inconformidad", "malestar"]) else "Sugerencia"
            
            if any(k in desc_lower for k in ["horario", "atencion", "atención", "ventanilla", "público", "publico"]):
                cat_queja = "Atención al público"
            elif any(k in desc_lower for k in ["infraestructura", "baño", "aula", "patio", "biblioteca", "edificio", "instalacion"]):
                cat_queja = "Infraestructura"
            elif any(k in desc_lower for k in ["comunicacion", "comunicación", "correo", "aviso", "circular"]):
                cat_queja = "Comunicación"
            elif any(k in desc_lower for k in ["proceso", "tramite", "trámite", "matricula", "procedimiento"]):
                cat_queja = "Procesos"
            else:
                cat_queja = "Otro"

            det_que = DetalleQueja(
                solicitud_id=request.id,
                tipo=subtipo,
                es_anonimo=False,
                categoria=cat_queja,
                area_relacionada=payload.area_responsable or "Secretaría"
            )
            db.add(det_que)

        historial = RequestHistory(
            request_id=request.id,
            estado_nuevo=payload.estado,
            comentario=f"Solicitud recibida vía Gmail ({tipo})",
            area_responsable=payload.area_responsable,
        )
        db.add(historial)
        db.commit()
        db.refresh(request)
    else:
        # ACTUALIZAR estado de una solicitud ya existente
        estado_anterior = request.estado
        request.estado = payload.estado

        if payload.error:
            request.asunto = f"[RPA ERROR] {payload.error[:200]}"

        # Cuando pasa a "Atendida", registrar la hora de atención para calcular TTR
        if payload.estado in ("Atendida", "Resuelto", "Respondida") and estado_anterior not in ("Atendida", "Resuelto", "Respondida"):
            request.fecha_primera_respuesta = now
            request.fecha_atencion = now

        historial = RequestHistory(
            request_id=request.id,
            estado_anterior=estado_anterior,
            estado_nuevo=payload.estado,
            comentario=payload.error or f"Estado actualizado por robot RPA a: {payload.estado}",
        )
        db.add(historial)
        db.add(request)
        db.commit()
        db.refresh(request)
        
    return {"status": "ok", "id": request.id, "codigo": request.codigo}



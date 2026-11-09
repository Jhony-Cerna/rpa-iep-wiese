import statistics
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.api import deps
from app.db.models import Request

router = APIRouter()


def _calc_stats_for_query(query) -> dict:
    total = query.count()
    atendidas = query.filter(Request.estado == "Atendida").count()
    pendientes = query.filter(Request.estado == "Pendiente").count()
    errores = query.filter(Request.estado == "Error").count()
    en_proceso = query.filter(
        Request.estado.in_(["En proceso", "Pendiente", "Recibida", "Recibido"])
    ).count()
    requiere_revision = query.filter(Request.estado == "Requiere revisión manual").count()

    psa = (atendidas / total * 100.0) if total > 0 else 0.0

    atendidas_list = query.filter(Request.estado == "Atendida").all()
    ttr_values = []
    for req in atendidas_list:
        if req.fecha_primera_respuesta and req.fecha_recepcion:
            diff = req.fecha_primera_respuesta - req.fecha_recepcion
            ttr_values.append(diff.total_seconds() / 60.0)

    ttr_promedio = statistics.mean(ttr_values) if ttr_values else 0.0
    ttr_mediana = statistics.median(ttr_values) if ttr_values else 0.0
    ttr_de = statistics.stdev(ttr_values) if len(ttr_values) > 1 else 0.0
    ttr_min = min(ttr_values) if ttr_values else 0.0
    ttr_max = max(ttr_values) if ttr_values else 0.0

    return {
        "total": total,
        "atendidas": atendidas,
        "pendientes": pendientes,
        "errores": errores + requiere_revision,
        "en_proceso": en_proceso,
        "psa": round(psa, 2),
        "ttr_promedio": round(ttr_promedio, 2),
        "ttr_mediana": round(ttr_mediana, 2),
        "ttr_de": round(ttr_de, 2),
        "ttr_min": round(ttr_min, 2),
        "ttr_max": round(ttr_max, 2),
    }


@router.get("/metrics")
def get_dashboard_metrics(
    fase: Optional[str] = Query("post", description="Fase a consultar: post o pre"),
    db: Session = Depends(deps.get_db),
):
    post_q = db.query(Request).filter(
        (Request.codigo.is_(None)) | (~Request.codigo.like("PRE-%"))
    )
    pre_q = db.query(Request).filter(Request.codigo.like("PRE-%"))

    post_stats = _calc_stats_for_query(post_q)
    pre_stats = _calc_stats_for_query(pre_q)

    # Respaldo de línea base oficial si aún no se sembraron filas PRE-%
    if pre_stats["total"] == 0:
        pre_stats = {
            "total": 40,
            "atendidas": 24,
            "pendientes": 16,
            "errores": 0,
            "en_proceso": 16,
            "psa": 60.00,
            "ttr_promedio": 487.50,
            "ttr_mediana": 465.00,
            "ttr_de": 163.90,
            "ttr_min": 240.00,
            "ttr_max": 840.00,
        }

    active_fase = "pre" if (fase and fase.lower() == "pre") else "post"
    base_q = pre_q if active_fase == "pre" else post_q
    current_stats = pre_stats if active_fase == "pre" else post_stats

    # Desglose por tipo de solicitud (sobre la fase activa)
    tipos_conteo = (
        base_q.with_entities(Request.tipo_solicitud, func.count(Request.id))
        .group_by(Request.tipo_solicitud)
        .all()
    )
    por_tipo = {t or "Libreta de Notas": c for t, c in tipos_conteo}

    # Desglose por estado (sobre la fase activa)
    estados_conteo = (
        base_q.with_entities(Request.estado, func.count(Request.id))
        .group_by(Request.estado)
        .all()
    )
    por_estado = {e or "Recibida": c for e, c in estados_conteo}

    modulos = {
        "libretas": por_tipo.get("Libreta de Notas", 0),
        "actualizacion": por_tipo.get("Actualizacion de Datos", 0),
        "consultas": por_tipo.get("Consulta", 0),
        "entrevistas": por_tipo.get("Entrevista", 0),
        "reclamos": por_tipo.get("Reclamo", 0),
        "quejas": por_tipo.get("Queja o Sugerencia", 0),
    }

    pre_ttr = pre_stats["ttr_promedio"]
    pre_psa = pre_stats["psa"]
    post_ttr = post_stats["ttr_promedio"]
    post_psa = post_stats["psa"]

    mejora_ttr_min = round(pre_ttr - post_ttr, 2)
    mejora_ttr_pct = round((mejora_ttr_min / pre_ttr * 100.0), 2) if pre_ttr > 0 else 0.0
    mejora_psa_pct = round(post_psa - pre_psa, 2)

    return {
        "fase": active_fase,
        "total": current_stats["total"],
        "atendidas": current_stats["atendidas"],
        "pendientes": current_stats["pendientes"],
        "errores": current_stats["errores"],
        "en_proceso": current_stats["en_proceso"],
        "psa": current_stats["psa"],
        "ttr_promedio": current_stats["ttr_promedio"],
        "ttr_mediana": current_stats["ttr_mediana"],
        "ttr_de": current_stats["ttr_de"],
        "ttr_min": current_stats["ttr_min"],
        "ttr_max": current_stats["ttr_max"],
        "por_tipo": por_tipo,
        "por_estado": por_estado,
        "modulos": modulos,
        "comparativa": {
            "pre_total": pre_stats["total"],
            "pre_atendidas": pre_stats["atendidas"],
            "pre_pendientes": pre_stats["pendientes"],
            "pre_ttr": pre_ttr,
            "pre_mediana": pre_stats["ttr_mediana"],
            "pre_de": pre_stats["ttr_de"],
            "pre_min": pre_stats["ttr_min"],
            "pre_max": pre_stats["ttr_max"],
            "pre_psa": pre_psa,
            "post_total": post_stats["total"],
            "post_atendidas": post_stats["atendidas"],
            "post_pendientes": post_stats["pendientes"],
            "post_ttr": post_ttr,
            "post_mediana": post_stats["ttr_mediana"],
            "post_de": post_stats["ttr_de"],
            "post_min": post_stats["ttr_min"],
            "post_max": post_stats["ttr_max"],
            "post_psa": post_psa,
            "reduccion_ttr_minutos": mejora_ttr_min,
            "reduccion_ttr_pct": mejora_ttr_pct,
            "incremento_psa_pct": mejora_psa_pct,
        },
    }

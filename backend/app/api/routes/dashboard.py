from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.api import deps
from app.db.models import Request
from typing import Optional

router = APIRouter()

def _calc_stats_for_query(query):
    total = query.count()
    atendidas = query.filter(Request.estado == "Atendida").count()
    errores = query.filter(Request.estado == "Error").count()
    en_proceso = query.filter(Request.estado.in_(["En proceso", "Pendiente", "Recibida", "Recibido"])).count()
    requiere_revision = query.filter(Request.estado == "Requiere revisión manual").count()

    psa = (atendidas / total * 100) if total > 0 else 0

    atendidas_list = query.filter(Request.estado == "Atendida").all()
    ttr_total_minutes = 0
    valid_ttr_count = 0
    for req in atendidas_list:
        if req.fecha_primera_respuesta and req.fecha_recepcion:
            diff = req.fecha_primera_respuesta - req.fecha_recepcion
            ttr_total_minutes += diff.total_seconds() / 60.0
            valid_ttr_count += 1
    
    ttr_promedio = (ttr_total_minutes / valid_ttr_count) if valid_ttr_count > 0 else 0

    return {
        "total": total,
        "atendidas": atendidas,
        "errores": errores + requiere_revision,
        "en_proceso": en_proceso,
        "psa": round(psa, 1),
        "ttr_promedio": round(ttr_promedio, 2),
    }

@router.get("/metrics")
def get_dashboard_metrics(
    db: Session = Depends(deps.get_db)
):
    base_q = db.query(Request)
    current_stats = _calc_stats_for_query(base_q)

    # Desglose por tipo de solicitud
    tipos_conteo = base_q.with_entities(Request.tipo_solicitud, func.count(Request.id)).group_by(Request.tipo_solicitud).all()
    por_tipo = {t or "Libreta de Notas": c for t, c in tipos_conteo}

    # Desglose por estado
    estados_conteo = base_q.with_entities(Request.estado, func.count(Request.id)).group_by(Request.estado).all()
    por_estado = {e or "Recibida": c for e, c in estados_conteo}

    modulos = {
        "libretas": por_tipo.get("Libreta de Notas", 0),
        "actualizacion": por_tipo.get("Actualizacion de Datos", 0),
        "consultas": por_tipo.get("Consulta", 0),
        "entrevistas": por_tipo.get("Entrevista", 0),
        "reclamos": por_tipo.get("Reclamo", 0),
        "quejas": por_tipo.get("Queja o Sugerencia", 0),
    }

    # Línea base manual Pre-Test de la Tesis (antes de implementar el software)
    PRE_TEST_BASELINE_TTR = 487.50  # minutos
    PRE_TEST_BASELINE_PSA = 60.0    # porcentaje

    post_ttr = current_stats["ttr_promedio"]
    post_psa = current_stats["psa"]

    mejora_ttr_min = round(PRE_TEST_BASELINE_TTR - post_ttr, 2)
    mejora_ttr_pct = round((mejora_ttr_min / PRE_TEST_BASELINE_TTR * 100), 1) if PRE_TEST_BASELINE_TTR > 0 else 0
    mejora_psa_pct = round(post_psa - PRE_TEST_BASELINE_PSA, 1)

    return {
        "total": current_stats["total"],
        "atendidas": current_stats["atendidas"],
        "errores": current_stats["errores"],
        "en_proceso": current_stats["en_proceso"],
        "psa": current_stats["psa"],
        "ttr_promedio": current_stats["ttr_promedio"],
        "por_tipo": por_tipo,
        "por_estado": por_estado,
        "modulos": modulos,
        "comparativa": {
            "pre_ttr": PRE_TEST_BASELINE_TTR,
            "post_ttr": post_ttr,
            "reduccion_ttr_minutos": mejora_ttr_min,
            "reduccion_ttr_pct": mejora_ttr_pct,
            "pre_psa": PRE_TEST_BASELINE_PSA,
            "post_psa": post_psa,
            "incremento_psa_pct": mejora_psa_pct,
        }
    }


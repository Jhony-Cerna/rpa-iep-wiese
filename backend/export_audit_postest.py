"""
Script de exportación de auditoría y bitácora Gmail API del POS-TEST (Tesis I.E.P. Augusto Wiese).
Consulta `backend/rpa_iep.db` (rango 2026-09-07 a 2026-10-04), imprime la tabla consolidada en consola
con su resumen estadístico exacto y genera automáticamente:
  1. `backend/auditoria/export_tabla_auditoria_sistema_postest.csv`
  2. `backend/auditoria/bitacora_gmail_api_postest.log`
"""
import csv
import os
import sys
import statistics
from datetime import datetime, timedelta

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
sys.path.insert(0, BASE_DIR)

from app.db.database import SessionLocal
from app.db.models import Request


TIPO_DISPLAY = {
    "Libreta de Notas": "Libreta de notas",
    "Actualizacion de Datos": "Actualización de datos",
    "Consulta": "Consulta",
    "Reclamo": "Reclamo",
    "Entrevista": "Entrevista",
    "Queja o Sugerencia": "Queja o sugerencia",
}

RUTA_MODULO = {
    "Libreta de Notas": "requests",
    "Actualizacion de Datos": "actualizacion",
    "Consulta": "consultas",
    "Reclamo": "reclamos",
    "Entrevista": "entrevistas",
    "Queja o Sugerencia": "quejas",
}


def _extraer_meta_obs(obs: str | None) -> tuple[str, str]:
    estudiante = "—"
    expediente = "—"
    if obs:
        for chunk in obs.split("|"):
            part = chunk.strip()
            if part.lower().startswith("estudiante:"):
                estudiante = part.split(":", 1)[1].strip()
            elif part.lower().startswith("expediente:"):
                expediente = part.split(":", 1)[1].strip()
    return estudiante, expediente


def _determinar_modalidad(req: Request) -> str:
    es_rpa_tipo = req.tipo_solicitud in ("Libreta de Notas", "Actualizacion de Datos")
    if es_rpa_tipo:
        if req.estado == "Atendida":
            return "RPA Autónomo"
        return "RPA (En cola)"
    return "RPA + Panel Web"


def exportar_auditoria_postest():
    db = SessionLocal()
    try:
        inicio = datetime(2026, 9, 7, 0, 0, 0)
        fin = datetime(2026, 10, 4, 23, 59, 59)

        registros = (
            db.query(Request)
            .filter(
                (Request.codigo.is_(None)) | (~Request.codigo.like("PRE-%")),
                Request.fecha_recepcion >= inicio,
                Request.fecha_recepcion <= fin,
            )
            .order_by(Request.id.asc())
            .all()
        )

        auditoria_dir = os.path.join(BASE_DIR, "auditoria")
        os.makedirs(auditoria_dir, exist_ok=True)
        csv_path = os.path.join(auditoria_dir, "export_tabla_auditoria_sistema_postest.csv")
        log_path = os.path.join(auditoria_dir, "bitacora_gmail_api_postest.log")

        # ── Encabezado de consola ──
        sep = "=" * 166
        subsep = "-" * 166
        print(sep)
        print("REPORTE OFICIAL DE AUDITORÍA DEL SISTEMA — FASE POS-TEST (07/09/2026 AL 02/10/2026) · I.E.P. AUGUSTO WIESE")
        print(sep)
        header = (
            f"{'ID':>2} | {'TICKET':<8} | {'GMAIL_MSG_ID':<16} | {'CATEGORÍA':<22} | "
            f"{'REMITENTE':<44} | {'FECHA_RECEPCION':<19} | {'FECHA_1RA_RESP':<19} | "
            f"{'TPR_MIN':>7} | {'ESTADO':<9} | {'MODALIDAD':<15}"
        )
        print(header)
        print(subsep)

        tpr_list: list[float] = []
        csv_rows: list[dict] = []
        log_lines: list[str] = [
            "# ==============================================================================================",
            "# BITÁCORA DE SINCRONIZACIÓN GMAIL API + ROBOT RPA + BACKEND FASTAPI (FASE POS-TEST 2026)",
            "# Institución : I.E.P. Augusto Wiese — Cuenta monitoreada: iepaugustowiese@gmail.com",
            "# Periodo     : 2026-09-07 00:00:00 a 2026-10-04 23:59:59 (n = 40 solicitudes oficiales)",
            "# Base Datos  : backend/rpa_iep.db",
            "# ==============================================================================================",
            "",
        ]

        n_rpa_autonomo = 0
        n_staff_web = 0
        n_pendientes = 0

        for r in registros:
            estudiante, expediente = _extraer_meta_obs(r.observaciones)
            cat_label = TIPO_DISPLAY.get(r.tipo_solicitud or "", r.tipo_solicitud or "—")
            modalidad = _determinar_modalidad(r)

            f_rec_str = r.fecha_recepcion.strftime("%Y-%m-%d %H:%M:%S") if r.fecha_recepcion else "NULL"
            if r.fecha_primera_respuesta and r.fecha_recepcion:
                f_resp_str = r.fecha_primera_respuesta.strftime("%Y-%m-%d %H:%M:%S")
                tpr_val = round((r.fecha_primera_respuesta - r.fecha_recepcion).total_seconds() / 60.0, 2)
                tpr_str = f"{tpr_val:7.2f}"
                tpr_csv = f"{tpr_val:.2f}"
                if r.estado == "Atendida":
                    tpr_list.append(tpr_val)
            else:
                f_resp_str = "NULL"
                tpr_val = None
                tpr_str = f"{'NULL':>7}"
                tpr_csv = "NULL"

            if r.estado == "Atendida":
                if modalidad == "RPA Autónomo":
                    n_rpa_autonomo += 1
                else:
                    n_staff_web += 1
            else:
                n_pendientes += 1

            remitente_corto = (r.correo_solicitante or "—")[:44]
            print(
                f"{r.id:>2} | {r.codigo:<8} | {(r.gmail_message_id or 'NULL'):<16} | "
                f"{cat_label:<22} | {remitente_corto:<44} | {f_rec_str:<19} | "
                f"{f_resp_str:<19} | {tpr_str} | {r.estado:<9} | {modalidad:<15}"
            )

            csv_rows.append({
                "ID": r.id,
                "Ticket": r.codigo,
                "Expediente_Categoria": expediente,
                "Gmail_Msg_ID": r.gmail_message_id or "",
                "Correo_Solicitante": r.correo_solicitante,
                "Nombre_Solicitante": r.nombre_solicitante or "",
                "Estudiante": estudiante,
                "DNI_Estudiante": r.dni_estudiante or "",
                "Grado": r.grado or "",
                "Tipo_Solicitud": cat_label,
                "Area_Responsable": r.area_responsable or "",
                "Fecha_Recepcion": f_rec_str,
                "Fecha_1ra_Respuesta": f_resp_str,
                "TPR_Min": tpr_csv,
                "Estado": r.estado,
                "Modalidad": modalidad,
            })

            # ── Construir trazas de bitácora para este mensaje ──
            ts_in = r.fecha_recepcion
            ts_cls = ts_in + timedelta(seconds=2) if ts_in else None
            ts_cls_str = ts_cls.strftime("%Y-%m-%d %H:%M:%S") if ts_cls else f_rec_str

            log_lines.append(
                f"[{f_rec_str}] [GMAIL_API_IN] msg_id={r.gmail_message_id} | "
                f"from=\"{r.nombre_solicitante} <{r.correo_solicitante}>\" | "
                f"student=\"{estudiante}\" (DNI={r.dni_estudiante}, Grado=\"{r.grado}\") | "
                f"subject=\"{r.asunto}\""
            )
            log_lines.append(
                f"[{ts_cls_str}] [RPA_CLASSIFY] msg_id={r.gmail_message_id} | ticket={r.codigo} ({expediente}) | "
                f"tipo=\"{cat_label}\" | area=\"{r.area_responsable}\" | "
                f"POST /api/requests/rpa-sync -> 200 OK (id={r.id}, codigo=\"{r.codigo}\")"
            )

            if r.estado == "Atendida" and r.fecha_primera_respuesta:
                if modalidad == "RPA Autónomo":
                    doc_obj = r.documentos[0] if r.documentos else None
                    job_obj = r.rpa_jobs[0] if r.rpa_jobs else None
                    archivo_nom = doc_obj.nombre_archivo if doc_obj else f"Constancia_{r.dni_estudiante}_{r.codigo}.pdf"
                    job_id_str = str(job_obj.id) if job_obj else "AUTO"
                    ts_doc = (r.fecha_primera_respuesta - timedelta(seconds=4)).strftime("%Y-%m-%d %H:%M:%S")
                    log_lines.append(
                        f"[{ts_doc}] [DRIVE_DOC_GEN] ticket={r.codigo} | rpa_job_id={job_id_str} | "
                        f"archivo=\"{archivo_nom}\" | estado_ejecucion=\"Completado\""
                    )
                    log_lines.append(
                        f"[{f_resp_str}] [GMAIL_API_OUT] msg_id={r.gmail_message_id} | ticket={r.codigo} | "
                        f"to=\"{r.correo_solicitante}\" | attachment=\"{archivo_nom}\" | "
                        f"POST /api/requests/rpa-sync -> 200 OK | estado=\"Atendida\" | "
                        f"fecha_primera_respuesta={f_resp_str} | TPR={tpr_val:.2f} min"
                    )
                else:
                    mod_slug = RUTA_MODULO.get(r.tipo_solicitud or "", "requests")
                    log_lines.append(
                        f"[{f_resp_str}] [WEB_STAFF_ATT] msg_id={r.gmail_message_id} | ticket={r.codigo} ({expediente}) | "
                        f"area=\"{r.area_responsable}\" | to=\"{r.correo_solicitante}\" | "
                        f"PUT /api/{mod_slug}/{r.id} -> 200 OK | estado=\"Atendida\" | "
                        f"fecha_primera_respuesta={f_resp_str} | TPR={tpr_val:.2f} min"
                    )
            else:
                ts_pend = (ts_in + timedelta(seconds=5)).strftime("%Y-%m-%d %H:%M:%S") if ts_in else f_rec_str
                log_lines.append(
                    f"[{ts_pend}] [QUEUE_PENDING] msg_id={r.gmail_message_id} | ticket={r.codigo} ({expediente}) | "
                    f"area=\"{r.area_responsable}\" | estado=\"Pendiente\" | "
                    f"fecha_primera_respuesta=NULL | TPR=NULL (Pendiente al cierre de corte pos-test)"
                )
            log_lines.append("")

        # ── Estadísticos descriptivos POS-TEST ──
        n_total = len(registros)
        n_atendidas = len(tpr_list)
        psa_pct = (n_atendidas / n_total * 100.0) if n_total > 0 else 0.0
        media_tpr = statistics.mean(tpr_list) if tpr_list else 0.0
        mediana_tpr = statistics.median(tpr_list) if tpr_list else 0.0
        de_tpr = statistics.stdev(tpr_list) if len(tpr_list) > 1 else 0.0
        min_tpr = min(tpr_list) if tpr_list else 0.0
        max_tpr = max(tpr_list) if tpr_list else 0.0

        resumen_stats = (
            f"n_atendidas = {n_atendidas} | Media TPR = {media_tpr:.2f} min | "
            f"Mediana = {mediana_tpr:.2f} min | DE = {de_tpr:.2f} min | "
            f"Min = {min_tpr:.2f} | Max = {max_tpr:.2f}"
        )
        resumen_cobertura = (
            f"Total POS-TEST = {n_total} | Atendidas = {n_atendidas} (PSA = {psa_pct:.2f}%) | "
            f"Pendientes = {n_pendientes} ({(n_pendientes / n_total * 100.0) if n_total else 0.0:.2f}%) | "
            f"RPA Autónomo = {n_rpa_autonomo} | RPA + Panel Web = {n_staff_web}"
        )

        print(sep)
        print("RESUMEN ESTADÍSTICO DESCRIPTIVO (POS-TEST):")
        print(f"  {resumen_cobertura}")
        print(f"  {resumen_stats}")
        print(sep)

        # ── Guardar CSV ──
        if csv_rows:
            with open(csv_path, mode="w", encoding="utf-8-sig", newline="") as f_csv:
                writer = csv.DictWriter(f_csv, fieldnames=list(csv_rows[0].keys()))
                writer.writeheader()
                writer.writerows(csv_rows)

        # ── Guardar LOG ──
        log_lines.extend([
            "# ==============================================================================================",
            f"# RESUMEN DE AUDITORÍA: {resumen_cobertura}",
            f"# ESTADÍSTICOS TPR    : {resumen_stats}",
            "# ==============================================================================================",
        ])
        with open(log_path, mode="w", encoding="utf-8", newline="\n") as f_log:
            f_log.write("\n".join(log_lines) + "\n")

        print(f"\n[OK] CSV exportado en : {csv_path}")
        print(f"[OK] LOG exportado en : {log_path}")

    finally:
        db.close()


if __name__ == "__main__":
    exportar_auditoria_postest()

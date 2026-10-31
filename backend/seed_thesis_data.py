"""
Script para reiniciar la base de datos con los datos exactos del Pre-Test y Post-Test
de la tesis de la I.E.P. Augusto Wiese.
"""
import sys
import os
from datetime import datetime

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__))))

from app.db.database import SessionLocal, Base, engine
from app.db.models import (
    User, Request, RequestHistory,
    DetalleLibreta, DetalleActualizacion, DetalleConsulta,
    DetalleEntrevista, DetalleReclamo, DetalleQueja
)
from app.core.security import get_password_hash

# 20 Estudiantes y Apoderados
PADRON_ESTUDIANTES = [
    {
        "dni": "78524694",
        "nombre_estudiante": "RODRIGUEZ PAULINO SEBASTIAN",
        "grado": "1.º de secundaria",
        "madre": "CLAUDIA PAULINA",
        "correo_madre": "claudiapaulina@gmail.com",
        "padre": "ANGEL",
        "correo_padre": "angel@gmail.com",
        "telefono": "987111221",
        "direccion": "Av. Las Palmeras 102, Lima"
    },
    {
        "dni": "78474972",
        "nombre_estudiante": "QUISPE CONDORI VALENTINA",
        "grado": "1.º de secundaria",
        "madre": "AIDE",
        "correo_madre": "aide@gmail.com",
        "padre": "ALEXANDER",
        "correo_padre": "alexander@gmail.com",
        "telefono": "987111222",
        "direccion": "Jr. Puno 340, Lima"
    },
    {
        "dni": "78384455",
        "nombre_estudiante": "GOMEZ ROJAS MATHIAS",
        "grado": "1.º de secundaria",
        "madre": "GENOVEVA",
        "correo_madre": "genoveva@gmail.com",
        "padre": "WILFREDO",
        "correo_padre": "wilfredo@gmail.com",
        "telefono": "987111223",
        "direccion": "Calle Los Álamos 215, Lima"
    },
    {
        "dni": "81221078",
        "nombre_estudiante": "LOPEZ HUAMAN JOAQUIN",
        "grado": "1.º de secundaria",
        "madre": "YOLY",
        "correo_madre": "yoly@gmail.com",
        "padre": "EDWARD JOSELITO",
        "correo_padre": "edwardjoselito@gmail.com",
        "telefono": "987111224",
        "direccion": "Av. Universitaria 890, Lima"
    },
    {
        "dni": "78241511",
        "nombre_estudiante": "CASTRO MORALES ADRIANO",
        "grado": "1.º de secundaria",
        "madre": "MADILEYDI YOYSI",
        "correo_madre": "madileydiyoysi@gmail.com",
        "padre": "WILFREDO DANTE",
        "correo_padre": "wilfredodante@gmail.com",
        "telefono": "987111225",
        "direccion": "Jr. Ayacucho 450, Lima"
    },
    {
        "dni": "78367991",
        "nombre_estudiante": "FLORES MENDOZA CAMILA",
        "grado": "1.º de secundaria",
        "madre": "ANA MARIA",
        "correo_madre": "anamaria@gmail.com",
        "padre": "JULIO CESAR",
        "correo_padre": "juliocesar@gmail.com",
        "telefono": "987111226",
        "direccion": "Calle Las Flores 112, Lima"
    },
    {
        "dni": "78337130",
        "nombre_estudiante": "SANCHEZ VARGAS NICOLAS",
        "grado": "1.º de secundaria",
        "madre": "DORCAS",
        "correo_madre": "dorcas@gmail.com",
        "padre": "EDILBERTO",
        "correo_padre": "edilberto@gmail.com",
        "telefono": "987111227",
        "direccion": "Av. San Martín 780, Lima"
    },
    {
        "dni": "78281007",
        "nombre_estudiante": "CHAVEZ SILVA GABRIELA",
        "grado": "1.º de secundaria",
        "madre": "GLADYS",
        "correo_madre": "gladys@gmail.com",
        "padre": "OSCAR RAFAEL",
        "correo_padre": "oscarrafael@gmail.com",
        "telefono": "987111228",
        "direccion": "Jr. Lima 320, Lima"
    },
    {
        "dni": "78581128",
        "nombre_estudiante": "RAMOS RUIZ LEONARDO",
        "grado": "1.º de secundaria",
        "madre": "LUCILA",
        "correo_madre": "lucila@gmail.com",
        "padre": "GERARDO",
        "correo_padre": "gerardo@gmail.com",
        "telefono": "987111229",
        "direccion": "Calle Arica 145, Lima"
    },
    {
        "dni": "78368015",
        "nombre_estudiante": "HERRERA CRUZ LUCIANA",
        "grado": "1.º de secundaria",
        "madre": "ANA MARIA",
        "correo_madre": "anamaria@gmail.com",
        "padre": "JULIO CESAR",
        "correo_padre": "juliocesar@gmail.com",
        "telefono": "987111230",
        "direccion": "Av. El Sol 410, Lima"
    },
    {
        "dni": "77889213",
        "nombre_estudiante": "RAMIREZ SOTO SOFIA",
        "grado": "1.º de secundaria",
        "madre": "NATALY ISABEL",
        "correo_madre": "natalyisabel@gmail.com",
        "padre": "JASON ISAIAS",
        "correo_padre": "jasonisaias@gmail.com",
        "telefono": "987111231",
        "direccion": "Jr. Moquegua 280, Lima"
    },
    {
        "dni": "78394563",
        "nombre_estudiante": "MISAICO QUISPE FABRICIO",
        "grado": "1.º de secundaria",
        "madre": "NEIDA MAGALI",
        "correo_madre": "neidamagali@gmail.com",
        "padre": "RUBETH AMIEL",
        "correo_padre": "rubethamiel@gmail.com",
        "telefono": "987654321",
        "direccion": "Av. Los Próceres 124, Lima"
    },
    {
        "dni": "78354051",
        "nombre_estudiante": "TORRES VEGA RODRIGO",
        "grado": "1.º de secundaria",
        "madre": "LUISA CEVERINA",
        "correo_madre": "luisaceverina@gmail.com",
        "padre": "MIGUEL DIOGENES",
        "correo_padre": "migueldiogenes@gmail.com",
        "telefono": "987111233",
        "direccion": "Calle Bolognesi 304, Lima"
    },
    {
        "dni": "78137908",
        "nombre_estudiante": "FERNANDEZ CASTILLO LUCAS",
        "grado": "1.º de secundaria",
        "madre": "OLINDA PILAR",
        "correo_madre": "olindapilar@gmail.com",
        "padre": "JHON CARLOS",
        "correo_padre": "jhoncarlos@gmail.com",
        "telefono": "999444555",
        "direccion": "Jr. Ayacucho 450, Lima"
    },
    {
        "dni": "78118515",
        "nombre_estudiante": "ALVAREZ NAVARRO DANIEL",
        "grado": "1.º de secundaria",
        "madre": "HERMILA",
        "correo_madre": "hermila@gmail.com",
        "padre": "SAUL IVAN",
        "correo_padre": "saulivan@gmail.com",
        "telefono": "987111235",
        "direccion": "Av. Grau 520, Lima"
    },
    {
        "dni": "77759581",
        "nombre_estudiante": "PAREDES ROJAS VALERIA",
        "grado": "1.º de secundaria",
        "madre": "YESICA",
        "correo_madre": "yesica@gmail.com",
        "padre": "SEGUNDO DAVID",
        "correo_padre": "segundodavid@gmail.com",
        "telefono": "987111236",
        "direccion": "Calle Tacna 190, Lima"
    },
    {
        "dni": "63688767",
        "nombre_estudiante": "MEDINA CAMPOS ALONSO",
        "grado": "1.º de secundaria",
        "madre": "LUZ ANGELICA",
        "correo_madre": "luzangelica@gmail.com",
        "padre": "RAUL ORLANDO",
        "correo_padre": "raulorlando@gmail.com",
        "telefono": "987111237",
        "direccion": "Jr. Trujillo 405, Lima"
    },
    {
        "dni": "77948454",
        "nombre_estudiante": "ESPINOZA RIOS THIAGO",
        "grado": "1.º de secundaria",
        "madre": "ELIA EDITH",
        "correo_madre": "eliaedith@gmail.com",
        "padre": "LUIS",
        "correo_padre": "luis@gmail.com",
        "telefono": "987111238",
        "direccion": "Av. Brasil 1250, Lima"
    },
    {
        "dni": "60070396",
        "nombre_estudiante": "GUTIERREZ BENITEZ MIA",
        "grado": "1.º de secundaria",
        "madre": "TIOFILA",
        "correo_madre": "tiofila@gmail.com",
        "padre": "SEGUNDO ARTURO",
        "correo_padre": "segundoarturo@gmail.com",
        "telefono": "987111239",
        "direccion": "Jr. Cusco 310, Lima"
    },
    {
        "dni": "62281241",
        "nombre_estudiante": "NAVARRO DELGADO MATIAS",
        "grado": "1.º de secundaria",
        "madre": "BRESILDA ZULEMA",
        "correo_madre": "bresildazulema@gmail.com",
        "padre": "JAIME WILLAM",
        "correo_padre": "jaimewillam@gmail.com",
        "telefono": "987111240",
        "direccion": "Calle Real 620, Lima"
    },
]

# PRE-TEST SOLICITUDES
PRE_SOLICITUDES = [
    (1, "PRE-001", "2026-08-03", "Libreta de notas", "Atendida", "Sí"),
    (2, "PRE-002", "2026-08-03", "Consulta", "Atendida", "Sí"),
    (3, "PRE-003", "2026-08-04", "Actualización de datos", "Atendida", "Sí"),
    (4, "PRE-004", "2026-08-05", "Entrevista", "Atendida", "Sí"),
    (5, "PRE-005", "2026-08-05", "Reclamo", "Atendida", "Sí"),
    (6, "PRE-006", "2026-08-06", "Sugerencia", "Atendida", "Sí"),
    (7, "PRE-007", "2026-08-07", "Libreta de notas", "Atendida", "Sí"),
    (8, "PRE-008", "2026-08-07", "Consulta", "Atendida", "Sí"),
    (9, "PRE-009", "2026-08-08", "Libreta de notas", "Atendida", "Sí"),
    (10, "PRE-010", "2026-08-09", "Consulta", "Atendida", "Sí"),
    (11, "PRE-011", "2026-08-09", "Actualización de datos", "Atendida", "Sí"),
    (12, "PRE-012", "2026-08-10", "Entrevista", "Atendida", "Sí"),
    (13, "PRE-013", "2026-08-11", "Reclamo", "Atendida", "Sí"),
    (14, "PRE-014", "2026-08-12", "Sugerencia", "Atendida", "Sí"),
    (15, "PRE-015", "2026-08-12", "Libreta de notas", "Atendida", "Sí"),
    (16, "PRE-016", "2026-08-13", "Consulta", "Atendida", "Sí"),
    (17, "PRE-017", "2026-08-14", "Libreta de notas", "Atendida", "Sí"),
    (18, "PRE-018", "2026-08-14", "Consulta", "Atendida", "Sí"),
    (19, "PRE-019", "2026-08-15", "Actualización de datos", "Atendida", "Sí"),
    (20, "PRE-020", "2026-08-16", "Entrevista", "Atendida", "Sí"),
    (21, "PRE-021", "2026-08-16", "Reclamo", "Atendida", "Sí"),
    (22, "PRE-022", "2026-08-17", "Sugerencia", "Atendida", "Sí"),
    (23, "PRE-023", "2026-08-18", "Libreta de notas", "Atendida", "Sí"),
    (24, "PRE-024", "2026-08-18", "Consulta", "Atendida", "Sí"),
    (25, "PRE-025", "2026-08-19", "Libreta de notas", "Pendiente", "No"),
    (26, "PRE-026", "2026-08-20", "Consulta", "Pendiente", "No"),
    (27, "PRE-027", "2026-08-21", "Actualización de datos", "Pendiente", "No"),
    (28, "PRE-028", "2026-08-21", "Entrevista", "Pendiente", "No"),
    (29, "PRE-029", "2026-08-22", "Reclamo", "Pendiente", "No"),
    (30, "PRE-030", "2026-08-23", "Sugerencia", "Pendiente", "No"),
    (31, "PRE-031", "2026-08-23", "Libreta de notas", "Pendiente", "No"),
    (32, "PRE-032", "2026-08-24", "Consulta", "Pendiente", "No"),
    (33, "PRE-033", "2026-08-25", "Libreta de notas", "Pendiente", "No"),
    (34, "PRE-034", "2026-08-25", "Consulta", "Pendiente", "No"),
    (35, "PRE-035", "2026-08-26", "Actualización de datos", "Pendiente", "No"),
    (36, "PRE-036", "2026-08-27", "Entrevista", "Pendiente", "No"),
    (37, "PRE-037", "2026-08-27", "Reclamo", "Pendiente", "No"),
    (38, "PRE-038", "2026-08-28", "Sugerencia", "Pendiente", "No"),
    (39, "PRE-039", "2026-08-29", "Libreta de notas", "Pendiente", "No"),
    (40, "PRE-040", "2026-08-30", "Consulta", "Pendiente", "No"),
]

PRE_TIEMPOS = {
    "PRE-001": ("2026-08-03 09:07:00", "2026-08-03 21:07:00", 720),
    "PRE-002": ("2026-08-03 10:14:00", "2026-08-03 19:14:00", 540),
    "PRE-003": ("2026-08-04 08:21:00", "2026-08-04 16:21:00", 480),
    "PRE-004": ("2026-08-05 09:28:00", "2026-08-05 15:28:00", 360),
    "PRE-005": ("2026-08-05 10:35:00", "2026-08-05 20:35:00", 600),
    "PRE-006": ("2026-08-06 08:42:00", "2026-08-06 15:42:00", 420),
    "PRE-007": ("2026-08-07 09:49:00", "2026-08-07 14:49:00", 300),
    "PRE-008": ("2026-08-07 10:56:00", "2026-08-08 00:56:00", 840),
    "PRE-009": ("2026-08-08 08:03:00", "2026-08-08 14:33:00", 390),
    "PRE-010": ("2026-08-09 09:10:00", "2026-08-09 17:40:00", 510),
    "PRE-011": ("2026-08-09 10:17:00", "2026-08-09 17:47:00", 450),
    "PRE-012": ("2026-08-10 08:24:00", "2026-08-10 12:54:00", 270),
    "PRE-013": ("2026-08-11 09:31:00", "2026-08-11 20:31:00", 660),
    "PRE-014": ("2026-08-12 10:38:00", "2026-08-12 16:08:00", 330),
    "PRE-015": ("2026-08-12 08:45:00", "2026-08-12 21:45:00", 780),
    "PRE-016": ("2026-08-13 09:52:00", "2026-08-13 16:52:00", 420),
    "PRE-017": ("2026-08-14 10:59:00", "2026-08-14 20:29:00", 570),
    "PRE-018": ("2026-08-14 08:06:00", "2026-08-14 12:06:00", 240),
    "PRE-019": ("2026-08-15 09:13:00", "2026-08-15 20:43:00", 690),
    "PRE-020": ("2026-08-16 10:20:00", "2026-08-16 16:20:00", 360),
    "PRE-021": ("2026-08-16 08:27:00", "2026-08-16 16:27:00", 480),
    "PRE-022": ("2026-08-17 09:34:00", "2026-08-17 14:34:00", 300),
    "PRE-023": ("2026-08-18 10:41:00", "2026-08-18 19:41:00", 540),
    "PRE-024": ("2026-08-18 08:48:00", "2026-08-18 16:18:00", 450),
}

# POST-TEST SOLICITUDES
POST_SOLICITUDES = [
    (1, "POST-001", "2026-09-07", "Libreta de notas", "Atendida", "Sí"),
    (2, "POST-002", "2026-09-07", "Consulta", "Atendida", "Sí"),
    (3, "POST-003", "2026-09-08", "Actualización de datos", "Atendida", "Sí"),
    (4, "POST-004", "2026-09-09", "Entrevista", "Atendida", "Sí"),
    (5, "POST-005", "2026-09-09", "Reclamo", "Atendida", "Sí"),
    (6, "POST-006", "2026-09-10", "Sugerencia", "Atendida", "Sí"),
    (7, "POST-007", "2026-09-11", "Libreta de notas", "Atendida", "Sí"),
    (8, "POST-008", "2026-09-11", "Consulta", "Atendida", "Sí"),
    (9, "POST-009", "2026-09-12", "Libreta de notas", "Atendida", "Sí"),
    (10, "POST-010", "2026-09-13", "Consulta", "Atendida", "Sí"),
    (11, "POST-011", "2026-09-13", "Actualización de datos", "Atendida", "Sí"),
    (12, "POST-012", "2026-09-14", "Entrevista", "Atendida", "Sí"),
    (13, "POST-013", "2026-09-15", "Reclamo", "Atendida", "Sí"),
    (14, "POST-014", "2026-09-16", "Sugerencia", "Atendida", "Sí"),
    (15, "POST-015", "2026-09-16", "Libreta de notas", "Atendida", "Sí"),
    (16, "POST-016", "2026-09-17", "Consulta", "Atendida", "Sí"),
    (17, "POST-017", "2026-09-18", "Libreta de notas", "Atendida", "Sí"),
    (18, "POST-018", "2026-09-18", "Consulta", "Atendida", "Sí"),
    (19, "POST-019", "2026-09-19", "Actualización de datos", "Atendida", "Sí"),
    (20, "POST-020", "2026-09-20", "Entrevista", "Atendida", "Sí"),
    (21, "POST-021", "2026-09-20", "Reclamo", "Atendida", "Sí"),
    (22, "POST-022", "2026-09-21", "Sugerencia", "Atendida", "Sí"),
    (23, "POST-023", "2026-09-22", "Libreta de notas", "Atendida", "Sí"),
    (24, "POST-024", "2026-09-22", "Consulta", "Atendida", "Sí"),
    (25, "POST-025", "2026-09-23", "Libreta de notas", "Atendida", "Sí"),
    (26, "POST-026", "2026-09-24", "Consulta", "Atendida", "Sí"),
    (27, "POST-027", "2026-09-25", "Actualización de datos", "Atendida", "Sí"),
    (28, "POST-028", "2026-09-25", "Entrevista", "Atendida", "Sí"),
    (29, "POST-029", "2026-09-26", "Reclamo", "Atendida", "Sí"),
    (30, "POST-030", "2026-09-27", "Sugerencia", "Atendida", "Sí"),
    (31, "POST-031", "2026-09-27", "Libreta de notas", "Atendida", "Sí"),
    (32, "POST-032", "2026-09-28", "Consulta", "Atendida", "Sí"),
    (33, "POST-033", "2026-09-29", "Libreta de notas", "Atendida", "Sí"),
    (34, "POST-034", "2026-09-29", "Consulta", "Atendida", "Sí"),
    (35, "POST-035", "2026-09-30", "Actualización de datos", "Atendida", "Sí"),
    (36, "POST-036", "2026-10-01", "Entrevista", "Atendida", "Sí"),
    (37, "POST-037", "2026-10-01", "Reclamo", "Pendiente", "No"),
    (38, "POST-038", "2026-10-02", "Sugerencia", "Pendiente", "No"),
    (39, "POST-039", "2026-10-03", "Libreta de notas", "Pendiente", "No"),
    (40, "POST-040", "2026-10-04", "Consulta", "Pendiente", "No"),
]

POST_TIEMPOS = {
    "POST-001": ("2026-09-07 09:07:00", "2026-09-07 10:07:00", 60),
    "POST-002": ("2026-09-07 10:14:00", "2026-09-07 11:29:00", 75),
    "POST-003": ("2026-09-08 08:21:00", "2026-09-08 09:51:00", 90),
    "POST-004": ("2026-09-09 09:28:00", "2026-09-09 10:13:00", 45),
    "POST-005": ("2026-09-09 10:35:00", "2026-09-09 12:35:00", 120),
    "POST-006": ("2026-09-10 08:42:00", "2026-09-10 10:02:00", 80),
    "POST-007": ("2026-09-11 09:49:00", "2026-09-11 10:54:00", 65),
    "POST-008": ("2026-09-11 10:56:00", "2026-09-11 12:36:00", 100),
    "POST-009": ("2026-09-12 08:03:00", "2026-09-12 08:58:00", 55),
    "POST-010": ("2026-09-13 09:10:00", "2026-09-13 10:20:00", 70),
    "POST-011": ("2026-09-13 10:17:00", "2026-09-13 11:42:00", 85),
    "POST-012": ("2026-09-14 08:24:00", "2026-09-14 09:04:00", 40),
    "POST-013": ("2026-09-15 09:31:00", "2026-09-15 11:21:00", 110),
    "POST-014": ("2026-09-16 10:38:00", "2026-09-16 12:13:00", 95),
    "POST-015": ("2026-09-16 08:45:00", "2026-09-16 09:45:00", 60),
    "POST-016": ("2026-09-17 09:52:00", "2026-09-17 11:07:00", 75),
    "POST-017": ("2026-09-18 10:59:00", "2026-09-18 11:49:00", 50),
    "POST-018": ("2026-09-18 08:06:00", "2026-09-18 09:36:00", 90),
    "POST-019": ("2026-09-19 09:13:00", "2026-09-19 10:18:00", 65),
    "POST-020": ("2026-09-20 10:20:00", "2026-09-20 12:20:00", 120),
    "POST-021": ("2026-09-20 08:27:00", "2026-09-20 09:47:00", 80),
    "POST-022": ("2026-09-21 09:34:00", "2026-09-21 10:29:00", 55),
    "POST-023": ("2026-09-22 10:41:00", "2026-09-22 11:51:00", 70),
    "POST-024": ("2026-09-22 08:48:00", "2026-09-22 09:33:00", 45),
    "POST-025": ("2026-09-23 09:55:00", "2026-09-23 11:35:00", 100),
    "POST-026": ("2026-09-24 10:02:00", "2026-09-24 11:27:00", 85),
    "POST-027": ("2026-09-25 08:09:00", "2026-09-25 09:09:00", 60),
    "POST-028": ("2026-09-25 09:16:00", "2026-09-25 10:31:00", 75),
    "POST-029": ("2026-09-26 10:23:00", "2026-09-26 11:53:00", 90),
    "POST-030": ("2026-09-27 08:30:00", "2026-09-27 09:20:00", 50),
    "POST-031": ("2026-09-27 09:37:00", "2026-09-27 10:42:00", 65),
    "POST-032": ("2026-09-28 10:44:00", "2026-09-28 12:04:00", 80),
    "POST-033": ("2026-09-29 08:51:00", "2026-09-29 09:31:00", 40),
    "POST-034": ("2026-09-29 09:58:00", "2026-09-29 11:08:00", 70),
    "POST-035": ("2026-09-30 10:05:00", "2026-09-30 11:00:00", 55),
    "POST-036": ("2026-10-01 08:12:00", "2026-10-01 09:47:00", 95),
}


def mapear_tipo_estandar(tipo_raw: str):
    m = {
        "Libreta de notas": "Libreta de Notas",
        "Consulta": "Consulta",
        "Actualización de datos": "Actualizacion de Datos",
        "Entrevista": "Entrevista",
        "Reclamo": "Reclamo",
        "Sugerencia": "Queja o Sugerencia",
    }
    return m.get(tipo_raw, tipo_raw)


def crear_detalle_segun_tipo(db, req_id: int, tipo: str, asunto: str, est_info: dict, area: str):
    if tipo == "Libreta de Notas":
        det = DetalleLibreta(
            solicitud_id=req_id,
            dni_estudiante=est_info["dni"],
            grado=est_info["grado"],
            archivo_pdf_url=f"/static/pdfs/Libreta_{est_info['dni']}.pdf",
        )
        db.add(det)
    elif tipo == "Actualizacion de Datos":
        det = DetalleActualizacion(
            solicitud_id=req_id,
            tipo_persona="Estudiante",
            dni_titular=est_info["dni"],
            nombre_titular=est_info["nombre_estudiante"],
            campo_actualizar="Teléfono de contacto",
            valor_actual="987000000",
            valor_nuevo=est_info.get("telefono", "999444555"),
            motivo=asunto,
            decision="Aprobada",
            comentario_decision="Actualizado en padrón oficial",
            fecha_decision=datetime.utcnow()
        )
        db.add(det)
    elif tipo == "Consulta":
        det = DetalleConsulta(
            solicitud_id=req_id,
            categoria="Financiera" if "pensión" in asunto or "abono" in asunto else "Administrativa",
            area_derivada=area,
            respuesta="Se atendió oportunamente brindando la orientación oficial institucional.",
            fecha_respuesta=datetime.utcnow()
        )
        db.add(det)
    elif tipo == "Entrevista":
        det = DetalleEntrevista(
            solicitud_id=req_id,
            relacion_institucion="Madre" if "@" in est_info.get("correo_madre", "") else "Padre",
            area_solicitada=area,
            modalidad="Presencial",
            motivo=asunto,
            enlace_reunion="Oficina de Tutoría - Pabellón A",
        )
        db.add(det)
    elif tipo == "Reclamo":
        det = DetalleReclamo(
            solicitud_id=req_id,
            categoria="Administrativo",
            hechos=asunto,
            acciones_realizadas="Verificación de registros y comprobantes bancarios.",
            resolucion="Reclamo resuelto favorablemente tras revisión contable.",
            fecha_resolucion=datetime.utcnow()
        )
        db.add(det)
    elif tipo == "Queja o Sugerencia":
        det = DetalleQueja(
            solicitud_id=req_id,
            tipo="Sugerencia",
            es_anonimo=False,
            categoria="Infraestructura" if "biblioteca" in asunto else "Atención al público",
            area_relacionada=area,
            evaluacion="Propuesta evaluada por la dirección institucional.",
            accion_propuesta="Implementación progresiva en el horario escolar.",
            respuesta_final="Agradecemos la propuesta de mejora para beneficio estudiantil."
        )
        db.add(det)


def poblar_datos():
    db = SessionLocal()
    print("Iniciando reseteo y siembra de datos de Tesis...")

    # 1. Asegurar usuario Admin
    admin = db.query(User).filter(User.correo == "admin@colegio.edu.pe").first()
    if not admin:
        admin = User(
            correo="admin@colegio.edu.pe",
            nombre="Administrador del Sistema",
            rol="Administrador",
            hashed_password=get_password_hash("Admin123!"),
            estado=True
        )
        db.add(admin)
        db.flush()

    # 2. Limpiar solicitudes previas
    print("Limpiando tablas de solicitudes e historiales...")
    db.query(RequestHistory).delete()
    db.query(DetalleLibreta).delete()
    db.query(DetalleActualizacion).delete()
    db.query(DetalleConsulta).delete()
    db.query(DetalleEntrevista).delete()
    db.query(DetalleReclamo).delete()
    db.query(DetalleQueja).delete()
    db.query(Request).delete()
    db.commit()

    # 3. Insertar POST-TEST (40 solicitudes del software implementado)
    print("Insertando 40 solicitudes POST-TEST (Software RPA)...")
    for nro, cod, fecha_str, tipo_raw, est_final, atendida_sn in POST_SOLICITUDES:
        tipo = mapear_tipo_estandar(tipo_raw)
        idx_est = (nro - 1) % len(PADRON_ESTUDIANTES)
        est = PADRON_ESTUDIANTES[idx_est]
        es_madre = (nro % 2 == 1)
        solicitante_nom = est["madre"] if es_madre else est["padre"]
        solicitante_cor = est["correo_madre"] if es_madre else est["correo_padre"]

        # Fechas y tiempos
        if cod in POST_TIEMPOS:
            rec_str, resp_str, _ = POST_TIEMPOS[cod]
            f_rec = datetime.strptime(rec_str, "%Y-%m-%d %H:%M:%S")
            f_resp = datetime.strptime(resp_str, "%Y-%m-%d %H:%M:%S")
            f_ate = f_resp
            estado_bd = "Atendida"
        else:
            # Pendiente
            hora_falsa = f"{8 + (nro % 4):02d}:{(nro * 7) % 60:02d}:00"
            f_rec = datetime.strptime(f"{fecha_str} {hora_falsa}", "%Y-%m-%d %H:%M:%S")
            f_resp = None
            f_ate = None
            estado_bd = "En proceso"

        # Asuntos representativos
        asuntos_map = {
            "Libreta de Notas": f"Solicitud de Libreta de Notas - DNI {est['dni']} - 1ro Secundaria",
            "Consulta": "Consulta sobre costos de matrícula y pensiones 2026",
            "Actualizacion de Datos": f"Solicitud de Actualización de Datos - DNI {est['dni']} - Teléfono: {est['telefono']}",
            "Entrevista": "Solicitud de entrevista con la tutora de 1ro de secundaria",
            "Reclamo": "Reclamo formal por problema de cobro en pensión",
            "Queja o Sugerencia": "Sugerencia de mejora en el horario de atención al público",
        }
        areas_map = {
            "Libreta de Notas": "Secretaría",
            "Consulta": "Secretaría",
            "Actualizacion de Datos": "Secretaría",
            "Entrevista": "Tutoría",
            "Reclamo": "Tesorería",
            "Queja o Sugerencia": "Secretaría",
        }

        asunto = asuntos_map.get(tipo, f"Solicitud {tipo}")
        area = areas_map.get(tipo, "Secretaría")

        r = Request(
            codigo=cod,
            tipo_solicitud=tipo,
            canal_origen="Gmail",
            correo_solicitante=solicitante_cor,
            nombre_solicitante=solicitante_nom,
            telefono_solicitante=est.get("telefono"),
            dni_estudiante=est["dni"],
            grado=est["grado"],
            asunto=asunto,
            descripcion=asunto,
            prioridad="Normal",
            area_responsable=area,
            estado=estado_bd,
            fecha_recepcion=f_rec,
            fecha_primera_respuesta=f_resp,
            fecha_atencion=f_ate,
            fecha_creacion=f_rec,
        )
        db.add(r)
        db.flush()

        crear_detalle_segun_tipo(db, r.id, tipo, asunto, est, area)

        # Historial
        h1 = RequestHistory(
            request_id=r.id,
            estado_nuevo="Recibida",
            comentario=f"Solicitud recibida vía Gmail ({tipo})",
            area_responsable=area,
            fecha=f_rec
        )
        db.add(h1)
        if f_resp:
            h2 = RequestHistory(
                request_id=r.id,
                estado_anterior="Recibida",
                estado_nuevo="Atendida",
                comentario="Solicitud procesada y atendida automáticamente por sistema RPA-IEP",
                area_responsable=area,
                fecha=f_resp
            )
            db.add(h2)

    db.commit()
    print("[OK] Siembra de datos completada exitosamente!")
    total = db.query(Request).count()
    atendidas = db.query(Request).filter(Request.estado == "Atendida").count()
    print(f"Total registros insertados: {total}")
    print(f"Total atendidas: {atendidas}")
    db.close()

if __name__ == "__main__":
    poblar_datos()

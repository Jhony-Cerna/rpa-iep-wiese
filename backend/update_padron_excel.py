import openpyxl
import os

padron_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'PADRON_ESTUDIANTES_Y_APODERADOS.xlsx'))

wb = openpyxl.load_workbook(padron_path)
ws = wb.active

estudiantes = [
    ("78524694", "RODRIGUEZ PAULINO SEBASTIAN", "1.º de secundaria", "CLAUDIA PAULINA", "claudiapaulina@gmail.com", "987111221", "Av. Las Palmeras 102, Lima"),
    ("78474972", "QUISPE CONDORI VALENTINA", "1.º de secundaria", "AIDE", "aide@gmail.com", "987111222", "Jr. Puno 340, Lima"),
    ("78384455", "GOMEZ ROJAS MATHIAS", "1.º de secundaria", "GENOVEVA", "genoveva@gmail.com", "987111223", "Calle Los Álamos 215, Lima"),
    ("81221078", "LOPEZ HUAMAN JOAQUIN", "1.º de secundaria", "YOLY", "yoly@gmail.com", "987111224", "Av. Universitaria 890, Lima"),
    ("78241511", "CASTRO MORALES ADRIANO", "1.º de secundaria", "MADILEYDI YOYSI", "madileydiyoysi@gmail.com", "987111225", "Jr. Ayacucho 450, Lima"),
    ("78367991", "FLORES MENDOZA CAMILA", "1.º de secundaria", "ANA MARIA", "anamaria@gmail.com", "987111226", "Calle Las Flores 112, Lima"),
    ("78337130", "SANCHEZ VARGAS NICOLAS", "1.º de secundaria", "DORCAS", "dorcas@gmail.com", "987111227", "Av. San Martín 780, Lima"),
    ("78281007", "CHAVEZ SILVA GABRIELA", "1.º de secundaria", "GLADYS", "gladys@gmail.com", "987111228", "Jr. Lima 320, Lima"),
    ("78581128", "RAMOS RUIZ LEONARDO", "1.º de secundaria", "LUCILA", "lucila@gmail.com", "987111229", "Calle Arica 145, Lima"),
    ("78368015", "HERRERA CRUZ LUCIANA", "1.º de secundaria", "ANA MARIA", "anamaria@gmail.com", "987111230", "Av. El Sol 410, Lima"),
    ("77889213", "RAMIREZ SOTO SOFIA", "1.º de secundaria", "NATALY ISABEL", "natalyisabel@gmail.com", "987111231", "Jr. Moquegua 280, Lima"),
    ("78394563", "MISAICO QUISPE FABRICIO", "1.º de secundaria", "NEIDA MAGALI", "neidamagali@gmail.com", "987654321", "Av. Los Próceres 124, Lima"),
    ("78354051", "TORRES VEGA RODRIGO", "1.º de secundaria", "LUISA CEVERINA", "luisaceverina@gmail.com", "987111233", "Calle Bolognesi 304, Lima"),
    ("78137908", "FERNANDEZ CASTILLO LUCAS", "1.º de secundaria", "OLINDA PILAR", "olindapilar@gmail.com", "999444555", "Jr. Ayacucho 450, Lima"),
    ("78118515", "ALVAREZ NAVARRO DANIEL", "1.º de secundaria", "HERMILA", "hermila@gmail.com", "987111235", "Av. Grau 520, Lima"),
    ("77759581", "PAREDES ROJAS VALERIA", "1.º de secundaria", "YESICA", "yesica@gmail.com", "987111236", "Calle Tacna 190, Lima"),
    ("63688767", "MEDINA CAMPOS ALONSO", "1.º de secundaria", "LUZ ANGELICA", "luzangelica@gmail.com", "987111237", "Jr. Trujillo 405, Lima"),
    ("77948454", "ESPINOZA RIOS THIAGO", "1.º de secundaria", "ELIA EDITH", "eliaedith@gmail.com", "987111238", "Av. Brasil 1250, Lima"),
    ("60070396", "GUTIERREZ BENITEZ MIA", "1.º de secundaria", "TIOFILA", "tiofila@gmail.com", "987111239", "Jr. Cusco 310, Lima"),
    ("62281241", "NAVARRO DELGADO MATIAS", "1.º de secundaria", "BRESILDA ZULEMA", "bresildazulema@gmail.com", "987111240", "Calle Real 620, Lima"),
]

# Limpiar filas existentes preservando encabezado
ws.delete_rows(2, ws.max_row + 1)

for idx, (dni, nom_est, grado, apoderado, correo, tel, dir_) in enumerate(estudiantes, start=1):
    dni_apoderado = f"4{idx:07d}"
    ws.append([
        dni,
        nom_est,
        grado,
        dni_apoderado,
        apoderado,
        "Madre",
        tel,
        correo,
        dir_,
        "Matriculado",
        "2026-09-07",
        f"POST-{idx:03d}"
    ])

wb.save(padron_path)
print(f"Padrón oficial actualizado exitosamente con {len(estudiantes)} estudiantes.")

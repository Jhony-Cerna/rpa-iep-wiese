from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.database import Base


# ─────────────────────────────────────────────
# USUARIOS
# ─────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
    correo = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    rol = Column(String, default="Operador")  # Administrador | Operador | Consulta
    estado = Column(Boolean, default=True)
    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now())


# ─────────────────────────────────────────────
# SOLICITUDES (tabla base, antes "requests")
# Ahora es genérica: aplica a todos los tipos
# ─────────────────────────────────────────────
class Request(Base):
    __tablename__ = "requests"

    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String, unique=True, index=True, nullable=True)  # SOL-2026-0001

    # Clasificación
    tipo_solicitud = Column(String, default="Libreta de Notas", index=True)
    # Valores: Libreta de Notas | Actualizacion de Datos | Consulta |
    #          Entrevista | Reclamo | Queja o Sugerencia
    canal_origen = Column(String, default="Gmail")  # Gmail | Manual | Web
    area_responsable = Column(String, nullable=True)  # Dirección | Secretaría | etc.

    # Solicitante
    correo_solicitante = Column(String, index=True, nullable=False)
    nombre_solicitante = Column(String, nullable=True)
    telefono_solicitante = Column(String, nullable=True)
    dni_estudiante = Column(String, nullable=True)
    grado = Column(String, nullable=True)


    # Contenido genérico
    asunto = Column(String, nullable=True)
    descripcion = Column(Text, nullable=True)
    prioridad = Column(String, default="Normal")  # Baja | Normal | Alta | Urgente
    observaciones = Column(Text, nullable=True)

    # Estado y trazabilidad
    estado = Column(String, default="Recibida", index=True)
    # Estados: Recibida | En proceso | En revisión | Atendida | Cerrada | Error | Requiere revisión manual

    responsable_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Fechas
    fecha_recepcion = Column(DateTime(timezone=True), server_default=func.now())
    fecha_primera_respuesta = Column(DateTime(timezone=True), nullable=True)
    fecha_atencion = Column(DateTime(timezone=True), nullable=True)
    fecha_cierre = Column(DateTime(timezone=True), nullable=True)
    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now())
    fecha_actualizacion = Column(DateTime(timezone=True), onupdate=func.now())

    # Gmail (solo para solicitudes entrantes por correo)
    gmail_message_id = Column(String, unique=True, index=True, nullable=True)

    # Relaciones
    responsable = relationship("User")
    historial = relationship("RequestHistory", back_populates="solicitud", cascade="all, delete-orphan")
    rpa_jobs = relationship("RPAJob", back_populates="solicitud", cascade="all, delete-orphan")
    documentos = relationship("GeneratedDocument", back_populates="solicitud", cascade="all, delete-orphan")

    # Detalles por tipo (one-to-one opcionales)
    detalle_libreta = relationship("DetalleLibreta", back_populates="solicitud", uselist=False, cascade="all, delete-orphan")
    detalle_actualizacion = relationship("DetalleActualizacion", back_populates="solicitud", uselist=False, cascade="all, delete-orphan")
    detalle_consulta = relationship("DetalleConsulta", back_populates="solicitud", uselist=False, cascade="all, delete-orphan")
    detalle_entrevista = relationship("DetalleEntrevista", back_populates="solicitud", uselist=False, cascade="all, delete-orphan")
    detalle_reclamo = relationship("DetalleReclamo", back_populates="solicitud", uselist=False, cascade="all, delete-orphan")
    detalle_queja = relationship("DetalleQueja", back_populates="solicitud", uselist=False, cascade="all, delete-orphan")


# ─────────────────────────────────────────────
# HISTORIAL DE CAMBIOS DE ESTADO
# ─────────────────────────────────────────────
class RequestHistory(Base):
    __tablename__ = "request_history"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("requests.id"))
    usuario_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # null = proceso automático
    estado_anterior = Column(String, nullable=True)
    estado_nuevo = Column(String, nullable=False)
    area_responsable = Column(String, nullable=True)
    comentario = Column(Text, nullable=True)
    resultado = Column(String, nullable=True)
    fecha = Column(DateTime(timezone=True), server_default=func.now())

    solicitud = relationship("Request", back_populates="historial")
    usuario = relationship("User")


# ─────────────────────────────────────────────
# EJECUCIONES RPA
# ─────────────────────────────────────────────
class RPAJob(Base):
    __tablename__ = "rpa_jobs"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("requests.id"))
    tipo_automatizacion = Column(String, default="Generar Libreta PDF")
    estado_ejecucion = Column(String, default="Pendiente")  # Pendiente | En proceso | Completado | Fallido
    fecha_inicio = Column(DateTime(timezone=True), nullable=True)
    fecha_finalizacion = Column(DateTime(timezone=True), nullable=True)
    cantidad_reintentos = Column(Integer, default=0)
    resultado = Column(String, nullable=True)
    mensaje_error = Column(Text, nullable=True)

    solicitud = relationship("Request", back_populates="rpa_jobs")


# ─────────────────────────────────────────────
# DOCUMENTOS GENERADOS
# ─────────────────────────────────────────────
class GeneratedDocument(Base):
    __tablename__ = "generated_documents"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("requests.id"))
    nombre_archivo = Column(String, nullable=False)
    ubicacion = Column(String, nullable=False)
    fecha_generacion = Column(DateTime(timezone=True), server_default=func.now())
    fecha_envio = Column(DateTime(timezone=True), nullable=True)

    solicitud = relationship("Request", back_populates="documentos")


# ─────────────────────────────────────────────
# CONFIGURACIÓN DEL SISTEMA
# ─────────────────────────────────────────────
class SystemConfiguration(Base):
    __tablename__ = "system_configurations"

    id = Column(Integer, primary_key=True, index=True)
    clave = Column(String, unique=True, index=True, nullable=False)
    valor = Column(String, nullable=False)
    descripcion = Column(Text, nullable=True)
    fecha_actualizacion = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


# ═══════════════════════════════════════════════════════════
# TABLAS DE DETALLE POR TIPO DE SOLICITUD
# ═══════════════════════════════════════════════════════════

# ─────────────────────────────────────────────
# DETALLE: LIBRETA DE NOTAS (módulo original)
# ─────────────────────────────────────────────
class DetalleLibreta(Base):
    __tablename__ = "detalle_libreta"

    id = Column(Integer, primary_key=True, index=True)
    solicitud_id = Column(Integer, ForeignKey("requests.id"), unique=True, nullable=False)
    dni_estudiante = Column(String, index=True, nullable=False)
    grado = Column(String, nullable=False)
    archivo_pdf_url = Column(String, nullable=True)

    solicitud = relationship("Request", back_populates="detalle_libreta")


# ─────────────────────────────────────────────
# DETALLE: ACTUALIZACIÓN DE DATOS
# ─────────────────────────────────────────────
class DetalleActualizacion(Base):
    __tablename__ = "detalle_actualizacion"

    id = Column(Integer, primary_key=True, index=True)
    solicitud_id = Column(Integer, ForeignKey("requests.id"), unique=True, nullable=False)

    tipo_persona = Column(String, nullable=False)
    # Valores: Estudiante | Padre | Madre | Apoderado

    dni_titular = Column(String, nullable=False)
    nombre_titular = Column(String, nullable=False)

    campo_actualizar = Column(String, nullable=False)
    # Valores: Nombre | Dirección | Teléfono | Correo | Fecha de nacimiento | Otro

    valor_actual = Column(String, nullable=True)   # Dato sensible, guardarlo si fue provisto
    valor_nuevo = Column(String, nullable=False)
    motivo = Column(Text, nullable=False)
    documento_sustento_url = Column(String, nullable=True)

    # Flujo de aprobación
    decision = Column(String, nullable=True)  # En revisión | Aprobada | Rechazada
    comentario_decision = Column(Text, nullable=True)
    fecha_decision = Column(DateTime(timezone=True), nullable=True)
    usuario_decision_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    solicitud = relationship("Request", back_populates="detalle_actualizacion")
    usuario_decision = relationship("User", foreign_keys=[usuario_decision_id])


# ─────────────────────────────────────────────
# DETALLE: CONSULTA ADMINISTRATIVA
# ─────────────────────────────────────────────
class DetalleConsulta(Base):
    __tablename__ = "detalle_consulta"

    id = Column(Integer, primary_key=True, index=True)
    solicitud_id = Column(Integer, ForeignKey("requests.id"), unique=True, nullable=False)

    categoria = Column(String, nullable=False)
    # Valores: Académica | Administrativa | Financiera | Matrícula | Reglamento | Otra

    area_derivada = Column(String, nullable=True)
    respuesta = Column(Text, nullable=True)
    fecha_respuesta = Column(DateTime(timezone=True), nullable=True)

    solicitud = relationship("Request", back_populates="detalle_consulta")


# ─────────────────────────────────────────────
# DETALLE: ENTREVISTA
# ─────────────────────────────────────────────
class DetalleEntrevista(Base):
    __tablename__ = "detalle_entrevista"

    id = Column(Integer, primary_key=True, index=True)
    solicitud_id = Column(Integer, ForeignKey("requests.id"), unique=True, nullable=False)

    relacion_institucion = Column(String, nullable=False)
    # Valores: Padre | Madre | Apoderado | Estudiante | Externo

    area_solicitada = Column(String, nullable=False)
    # Valores: Dirección | Tutoría | Secretaría | Psicología | Otra

    motivo = Column(Text, nullable=False)
    modalidad = Column(String, default="Presencial")  # Presencial | Virtual

    fecha_hora_propuesta = Column(DateTime(timezone=True), nullable=True)
    fecha_hora_confirmada = Column(DateTime(timezone=True), nullable=True)
    enlace_reunion = Column(String, nullable=True)  # Para entrevistas virtuales

    solicitud = relationship("Request", back_populates="detalle_entrevista")


# ─────────────────────────────────────────────
# DETALLE: RECLAMO
# ─────────────────────────────────────────────
class DetalleReclamo(Base):
    __tablename__ = "detalle_reclamo"

    id = Column(Integer, primary_key=True, index=True)
    solicitud_id = Column(Integer, ForeignKey("requests.id"), unique=True, nullable=False)

    categoria = Column(String, nullable=False)
    # Valores: Servicio | Docente | Administrativo | Infraestructura | Otro

    hechos = Column(Text, nullable=False)
    documentos_adjuntos = Column(String, nullable=True)  # URL o referencia

    acciones_realizadas = Column(Text, nullable=True)
    resolucion = Column(Text, nullable=True)
    fecha_resolucion = Column(DateTime(timezone=True), nullable=True)

    solicitud = relationship("Request", back_populates="detalle_reclamo")


# ─────────────────────────────────────────────
# DETALLE: QUEJA O SUGERENCIA
# ─────────────────────────────────────────────
class DetalleQueja(Base):
    __tablename__ = "detalle_queja"

    id = Column(Integer, primary_key=True, index=True)
    solicitud_id = Column(Integer, ForeignKey("requests.id"), unique=True, nullable=False)

    tipo = Column(String, nullable=False)  # Queja | Sugerencia
    es_anonimo = Column(Boolean, default=False)

    categoria = Column(String, nullable=False)
    # Valores: Atención al público | Comunicación | Infraestructura | Procesos | Otro

    area_relacionada = Column(String, nullable=True)
    evaluacion = Column(Text, nullable=True)
    accion_propuesta = Column(Text, nullable=True)
    respuesta_final = Column(Text, nullable=True)

    solicitud = relationship("Request", back_populates="detalle_queja")

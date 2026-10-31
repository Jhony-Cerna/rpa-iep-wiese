import base64
from email.message import EmailMessage
from googleapiclient.discovery import build
from .google_auth import get_google_credentials

def get_gmail_service():
    creds = get_google_credentials()
    return build('gmail', 'v1', credentials=creds)

def fetch_unread_requests(query="is:unread in:inbox -from:google.com -category:promotions -category:social"):
    """
    Busca correos no leídos en la bandeja de entrada, excluyendo avisos automáticos de Google y promociones.
    Permite procesar cualquier solicitud, consulta, reclamo, entrevista o queja.
    """
    service = get_gmail_service()
    results = service.users().messages().list(userId='me', q=query).execute()
    messages = results.get('messages', [])
    
    correos = []
    for msg in messages:
        msg_id = msg['id']
        msg_detail = service.users().messages().get(userId='me', id=msg_id, format='metadata', metadataHeaders=['From', 'Subject', 'Date']).execute()
        
        headers = msg_detail.get('payload', {}).get('headers', [])
        
        asunto = next((header['value'] for header in headers if header['name'] == 'Subject'), "Sin Asunto")
        remitente = next((header['value'] for header in headers if header['name'] == 'From'), "Desconocido")
        fecha = next((header['value'] for header in headers if header['name'] == 'Date'), "")
        
        # Ignorar correos de Google o no-reply
        if "google.com" in remitente.lower() or "no-reply" in remitente.lower() or "noreply" in remitente.lower():
            continue

        correos.append({
            'id': msg_id,
            'remitente': remitente,
            'asunto': asunto,
            'fecha': fecha,
            'snippet': msg_detail.get('snippet', '')
        })
        
    return correos

def mark_as_read(msg_id):
    """Marca un correo como leído eliminando la etiqueta UNREAD."""
    service = get_gmail_service()
    service.users().messages().modify(
        userId='me', id=msg_id, body={'removeLabelIds': ['UNREAD']}
    ).execute()

def send_email_with_pdf(to_email, subject, body, pdf_path, pdf_filename):
    """
    Envía un correo electrónico con un archivo PDF adjunto.
    """
    service = get_gmail_service()
    
    message = EmailMessage()
    message['To'] = to_email
    message['Subject'] = subject
    message.set_content(body)
    
    # Adjuntar el archivo PDF
    with open(pdf_path, 'rb') as f:
        pdf_data = f.read()
    
    message.add_attachment(
        pdf_data, 
        maintype='application', 
        subtype='pdf', 
        filename=pdf_filename
    )
    
    # Codificar el mensaje para la API de Gmail
    encoded_message = base64.urlsafe_b64encode(message.as_bytes()).decode()
    create_message = {'raw': encoded_message}
    
    send_message = service.users().messages().send(userId="me", body=create_message).execute()
    return send_message['id']

def send_plain_email(to_email, subject, body):
    """
    Envía un correo electrónico simple de texto/notificación.
    """
    service = get_gmail_service()
    message = EmailMessage()
    message['To'] = to_email
    message['Subject'] = subject
    message.set_content(body)

    encoded_message = base64.urlsafe_b64encode(message.as_bytes()).decode()
    create_message = {'raw': encoded_message}
    send_message = service.users().messages().send(userId="me", body=create_message).execute()
    return send_message['id']


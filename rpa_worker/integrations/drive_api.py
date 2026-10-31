import io
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
from .google_auth import get_google_credentials

def get_drive_service():
    creds = get_google_credentials()
    return build('drive', 'v3', credentials=creds)

def search_excel_file_by_name(file_name, parent_folder_id=None):
    """
    Busca un archivo de Excel (.xlsx) en Drive por su nombre exacto o variantes.
    """
    service = get_drive_service()
    
    query = f"name = '{file_name}' and mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' and trashed = false"
    results = service.files().list(
        q=query, spaces='drive', fields='files(id, name, parents)'
    ).execute()
    files = results.get('files', [])
    if files:
        return files[0]

    # Fallback con variantes comunes (ej. 1.º vs 1.o vs 1ro)
    grado_num = file_name[0] if file_name and file_name[0].isdigit() else None
    if grado_num:
        alt_names = [
            f"{grado_num}.o de secundaria.xlsx",
            f"{grado_num}.º de secundaria.xlsx",
            f"{grado_num}ro de secundaria.xlsx",
            f"{grado_num}do de secundaria.xlsx",
            f"{grado_num}er de secundaria.xlsx",
            f"{grado_num}to de secundaria.xlsx",
        ]
        for alt in alt_names:
            if alt == file_name:
                continue
            q_alt = f"name = '{alt}' and mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' and trashed = false"
            res_alt = service.files().list(q=q_alt, spaces='drive', fields='files(id, name, parents)').execute()
            f_alt = res_alt.get('files', [])
            if f_alt:
                return f_alt[0]

    return None

def download_excel_file(file_id, dest_path):
    """
    Descarga un archivo desde Google Drive y lo guarda en dest_path.
    """
    service = get_drive_service()
    request = service.files().get_media(fileId=file_id)
    
    with open(dest_path, 'wb') as fh:
        downloader = MediaIoBaseDownload(fh, request)
        done = False
        while done is False:
            status, done = downloader.next_chunk()
    return dest_path

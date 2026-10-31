import os
import win32com.client

def export_sheet_to_pdf(excel_path, sheet_name, pdf_output_path):
    """
    Abre un archivo de Excel, busca la pestaña con el nombre `sheet_name` (DNI)
    y la exporta a PDF en la ubicación `pdf_output_path` utilizando Excel COM.
    Esto garantiza 100% que se mantiene el diseño de impresión institucional.
    """
    excel_path = os.path.abspath(excel_path)
    pdf_output_path = os.path.abspath(pdf_output_path)
    
    excel = None
    wb = None
    
    try:
        # Inicializa Excel en segundo plano
        excel = win32com.client.Dispatch("Excel.Application")
        excel.Visible = False
        excel.DisplayAlerts = False
        
        # Abre el libro de trabajo
        wb = excel.Workbooks.Open(excel_path, ReadOnly=True)
        
        # Busca la pestaña exacta
        try:
            ws = wb.Sheets(sheet_name)
        except Exception:
            raise ValueError(f"No se encontró la pestaña con el DNI: {sheet_name} en el archivo.")
            
        # Parámetros para la exportación PDF en Excel
        # Type: 0 (xlTypePDF), Filename: path, Quality: 0 (xlQualityStandard)
        ws.ExportAsFixedFormat(0, pdf_output_path, 0, True, False)
        
        return pdf_output_path
        
    except Exception as e:
        raise Exception(f"Error al exportar PDF: {str(e)}")
        
    finally:
        # Limpieza crítica para no dejar procesos EXCEL.EXE colgados ni bloqueos de archivo
        if wb:
            try:
                wb.Close(SaveChanges=False)
            except Exception:
                pass
            del wb
        if excel:
            try:
                excel.Quit()
            except Exception:
                pass
            del excel

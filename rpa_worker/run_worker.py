"""
Script ejecutor del Servicio Continuo del Robot RPA - I.E.P. Augusto Wiese.
Uso directo:
    .\\venv\\Scripts\\python run_worker.py
    .\\venv\\Scripts\\python run_worker.py 30  (para sondeo cada 30 segundos)
"""
import sys
import os

sys.path.append(os.path.abspath(os.path.dirname(__file__)))
from core.rpa_logic import run_continuous_daemon

if __name__ == "__main__":
    interval = 15
    if len(sys.argv) > 1 and sys.argv[1].isdigit():
        interval = int(sys.argv[1])
    run_continuous_daemon(interval=interval)

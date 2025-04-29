# Intranet para Pymes

Este proyecto es una intranet corporativa desarrollada como parte de un Trabajo Fin de Estudios de Ingeniería Informática.
Su objetivo es proporcionar a las pequeñas y medianas empresas (pymes) una solución sencilla, eficiente y modular para la gestión de tareas, noticias, promociones, peticiones y objetivos comerciales.

## Tecnologías utilizadas

- **Backend**: Django + Django REST Framework
- **Frontend**: React + Vite
- **Base de datos**: MySQL
- **Contenerización**: Docker + Docker Compose

## Módulos principales

- **Autenticación y gestión de usuarios**
- **Gestión de tareas** (creación, aprobación, rechazo)
- **Noticias y promociones internas**
- **Calendario corporativo**
- **Seguimiento de KPIs (indicadores clave de rendimiento)**

## Requisitos previos

- Python 3.10+
- Node.js 18+
- MySQL Server
- Docker (opcional, para despliegue más sencillo)

## Instalación y ejecución local

### Backend

```bash
cd backend
python -m venv env
source env/bin/activate  # En Windows: env\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Accede a la aplicación en: `http://localhost:5173`

## Despliegue con Docker

```bash
docker-compose up --build
```

Accede a la aplicación en: `http://localhost`

## Estado del proyecto

✅ Funcionalidad básica completa  
🚀 Preparado para pruebas en entorno real  
📈 Próximas mejoras: optimización del rendimiento, pruebas de carga, mejoras en la UI

## Autor

- Juan Miguel Rojas Moreno

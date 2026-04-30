# Electromanfer — Sistema de Cotizaciones

Sistema web interno para la gestión de cotizaciones de **Electromanfer LTDA**, empresa colombiana de suministros industriales.

## Stack

- **Backend:** FastAPI, SQLAlchemy, Alembic, PostgreSQL
- **Frontend:** React + Vite
- **Infraestructura:** Docker Compose, Nginx, VPS

## Funcionalidades

- Autenticación con JWT y roles (Administrador, Gerencia, Vendedor)
- Gestión de cotizaciones (crear, editar, historial, estados)
- Catálogo de productos sincronizado automáticamente desde SIASOFT
- Gestión de clientes
- Multimedia por producto (imágenes y fichas PDF)
- Generación de PDF en el frontend
- Envío de cotizaciones por email con adjuntos y firma del vendedor
- Dashboard con métricas

## Despliegue

El sistema corre en un VPS con Docker Compose y Nginx, con SSL mediante Certbot.

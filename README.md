# Electromanfer — Sistema de Cotizaciones

![Status](https://img.shields.io/badge/Status-Producci%C3%B3n-green)
![Version](https://img.shields.io/badge/Version-1.0.0-blue)
![License](https://img.shields.io/badge/License-Proprietary-red)

Sistema web interno robusto para la gestión y automatización de procesos comerciales de **Electromanfer LTDA**, empresa colombiana líder en el sector de suministros industriales.

## 📋 Descripción del Proyecto

Este sistema centraliza el flujo de ventas, permitiendo a la fuerza comercial generar propuestas profesionales de manera ágil, integrando datos en tiempo real de inventarios y facilitando la comunicación directa con el cliente.

---

## 🛠️ Stack Tecnológico

### Backend
* **Framework:** [FastAPI](https://fastapi.tiangolo.com/) (Python)
* **ORM:** SQLAlchemy con **Alembic** para migraciones de datos.
* **Base de Datos:** PostgreSQL.
* **Autenticación:** OAuth2 con JWT (JSON Web Tokens).

### Frontend
* **Framework:** React con **Vite** para una experiencia de usuario rápida.
* **Estilos:** CSS / UI Framework.
* **Generación de Documentos:** Librerías para exportación de PDF en cliente.

### Infraestructura y Despliegue
* **Contenerización:** Docker & Docker Compose.
* **Servidor Web:** Nginx como Proxy Inverso.
* **Seguridad:** SSL mediante Certbot (Let's Encrypt).
* **Hosting:** VPS (Virtual Private Server).

---

## ✨ Funcionalidades Clave

### 1. Gestión de Acceso (RBAC)
Control de acceso basado en roles para garantizar la seguridad de la información:
* **Administrador:** Gestión de usuarios, roles y configuración global.
* **Gerencia:** Acceso a métricas estratégicas y reportes de ventas.
* **Vendedor:** Operación diaria, creación y seguimiento de cotizaciones.

### 2. Sincronización con SIASOFT
* Integración automática para la lectura de catálogo de productos, precios y stock desde el ERP **SIASOFT**.
* Soporte multimedia: Visualización de imágenes de productos y fichas técnicas PDF integradas.

### 3. Módulo de Cotizaciones
* **Ciclo de vida:** Gestión de estados (Borrador, Enviada, Aceptada, Rechazada).
* **Automatización de Email:** Envío de propuestas directamente desde la plataforma con adjuntos y firma personalizada del asesor.
* **Dashboard:** Visualización de métricas clave de rendimiento comercial.

---

## 🚀 Instalación y Uso

### Requisitos
* Docker y Docker Compose instalado.

### Despliegue Rápido
1.  Clonar el repositorio:
    ```bash
    git clone https://github.com/tu-usuario/electromanfer-cotizaciones.git
    cd electromanfer-cotizaciones
    ```
2.  Configurar variables de entorno:
    ```bash
    cp .env.example .env
    # Editar .env con las credenciales de DB y API keys
    ```
3.  Levantar el entorno con Docker:
    ```bash
    docker-compose up -d --build
    ```

---

## 🛡️ Documentación de la API

Una vez el backend esté corriendo, puedes acceder a la documentación interactiva en:
* **Swagger UI:** `http://localhost:8000/docs`
* **ReDoc:** `http://localhost:8000/redoc`

---

## 📈 Roadmap / Próximas Mejoras
- [ ] Implementación de recordatorios automáticos de seguimiento.
- [ ] Módulo de análisis predictivo de ventas.
- [ ] App móvil para vendedores en campo.

---
**Desarrollado para Electromanfer LTDA.**

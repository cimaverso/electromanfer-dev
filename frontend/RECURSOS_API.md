# API de Recursos por Producto

Documentación para implementar los endpoints de gestión de imágenes y fichas PDF asociadas a productos.

---

## Modelo de datos

### Tabla: `producto_recursos`

| Campo          | Tipo        | Descripción                                      |
|----------------|-------------|--------------------------------------------------|
| `id`           | SERIAL PK   | ID autoincremental                               |
| `cod_ref`      | VARCHAR FK  | Referencia al producto (`productos.cod_ref`)     |
| `tipo`         | VARCHAR(10) | `'imagen'` o `'pdf'`                             |
| `nombre`       | VARCHAR     | Nombre original del archivo                      |
| `url`          | VARCHAR     | URL pública (local o S3)                         |
| `seleccionada` | BOOLEAN     | Si se incluye en la cotización (default: false)  |
| `orden`        | INTEGER     | Orden de aparición (default: 0)                  |
| `created_at`   | TIMESTAMP   | Fecha de creación (default: NOW())               |

```sql
CREATE TABLE producto_recursos (
  id            SERIAL PRIMARY KEY,
  cod_ref       VARCHAR NOT NULL REFERENCES productos(cod_ref) ON DELETE CASCADE,
  tipo          VARCHAR(10) NOT NULL CHECK (tipo IN ('imagen', 'pdf')),
  nombre        VARCHAR NOT NULL,
  url           VARCHAR NOT NULL,
  seleccionada  BOOLEAN DEFAULT FALSE,
  orden         INTEGER DEFAULT 0,
  created_at    TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_producto_recursos_cod_ref ON producto_recursos(cod_ref, tipo);
```

---

## Endpoints

### GET `/productos/{cod_ref}/recursos`

Retorna todos los recursos de un producto.

**Response 200:**
```json
[
  {
    "id": 1,
    "cod_ref": "REF001",
    "tipo": "imagen",
    "nombre": "foto_producto.jpg",
    "url": "http://localhost:8000/uploads/productos/REF001/imagen/foto_producto.jpg",
    "seleccionada": true,
    "orden": 0
  },
  {
    "id": 2,
    "cod_ref": "REF001",
    "tipo": "pdf",
    "nombre": "ficha_tecnica.pdf",
    "url": "http://localhost:8000/uploads/productos/REF001/pdf/ficha_tecnica.pdf",
    "seleccionada": false,
    "orden": 0
  }
]
```

---

### POST `/productos/{cod_ref}/recursos`

Sube un archivo (imagen o PDF) y crea el registro.

**Body:** `multipart/form-data`

| Campo    | Tipo   | Requerido | Descripción              |
|----------|--------|-----------|--------------------------|
| `archivo`| File   | Sí        | Archivo a subir          |
| `tipo`   | string | Sí        | `'imagen'` o `'pdf'`     |

**Validaciones:**
- Imágenes: `image/jpeg`, `image/png`, `image/webp`, `image/gif` — máx 5MB
- PDFs: `application/pdf` — máx 20MB

**Response 201:**
```json
{
  "id": 3,
  "cod_ref": "REF001",
  "tipo": "imagen",
  "nombre": "nueva_foto.jpg",
  "url": "http://localhost:8000/uploads/productos/REF001/imagen/nueva_foto.jpg",
  "seleccionada": false,
  "orden": 1
}
```

**Implementación FastAPI sugerida:**
```python
import shutil
from pathlib import Path

UPLOAD_DIR = Path("uploads")

@router.post("/productos/{cod_ref}/recursos", status_code=201)
async def subir_recurso(
    cod_ref: str,
    archivo: UploadFile = File(...),
    tipo: str = Form(...),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Validar tipo
    if tipo not in ("imagen", "pdf"):
        raise HTTPException(400, "tipo debe ser 'imagen' o 'pdf'")
    
    # Crear directorio si no existe
    dest_dir = UPLOAD_DIR / "productos" / cod_ref / tipo
    dest_dir.mkdir(parents=True, exist_ok=True)
    
    # Guardar archivo
    dest = dest_dir / archivo.filename
    with dest.open("wb") as f:
        shutil.copyfileobj(archivo.file, f)
    
    # URL pública
    url = f"{settings.BASE_URL}/uploads/productos/{cod_ref}/{tipo}/{archivo.filename}"
    
    # Contar orden actual
    orden = await db.scalar(
        select(func.count()).where(
            ProductoRecurso.cod_ref == cod_ref,
            ProductoRecurso.tipo == tipo
        )
    )
    
    # Crear registro
    recurso = ProductoRecurso(
        cod_ref=cod_ref,
        tipo=tipo,
        nombre=archivo.filename,
        url=url,
        orden=orden
    )
    db.add(recurso)
    await db.commit()
    await db.refresh(recurso)
    return recurso
```

**Servir estáticos en FastAPI:**
```python
from fastapi.staticfiles import StaticFiles
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
```

---

### DELETE `/productos/{cod_ref}/recursos/{id}`

Elimina un recurso (registro en BD y archivo físico).

**Response 200:**
```json
{ "ok": true }
```

---

### PATCH `/productos/{cod_ref}/recursos/{id}/seleccion`

Marca o desmarca un recurso para incluirlo en la cotización.

**Body:**
```json
{ "seleccionada": true }
```

**Regla de negocio:** el frontend ya controla que no pasen de 3 seleccionados por tipo. El backend puede validar también como doble seguro.

**Response 200:**
```json
{ "id": 1, "seleccionada": true }
```

---

## Migración a S3

Cuando se migre de almacenamiento local a S3, solo cambia la lógica de upload en el backend:

```python
import boto3

s3 = boto3.client("s3", region_name=settings.AWS_REGION)

s3.upload_fileobj(
    archivo.file,
    settings.S3_BUCKET,
    f"productos/{cod_ref}/{tipo}/{archivo.filename}",
    ExtraArgs={"ACL": "public-read", "ContentType": archivo.content_type}
)

url = f"https://{settings.S3_BUCKET}.s3.amazonaws.com/productos/{cod_ref}/{tipo}/{archivo.filename}"
```

El campo `url` en la BD pasa a ser la URL de S3. **El frontend no requiere ningún cambio.**

---

## Lógica de selección para el PDF

- Cada producto puede tener N imágenes y N PDFs.
- El usuario selecciona cuáles van a la cotización (máximo 3 de cada tipo).
- Si no hay ninguna seleccionada, el generador de PDF usa las primeras 3 por defecto (orden ASC).
- El frontend ya maneja esta lógica — el backend solo persiste el campo `seleccionada`.
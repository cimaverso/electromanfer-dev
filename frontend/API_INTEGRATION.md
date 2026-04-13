# FIRMAS_API.md — Módulo de Firmas de Correo

## Contexto

Las firmas son imágenes (JPG/PNG) que el asesor selecciona al momento de enviar una cotización por email.
Se almacenan en la carpeta `media/firmas/` del servidor. El frontend las lista, muestra como thumbnails y permite seleccionar cuál se embebe en el correo saliente.

---

## Modelo de datos sugerido

### Tabla: `firmas`

| Campo        | Tipo         | Descripción                                      |
|--------------|--------------|--------------------------------------------------|
| `id`         | int PK       | Identificador único                              |
| `nombre`     | varchar(120) | Nombre descriptivo (ej: "Firma ecológica")       |
| `descripcion`| varchar(255) | Descripción opcional del uso                     |
| `archivo`    | varchar(255) | Nombre del archivo en `media/firmas/`            |
| `url`        | varchar(500) | URL pública de acceso a la imagen                |
| `activa`     | bool         | Si está disponible para selección (default true) |
| `created_at` | datetime     | Fecha de creación                                |

### Pydantic schemas sugeridos

```python
class FirmaCreate(BaseModel):
    nombre: str
    descripcion: Optional[str] = None

class FirmaResponse(BaseModel):
    id: int
    nombre: str
    descripcion: Optional[str] = None
    url: str
    activa: bool
    created_at: datetime

    class Config:
        from_attributes = True
```

---

## Endpoints requeridos

### 1. Listar firmas activas

```
GET /firmas
```

**Response 200:**
```json
[
  {
    "id": 1,
    "nombre": "Harvey Cano - Logo Electromanfer",
    "descripcion": "Firma estándar con logo principal",
    "url": "https://api.electromanfer.com/media/firmas/firma_harvey_principal.jpg",
    "activa": true,
    "created_at": "2026-01-10T10:00:00"
  },
  {
    "id": 2,
    "nombre": "Harvey Cano - Logo Ecológico",
    "descripcion": "Para línea de productos ecológicos",
    "url": "https://api.electromanfer.com/media/firmas/firma_harvey_eco.jpg",
    "activa": true,
    "created_at": "2026-01-10T10:00:00"
  }
]
```

---

### 2. Subir nueva firma

```
POST /firmas
Content-Type: multipart/form-data
```

**Body:**
| Campo        | Tipo   | Requerido |
|--------------|--------|-----------|
| `nombre`     | string | ✅        |
| `descripcion`| string | ❌        |
| `archivo`    | File   | ✅ (jpg/png, max 2MB) |

**Validaciones:**
- Tipos permitidos: `image/jpeg`, `image/png`
- Tamaño máximo: 2MB
- El archivo se guarda en `media/firmas/` con nombre único (UUID o timestamp)
- La URL pública se construye con `settings.MEDIA_URL + archivo`

**Response 201:**
```json
{
  "id": 3,
  "nombre": "Firma nueva",
  "descripcion": null,
  "url": "https://api.electromanfer.com/media/firmas/firma_uuid.jpg",
  "activa": true,
  "created_at": "2026-04-13T12:00:00"
}
```

**Errors:**
- `400` — Tipo de archivo no permitido
- `413` — Archivo demasiado grande

---

### 3. Eliminar firma

```
DELETE /firmas/{id}
```

**Response 200:**
```json
{ "success": true }
```

**Notas:**
- El archivo físico en `media/firmas/` debe eliminarse junto con el registro
- Si la firma está siendo usada en cotizaciones previas, considerar soft delete (`activa = false`) en vez de eliminación física

---

## Uso en el envío de cotizaciones

Al enviar un email, el frontend incluye `firma_base64` en el payload:

```json
{
  "destino": "cliente@empresa.com",
  "asunto": "Cotización COT-2026-0001",
  "cuerpo": "...",
  "firma_base64": "data:image/png;base64,...",
  "pdf_base64": "...",
  "adjuntos_imagenes": [],
  "adjuntos_pdfs": []
}
```

El backend embebe `firma_base64` como imagen inline en el HTML del correo (Content-ID o base64 embebido en `<img src="...">`).

---

## FastAPI — implementación de referencia

```python
import uuid
import os
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from app.db.session import get_db

router = APIRouter(prefix="/firmas", tags=["firmas"])

MEDIA_FIRMAS_PATH = "media/firmas"
ALLOWED_TYPES = {"image/jpeg", "image/png"}
MAX_SIZE_BYTES = 2 * 1024 * 1024  # 2MB

@router.get("/", response_model=list[FirmaResponse])
def listar_firmas(db: Session = Depends(get_db)):
    return db.query(Firma).filter(Firma.activa == True).all()

@router.post("/", response_model=FirmaResponse, status_code=201)
async def subir_firma(
    nombre: str = Form(...),
    descripcion: str = Form(None),
    archivo: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    if archivo.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, "Tipo de archivo no permitido. Use JPG o PNG.")
    
    contenido = await archivo.read()
    if len(contenido) > MAX_SIZE_BYTES:
        raise HTTPException(413, "El archivo supera el límite de 2MB.")
    
    ext = archivo.filename.rsplit(".", 1)[-1]
    nombre_archivo = f"firma_{uuid.uuid4().hex}.{ext}"
    ruta = os.path.join(MEDIA_FIRMAS_PATH, nombre_archivo)
    
    os.makedirs(MEDIA_FIRMAS_PATH, exist_ok=True)
    with open(ruta, "wb") as f:
        f.write(contenido)
    
    firma = Firma(
        nombre=nombre,
        descripcion=descripcion,
        archivo=nombre_archivo,
        url=f"{settings.MEDIA_URL}/firmas/{nombre_archivo}",
        activa=True,
    )
    db.add(firma)
    db.commit()
    db.refresh(firma)
    return firma

@router.delete("/{id}")
def eliminar_firma(id: int, db: Session = Depends(get_db)):
    firma = db.query(Firma).filter(Firma.id == id).first()
    if not firma:
        raise HTTPException(404, "Firma no encontrada.")
    # Soft delete para preservar historial
    firma.activa = False
    db.commit()
    return {"success": True}
```

---

## Notas de migración frontend

En `src/api/firmasApi.js`, cuando el backend esté listo:
1. Descomentar los bloques `REAL`
2. Eliminar los bloques `MOCK` y `mockFirmas`
3. Verificar que las URLs devueltas por el backend sean accesibles (CORS en `/media/`)
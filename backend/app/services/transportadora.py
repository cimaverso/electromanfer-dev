from sqlalchemy.orm import Session
from app.models.transportadora import Transportadora


class TransportadoraService:

    @staticmethod
    def listar(db: Session):
        return (
            db.query(Transportadora)
            .filter(Transportadora.activa.is_(True))
            .order_by(Transportadora.nombre)
            .all()
        )

    @staticmethod
    def crear(db: Session, nombre: str):
        existe = db.query(Transportadora).filter(Transportadora.nombre == nombre).first()
        if existe:
            return None, "Ya existe una transportadora con ese nombre"
        transportadora = Transportadora(nombre=nombre, activa=True)
        db.add(transportadora)
        db.commit()
        db.refresh(transportadora)
        return transportadora, None
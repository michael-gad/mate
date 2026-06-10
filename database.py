from sqlalchemy import (
    create_engine, Column, String, Integer, Float, Text,
    ForeignKey, UniqueConstraint
)
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from sqlalchemy.pool import NullPool
import os

Base = declarative_base()

# ---- מודלים ----

class Cage(Base):
    __tablename__ = 'cages'
    cage_id   = Column(String, primary_key=True)
    cage_name = Column(String)
    cage_type = Column(String)
    open_date = Column(String)
    row       = Column(Integer)
    col       = Column(Integer)

class Mouse(Base):
    __tablename__ = 'mice'
    mouse_id  = Column(String, primary_key=True)
    mark      = Column(String)
    sex       = Column(String)
    dob       = Column(String)
    cage_id   = Column(String, ForeignKey('cages.cage_id'))
    father    = Column(String, default='')
    mother    = Column(String, default='')
    cbz_start = Column(String, default='')

class Archive(Base):
    __tablename__ = 'archive'
    id             = Column(Integer, primary_key=True, autoincrement=True)
    mouse_id       = Column(String)
    mark           = Column(String)
    sex            = Column(String)
    dob            = Column(String)
    cage_id        = Column(String)
    father         = Column(String, default='')
    mother         = Column(String, default='')
    cbz_start      = Column(String, default='')
    sacrifice_date = Column(String)
    reason         = Column(String, default='')

class Weight(Base):
    __tablename__ = 'weights'
    id       = Column(Integer, primary_key=True, autoincrement=True)
    mouse_id = Column(String, ForeignKey('mice.mouse_id'))
    date     = Column(String)
    weight   = Column(Float)

class Litter(Base):
    __tablename__ = 'litters'
    id           = Column(Integer, primary_key=True, autoincrement=True)
    mouse_id     = Column(String, ForeignKey('mice.mouse_id'))
    birth_date   = Column(String)
    pups_count   = Column(Integer, default=0)
    weaning_date = Column(String, default='')

class Experiment(Base):
    __tablename__ = 'experiments'
    id            = Column(Integer, primary_key=True, autoincrement=True)
    female_id     = Column(String, ForeignKey('mice.mouse_id'))
    male_id       = Column(String)
    mating_date   = Column(String)
    sacrifice_date = Column(String)

class PregWeight(Base):
    __tablename__ = 'preg_weights'
    id            = Column(Integer, primary_key=True, autoincrement=True)
    experiment_id = Column(Integer, ForeignKey('experiments.id'))
    female_id     = Column(String)
    date          = Column(String)
    weight        = Column(Float)
    gd_day        = Column(Float, default=0)

# ---- חיבור ל-DB ----

def get_engine():
    db_url = os.environ.get('DATABASE_URL')
    if not db_url:
        raise RuntimeError(
            'DATABASE_URL environment variable is not set.\n'
            'Example: postgresql://user:password@host:5432/dbname'
        )
    # Render ו-Heroku שולחים postgres:// — SQLAlchemy דורש postgresql://
    if db_url.startswith('postgres://'):
        db_url = db_url.replace('postgres://', 'postgresql://', 1)
    return create_engine(db_url, poolclass=NullPool)

engine = get_engine()
SessionLocal = sessionmaker(bind=engine)

def init_db():
    """יוצר את כל הטבלאות אם אינן קיימות — בטוח להרצה חוזרת"""
    Base.metadata.create_all(engine)

def get_session() -> Session:
    return SessionLocal()

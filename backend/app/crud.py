from sqlalchemy.orm import Session
from sqlalchemy import and_
from app import models
from app import schemas
from app.auth import get_password_hash, verify_password
from typing import List, Optional

# User operations


def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()


def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = get_password_hash(user.password)
    db_user = models.User(email=user.email, hashed_password=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def authenticate_user(db: Session, email: str, password: str):
    user = get_user_by_email(db, email)
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user

# Project operations


def get_user_projects(db: Session, user_id: int):
    return db.query(models.Project).filter(models.Project.user_id == user_id).all()


def get_project(db: Session, project_id: int, user_id: int):
    return db.query(models.Project).filter(
        and_(models.Project.id == project_id,
             models.Project.user_id == user_id)
    ).first()


def create_project(db: Session, project: schemas.ProjectCreate, user_id: int):
    db_project = models.Project(
        title=project.title,
        document_type=project.document_type,
        topic=project.topic,
        user_id=user_id
    )
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project


def create_project_sections(db: Session, project_id: int, sections: List[str]):
    db_sections = []
    for i, title in enumerate(sections):
        db_section = models.ContentSection(
            project_id=project_id,
            title=title,
            content="",
            order_index=i
        )
        db.add(db_section)
        db_sections.append(db_section)
    db.commit()
    for section in db_sections:
        db.refresh(section)
    return db_sections


def get_project_sections(db: Session, project_id: int):
    return db.query(models.ContentSection).filter(
        models.ContentSection.project_id == project_id
    ).order_by(models.ContentSection.order_index).all()


def update_section_content(db: Session, section_id: int, content: str):
    db_section = db.query(models.ContentSection).filter(
        models.ContentSection.id == section_id).first()
    if db_section:
        db_section.content = content
        db.commit()
        db.refresh(db_section)
    return db_section


def create_refinement_history(db: Session, section_id: int, old_content: str, new_content: str, user_prompt: str):
    db_refinement = models.RefinementHistory(
        content_section_id=section_id,
        old_content=old_content,
        new_content=new_content,
        user_prompt=user_prompt
    )
    db.add(db_refinement)
    db.commit()
    db.refresh(db_refinement)
    return db_refinement

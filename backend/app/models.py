from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from .database import Base


class DocumentType(enum.Enum):
    docx = "docx"
    pptx = "pptx"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    projects = relationship("Project", back_populates="owner")


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    document_type = Column(SQLEnum(DocumentType), nullable=False)
    topic = Column(String, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True),
                        server_default=func.now(), onupdate=func.now())

    owner = relationship("User", back_populates="projects")
    sections = relationship(
        "ContentSection", back_populates="project", cascade="all, delete-orphan")
    exports = relationship(
        "ExportHistory", back_populates="project", cascade="all, delete-orphan"
    )


class ContentSection(Base):
    __tablename__ = "content_sections"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    title = Column(String, nullable=False)
    content = Column(Text, default="")
    order_index = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True),
                        server_default=func.now(), onupdate=func.now())

    project = relationship("Project", back_populates="sections")
    refinements = relationship(
        "RefinementHistory", back_populates="section", cascade="all, delete-orphan")


class RefinementHistory(Base):
    __tablename__ = "refinement_history"

    id = Column(Integer, primary_key=True, index=True)
    content_section_id = Column(Integer, ForeignKey(
        "content_sections.id"), nullable=False)
    old_content = Column(Text)
    new_content = Column(Text)
    user_prompt = Column(Text)
    user_feedback = Column(String)
    user_comment = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    section = relationship("ContentSection", back_populates="refinements")


class ExportHistory(Base):
    __tablename__ = "export_history"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    file_type = Column(String, nullable=False)  # "docx" or "pptx"
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    project = relationship("Project", back_populates="exports")

from app.utils.export_pptx import export_to_pptx
from app.utils.export_docx import export_to_docx
from app.llm import get_gemini_client
import app.auth as auth
from app import schemas
from app.database import get_db, Base, engine
from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List
import logging
from datetime import datetime
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.encoders import jsonable_encoder


from app import models  # ensure models are imported for table creation
from app.models import (
    User,
    Project,
    ContentSection,
    RefinementHistory,
    ExportHistory,
    DocumentType as ModelDocumentType,
)

import random
import io

print("✅ MAIN.PY STARTED (DB-backed)")
Base.metadata.create_all(bind=engine)

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="AI Document Authoring Platform", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:3000",
        "http://localhost:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"Incoming request: {request.method} {request.url}")
    try:
        response = await call_next(request)
    except Exception:
        logger.exception("Unhandled error in request")
        raise
    logger.info(f"Response status: {response.status_code}")
    return response


security = HTTPBearer()


# ---------------- Helper functions ----------------

def to_model_document_type(value) -> ModelDocumentType:
    """Convert schema.DocumentType/str -> models.DocumentType enum."""
    if isinstance(value, ModelDocumentType):
        return value
    if hasattr(value, "value"):
        value = value.value
    # value is "docx" or "pptx"
    return ModelDocumentType(value)


def project_to_dict(project: Project, include_sections: bool = False):
    """Convert Project SQLAlchemy object to dict matching your schemas."""
    doc_type = project.document_type
    doc_type_str = doc_type.value if hasattr(
        doc_type, "value") else str(doc_type)

    data = {
        "id": project.id,
        "title": project.title,
        "document_type": doc_type_str,
        "topic": project.topic,
        "user_id": project.user_id,
        "created_at": project.created_at,
        "updated_at": project.updated_at,
    }

    if include_sections:
        sections = sorted(project.sections, key=lambda s: s.order_index)
        data["sections"] = [
            {
                "id": s.id,
                "title": s.title,
                "content": s.content or "",
                "project_id": s.project_id,
                "order_index": s.order_index,
                "created_at": s.created_at,
                "updated_at": s.updated_at,
            }
            for s in sections
        ]

    return data


# ---------------- Auth helpers ----------------

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    """Decode JWT, fetch user from DB, return User object."""
    token = credentials.credentials
    print(f"🔐 get_current_user called with token: {token[:50]}...")

    user_id = auth.verify_token(token)  # should return sub (user id)
    if user_id is None:
        print("❌ get_current_user: Token verification failed")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # cast to int if needed
    try:
        user_id = int(user_id)
    except Exception:
        pass

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        print(f"❌ get_current_user: user {user_id} not found in DB")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    print(f"✅ get_current_user: Token valid for user {user_id}")
    return user


# ---------------- Auth ----------------

@app.post("/auth/register", response_model=schemas.UserResponse)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    logger.info(f"Registration attempt for email: {user.email}")

    # Check if user already exists
    existing = db.query(User).filter(User.email == user.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # ✅ Simple password storage (no bcrypt / passlib here)
    hashed_password = user.password[:72]

    db_user = User(
        email=user.email,
        hashed_password=hashed_password,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    print("✅ User registered:", db_user.email)

    return db_user


@app.post("/auth/login")
def login(user: schemas.UserCreate, db: Session = Depends(get_db)):
    logger.info(f"Login attempt for email: {user.email}")

    db_user = db.query(User).filter(User.email == user.email).first()
    if not db_user:
        raise HTTPException(
            status_code=400, detail="Invalid email or password")

    # ✅ Simple check: plain / truncated password
    if user.password[:72] != (db_user.hashed_password or "")[:72]:
        raise HTTPException(
            status_code=400, detail="Invalid email or password")

    access_token = auth.create_access_token(data={"sub": str(db_user.id)})
    response_data = {
        "access_token": access_token,
        "token_type": "bearer",
    }

    logger.info(f"Login successful for email: {user.email}")
    print(f">>> Returning token: {access_token[:50]}...")
    print(f">>> Full response: {response_data}")

    return JSONResponse(content=response_data)


@app.post("/auth/test-simple")
def test_simple_login():
    print(">>> REACHED TEST SIMPLE ENDPOINT")
    return JSONResponse(
        content={
            "access_token": "test_token_12345",
            "token_type": "bearer",
        }
    )


@app.post("/auth/debug-login")
def debug_login(user: schemas.UserCreate, db: Session = Depends(get_db)):
    print(">>> REACHED DEBUG LOGIN ENDPOINT")

    # create_or_get simple user for debug
    db_user = db.query(User).filter(User.email == user.email).first()
    if not db_user:
        db_user = User(email=user.email, hashed_password=user.password)
        db.add(db_user)
        db.commit()
        db.refresh(db_user)

    access_token = auth.create_access_token(data={"sub": str(db_user.id)})

    debug_info = {
        "access_token": access_token,
        "token_type": "bearer",
        "token_length": len(access_token),
        "token_preview": access_token[:50] + "..."
        if len(access_token) > 50
        else access_token,
    }

    print(f">>> Debug login response: {debug_info}")
    return JSONResponse(content=debug_info)


# ---------------- Projects ----------------

@app.get("/projects", response_model=List[schemas.ProjectResponse])
def get_projects(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Get all projects for current user"""
    print(f"📂 Getting projects for user {current_user.id}")

    projects = (
        db.query(Project)
        .filter(Project.user_id == current_user.id)
        .order_by(Project.created_at.desc())
        .all()
    )

    result = [project_to_dict(p, include_sections=False) for p in projects]
    print(f"📂 Found {len(result)} projects for user {current_user.id}")
    return result


@app.get("/projects/{project_id}", response_model=schemas.ProjectWithSections)
def get_project(
    project_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a specific project with its sections"""
    print(f"📂 Getting project {project_id} for user {current_user.id}")

    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        print(f"❌ Project {project_id} not found")
        raise HTTPException(status_code=404, detail="Project not found")

    if project.user_id != current_user.id:
        print(
            f"❌ User {current_user.id} not authorized for project {project_id}")
        raise HTTPException(status_code=403, detail="Not authorized")

    project_dict = project_to_dict(project, include_sections=True)
    print(
        f"✅ Returning project {project_id} with {len(project_dict.get('sections', []))} sections"
    )
    return project_dict


@app.post("/projects", response_model=schemas.ProjectResponse)
def create_project(
    project: schemas.ProjectCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new project with sections"""
    print(
        f"📝 Creating project: {project.title}, type: {project.document_type}, topic: {project.topic}"
    )
    print(f"📝 Sections to create: {project.sections}")

    doc_type_enum = to_model_document_type(project.document_type)

    new_project = Project(
        title=project.title,
        topic=project.topic,
        document_type=doc_type_enum,
        user_id=current_user.id,
    )
    db.add(new_project)
    db.commit()
    db.refresh(new_project)

    # Create sections
    if project.sections:
        for i, section_title in enumerate(project.sections):
            section = ContentSection(
                project_id=new_project.id,
                title=section_title,
                content="",
                order_index=i,
            )
            db.add(section)
        db.commit()
        db.refresh(new_project)

    project_dict = project_to_dict(new_project, include_sections=True)
    print(
        f"✅ Project created with ID: {new_project.id} and {len(project_dict.get('sections', []))} sections"
    )
    return project_dict


@app.post("/projects/{project_id}/sections")
def set_project_sections(
    project_id: int,
    data: schemas.ProjectSectionsUpdate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Replace sections for an existing project"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if project.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # delete old sections
    db.query(ContentSection).filter(
        ContentSection.project_id == project_id).delete()

    # insert new ones
    new_sections = []
    for i, title in enumerate(data.sections):
        section = ContentSection(
            project_id=project_id,
            title=title,
            content="",
            order_index=i,
        )
        db.add(section)
        db.flush()  # get id without full commit
        new_sections.append(
            {
                "id": section.id,
                "title": section.title,
                "content": section.content or "",
                "project_id": section.project_id,
                "order_index": section.order_index,
                "created_at": section.created_at,
                "updated_at": section.updated_at,
            }
        )

    project.updated_at = datetime.now()
    db.commit()

    print(f"✅ Updated project {project_id} with {len(new_sections)} sections")
    return new_sections


# ---------------- AI: Generate & Outline ----------------

@app.post("/projects/{project_id}/generate")
def generate_project_content(
    project_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate content for all sections in a project using Gemini"""
    print(f"🤖 Generating content for project {project_id}")

    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if project.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    sections = (
        db.query(ContentSection)
        .filter(ContentSection.project_id == project_id)
        .order_by(ContentSection.order_index)
        .all()
    )

    if not sections:
        print(f"⚠️ No sections found for project {project_id}")
        return JSONResponse(
            content={
                "message": "No sections to generate content for",
                "sections_updated": 0,
            }
        )

    doc_type = project.document_type
    doc_type_str = doc_type.value if hasattr(
        doc_type, "value") else str(doc_type)
    topic = project.topic
    sections_updated = 0

    for section in sections:
        title = section.title
        print(f"🤖 Calling Gemini for section: {title}")

        try:
            client = get_gemini_client()
            ai_content = client.generate_section_content(
                topic=topic,
                section_title=title,
                document_type=doc_type_str,
            )
        except Exception as e:
            print(f"❌ Gemini error for section '{title}': {e}")
            ai_content = f"(Error generating AI content: {e})"

        section.content = ai_content
        section.updated_at = datetime.now()
        sections_updated += 1

    project.updated_at = datetime.now()
    db.commit()

    print(f"✅ Generated content for {sections_updated} sections with Gemini")
    return JSONResponse(
        content={
            "message": f"Content generated for {sections_updated} sections",
            "sections_updated": sections_updated,
        }
    )


@app.post("/projects/{project_id}/suggest-outline")
def suggest_outline(
    project_id: int,
    request: schemas.OutlineSuggestionRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """AI suggests an outline based on topic and document type using Gemini"""
    print(
        f"🤖 Suggesting outline for: {request.topic}, type: {request.document_type}"
    )

    # Optional: if project_id != 0, you can validate ownership
    if project_id != 0:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        if project.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")

    doc_type_str = (
        request.document_type.value
        if hasattr(request.document_type, "value")
        else str(request.document_type)
    )

    try:
        client = get_gemini_client()
        outline = client.generate_outline(
            topic=request.topic,
            document_type=doc_type_str,
        )
    except Exception as e:
        print(f"❌ Gemini outline error: {e}")
        if doc_type_str == "docx":
            outline = [
                "Introduction",
                "Background and Context",
                "Market Analysis",
                "Key Findings",
                "Recommendations",
                "Conclusion",
            ]
        else:
            outline = [
                "Title Slide",
                "Agenda",
                "Problem Statement",
                "Market Overview",
                "Key Insights",
                "Solution Proposal",
                "Next Steps",
                "Q&A",
            ]

    print(f"✅ Suggested outline with {len(outline)} items")
    return JSONResponse(content={"outline": outline})


# ---------------- Refinement + History / Feedback / Comments ----------------

@app.post("/sections/{section_id}/refine", response_model=schemas.RefinementResponse)
def refine_section(
    section_id: int,
    refinement: schemas.RefinementRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Refine a specific section with Gemini and store refinement history"""
    print(f"🔧 Refining section {section_id} with prompt: {refinement.prompt}")

    section = db.query(ContentSection).filter(
        ContentSection.id == section_id).first()
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    project = section.project
    if project.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    old_content = section.content or ""

    try:
        client = get_gemini_client()
        new_content = client.refine_content(
            current_content=old_content,
            user_prompt=refinement.prompt,
        )
    except Exception as e:
        print(f"❌ Gemini refine error: {e}")
        new_content = f"(Error refining content: {e})\n\n{old_content}"

    section.content = new_content
    section.updated_at = datetime.now()
    project.updated_at = datetime.now()

    history = RefinementHistory(
        content_section_id=section_id,
        old_content=old_content,
        new_content=new_content,
        user_prompt=refinement.prompt,
    )
    db.add(history)
    db.commit()
    db.refresh(history)

    print(f"✅ Section {section_id} refined successfully with Gemini")

    # Build response dict matching schemas.RefinementResponse
    return {
        "id": history.id,
        "content_section_id": history.content_section_id,
        "old_content": history.old_content,
        "new_content": history.new_content,
        "user_prompt": history.user_prompt,
        "created_at": history.created_at,
    }


@app.get("/sections/{section_id}/history")
def get_section_history(
    section_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get refinement history, feedback, and comments for a section"""
    section = db.query(ContentSection).filter(
        ContentSection.id == section_id).first()
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    project = section.project
    if project.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    histories = (
        db.query(RefinementHistory)
        .filter(RefinementHistory.content_section_id == section_id)
        .order_by(RefinementHistory.created_at.desc())
        .all()
    )

    refinements = []
    feedback = []
    comments = []

    for h in histories:
        refinements.append(
            {
                "id": h.id,
                "content_section_id": h.content_section_id,
                "old_content": h.old_content,
                "new_content": h.new_content,
                "user_prompt": h.user_prompt,
                "created_at": h.created_at,
            }
        )
        if h.user_feedback:
            feedback.append(
                {
                    "id": h.id,
                    "section_id": h.content_section_id,
                    "type": h.user_feedback,
                    "created_at": h.created_at,
                }
            )
        if h.user_comment:
            comments.append(
                {
                    "id": h.id,
                    "section_id": h.content_section_id,
                    "text": h.user_comment,
                    "created_at": h.created_at,
                }
            )

    history = {
        "refinements": refinements,
        "feedback": feedback,
        "comments": comments,
    }
    return JSONResponse(content=jsonable_encoder(history))


@app.post("/sections/{section_id}/feedback")
def add_section_feedback(
    section_id: int,
    feedback: schemas.FeedbackRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Record like/dislike for a section (stored in RefinementHistory.user_feedback)"""
    section = db.query(ContentSection).filter(
        ContentSection.id == section_id).first()
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    project = section.project
    if project.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # attach feedback to latest refinement; if none, create a bare history row
    history = (
        db.query(RefinementHistory)
        .filter(RefinementHistory.content_section_id == section_id)
        .order_by(RefinementHistory.created_at.desc())
        .first()
    )

    if not history:
        history = RefinementHistory(
            content_section_id=section_id,
            old_content=section.content,
            new_content=section.content,
            user_prompt="(feedback only)",
        )
        db.add(history)
        db.flush()

    history.user_feedback = feedback.type.value
    db.commit()
    db.refresh(history)

    entry = {
        "id": history.id,
        "section_id": section_id,
        "type": feedback.type.value,
        "created_at": history.created_at,
    }

    print(f"✅ Feedback recorded for section {section_id}: {feedback.type}")
    return JSONResponse(content=entry)


@app.post("/sections/{section_id}/comments")
def add_section_comment(
    section_id: int,
    comment: schemas.CommentRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add a user comment to a section (stored in RefinementHistory.user_comment)"""
    section = db.query(ContentSection).filter(
        ContentSection.id == section_id).first()
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    project = section.project
    if project.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    history = (
        db.query(RefinementHistory)
        .filter(RefinementHistory.content_section_id == section_id)
        .order_by(RefinementHistory.created_at.desc())
        .first()
    )

    if not history:
        history = RefinementHistory(
            content_section_id=section_id,
            old_content=section.content,
            new_content=section.content,
            user_prompt="(comment only)",
        )
        db.add(history)
        db.flush()

    history.user_comment = comment.text
    db.commit()
    db.refresh(history)

    entry = {
        "id": history.id,
        "section_id": section_id,
        "text": comment.text,
        "created_at": history.created_at,
    }

    print(f"✅ Comment added for section {section_id}")
    return JSONResponse(content=entry)


# ---------------- Export ----------------

@app.get("/projects/{project_id}/export")
def export_project(
    project_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Export project as .docx or .pptx using latest refined content"""
    print(f"📤 Exporting project {project_id}")

    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if project.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    sections = (
        db.query(ContentSection)
        .filter(ContentSection.project_id == project_id)
        .order_by(ContentSection.order_index)
        .all()
    )

    title = project.title
    section_objs = [
        {"title": s.title, "content": s.content or ""} for s in sections
    ]

    doc_type = project.document_type
    doc_type_str = doc_type.value if hasattr(
        doc_type, "value") else str(doc_type)

    # ✅ Save export history to DB
    try:
        history = ExportHistory(
            project_id=project_id,
            file_type=doc_type_str,
        )
        db.add(history)
        db.commit()
        print(f"🧾 Export history saved for project {project_id}")
    except Exception as e:
        db.rollback()
        print(f"⚠️ Failed to save export history: {e}")

    if doc_type_str == "docx":
        file_bytes = export_to_docx(title, section_objs)
        filename = f"{title}.docx"
        media_type = (
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )
    else:
        file_bytes = export_to_pptx(title, section_objs)
        filename = f"{title}.pptx"
        media_type = (
            "application/vnd.openxmlformats-officedocument.presentationml.presentation"
        )

    print(f"✅ Export ready for project {project_id}: {filename}")

    return StreamingResponse(
        io.BytesIO(file_bytes),
        media_type=media_type,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        },
    )


# ---------------- Debug ----------------

@app.get("/debug/projects-store")
def debug_projects_store(db: Session = Depends(get_db)):
    total_projects = db.query(Project).count()
    total_sections = db.query(ContentSection).count()
    total_refinements = db.query(RefinementHistory).count()
    total_exports = db.query(ExportHistory).count()

    return {
        "total_projects": total_projects,
        "total_sections": total_sections,
        "total_refinements": total_refinements,
        "total_exports": total_exports,
    }


@app.get("/debug/auth")
def debug_auth():
    import app.auth as auth_mod

    return {
        "SECRET_KEY": auth_mod.SECRET_KEY[:20] + "..." if auth_mod.SECRET_KEY else None,
        "ALGORITHM": auth_mod.ALGORITHM,
        "SECRET_KEY_LENGTH": len(auth_mod.SECRET_KEY) if auth_mod.SECRET_KEY else 0,
        "SECRET_KEY_SET": bool(auth_mod.SECRET_KEY),
    }


@app.get("/debug/test-token")
def debug_test_token():
    test_token = auth.create_access_token(data={"sub": "1"})
    user_id = auth.verify_token(test_token)

    return {
        "token_created": test_token,
        "token_verified_user_id": user_id,
        "success": user_id is not None,
    }


@app.get("/")
def read_root():
    return {"message": "AI Document Authoring Platform API (DB-backed)"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)

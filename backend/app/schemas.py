from pydantic import BaseModel, EmailStr, ConfigDict
from typing import List, Optional
from datetime import datetime
from enum import Enum


class DocumentType(str, Enum):
    docx = "docx"
    pptx = "pptx"


class UserBase(BaseModel):
    email: EmailStr


class UserCreate(UserBase):
    password: str


class UserResponse(UserBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    user_id: Optional[int] = None


class ProjectBase(BaseModel):
    title: str
    document_type: DocumentType
    topic: str


class ProjectCreate(BaseModel):
    title: str
    topic: str
    document_type: DocumentType | str
    sections: Optional[List[str]] = None


class ProjectResponse(ProjectBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProjectSectionsUpdate(BaseModel):
    sections: List[str]


class SectionBase(BaseModel):
    title: str
    content: str
    order_index: int


class SectionCreate(SectionBase):
    pass


class SectionResponse(SectionBase):
    id: int
    project_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RefinementRequest(BaseModel):
    prompt: str


class RefinementResponse(BaseModel):
    id: int
    content_section_id: int
    old_content: Optional[str]
    new_content: str
    user_prompt: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProjectWithSections(ProjectResponse):
    sections: List[SectionResponse] = []


class OutlineSuggestionRequest(BaseModel):
    topic: str
    document_type: DocumentType


class FeedbackType(str, Enum):
    like = "like"
    dislike = "dislike"


class FeedbackRequest(BaseModel):
    type: FeedbackType


class CommentRequest(BaseModel):
    text: str

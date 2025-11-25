# 📄 AI Document Authoring & Content Generation Platform

## 📌 Overview

This is a full-stack AI-powered application that allows users to automatically generate both **Word documents (.docx)** and **PowerPoint presentations (.pptx)** using an AI model (**Google Gemini**).

### Users can:

* Create an account and log in
* Create projects based on a topic
* Automatically generate content section-by-section
* Refine the content using custom AI prompts
* Give feedback and comments on generated content
* Export the final document or presentation in required format

All data is stored in a relational database (**SQLite + SQLAlchemy**) to ensure persistence, history tracking, and version control.

---

## 🚀 Features

### ✅ User Authentication

* Register and login using JWT-based authentication
* Tokens are stored in the browser and used for API requests

### ✅ Project Management

* Create multiple projects per user
* Select document type: **.docx** or **.pptx**
* Provide topic and custom section outline

### ✅ AI Content Generation

Each section is generated using **Google Gemini AI**
Content is created based on:

* Topic
* Section title
* Document type

### ✅ Content Refinement

Users can enter custom prompts to refine AI generated content.
Every refinement is stored in the database with:

* Id
* Content_section_id
* Old content
* New content
* User prompt
* Created at (Timestamp)

### ✅ Feedback & Comments

Each section supports:

* Like / Dislike feedback
* Text comments

All feedback is persisted in the database.

### ✅ Exporting

Final results can be exported as:

* `.docx` documents
* `.pptx` presentations

Every export is saved in the `export_history` table.

### ✅ Data Persistence

All data is stored in SQLite via SQLAlchemy:

* Users
* Projects
* Content Sections
* Refinement History (includes feedback and comments)
* Export history

This ensures no data is lost when the server is restarted.

---

## 🏗 System Architecture

```
Frontend (HTML/CSS/JS)
        ↓
    FastAPI Backend
        ↓
Google Gemini AI + SQLite Database
```

---

## 📁 Project Structure

```
AI_DOCUMENT-AUTHORING_REFINED_VERSION/
│
├── backend/
│   │
│   ├── app/
│   │   ├── __init__.py
│   │   ├── auth.py                # JWT authentication logic
│   │   ├── crud.py                # Database CRUD operations
│   │   ├── database.py            # SQLAlchemy DB connection
│   │   ├── llm.py                 # Google Gemini AI integration
│   │   ├── main.py                # FastAPI application & API routes
│   │   ├── models.py              # ORM database models
│   │   ├── schemas.py             # Pydantic request/response schemas
│   │   │
│   │   └── utils/
│   │       ├── __init__.py
│   │       ├── export_docx.py     # Word export logic
│   │       └── export_pptx.py     # PowerPoint export logic
│   │
│   ├── data/
│   │   └── ai_docs.db             # SQLite database file
│   │
│   ├── init_db.py                 # DB initialization
│   ├── test_server.py             # Used for server testing
│   ├── sanity_test.py             # Optional testing script
│   ├── setup.py                   # Setup / packaging
│   ├── requirements.txt           # Backend dependencies
│   └── .env                       # Environment variables
│
├── frontend/
│   │
│   ├── assets/
│   │   └── (icons/images etc.)
│   │
│   ├── css/
│   │   └── style.css              # All UI styles
│   │
│   ├── js/
│   │   ├── api.js                 # API request handler
│   │   ├── auth.js                # Login & Register logic
│   │   ├── dashboard.js           # Project dashboard logic
│   │   ├── project-editor.js      # Editor + refinement logic
│   │   └── project-wizard.js      # Project creation wizard
│   │
│   ├── index.html                 # Entry page
│   ├── login.html                 # Login UI
│   ├── register.html              # Register UI
│   ├── dashboard.html             # Projects page
│   ├── project-wizard.html        # Create project UI
│   ├── project-editor.html        # Main editor UI
│   └── README.md                  # Frontend instructions
│
├── jwt-generation_code.py         # Token generation helper
├── .env                           # Global env
└── README.md                      # Main project documentation
```

---

## ⚙️ Technologies Used

| Layer           | Technologies             |
| --------------- | ------------------------ |
| Frontend        | HTML, CSS, JavaScript    |
| Backend         | FastAPI (Python)         |
| AI Model        | Google Gemini            |
| Database        | SQLite + SQLAlchemy      |
| Auth            | JWT                      |
| Document Export | python-docx, python-pptx |

---

## 🖥 How to Run the Project

### 1️⃣ Backend Setup

```bash
cd backend
python -m venv venv

venv\Scripts\activate       # Windows
# source venv/bin/activate  # Mac/Linux

pip install -r requirements.txt

uvicorn app.main:app --reload
```

Backend will run at:
👉 `http://127.0.0.1:8000`

Swagger Docs:
👉 `http://127.0.0.1:8000/docs`

---

### 2️⃣ Frontend Setup

Open in browser (Live Server recommended):

```
frontend/login.html
```

---

## 🔌 Environment Variables

Create a `.env` file in `backend/`:

```
DATABASE_URL=sqlite:///./app.db
GEMINI_API_KEY=your_api_key_here
JWT_SECRET_KEY=your_secret_key_here
```

---

## 📽 How To Use The System

1. Register a new user
2. Login with credentials
3. Create a new project
4. Add topic and sections
5. Generate AI content
6. Refine content per section
7. Add feedback/comments
8. Export as Word/PPT

---

## 🏆 What Makes This Project Unique

✔ Uses real database instead of in-memory variables
✔ Tracks AI content versions like Git for AI text
✔ Stores every prompt and refinement
✔ Fully modular architecture
✔ Ready for real-world extension

---

## 👩‍💻 Author

**Name:** Pravallika Chekuri
**Domain:** AI, Backend Development, Automation
**Technologies:** Python, FastAPI, AI / ML, SQLite

---

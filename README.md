📄 AI Document Authoring & Content Generation Platform
📌 Overview

This is a full-stack AI-powered application that allows users to automatically generate both Word documents (.docx) and PowerPoint presentations (.pptx) using an AI model (Google Gemini).

Users can:

Create an account and log in

Create projects based on a topic

Automatically generate content section-by-section

Refine the content using custom AI prompts

Give feedback and comments on generated content

Export the final document or presentation in required format

All data is stored in a relational database (SQLite + SQLAlchemy) to ensure persistence, history tracking, and version control.

🚀 Features
✅ User Authentication

Register and login using JWT-based authentication.

Tokens are stored in the browser and used for API requests.

✅ Project Management

Create multiple projects per user

Select document type: .docx or .pptx

Provide topic and custom section outline

✅ AI Content Generation

Each section is generated using Google Gemini AI

Content is created based on:

Topic

Section title

Document type

✅ Content Refinement

Users can enter custom prompts to refine AI generated content

Every refinement is stored in the database with:

Old content

New content

User prompt

Timestamp

✅ Feedback & Comments

Each section supports:

Like / Dislike feedback

Text comments

All feedback is persisted in the database

✅ Exporting

Export final results as:

.docx documents

.pptx presentations

Every export is saved in export_history table

✅ Data Persistence

All data is stored in SQLite via SQLAlchemy:

Users

Projects

Section content

Refinements

Feedback

Export history

This ensures no data is lost when the server is restarted.

🏗 System Architecture
Frontend (HTML/CSS/JS)
        ↓
    FastAPI Backend
        ↓
Google Gemini AI + SQLite Database


Backend structure:

app/
├── auth.py
├── database.py
├── models.py
├── schemas.py
├── llm.py
├── main.py
├── utils/
│   ├── export_docx.py
│   └── export_pptx.py


Frontend structure:

frontend/
├── login.html
├── register.html
├── dashboard.html
├── editor.html
├── js/
│   ├── api.js
│   ├── auth.js
│   └── dashboard.js

⚙️ Technologies Used
Layer	Technologies
Frontend	HTML, CSS, JavaScript
Backend	FastAPI (Python)
AI Model	Google Gemini
Database	SQLite + SQLAlchemy
Auth	JWT
Document Export	python-docx, python-pptx
🖥 How to Run the Project
1️⃣ Backend Setup
cd backend
python -m venv venv
venv\Scripts\activate          # (Windows)
# source venv/bin/activate     # (Mac/Linux)

pip install -r requirements.txt

uvicorn app.main:app --reload


Backend runs at:

http://127.0.0.1:8000


Swagger docs:

http://127.0.0.1:8000/docs

2️⃣ Frontend Setup

Open in browser (Live Server recommended):

frontend/login.html

🔌 Environment Variables

Create a .env file in backend:

GEMINI_API_KEY=your_api_key_here
SECRET_KEY=your_secret_key_here

📽 How To Use The System

Register a new user

Login with credentials

Create a new project

Add topic and sections

Generate AI content

Refine content per section

Add feedback/comments

Export as Word/PPT

🏆 What Makes This Project Unique

✔ Uses real database instead of in-memory variables
✔ Tracks AI content versions like Git for AI text
✔ Stores every prompt and refinement
✔ Fully modular architecture
✔ Ready for real-world extension

👩‍💻 Author

Name: [Your Name]
Domain: AI, Backend Development, Automation
Technologies: Python, FastAPI, AI / ML, SQL, Cloud
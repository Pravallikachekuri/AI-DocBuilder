# AI Document Authoring Platform

A full-stack web application for generating and refining business documents using AI. Users can create Word documents and PowerPoint presentations with AI-powered content generation and refinement.

## Features

- **User Authentication** - Secure JWT-based registration and login
- **Project Management** - Create and manage document projects
- **AI Content Generation** - Generate content using Google Gemini AI
- **Interactive Refinement** - Refine content with AI-powered editing
- **Document Export** - Export to .docx and .pptx formats
- **AI Template Suggestions** - AI-generated outlines and structures

## Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **SQLite** - Lightweight database
- **SQLAlchemy** - Database ORM
- **Google Gemini AI** - Content generation
- **Python-docx** - Word document generation
- **Python-pptx** - PowerPoint presentation generation

### Frontend
- **Vanilla HTML/CSS/JavaScript** - No frameworks, pure web standards
- **Modern CSS** - CSS Grid, Flexbox, CSS Variables
- **Fetch API** - Modern HTTP client

## Quick Start

### Prerequisites
- Python 3.8+
- Google Gemini API key

### Backend Setup

1. **Navigate to backend directory:**
```bash
cd backend
```

2. **Create virtual environment and install dependencies:**
```bash
python -m venv venv

# On Windows:
venv\Scripts\activate

# On Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
```

3. **Set environment variables:**
Create a `.env` file in the backend directory:
```env
DATABASE_URL=sqlite:///./app.db
GEMINI_API_KEY=your_actual_gemini_api_key_here
JWT_SECRET_KEY=your_super_secret_jwt_key_64_characters_long
JWT_ALGORITHM=HS256
```

4. **Initialize database:**
```bash
python init_db.py
```

5. **Start the backend server:**
```bash
uvicorn app.main:app --reload
```

Backend will be available at `http://localhost:8000`  
API documentation at `http://localhost:8000/docs`

### Frontend Setup

1. **Navigate to frontend directory:**
```bash
cd frontend
```

2. **Serve the frontend using any HTTP server:**

**Using Python:**
```bash
python -m http.server 3000
```

**Using Node.js (if you have it installed):**
```bash
npx serve .
```

**Using PHP:**
```bash
php -S localhost:3000
```

3. **Open your browser:**
```
http://localhost:3000
```

## Getting Your Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account
3. Click "Get API key" in the left sidebar
4. Create a new API key and copy it
5. Replace `your_actual_gemini_api_key_here` in the `.env` file with your actual key

## Generating JWT Secret Key

Run this command to generate a secure JWT secret:
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

Copy the output and use it as your `JWT_SECRET_KEY` in the `.env` file.

## API Endpoints

- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `GET /projects` - List user projects
- `POST /projects` - Create new project
- `GET /projects/{id}` - Get project details
- `POST /projects/{id}/generate` - Generate content
- `POST /sections/{id}/refine` - Refine section content
- `GET /projects/{id}/export` - Export document
- `POST /projects/{id}/suggest-outline` - AI-generated outline suggestions

## Usage Demo

1. **Register/Login** - Create an account or sign in
2. **Create Project** - Choose document type (Word/PowerPoint) and topic
3. **Define Structure** - Add sections manually or use AI suggestions
4. **Generate Content** - AI creates content for all sections
5. **Refine Content** - Use AI to improve specific sections with prompts
6. **Export Document** - Download as .docx or .pptx file

## Project Structure

```
ai-doc-platform/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI application
│   │   ├── models.py        # SQLAlchemy models
│   │   ├── schemas.py       # Pydantic schemas
│   │   ├── auth.py          # Authentication utilities
│   │   ├── crud.py          # Database operations
│   │   ├── llm.py           # Gemini AI integration
│   │   └── utils/           # Export utilities
│   ├── requirements.txt
│   ├── init_db.py
│   └── .env
├── frontend/
│   ├── index.html           # Landing page
│   ├── login.html           # Login page
│   ├── register.html        # Registration page
│   ├── dashboard.html       # Projects dashboard
│   ├── project-wizard.html  # Project creation wizard
│   ├── project-editor.html  # Document editor
│   ├── css/
│   │   └── style.css        # Complete styling
│   ├── js/
│   │   ├── api.js           # API client
│   │   ├── auth.js          # Authentication management
│   │   ├── dashboard.js     # Dashboard functionality
│   │   ├── project-wizard.js # Project creation wizard
│   │   └── project-editor.js # Document editor
│   └── assets/
└── README.md
```

## Troubleshooting

### Common Issues:

1. **CORS Errors**: Make sure frontend is served on port 3000 and backend on port 8000
2. **Gemini API Errors**: Verify your API key is correct and has sufficient quota
3. **Database Errors**: Delete `app.db` and run `python init_db.py` again
4. **JWT Errors**: Ensure JWT_SECRET_KEY is exactly 64 characters long

### Port Conflicts:

If ports are already in use:
- Backend: Change port with `uvicorn app.main:app --port 8001`
- Frontend: Use a different port for the HTTP server

## Deployment

### Backend Deployment (Railway/Render)

1. Push code to GitHub
2. Connect repository to Railway or Render
3. Set environment variables in deployment platform
4. Deploy automatically

### Frontend Deployment (Netlify/Vercel)

1. Build and serve frontend files
2. Update API base URL in production to point to your deployed backend
3. Deploy static files

## Demo Video

[Link to your 5-10 minute demonstration video showing all features]

## License

MIT License

---

## Development Notes

- The application uses SQLite for simplicity in development
- For production, consider switching to PostgreSQL
- All AI features require a valid Gemini API key
- The frontend uses pure JavaScript without frameworks for maximum compatibility

# For Production:
## Remember to change this back to specific origins when deploying to production:

# python
allow_origins=[
    "https://yourdomain.com",
    "https://www.yourdomain.com"
]
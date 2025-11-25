import secrets
import os


def generate_env_file():
    gemini_key = input("Enter your Gemini API key: ").strip()

    # Generate a secure JWT secret
    jwt_secret = secrets.token_hex(32)

    env_content = f"""DATABASE_URL=sqlite:///./app.db
GEMINI_API_KEY={gemini_key}
JWT_SECRET_KEY={jwt_secret}
JWT_ALGORITHM=HS256
"""

    with open('.env', 'w') as f:
        f.write(env_content)

    print("✅ .env file created successfully!")
    print("🔑 JWT Secret generated automatically")
    print("🚀 You're ready to run the application!")


if __name__ == "__main__":
    generate_env_file()

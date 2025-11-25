import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise RuntimeError("GEMINI_API_KEY not set")

genai.configure(api_key=api_key)

model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
print("Using model:", model_name)

model = genai.GenerativeModel(model_name=model_name)

resp = model.generate_content(
    "Give me 3 concise insights about the future of electric vehicles.")
print("=== RAW RESPONSE OBJECT ===")
print(resp)
print("\n=== TEXT ===")
print(getattr(resp, "text", resp))

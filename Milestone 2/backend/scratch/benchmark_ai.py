import os
import sys
import time
from pathlib import Path
from dotenv import load_dotenv

CURRENT_DIR = Path(__file__).resolve().parent
ENV_PATH = CURRENT_DIR.parent / ".env"
load_dotenv(dotenv_path=ENV_PATH)

sys.path.insert(0, str(CURRENT_DIR.parent))

from services.ai_service import extract_content_text

prompt = """You are an expert exam generator. Generate exactly 2 MCQ questions for Computer Science, Algorithms:
Return ONLY a valid JSON array of objects with keys: question_text, question_type, options, correct_answer, explanation, marks."""

openai_key = os.getenv("OPENAI_API_KEY", "").strip()
google_key = (os.getenv("GOOGLE_API_KEY", "") or os.getenv("GEMINI_API_KEY", "")).strip()

print(f"OpenAI Key present: {bool(openai_key)} (len: {len(openai_key)})")
print(f"Google Key present: {bool(google_key)} (len: {len(google_key)})")

if openai_key:
    for model_name in ["gpt-4o-mini"]:
        t0 = time.time()
        try:
            from langchain_openai import ChatOpenAI
            model = ChatOpenAI(
                model=model_name,
                api_key=openai_key,
                temperature=0.2,
                timeout=15,
                max_retries=1,
            )
            resp = model.invoke(prompt)
            text = extract_content_text(resp.content)
            print(f"[OpenAI {model_name}] SUCCESS in {time.time()-t0:.2f}s! Text len: {len(text)}")
        except Exception as e:
            print(f"[OpenAI {model_name}] FAILED in {time.time()-t0:.2f}s: {e}")

if google_key:
    for gemini_model in ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-3.5-flash-lite"]:
        t0 = time.time()
        try:
            from langchain_google_genai import ChatGoogleGenerativeAI
            model = ChatGoogleGenerativeAI(
                model=gemini_model,
                google_api_key=google_key,
                timeout=15,
                max_retries=1,
            )
            resp = model.invoke(prompt)
            text = extract_content_text(resp.content)
            print(f"[Gemini {gemini_model}] SUCCESS in {time.time()-t0:.2f}s! Text len: {len(text)}")
        except Exception as e:
            print(f"[Gemini {gemini_model}] FAILED in {time.time()-t0:.2f}s: {e}")

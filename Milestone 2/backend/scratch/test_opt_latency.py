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
from langchain_openai import ChatOpenAI

openai_key = os.getenv("OPENAI_API_KEY", "").strip()

fast_model = ChatOpenAI(
    model="gpt-4o-mini",
    api_key=openai_key,
    temperature=0.2,
    timeout=15,
    max_tokens=900,
    max_retries=1,
)

prompt = """Generate 2 assessment questions for Computer Science, Algorithms as a JSON array:
[{"question_text": "...", "question_type": "mcq", "options": ["A", "B", "C", "D"], "correct_answer": "A", "explanation": "Brief rationale.", "marks": 1}]
Return ONLY the JSON array."""

t0 = time.time()
resp = fast_model.invoke(prompt)
print(f"Call 1 time with max_tokens & client reuse: {time.time()-t0:.2f}s (len: {len(resp.content)})")

t0 = time.time()
resp2 = fast_model.invoke(prompt)
print(f"Call 2 time with max_tokens & client reuse: {time.time()-t0:.2f}s (len: {len(resp2.content)})")

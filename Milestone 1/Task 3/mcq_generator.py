"""
Task 3: MCQ Generation Engine
Generates multiple-choice questions with answer keys and technical rationales
using ChatOpenAI with fallback support.
"""

import os
import json
import re
from pathlib import Path
from dotenv import load_dotenv

# --------------------------------------------------
# 1. Environment Loading
# --------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent

POSSIBLE_ENV_PATHS = [
    BASE_DIR / "api_keys.env",
    PROJECT_ROOT / "api_keys.env",
    PROJECT_ROOT.parent / "api_keys.env",
    BASE_DIR / ".env",
    PROJECT_ROOT / ".env",
]

env_path = next((p for p in POSSIBLE_ENV_PATHS if p.exists()), None)
if env_path:
    load_dotenv(env_path, override=True)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "").strip()
raw_openai_model = os.getenv("OPENAI_MODEL", "gpt-4o-mini").strip()
OPENAI_MODEL = "gpt-4o-mini" if raw_openai_model in ("gpt-3.5-turbo", "gpt-3.5-turbo-0125", "") else raw_openai_model
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash").strip()

# --------------------------------------------------
# 2. MCQ Generator Core Function
# --------------------------------------------------
def generate_mcqs(topic: str, difficulty: str, number_of_questions: int):
    """
    Generate multiple-choice questions for the requested topic and difficulty.
    
    Args:
        topic (str): The subject or topic name.
        difficulty (str): 'Easy', 'Medium', or 'Hard'.
        number_of_questions (int): Number of questions (1-20).
        
    Returns:
        list[dict]: List of question dicts containing:
                    - 'question': str
                    - 'options': dict with keys 'A', 'B', 'C', 'D'
                    - 'answer': 'A' | 'B' | 'C' | 'D'
                    - 'explanation': str
    """
    if not topic or not topic.strip():
        raise ValueError("Please provide a valid topic name.")

    number_of_questions = max(1, min(int(number_of_questions), 20))

    if not OPENAI_API_KEY and not GOOGLE_API_KEY:
        raise ValueError(
            "Neither OPENAI_API_KEY nor GOOGLE_API_KEY found in environment."
        )

    prompt = f"""
Generate exactly {number_of_questions} multiple-choice questions for an academic examination.

Topic: {topic.strip()}
Difficulty: {difficulty}

Requirements:
1. Generate exactly {number_of_questions} questions testing core principles and problem solving.
2. Each question must have four distinct options labeled A, B, C, and D.
3. Exactly one option must be unambiguously correct.
4. Match the requested difficulty level ('{difficulty}') appropriately.
5. Provide a concise, technically sound explanation for why the correct option is right.
6. Return ONLY valid JSON without markdown code fences or surrounding text.

Required JSON format:
{{
    "questions": [
        {{
            "question": "Question text here",
            "options": {{
                "A": "Option A text",
                "B": "Option B text",
                "C": "Option C text",
                "D": "Option D text"
            }},
            "answer": "A",
            "explanation": "Explanation of why this answer is correct."
        }}
    ]
}}
"""

    raw_content = ""

    # Invoke primary OpenAI model, or fallback to Gemini
    if OPENAI_API_KEY:
        from langchain_openai import ChatOpenAI
        llm = ChatOpenAI(
            model=OPENAI_MODEL,
            temperature=0.4,
            timeout=60,
            max_retries=2,
            api_key=OPENAI_API_KEY,
        )
        response = llm.invoke(prompt)
        raw_content = response.content
    elif GOOGLE_API_KEY:
        from langchain_google_genai import ChatGoogleGenerativeAI
        llm = ChatGoogleGenerativeAI(
            model=GEMINI_MODEL,
            temperature=0.4,
            timeout=60,
            max_retries=2,
            google_api_key=GOOGLE_API_KEY,
        )
        response = llm.invoke(prompt)
        raw_content = response.content

    if isinstance(raw_content, list):
        raw_content = "".join(b.get("text", "") for b in raw_content if isinstance(b, dict))
    raw_content = str(raw_content).strip()

    # Clean markdown fences
    raw_content = re.sub(r"^```(?:json)?\s*", "", raw_content)
    raw_content = re.sub(r"\s*```$", "", raw_content)

    try:
        data = json.loads(raw_content)
    except json.JSONDecodeError:
        start = raw_content.find("{")
        end = raw_content.rfind("}")
        if start != -1 and end != -1:
            data = json.loads(raw_content[start:end+1])
        else:
            raise ValueError("The AI returned invalid JSON output.")

    questions = data.get("questions")
    if not isinstance(questions, list) or len(questions) == 0:
        raise ValueError("The AI response did not contain a valid list of questions.")

    # Schema validation
    validated = []
    seen_texts = set()

    for idx, q in enumerate(questions, start=1):
        if not isinstance(q, dict):
            continue
        q_text = str(q.get("question", "")).strip()
        opts = q.get("options", {})
        ans = str(q.get("answer", "")).strip().upper()
        expl = str(q.get("explanation", "Correct answer verified.")).strip()

        if not q_text or not isinstance(opts, dict):
            continue
        if set(opts.keys()) != {"A", "B", "C", "D"}:
            continue
        if ans not in {"A", "B", "C", "D"}:
            continue

        normalized_text = re.sub(r"\W+", " ", q_text.lower()).strip()
        if normalized_text in seen_texts:
            continue
        seen_texts.add(normalized_text)

        validated.append({
            "question": q_text,
            "options": {k: str(v).strip() for k, v in opts.items()},
            "answer": ans,
            "explanation": expl,
        })

    if not validated:
        raise ValueError("Failed to validate generated questions schema.")

    return validated[:number_of_questions]

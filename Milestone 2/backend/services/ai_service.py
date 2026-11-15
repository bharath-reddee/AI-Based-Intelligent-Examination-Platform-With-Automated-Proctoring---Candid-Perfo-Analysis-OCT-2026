import os
import re
import json
from typing import List, Dict, Any, Optional
from pathlib import Path
from dotenv import load_dotenv

CURRENT_DIR = Path(__file__).resolve().parent
ENV_PATH = CURRENT_DIR.parent / ".env"
load_dotenv(dotenv_path=ENV_PATH)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
GOOGLE_API_KEY = (os.getenv("GOOGLE_API_KEY", "") or os.getenv("GEMINI_API_KEY", "")).strip()


def extract_content_text(response_content) -> str:
    if isinstance(response_content, str):
        return response_content
    elif isinstance(response_content, list):
        parts = []
        for part in response_content:
            if isinstance(part, dict) and "text" in part:
                parts.append(part["text"])
            elif isinstance(part, str):
                parts.append(part)
        if parts:
            return "".join(parts)
    return str(response_content)


_CLIENT_CACHE = {}

def get_openai_client(model_name: str, api_key: str, temperature: float, timeout: int, max_tokens: Optional[int] = None):
    cache_key = f"openai:{model_name}:{temperature}:{max_tokens}"
    if cache_key not in _CLIENT_CACHE:
        from langchain_openai import ChatOpenAI
        base_url = (os.getenv("OPENAI_BASE_URL", "") or os.getenv("OPENAI_API_BASE", "")).strip() or None
        kwargs = {
            "model": model_name,
            "api_key": api_key,
            "temperature": temperature,
            "timeout": timeout,
            "max_tokens": max_tokens,
            "max_retries": 2,
        }
        if base_url:
            kwargs["base_url"] = base_url
        _CLIENT_CACHE[cache_key] = ChatOpenAI(**kwargs)
    return _CLIENT_CACHE[cache_key]

def get_gemini_client(model_name: str, google_key: str, timeout: int):
    cache_key = f"gemini:{model_name}"
    if cache_key not in _CLIENT_CACHE:
        from langchain_google_genai import ChatGoogleGenerativeAI
        _CLIENT_CACHE[cache_key] = ChatGoogleGenerativeAI(
            model=model_name,
            google_api_key=google_key,
            timeout=timeout,
            max_retries=2,
        )
    return _CLIENT_CACHE[cache_key]


def invoke_ai_model(
    prompt: str,
    temperature: float = 0.25,
    timeout: int = 25,
    max_tokens: Optional[int] = None
) -> str:
    """
    Invoke primary provider (OpenAI) with automatic fallback to secondary (Google Gemini).
    Utilizes connection reuse, bounded output tokens, and optimized model failover.
    """
    openai_key = os.getenv("OPENAI_API_KEY", "").strip()
    google_key = (os.getenv("GOOGLE_API_KEY", "") or os.getenv("GEMINI_API_KEY", "")).strip()

    if not openai_key and not google_key:
        raise ValueError("No AI API key found. Please configure OPENAI_API_KEY or GOOGLE_API_KEY in backend .env.")

    raw_response = None
    last_err = None

    if openai_key:
        for openai_model in ["gpt-4o-mini", "gpt-4o"]:
            cache_key = f"openai:{openai_model}:{temperature}:{max_tokens}"
            try:
                client = get_openai_client(openai_model, openai_key, temperature, timeout, max_tokens)
                resp = client.invoke(prompt)
                raw_response = extract_content_text(resp.content)
                if raw_response and raw_response.strip():
                    return raw_response
            except Exception as inner_e:
                _CLIENT_CACHE.pop(cache_key, None)
                last_err = inner_e
                continue

    if google_key:
        for gemini_model in ["gemini-2.5-flash", "gemini-flash-latest", "gemini-2.5-pro"]:
            cache_key = f"gemini:{gemini_model}"
            try:
                client = get_gemini_client(gemini_model, google_key, timeout)
                resp = client.invoke(prompt)
                raw_response = extract_content_text(resp.content)
                if raw_response and raw_response.strip():
                    return raw_response
            except Exception as e:
                _CLIENT_CACHE.pop(cache_key, None)
                last_err = e
                continue

    if last_err:
        err_str = str(last_err)
        if "11001" in err_str or "getaddrinfo" in err_str or "NameResolutionError" in err_str:
            raise RuntimeError(f"AI Provider connection error (DNS resolution failed): {last_err}")
        raise RuntimeError(f"AI Provider error: {last_err}")
    raise RuntimeError("Failed to generate response from all configured AI models.")


def parse_json_from_llm(raw_text: str) -> Any:
    text = raw_text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
        text = re.sub(r"\s*```$", "", text).strip()

    match = re.search(r"(\[.*\]|\{.*\})", text, re.DOTALL)
    if match:
        text = match.group(1).strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        sanitized = re.sub(r'\\(?!["\\/bfnrtu])', r'\\\\', text)
        try:
            return json.loads(sanitized)
        except Exception:
            sanitized = re.sub(r'[\x00-\x1f\x7f-\x9f]', ' ', sanitized)
            return json.loads(sanitized)


def generate_exam_questions(
    subject: str,
    topic: str,
    difficulty: str = "Medium",
    mcq_count: int = 0,
    multi_select_count: int = 0,
    short_answer_count: int = 0,
    long_answer_count: int = 0,
    instructions: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Generate questions across requested categories using configured AI model.
    """
    total_requested = mcq_count + multi_select_count + short_answer_count + long_answer_count
    if total_requested <= 0:
        raise ValueError("Total requested questions must be at least 1.")
    if total_requested > 60:
        raise ValueError("A maximum of 60 questions can be generated in a single batch.")

    spec_lines = []
    if mcq_count > 0:
        spec_lines.append(f"- Multiple-Choice Questions (MCQ): EXACTLY {mcq_count} questions. Single correct answer among 4 options, default marks: 1")
    if multi_select_count > 0:
        spec_lines.append(f"- Multi-Select Questions: EXACTLY {multi_select_count} questions. 2 or more correct options among 4 options, default marks: 2")
    if short_answer_count > 0:
        spec_lines.append(f"- Short-Answer Questions: EXACTLY {short_answer_count} questions. Concise conceptual question with model answer, default marks: 3")
    if long_answer_count > 0:
        spec_lines.append(f"- Long-Answer Questions: EXACTLY {long_answer_count} questions. Comprehensive analytical/descriptive question with detailed model answer key points, default marks: 5")

    spec_text = "\n".join(spec_lines)
    extra_inst = f"\nAdditional Guidance: {instructions.strip()}" if instructions and instructions.strip() else ""

    prompt = f"""You are an expert university examiner creating rigorous assessment questions for an examination platform.
Subject: {subject}
Topic: {topic}
Difficulty: {difficulty}

Generate EXACTLY the following question breakdown ({total_requested} total questions):
{spec_text}{extra_inst}

CRITICAL ASSESSMENT QUALITY & COUNT RULES:
1. You MUST generate EXACTLY the requested question counts for each category above. Do not omit any requested question type. Do not produce questions for types with 0 requested count.
2. For Multiple-Choice Questions (MCQ): There must be EXACTLY ONE unambiguously correct option. The 3 distractors must be demonstrably incorrect. NEVER provide choices where two or more options are scientifically valid equations or equivalent principles (e.g., in thermodynamics adiabatic processes, do not include both PV^gamma=C and TV^(gamma-1)=C unless one is the sole correct choice and the other is formulated incorrectly).
3. For Multi-Select Questions: Include 2 or more correct choices among the options. Correct answer must be a JSON array of the exact matching option texts.
4. Use readable LaTeX notation for formulas and equations (e.g., $PV^\\gamma = \\text{{constant}}$, $O(n \\log n)$).
5. No duplicate options or trivial variations.

Return ONLY a valid JSON array of question objects with NO markdown formatting, NO extra commentary.
Schema for each question object:
{{
  "question_text": "Clear, precise question statement",
  "question_type": "mcq" | "multi_select" | "short_answer" | "long_answer",
  "difficulty": "{difficulty}",
  "options": ["Option A text", "Option B text", "Option C text", "Option D text"] (only for mcq and multi_select, null for subjective),
  "correct_answer": "Option A text (or JSON list for multi_select, or comprehensive model answer string for short/long answer)",
  "explanation": "Diagnostic rationale or evaluation key points",
  "marks": integer marks,
  "negative_marks": 0.0,
  "min_words": integer or null (optional word limit for long_answer),
  "max_words": integer or null (optional word limit for long_answer)
}}
"""

    import time
    t_start = time.time()
    calculated_max_tokens = min(8192, max(800, total_requested * 280 + 400))
    call_timeout = min(120, max(35, total_requested * 3 + 20))
    raw_output = invoke_ai_model(prompt, temperature=0.25, timeout=call_timeout, max_tokens=calculated_max_tokens)
    t_model = time.time()
    data = parse_json_from_llm(raw_output)

    if isinstance(data, dict):
        for k in ["questions", "items", "data"]:
            if k in data and isinstance(data[k], list):
                data = data[k]
                break

    if not isinstance(data, list):
        raise ValueError("Model response could not be parsed into a question list.")

    from services.validation_service import validate_and_refine_question

    valid_questions = []
    for item in data:
        if not isinstance(item, dict):
            continue
        q_text = str(item.get("question_text", "")).strip()
        q_type = str(item.get("question_type", "mcq")).lower().strip()
        if not q_text:
            continue

        options = item.get("options")
        if q_type in ["mcq", "multi_select"]:
            if isinstance(options, list):
                options = [str(o).strip() for o in options if str(o).strip()]
            else:
                options = ["Option A", "Option B", "Option C", "Option D"]
            while len(options) < 4:
                options.append(f"Option {chr(65 + len(options))}")

        corr = item.get("correct_answer")
        if isinstance(corr, list):
            corr = json.dumps(corr)
        else:
            corr = str(corr or "").strip()

        marks = int(item.get("marks", 0))
        if marks <= 0:
            if q_type == "mcq":
                marks = 1
            elif q_type == "multi_select":
                marks = 2
            elif q_type == "short_answer":
                marks = 3
            else:
                marks = 5

        raw_item = {
            "question_text": q_text,
            "question_type": q_type,
            "difficulty": str(item.get("difficulty", difficulty)),
            "options": options if q_type in ["mcq", "multi_select"] else None,
            "correct_answer": corr,
            "explanation": str(item.get("explanation", "")).strip() or "Standard academic model answer rationale.",
            "marks": marks,
            "negative_marks": float(item.get("negative_marks", 0.0)),
            "min_words": item.get("min_words"),
            "max_words": item.get("max_words"),
        }

        validated_item = validate_and_refine_question(raw_item)
        valid_questions.append(validated_item)

    return valid_questions


def evaluate_subjective_answer(
    question_text: str,
    question_type: str,
    model_answer: str,
    max_marks: float,
    student_answer: str,
) -> Optional[Dict[str, Any]]:
    """
    Uses AI to evaluate short or long subjective answers against the model answer criteria.
    Returns { awarded_marks: float, feedback: str, is_correct: bool } or None if AI is unavailable.
    """
    if not student_answer or not student_answer.strip():
        return {
            "awarded_marks": 0.0,
            "feedback": "No answer provided.",
            "is_correct": False,
        }

    if model_answer and student_answer.strip().lower() == model_answer.strip().lower():
        return {
            "awarded_marks": float(max_marks),
            "feedback": "Accurate response aligning precisely with model criteria.",
            "is_correct": True,
        }

    openai_key = os.getenv("OPENAI_API_KEY", "").strip()
    google_key = (os.getenv("GOOGLE_API_KEY", "") or os.getenv("GEMINI_API_KEY", "")).strip()
    if not openai_key and not google_key:
        return None

    prompt = f"""You are an objective academic evaluator grading a student's examination response.
Question: {question_text}
Question Type: {question_type}
Model Answer / Key Points: {model_answer}
Maximum Marks: {max_marks}

Student Answer:
\"\"\"
{student_answer.strip()}
\"\"\"

Evaluate the response objectively. Return ONLY a valid JSON object with NO extra text:
{{
  "awarded_marks": float between 0.0 and {max_marks},
  "feedback": "1-2 concise sentences justifying the awarded marks and identifying strengths or omissions"
}}
"""
    try:
        raw_output = invoke_ai_model(prompt, temperature=0.1, timeout=25)
        data = parse_json_from_llm(raw_output)
        if isinstance(data, dict) and "awarded_marks" in data:
            awarded = float(data.get("awarded_marks", 0.0))
            awarded = max(0.0, min(float(max_marks), awarded))
            return {
                "awarded_marks": round(awarded, 1),
                "feedback": str(data.get("feedback", "Automated AI evaluation completed.")).strip(),
                "is_correct": awarded >= (float(max_marks) / 2.0),
            }
    except Exception as e:
        print(f"[AI EVALUATION ERROR] {e}")
        if model_answer and (model_answer.strip().lower() in student_answer.strip().lower() or student_answer.strip().lower() in model_answer.strip().lower()):
            return {
                "awarded_marks": float(max_marks),
                "feedback": "Evaluation completed based on key criteria match.",
                "is_correct": True,
            }
        return None

    return None

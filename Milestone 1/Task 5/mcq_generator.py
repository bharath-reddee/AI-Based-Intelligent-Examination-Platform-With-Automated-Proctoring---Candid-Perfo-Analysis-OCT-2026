"""
Task 5: Multimodal Question Generation, OCR Vision Transcription & Answer Evaluation
Features:
- Concept-aware MCQ generation with normalization and automated deduplication
- Distinct written question generation with anti-overlap concept exclusion
- Vision-capable AI transcription (OCR) from handwritten candidate answer images
- Rubric-based descriptive answer grading (0 to 5 marks) with feedback and missing points
"""

import os
import json
import re
import base64
from pathlib import Path
from dotenv import load_dotenv

# --------------------------------------------------
# 1. Environment Loading & Provider Setup
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
OCR_MODEL = os.getenv("OCR_MODEL", "gpt-4o").strip()

# --------------------------------------------------
# 2. Resilient JSON Parsing & Helper Utilities
# --------------------------------------------------
def normalize(text: str) -> str:
    """Normalize question text for case and punctuation insensitive comparison."""
    return re.sub(r"\W+", " ", str(text).lower()).strip()

def clean_json_string(content: str) -> str:
    """Strip markdown code blocks and whitespace from string."""
    cleaned = str(content).strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
    cleaned = re.sub(r"\s*```$", "", cleaned)
    return cleaned.strip()

def extract_json(content) -> dict:
    """Safely extract and parse JSON object from LLM response."""
    if isinstance(content, list):
        content = "\n".join(
            item.get("text", "") if isinstance(item, dict) else str(item)
            for item in content
        )
    cleaned = clean_json_string(content)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start != -1 and end != -1:
            return json.loads(cleaned[start:end + 1])
        raise ValueError("AI response did not contain a valid JSON object.")

def ask_ai(prompt: str, model: str = None, temperature: float = 0.3) -> dict:
    """Execute LLM prompt and return parsed JSON with multi-provider fallback."""
    if not OPENAI_API_KEY and not GOOGLE_API_KEY:
        raise ValueError("No API key available. Check your api_keys.env configuration.")

    model_name = model or OPENAI_MODEL

    if OPENAI_API_KEY:
        try:
            from langchain_openai import ChatOpenAI
            llm = ChatOpenAI(
                model=model_name,
                temperature=temperature,
                timeout=90,
                max_retries=2,
                api_key=OPENAI_API_KEY,
            )
            response = llm.invoke(prompt)
            return extract_json(response.content)
        except Exception as oai_err:
            if not GOOGLE_API_KEY:
                raise oai_err
            # Fallback to Gemini
            from langchain_google_genai import ChatGoogleGenerativeAI
            llm = ChatGoogleGenerativeAI(
                model=GEMINI_MODEL,
                temperature=temperature,
                timeout=90,
                max_retries=2,
                google_api_key=GOOGLE_API_KEY,
            )
            response = llm.invoke(prompt)
            return extract_json(response.content)

    elif GOOGLE_API_KEY:
        from langchain_google_genai import ChatGoogleGenerativeAI
        llm = ChatGoogleGenerativeAI(
            model=GEMINI_MODEL,
            temperature=temperature,
            timeout=90,
            max_retries=2,
            google_api_key=GOOGLE_API_KEY,
        )
        response = llm.invoke(prompt)
        return extract_json(response.content)

# --------------------------------------------------
# 3. Generate Multiple-Choice Questions (MCQs)
# --------------------------------------------------
def generate_mcqs(topic: str, difficulty: str, count: int) -> list:
    """
    Generate multiple-choice questions with answer keys, explanations, and concepts.
    Validates 4 options (A,B,C,D) and performs automatic in-memory deduplication.
    """
    count = max(1, min(int(count), 10))

    prompt = f"""
Generate exactly {count} multiple-choice questions for an academic examination.

Topic: {topic}
Difficulty: {difficulty}

Return ONLY valid JSON in this format:
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
      "explanation": "Clear explanation of why this answer is correct",
      "concept": "Specific concept tested"
    }}
  ]
}}

Rules:
1. Provide original questions with high technical clarity.
2. Every question must have exactly four distinct options: A, B, C, and D.
3. Exactly one option must be unambiguously correct.
4. The 'answer' field must be exactly one letter: 'A', 'B', 'C', or 'D'.
5. Include a specific concept name for each question.
"""

    data = ask_ai(prompt)
    raw_questions = data.get("questions", [])

    validated = []
    seen = set()

    for q in raw_questions:
        if not isinstance(q, dict):
            continue

        q_text = str(q.get("question", "")).strip()
        opts = q.get("options", {})
        ans = str(q.get("answer", "")).strip().upper()
        expl = str(q.get("explanation", "Verified correct option.")).strip()
        concept = str(q.get("concept", topic)).strip()

        if not q_text or not isinstance(opts, dict):
            continue
        if set(opts.keys()) != {"A", "B", "C", "D"}:
            continue
        if ans not in {"A", "B", "C", "D"}:
            continue

        norm = normalize(q_text)
        if norm in seen:
            continue
        seen.add(norm)

        validated.append({
            "question": q_text,
            "options": {k: str(v).strip() for k, v in opts.items()},
            "answer": ans,
            "explanation": expl,
            "concept": concept,
        })

    if not validated:
        raise ValueError("Failed to generate valid MCQs. Please try again.")

    return validated[:count]

# --------------------------------------------------
# 4. Generate Written Questions & Answers
# --------------------------------------------------
def generate_qa_questions(topic: str, difficulty: str, count: int, mcqs: list) -> list:
    """
    Generate descriptive written questions ensuring zero repetition or concept
    overlap with the generated MCQs.
    """
    count = max(1, min(int(count), 5))

    excluded = [
        {"question": item["question"], "concept": item["concept"]}
        for item in mcqs
    ]

    prompt = f"""
Generate exactly {count} written question-and-answer examination questions.

Topic: {topic}
Difficulty: {difficulty}

The following concepts and questions have ALREADY been tested in Section A (MCQs):
{json.dumps(excluded, ensure_ascii=False)}

CRITICAL ANTI-OVERLAP RULES:
1. Do not repeat any concept or question tested in Section A.
2. Focus on different subtopics, architectural principles, or implementation details.
3. Questions must require descriptive written reasoning.
4. Include 2-4 concrete key evaluation points.

Return ONLY valid JSON in this format:
{{
  "questions": [
    {{
      "question": "Descriptive question text",
      "expected_answer": "Complete reference solution",
      "key_points": [
        "Key evaluation point 1",
        "Key evaluation point 2"
      ],
      "concept": "Distinct subtopic being tested",
      "max_marks": 5
    }}
  ]
}}
"""

    data = ask_ai(prompt)
    raw_questions = data.get("questions", [])

    mcq_texts = {normalize(item["question"]) for item in mcqs}
    qa_texts = set()

    validated = []
    for q in raw_questions:
        if not isinstance(q, dict):
            continue

        q_text = str(q.get("question", "")).strip()
        exp_ans = str(q.get("expected_answer", "")).strip()
        kp = q.get("key_points", [])
        concept = str(q.get("concept", topic)).strip()

        if not q_text or not exp_ans:
            continue
        if not isinstance(kp, list):
            kp = [str(kp)]

        norm = normalize(q_text)
        if norm in mcq_texts or norm in qa_texts:
            continue
        qa_texts.add(norm)

        validated.append({
            "question": q_text,
            "expected_answer": exp_ans,
            "key_points": [str(p).strip() for p in kp if str(p).strip()],
            "concept": concept,
            "max_marks": 5,
        })

    if not validated:
        raise ValueError("Failed to generate distinct written questions.")

    return validated[:count]

# --------------------------------------------------
# 5. Multimodal Vision OCR Transcription
# --------------------------------------------------
def extract_text_from_image(image_bytes: bytes, mime_type: str, model: str = None) -> str:
    """
    Transcribe handwritten or printed answer images using vision-capable models.
    Supports PNG, JPEG, WebP, and GIF.
    """
    model_name = model or OCR_MODEL or "gpt-4o"
    allowed_mime_types = {"image/png", "image/jpeg", "image/webp", "image/gif"}
    safe_mime = mime_type if mime_type in allowed_mime_types else "image/jpeg"

    encoded_image = base64.b64encode(image_bytes).decode("utf-8")
    data_uri = f"data:{safe_mime};base64,{encoded_image}"

    system_instruction = (
        "You are an expert OCR transcription assistant for academic examinations. "
        "Transcribe only the candidate's handwritten or printed answer visible in the image. "
        "Preserve formatting, paragraphs, equations, and wording accurately. "
        "Do not answer or evaluate the question itself. "
        "If a specific word is illegible, transcribe it as '[unclear]'."
    )

    if OPENAI_API_KEY:
        from langchain_openai import ChatOpenAI
        llm = ChatOpenAI(
            model=model_name,
            temperature=0,
            timeout=90,
            api_key=OPENAI_API_KEY,
        )
        response = llm.invoke([
            ("system", system_instruction),
            (
                "human",
                [
                    {"type": "text", "text": "Transcribe the candidate's written answer from this exam sheet:"},
                    {"type": "image_url", "image_url": {"url": data_uri}},
                ],
            ),
        ])
        content = response.content
    elif GOOGLE_API_KEY:
        from langchain_google_genai import ChatGoogleGenerativeAI
        gemini_vision_model = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
        llm = ChatGoogleGenerativeAI(
            model=gemini_vision_model,
            temperature=0,
            timeout=90,
            google_api_key=GOOGLE_API_KEY,
        )
        response = llm.invoke([
            ("system", system_instruction),
            (
                "human",
                [
                    {"type": "text", "text": "Transcribe the candidate's written answer from this exam sheet:"},
                    {"type": "image_url", "image_url": {"url": data_uri}},
                ],
            ),
        ])
        content = response.content
    else:
        raise ValueError("No API key available for OCR transcription.")

    if isinstance(content, list):
        content = "\n".join(
            item.get("text", "") if isinstance(item, dict) else str(item)
            for item in content
        )

    return str(content).strip()

# --------------------------------------------------
# 6. Automated Written Answer Evaluation
# --------------------------------------------------
def evaluate_written_answer(
    question: str,
    expected_answer: str,
    key_points: list,
    answer: str
) -> dict:
    """
    Score a student's descriptive answer from 0.0 to 5.0 marks with feedback
    and identified missing key points.
    """
    if not answer or not answer.strip():
        return {
            "marks": 0.0,
            "feedback": "No answer was provided by the candidate.",
            "missing_points": list(key_points) if key_points else ["No submission recorded."],
        }

    prompt = f"""
Evaluate the candidate's written examination answer fairly and impartially.

Question:
{question}

Reference Model Answer:
{expected_answer}

Expected Core Key Points:
{json.dumps(key_points, ensure_ascii=False)}

Candidate's Submitted Answer:
{answer}

Maximum Marks: 5.0

Evaluation Standards:
1. Award marks between 0.0 and 5.0 in increments of 0.25 or 0.5.
2. Grant proportional credit for partially correct responses and conceptual grasp.
3. Evaluate semantic understanding, not literal phrasing.
4. Constructive, professional feedback explaining the score.
5. Identify any key points that were absent or incompletely answered.

Return ONLY valid JSON:
{{
  "marks": 4.5,
  "feedback": "Constructive explanation for the awarded score.",
  "missing_points": ["Missing key point if any"]
}}
"""

    data = ask_ai(prompt, temperature=0.2)

    try:
        marks = float(data.get("marks", 0.0))
    except (ValueError, TypeError):
        marks = 0.0

    marks = round(max(0.0, min(5.0, marks)), 2)
    missing = data.get("missing_points", [])
    if not isinstance(missing, list):
        missing = [str(missing)]

    feedback = str(data.get("feedback", "Evaluation completed successfully."))

    return {
        "marks": marks,
        "feedback": feedback,
        "missing_points": [str(m).strip() for m in missing if str(m).strip()],
    }

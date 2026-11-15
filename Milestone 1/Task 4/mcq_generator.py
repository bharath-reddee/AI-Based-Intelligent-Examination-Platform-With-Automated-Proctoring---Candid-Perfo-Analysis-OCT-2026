"""
Task 4: Dual-Format Examination Generator & Automated AI Evaluator
Provides Section A (MCQs with concept tagging), Section B (Written Q&A with
anti-duplication concept checking), and AI-based rubric marking (0 to 5 marks)
with constructive feedback and missing key-point identification.
"""

import os
import json
import re
from pathlib import Path
from dotenv import load_dotenv

# --------------------------------------------------
# 1. Environment & API Key Setup
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
# 2. Resilient JSON AI Caller
# --------------------------------------------------
def get_ai_json_response(prompt: str, system_prompt: str = None) -> dict:
    """Send prompt to AI and parse verified JSON output."""
    if not OPENAI_API_KEY and not GOOGLE_API_KEY:
        raise ValueError("Missing API key. Please check your api_keys.env configuration.")

    sys_text = system_prompt or (
        "You are an educational examination assistant. "
        "Follow the requested JSON structure exactly. "
        "Return valid JSON only without markdown code fences."
    )

    raw_text = ""

    # Primary: OpenAI
    if OPENAI_API_KEY:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=OPENAI_API_KEY)
            response = client.chat.completions.create(
                model=OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": sys_text},
                    {"role": "user", "content": prompt},
                ],
                response_format={"type": "json_object"},
                temperature=0.3,
                timeout=60,
            )
            raw_text = response.choices[0].message.content or ""
        except Exception as oai_err:
            if not GOOGLE_API_KEY:
                raise oai_err
            # Fallback to Gemini
            from langchain_google_genai import ChatGoogleGenerativeAI
            llm = ChatGoogleGenerativeAI(
                model=GEMINI_MODEL,
                temperature=0.3,
                timeout=60,
                google_api_key=GOOGLE_API_KEY,
            )
            res = llm.invoke(f"{sys_text}\n\n{prompt}")
            raw_text = res.content
    elif GOOGLE_API_KEY:
        from langchain_google_genai import ChatGoogleGenerativeAI
        llm = ChatGoogleGenerativeAI(
            model=GEMINI_MODEL,
            temperature=0.3,
            timeout=60,
            google_api_key=GOOGLE_API_KEY,
        )
        res = llm.invoke(f"{sys_text}\n\n{prompt}")
        raw_text = res.content

    if isinstance(raw_text, list):
        raw_text = "".join(b.get("text", "") for b in raw_text if isinstance(b, dict))
    raw_text = str(raw_text).strip()

    # Clean code fences
    raw_text = re.sub(r"^```(?:json)?\s*", "", raw_text)
    raw_text = re.sub(r"\s*```$", "", raw_text)

    try:
        return json.loads(raw_text)
    except json.JSONDecodeError:
        start = raw_text.find("{")
        end = raw_text.rfind("}")
        if start != -1 and end != -1:
            return json.loads(raw_text[start:end+1])
        raise ValueError("AI returned non-JSON content.")

# --------------------------------------------------
# 3. Generate Multiple-Choice Questions (MCQs)
# --------------------------------------------------
def generate_mcqs(topic: str, difficulty: str, number_of_questions: int) -> list:
    """
    Generate MCQs matching Task 4 specification.
    Returns: list of dicts with 'question', 'options' (list of 4 strings),
             'answer' (matching string), 'explanation', 'concept'.
    """
    number_of_questions = max(1, min(int(number_of_questions), 10))

    prompt = f"""
Generate exactly {number_of_questions} multiple-choice questions for an examination.

Topic: {topic}
Difficulty: {difficulty}

Return JSON in this format:
{{
    "questions": [
        {{
            "question": "Question text",
            "options": [
                "Option A text",
                "Option B text",
                "Option C text",
                "Option D text"
            ],
            "answer": "Exact text of the correct option",
            "explanation": "Explanation of the answer",
            "concept": "Specific concept being tested"
        }}
    ]
}}

Requirements:
1. Each question must have exactly four options as a list of strings.
2. There must be exactly one correct answer matching one of the options word-for-word.
3. Questions must accurately reflect the requested difficulty level.
4. Each question must test a distinct concept within the topic.
"""

    data = get_ai_json_response(prompt)
    questions = data.get("questions", [])

    validated = []
    seen = set()

    for q in questions:
        if not isinstance(q, dict):
            continue

        q_text = str(q.get("question", "")).strip()
        opts = q.get("options")
        ans = str(q.get("answer", "")).strip()

        if not q_text or not isinstance(opts, list) or len(opts) != 4:
            continue

        clean_opts = [str(o).strip() for o in opts]
        if not all(clean_opts):
            continue

        # If answer is just a letter like "A" or "Option A", resolve it to the text
        if ans in ["A", "B", "C", "D"]:
            ans_idx = ord(ans) - ord("A")
            ans = clean_opts[ans_idx]
        elif ans not in clean_opts:
            # Check if letter prefixed
            matched = False
            for o in clean_opts:
                if ans.lower() in o.lower():
                    ans = o
                    matched = True
                    break
            if not matched:
                continue

        norm = re.sub(r"\W+", " ", q_text.lower()).strip()
        if norm in seen:
            continue
        seen.add(norm)

        validated.append({
            "question": q_text,
            "options": clean_opts,
            "answer": ans,
            "explanation": str(q.get("explanation", "Verified correct answer.")).strip(),
            "concept": str(q.get("concept", topic)).strip(),
        })

    if not validated:
        raise ValueError("No valid MCQs were generated. Please try again.")

    return validated[:number_of_questions]

# --------------------------------------------------
# 4. Generate Written Questions & Answers
# --------------------------------------------------
def generate_qa_questions(
    topic: str,
    difficulty: str,
    number_of_questions: int,
    generated_mcqs: list = None
) -> list:
    """
    Generate written questions ensuring zero concept repetition with MCQs.
    Returns: list of dicts with 'question', 'expected_answer', 'key_points', 'concept'.
    """
    number_of_questions = max(1, min(int(number_of_questions), 5))

    mcq_context = ""
    if generated_mcqs:
        concepts = [q.get("concept", topic) for q in generated_mcqs]
        mcq_context = (
            "Concepts already covered in the MCQ section: "
            + ", ".join(set(concepts))
            + ". DO NOT repeat or retest these specific concepts."
        )

    prompt = f"""
Generate exactly {number_of_questions} written-answer examination questions.

Topic: {topic}
Difficulty: {difficulty}
{mcq_context}

Return JSON in this format:
{{
    "questions": [
        {{
            "question": "Written question requiring descriptive answer",
            "expected_answer": "Complete reference answer",
            "key_points": [
                "Essential point 1",
                "Essential point 2",
                "Essential point 3"
            ],
            "concept": "Different subtopic/concept being tested"
        }}
    ]
}}

Requirements:
1. Written questions must require explanation, architecture, or analytical reasoning.
2. Expected answers must be technically accurate.
3. Provide 2-4 concrete key points required for full marks.
"""

    data = get_ai_json_response(prompt)
    questions = data.get("questions", [])

    validated = []
    seen = set()

    for q in questions:
        if not isinstance(q, dict):
            continue

        q_text = str(q.get("question", "")).strip()
        exp_ans = str(q.get("expected_answer", "")).strip()
        kp = q.get("key_points", [])

        if not q_text or not exp_ans:
            continue
        if not isinstance(kp, list):
            kp = [str(kp)]

        norm = re.sub(r"\W+", " ", q_text.lower()).strip()
        if norm in seen:
            continue
        seen.add(norm)

        validated.append({
            "question": q_text,
            "expected_answer": exp_ans,
            "key_points": [str(p).strip() for p in kp if str(p).strip()],
            "concept": str(q.get("concept", topic)).strip(),
        })

    if not validated:
        raise ValueError("No valid written questions could be generated.")

    return validated[:number_of_questions]

# --------------------------------------------------
# 5. Automated Written Answer Evaluation
# --------------------------------------------------
def evaluate_written_answer(
    question: str,
    expected_answer: str,
    key_points: list,
    answer: str
) -> dict:
    """
    Score a candidate's descriptive answer from 0.0 to 5.0 marks.
    Returns: dict with 'marks', 'feedback', 'missing_points'.
    """
    if not answer or not answer.strip():
        return {
            "marks": 0.0,
            "feedback": "No answer was provided by the candidate.",
            "missing_points": list(key_points) if key_points else ["Complete solution missing."],
        }

    prompt = f"""
Evaluate a student's written examination answer fairly.

Question:
{question}

Expected Reference Answer:
{expected_answer}

Key Points Required for Full Marks:
{json.dumps(key_points, ensure_ascii=False)}

Student's Submitted Answer:
{answer}

Maximum Marks: 5.0

Return JSON in this format:
{{
    "marks": 4.5,
    "feedback": "Concise feedback explaining the awarded score",
    "missing_points": [
        "Specific point that was missing or inadequate"
    ]
}}

Grading Rules:
1. Award marks between 0.0 and 5.0.
2. Award partial credit proportional to demonstrated understanding.
3. Judge semantic correctness, not exact word-for-word matching.
4. If essential points are absent, list them under missing_points.
"""

    try:
        data = get_ai_json_response(prompt)
        marks = float(data.get("marks", 0.0))
    except (TypeError, ValueError):
        marks = 0.0

    marks = round(max(0.0, min(marks, 5.0)), 2)
    missing = data.get("missing_points", []) if isinstance(data, dict) else []
    if not isinstance(missing, list):
        missing = [str(missing)]

    feedback = data.get("feedback", "Evaluation completed successfully.") if isinstance(data, dict) else "Evaluated."

    return {
        "marks": marks,
        "feedback": str(feedback),
        "missing_points": [str(m).strip() for m in missing if str(m).strip()],
    }

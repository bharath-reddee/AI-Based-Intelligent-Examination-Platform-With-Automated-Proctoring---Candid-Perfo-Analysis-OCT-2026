import json
import re
import base64
from pathlib import Path

from dotenv import load_dotenv
from langchain_openai import ChatOpenAI


# Find the .env file in the project root.

# Find and load the environment file.
CURRENT_FOLDER = Path(__file__).resolve().parent

PROJECT_FOLDER = next(
    (
        folder
        for folder in [CURRENT_FOLDER, *CURRENT_FOLDER.parents]
        if (folder / "api_keys.env").exists()
        or (folder / ".env").exists()
    ),
    CURRENT_FOLDER,
)

ENV_FILE = (
    PROJECT_FOLDER / "api_keys.env"
    if (PROJECT_FOLDER / "api_keys.env").exists()
    else PROJECT_FOLDER / ".env"
)

load_dotenv(ENV_FILE, override=True)



def get_llm(model=None, temperature=0.3):
    """Create a LangChain OpenAI model."""
    model_name = model or "gpt-3.5-turbo"
    return ChatOpenAI(
        model=model_name,
        temperature=temperature,
        timeout=90,
        max_retries=2,
    )


def extract_json(content):
    """Extract JSON from an AI response."""
    if isinstance(content, list):
        content = "\n".join(
            item.get("text", "") if isinstance(item, dict) else str(item)
            for item in content
        )

    content = str(content).strip()
    content = re.sub(r"^```(?:json)?\s*", "", content)
    content = re.sub(r"\s*```$", "", content)

    try:
        return json.loads(content)
    except json.JSONDecodeError:
        start = content.find("{")
        end = content.rfind("}")

        if start == -1 or end == -1:
            raise ValueError("The AI response did not contain valid JSON.")

        return json.loads(content[start:end + 1])


def ask_ai(prompt, model=None):
    response = get_llm(model=model).invoke(prompt)
    return extract_json(response.content)


def normalize(text):
    """Normalize question text for duplicate checking."""
    return re.sub(r"\W+", " ", str(text).lower()).strip()


def generate_mcqs(topic, difficulty, count):
    prompt = f"""
Generate exactly {count} multiple-choice questions.

Topic: {topic}
Difficulty: {difficulty}

Return ONLY valid JSON in this format:
{{
  "questions": [
    {{
      "question": "Question text",
      "options": {{
        "A": "First option",
        "B": "Second option",
        "C": "Third option",
        "D": "Fourth option"
      }},
      "answer": "A",
      "explanation": "Explanation of the correct answer",
      "concept": "Specific concept tested"
    }}
  ]
}}

Rules:
- Generate original questions without repetition.
- Provide exactly four meaningful options per question.
- Exactly one option must be correct.
- The answer must be A, B, C, or D.
- Keep questions appropriate to the selected difficulty.
- Do not include written-answer questions.
"""

    data = ask_ai(prompt)
    questions = data.get("questions", [])

    if len(questions) != count:
        raise ValueError(
            f"Expected {count} MCQs but received {len(questions)}."
        )

    seen = set()

    for question in questions:
        required = [
            "question",
            "options",
            "answer",
            "explanation",
            "concept",
        ]

        if not all(key in question for key in required):
            raise ValueError("An MCQ is missing required information.")

        if question["answer"] not in ["A", "B", "C", "D"]:
            raise ValueError("An MCQ has an invalid correct answer.")

        if not all(
            key in question["options"] for key in ["A", "B", "C", "D"]
        ):
            raise ValueError("Every MCQ must contain four options.")

        normalized = normalize(question["question"])

        if normalized in seen:
            raise ValueError("Duplicate MCQs were generated. Try again.")

        seen.add(normalized)

    return questions


def generate_qa_questions(topic, difficulty, count, mcqs):
    excluded = [
        {"question": item["question"], "concept": item["concept"]}
        for item in mcqs
    ]

    prompt = f"""
Generate exactly {count} written question-and-answer questions.

Topic: {topic}
Difficulty: {difficulty}

The following concepts have already been tested in the MCQ section:
{json.dumps(excluded, ensure_ascii=False)}

IMPORTANT:
- Do not repeat any MCQ question.
- Do not reword an MCQ and use it as a written question.
- Do not test the same specific concept as an MCQ.
- Select different subtopics within the overall topic.
- Written questions must require an explanation or descriptive answer.
- Do not provide multiple-choice options.
- Check every generated question against the excluded list.

Return ONLY valid JSON in this format:
{{
  "questions": [
    {{
      "question": "Written question",
      "expected_answer": "Reference answer",
      "key_points": ["Important point 1", "Important point 2"],
      "concept": "Specific concept tested",
      "max_marks": 5
    }}
  ]
}}
"""

    data = ask_ai(prompt)
    questions = data.get("questions", [])

    if len(questions) != count:
        raise ValueError(
            f"Expected {count} written questions but received {len(questions)}."
        )

    mcq_texts = {normalize(item["question"]) for item in mcqs}
    qa_texts = set()
    mcq_concepts = {normalize(item["concept"]) for item in mcqs}

    for question in questions:
        required = [
            "question",
            "expected_answer",
            "key_points",
            "concept",
        ]

        if not all(key in question for key in required):
            raise ValueError("A written question is missing required information.")

        normalized = normalize(question["question"])
        concept = normalize(question["concept"])

        if normalized in mcq_texts or normalized in qa_texts:
            raise ValueError(
                "Duplicate questions were generated. Generate the exam again."
            )

        if concept in mcq_concepts:
            raise ValueError(
                "A written question overlaps with an MCQ concept. "
                "Generate the exam again."
            )

        question["max_marks"] = 5
        qa_texts.add(normalized)

    return questions


def extract_text_from_image(image_bytes, mime_type, model=None):
    """Use a vision-capable OpenAI model to transcribe an answer image."""
    model_name = model or "gpt-4o"

    encoded_image = base64.b64encode(image_bytes).decode("utf-8")

    allowed_mime_types = {
        "image/png",
        "image/jpeg",
        "image/webp",
        "image/gif",
    }

    safe_mime_type = (
        mime_type
        if mime_type in allowed_mime_types
        else "image/jpeg"
    )

    image_url = f"data:{safe_mime_type};base64,{encoded_image}"

    llm = get_llm(model=model_name, temperature=0)

    response = llm.invoke(
        [
            (
                "system",
                "You are an OCR transcription assistant. Transcribe only "
                "the visible handwritten or printed answer. Preserve wording "
                "and line breaks as closely as possible. Do not answer or "
                "evaluate the question. If a word cannot be read, write "
                "[unclear].",
            ),
            (
                "human",
                [
                    {
                        "type": "text",
                        "text": (
                            "Transcribe the candidate's answer in this image."
                        ),
                    },
                    {
                        "type": "image_url",
                        "image_url": {"url": image_url},
                    },
                ],
            ),
        ]
    )

    content = response.content

    if isinstance(content, list):
        content = "\n".join(
            item.get("text", "") if isinstance(item, dict) else str(item)
            for item in content
        )

    return str(content).strip()


def evaluate_written_answer(
    question,
    expected_answer,
    key_points,
    answer,
):
    """Evaluate a written answer using AI."""
    if not answer or not answer.strip():
        return {
            "marks": 0,
            "feedback": "No answer was provided.",
            "missing_points": key_points,
        }

    prompt = f"""
Evaluate the candidate's written answer fairly.

Question:
{question}

Reference answer:
{expected_answer}

Expected key points:
{json.dumps(key_points, ensure_ascii=False)}

Candidate's answer:
{answer}

Maximum marks: 5

Rules:
- Give marks between 0 and 5.
- Award partial marks for correct points.
- Accept correct explanations written in different words.
- Focus on correctness, relevance, and understanding.
- Do not require exact wording.
- Do not award marks for unrelated content.
- Give short, constructive feedback.
- Identify important missing points.
- Return marks as a number.

Return ONLY valid JSON:
{{
  "marks": 0,
  "feedback": "Feedback for the candidate",
  "missing_points": ["Missing point"]
}}
"""

    result = ask_ai(prompt)

    try:
        marks = float(result.get("marks", 0))
    except (ValueError, TypeError):
        marks = 0

    marks = max(0, min(5, marks))

    missing_points = result.get("missing_points", [])

    if not isinstance(missing_points, list):
        missing_points = []

    return {
        "marks": round(marks, 2),
        "feedback": str(
            result.get("feedback", "Evaluation completed.")
        ),
        "missing_points": missing_points,
    }
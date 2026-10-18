
import os
import json
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI


# --------------------------------------------------
# 1. LOAD API KEY
# --------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent
ENV_PATH = BASE_DIR.parent / "api_keys.env"

load_dotenv(ENV_PATH, override=True)

API_KEY = os.getenv("OPENAI_API_KEY")

if not API_KEY:
    raise ValueError(
        f"OPENAI_API_KEY is missing. Please check: {ENV_PATH}"
    )

client = OpenAI(api_key=API_KEY)

MODEL = "gpt-3.5-turbo"


# --------------------------------------------------
# 2. HELPER FUNCTION TO GET JSON FROM OPENAI
# --------------------------------------------------

def get_json_response(prompt):
    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {
                "role": "system",
                "content": (
                    "You are an educational examination assistant. "
                    "Follow the requested JSON structure exactly. "
                    "Return valid JSON only."
                )
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        response_format={"type": "json_object"},
        temperature=0.3
    )

    content = response.choices[0].message.content

    if not content:
        raise ValueError("The AI returned an empty response.")

    return json.loads(content)


# --------------------------------------------------
# 3. GENERATE MULTIPLE-CHOICE QUESTIONS
# --------------------------------------------------

def generate_mcqs(topic, difficulty, number_of_questions):

    number_of_questions = max(
        1, min(int(number_of_questions), 10)
    )

    prompt = f"""
    Generate exactly {number_of_questions} multiple-choice
    questions for an examination.

    Topic: {topic}
    Difficulty: {difficulty}

    Return JSON in this format:

    {{
        "questions": [
            {{
                "question": "Question text",
                "options": [
                    "Option A",
                    "Option B",
                    "Option C",
                    "Option D"
                ],
                "answer": "Correct option text",
                "explanation": "Explanation of the answer",
                "concept": "Concept being tested"
            }}
        ]
    }}

    Requirements:
    1. Each question must have exactly four options.
    2. There must be exactly one correct answer.
    3. The answer must exactly match one of the options.
    4. Questions must match the requested difficulty.
    5. Questions should test different aspects of the topic.
    """

    data = get_json_response(prompt)
    questions = data.get("questions", [])

    validated_questions = []

    for question in questions:

        if not isinstance(question, dict):
            continue

        question_text = question.get("question")
        options = question.get("options")
        answer = question.get("answer")

        if not question_text or not isinstance(options, list):
            continue

        if len(options) != 4:
            continue

        if not all(isinstance(option, str) for option in options):
            continue

        if answer not in options:
            continue

        validated_questions.append({
            "question": question_text,
            "options": options,
            "answer": answer,
            "explanation": question.get(
                "explanation", "No explanation provided."
            ),
            "concept": question.get("concept", topic)
        })

    if not validated_questions:
        raise ValueError(
            "No valid MCQs were generated. Please try again."
        )

    return validated_questions


# --------------------------------------------------
# 4. GENERATE WRITTEN QUESTIONS
# --------------------------------------------------

def generate_qa_questions(
    topic,
    difficulty,
    number_of_questions,
    generated_mcqs=None
):

    number_of_questions = max(
        1, min(int(number_of_questions), 5)
    )

    mcq_context = ""

    if generated_mcqs:
        concepts = [
            question.get("concept", topic)
            for question in generated_mcqs
        ]

        mcq_context = (
            "Concepts already covered in the MCQs: "
            + ", ".join(concepts)
            + ". Avoid repeating the same questions."
        )

    prompt = f"""
    Generate exactly {number_of_questions} written-answer
    questions for an examination.

    Topic: {topic}
    Difficulty: {difficulty}

    {mcq_context}

    Return JSON in this format:

    {{
        "questions": [
            {{
                "question": "Written question",
                "expected_answer": "Model answer",
                "key_points": [
                    "Important point 1",
                    "Important point 2",
                    "Important point 3"
                ],
                "concept": "Concept being tested"
            }}
        ]
    }}

    Requirements:
    1. Questions must match the requested difficulty.
    2. Expected answers must be factually correct.
    3. Include important points needed for a good answer.
    4. Use clear and understandable language.
    """

    data = get_json_response(prompt)
    questions = data.get("questions", [])

    validated_questions = []

    for question in questions:

        if not isinstance(question, dict):
            continue

        question_text = question.get("question")
        expected_answer = question.get("expected_answer")
        key_points = question.get("key_points", [])

        if not question_text or not expected_answer:
            continue

        if not isinstance(key_points, list):
            key_points = []

        validated_questions.append({
            "question": question_text,
            "expected_answer": expected_answer,
            "key_points": key_points,
            "concept": question.get("concept", topic)
        })

    if not validated_questions:
        raise ValueError(
            "No valid written questions were generated. "
            "Please try again."
        )

    return validated_questions


# --------------------------------------------------
# 5. EVALUATE A CANDIDATE'S WRITTEN ANSWER
# --------------------------------------------------

def evaluate_written_answer(
    question,
    expected_answer,
    key_points,
    answer
):

    if not answer or not answer.strip():
        return {
            "marks": 0.0,
            "feedback": "No answer provided.",
            "missing_points": list(key_points)
        }

    prompt = f"""
    Evaluate a student's written examination answer.

    Question:
    {question}

    Expected answer:
    {expected_answer}

    Important key points:
    {json.dumps(key_points, ensure_ascii=False)}

    Student's answer:
    {answer}

    Maximum marks: 5

    Return JSON in this format:

    {{
        "marks": 4,
        "feedback": "Feedback explaining the score",
        "missing_points": [
            "Important point missing from the answer"
        ]
    }}

    Evaluation rules:
    1. Award marks from 0 to 5.
    2. Give partial marks for partially correct answers.
    3. Judge the meaning, not just exact word matching.
    4. Do not award marks for incorrect information.
    5. Be fair and consistent.
    6. List important missing key points.
    """

    data = get_json_response(prompt)

    try:
        marks = float(data.get("marks", 0))
    except (TypeError, ValueError):
        marks = 0.0

    marks = max(0.0, min(marks, 5.0))

    missing_points = data.get("missing_points", [])

    if not isinstance(missing_points, list):
        missing_points = []

    return {
        "marks": marks,
        "feedback": data.get(
            "feedback", "Evaluation completed."
        ),
        "missing_points": missing_points
    }

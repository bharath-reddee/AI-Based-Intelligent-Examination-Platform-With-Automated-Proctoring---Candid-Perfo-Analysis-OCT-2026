
import os
import json
from pathlib import Path

from dotenv import load_dotenv
from langchain_openai import ChatOpenAI

# --------------------------------------------------
# 1. LOAD API KEY
# --------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent
ENV_PATH = BASE_DIR.parent / "api_keys.env"

load_dotenv(ENV_PATH, override=True)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

print("Environment file exists:", ENV_PATH.exists())
print("OpenAI API key loaded:", bool(OPENAI_API_KEY))


# --------------------------------------------------
# 2. GENERATE MCQ QUESTIONS
# --------------------------------------------------

def generate_mcqs(topic, difficulty, number_of_questions):

    api_key = OPENAI_API_KEY

    if not ENV_PATH.exists():
        raise FileNotFoundError(
            f"API environment file not found: {ENV_PATH}"
        )

    if not api_key:
        raise ValueError(
            "OPENAI_API_KEY is missing from api_keys.env."
        )

    if not topic or not topic.strip():
        raise ValueError("Please provide a topic.")

    if not 1 <= number_of_questions <= 20:
        raise ValueError(
            "Number of questions must be between 1 and 20."
        )

    # Initialize the OpenAI model
    llm = ChatOpenAI(
        model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
        temperature=0.5,
        timeout=60,
        max_retries=1,
        api_key=api_key
    )

    # Prepare the prompt
    prompt = f"""
Generate exactly {number_of_questions} multiple-choice questions.

Topic: {topic}
Difficulty: {difficulty}

Requirements:
- Generate exactly {number_of_questions} questions.
- Each question must have four options labelled A, B, C and D.
- Exactly one option must be correct.
- Match the selected difficulty.
- Include a short explanation for every correct answer.
- Return valid JSON only, without Markdown code fences.

Required JSON format:
{{
    "questions": [
        {{
            "question": "Question text",
            "options": {{
                "A": "Option A",
                "B": "Option B",
                "C": "Option C",
                "D": "Option D"
            }},
            "answer": "A",
            "explanation": "Explanation of the correct answer"
        }}
    ]
}}
"""

    # Send the prompt to OpenAI
    response = llm.invoke(prompt)
    content = response.content

    # Handle responses containing content blocks
    if isinstance(content, list):
        content = "".join(
            block.get("text", "")
            for block in content
            if isinstance(block, dict)
        )

    content = content.strip()

    # Remove Markdown code fences if present
    if content.startswith("```"):
        lines = content.splitlines()

        if lines and lines[0].startswith("```"):
            lines = lines[1:]

        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]

        content = "\n".join(lines).strip()

    # Parse the JSON response
    try:
        result = json.loads(content)
    except json.JSONDecodeError as error:
        raise ValueError(
            f"The AI returned invalid JSON: {error}"
        ) from error

    if not isinstance(result, dict):
        raise ValueError(
            "The AI response must be a JSON object."
        )

    questions = result.get("questions")

    if not isinstance(questions, list):
        raise ValueError(
            "The AI response has no valid questions list."
        )

    if len(questions) != number_of_questions:
        raise ValueError(
            f"Expected {number_of_questions} questions, "
            f"but received {len(questions)}."
        )

    # Validate each generated question
    required_fields = {
        "question",
        "options",
        "answer",
        "explanation"
    }

    for index, question in enumerate(questions, start=1):

        if not isinstance(question, dict):
            raise ValueError(
                f"Question {index} is not a valid object."
            )

        if not required_fields.issubset(question):
            raise ValueError(
                f"Question {index} is missing required fields."
            )

        options = question["options"]

        if not isinstance(options, dict) or set(options) != {
            "A", "B", "C", "D"
        }:
            raise ValueError(
                f"Question {index} must contain options A, B, C and D."
            )

        if question["answer"] not in {"A", "B", "C", "D"}:
            raise ValueError(
                f"Question {index} has an invalid answer."
            )

        if not isinstance(question["question"], str):
            raise ValueError(
                f"Question {index} must have question text."
            )

        if not isinstance(question["explanation"], str):
            raise ValueError(
                f"Question {index} must have an explanation."
            )

    # Return the questions to app.py
    return questions

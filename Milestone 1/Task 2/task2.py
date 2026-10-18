
import json
import os
from pathlib import Path

import streamlit as st
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI

# --------------------------------------------------
# 1. LOAD API KEY
# --------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent

ENV_PATH = BASE_DIR / "api_keys.env"

if not ENV_PATH.exists():
    ENV_PATH = BASE_DIR.parent / "api_keys.env"

load_dotenv(ENV_PATH, override=True)



api_key = os.getenv("OPENAI_API_KEY")

# --------------------------------------------------
# 2. PAGE CONFIGURATION
# --------------------------------------------------

st.set_page_config(
    page_title="CSM Exam Prep | AI MCQ Generator",
    page_icon="🎓",
    layout="wide"
)

# --------------------------------------------------
# 3. CUSTOM CSS
# --------------------------------------------------

st.markdown("""
<style>
.stApp {
    background-color: #f1f5f9;
    color: #172554;
}

.block-container {
    max-width: 1150px;
    padding-top: 2rem;
    padding-bottom: 3rem;
}

.hero {
    background: linear-gradient(120deg, #0f172a, #164e63, #0891b2);
    padding: 36px;
    border-radius: 18px;
    margin-bottom: 28px;
    border-bottom: 4px solid #22d3ee;
}

.hero h1 {
    color: #ffffff !important;
    font-size: 36px;
    font-weight: 750;
    margin-bottom: 10px;
}

.hero p {
    color: #cffafe !important;
    font-size: 16px;
}

h1, h2, h3, h4, p, label {
    color: #172554;
}

div[data-testid="stWidgetLabel"] p,
div[data-testid="stWidgetLabel"] label {
    color: #1e3a5f !important;
    font-weight: 600;
}

div[data-testid="stMetric"] {
    background: #ffffff;
    border: 1px solid #dbeafe;
    border-radius: 12px;
    padding: 16px;
}

.question-card {
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-left: 5px solid #0891b2;
    border-radius: 12px;
    padding: 18px;
    margin: 20px 0 10px;
}

.question-title {
    color: #0f172a !important;
    font-size: 17px;
    font-weight: 700;
}

.option {
    background: #ffffff;
    border: 1px solid #dbeafe;
    padding: 12px 15px;
    border-radius: 9px;
    margin: 7px 0;
    color: #334155 !important;
}

.option b {
    color: #0891b2 !important;
}

div.stButton > button {
    background: #0891b2;
    color: #ffffff !important;
    border: none;
    border-radius: 9px;
    padding: 12px 18px;
    font-weight: 650;
}

div.stButton > button:hover {
    background: #0e7490;
    color: #ffffff !important;
}

hr {
    border-color: #cbd5e1;
}
</style>
""", unsafe_allow_html=True)

# --------------------------------------------------
# 4. HEADER
# --------------------------------------------------

st.markdown("""
<div class="hero">
    <h1>🎓 CSM Exam Prep</h1>
    <p>
        AI-powered practice for Computer Science and Engineering
        students specializing in Artificial Intelligence and Machine Learning.
        Generate MCQs, revise concepts, and prepare for examinations.
    </p>
</div>
""", unsafe_allow_html=True)

# --------------------------------------------------
# 5. DASHBOARD INTRODUCTION
# --------------------------------------------------

st.subheader("Your CSM Study Dashboard")

col1, col2, col3 = st.columns(3)

with col1:
    st.markdown("### 📚")
    st.markdown("**CSM Subjects**")
    st.write("Explore core AI, ML, and computer science subjects.")

with col2:
    st.markdown("### 🧠")
    st.markdown("**AI-Generated MCQs**")
    st.write("Practice questions with answer explanations.")

with col3:
    st.markdown("### 🎯")
    st.markdown("**Exam Preparation**")
    st.write("Customize your difficulty and question count.")

st.divider()

# --------------------------------------------------
# 6. CSM SUBJECTS
# --------------------------------------------------

subjects = [
    "Engineering Mathematics",
    "Python Programming",
    "Java Programming",
    "Data Structures",
    "Design and Analysis of Algorithms",
    "Object-Oriented Programming",
    "Probability and Statistics",
    "Linear Algebra",
    "Database Management Systems",
    "Operating Systems",
    "Computer Networks",
    "Computer Organization and Architecture",
    "Artificial Intelligence",
    "Machine Learning",
    "Deep Learning",
    "Neural Networks",
    "Natural Language Processing",
    "Computer Vision",
    "Data Mining",
    "Big Data Analytics",
    "Exploratory Data Analysis",
    "Data Visualization",
    "Statistical Modeling",
    "Cloud Computing",
    "Software Engineering",
]

# --------------------------------------------------
# 7. QUIZ CONFIGURATION
# --------------------------------------------------

st.subheader("⚙️ Configure Your Practice Test")
st.write("Choose your subject, difficulty, and number of questions.")

col1, col2 = st.columns(2)

with col1:
    subject = st.selectbox(
        "📘 Select CSM Subject",
        subjects
    )

with col2:
    difficulty = st.selectbox(
        "🎯 Difficulty Level",
        ["Easy", "Medium", "Hard"]
    )

col1, col2 = st.columns(2)

with col1:
    number_of_questions = st.number_input(
        "🔢 Number of Questions",
        min_value=1,
        max_value=20,
        value=5,
        step=1
    )

with col2:
    st.markdown("**Question Format**")
    st.info("4 options per question • 1 correct answer")

custom_topic = st.text_input(
    "📝 Specific Unit or Topic (Optional)",
    placeholder="Example: Decision Trees, Unit 3, Neural Networks"
)

st.caption(
    "Leave the topic blank to generate questions from the selected subject."
)

generate = st.button(
    "🚀 Generate CSM MCQs",
    use_container_width=True,
    type="primary"
)

# --------------------------------------------------
# 8. GENERATE MCQs
# --------------------------------------------------

if generate:

    if not api_key:
        st.error(
            "OpenAI API key not found. Check that api_keys.env "
            "is in the same folder as task2.py and contains "
            "OPENAI_API_KEY=your_actual_key."
        )

    else:
        selected_topic = subject

        if custom_topic.strip():
            selected_topic += " - " + custom_topic.strip()

        prompt = f"""
You are an experienced university-level B.Tech CSM examination setter.

Generate exactly {number_of_questions} multiple-choice questions.

Branch: CSM - Computer Science and Engineering (AI & ML)
Subject: {subject}
Specific topic: {custom_topic.strip() or "General subject syllabus"}
Difficulty: {difficulty}

Requirements:
1. Questions must be relevant to the selected subject and CSM syllabus.
2. Match the requested difficulty level.
3. Cover important concepts, applications, and problem-solving.
4. Avoid duplicate questions.
5. Every question must have exactly four options: A, B, C, D.
6. Exactly one option must be correct.
7. Ensure every correct answer is technically accurate.
8. Provide a short explanation for each correct answer.
9. Return valid JSON only, without Markdown code fences.
10. Generate exactly {number_of_questions} questions.

Required JSON structure:
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
            "explanation": "Explanation of the correct answer"
        }}
    ]
}}
"""

        try:
            llm = ChatOpenAI(
                model="gpt-3.5-turbo",
                temperature=0.5,
                timeout=60,
                max_retries=1
            )

            with st.spinner("Generating your CSM practice questions..."):
                response = llm.invoke(prompt)
                result_text = response.content

                if isinstance(result_text, list):
                    result_text = "".join(
                        block.get("text", "")
                        for block in result_text
                        if isinstance(block, dict)
                    )

                result_text = result_text.strip()

                if result_text.startswith("```"):
                    result_text = result_text.split("\n", 1)[1]
                    result_text = result_text.rsplit("```", 1)[0].strip()

                result = json.loads(result_text)
                questions = result.get("questions", [])

                if not questions:
                    st.error("No questions were generated.")

                else:
                    st.session_state["mcq_questions"] = questions
                    st.session_state["mcq_topic"] = selected_topic
                    st.session_state["mcq_subject"] = subject
                    st.session_state["mcq_difficulty"] = difficulty

        except Exception as e:
            st.error(f"Unable to generate questions: {e}")

# --------------------------------------------------
# 9. DISPLAY GENERATED QUIZ
# --------------------------------------------------

if "mcq_questions" in st.session_state:

    questions = st.session_state["mcq_questions"]

    st.divider()
    st.header("📋 Your Generated Practice Test")

    col1, col2, col3 = st.columns(3)

    with col1:
        st.metric("Branch", "CSM")

    with col2:
        st.metric(
            "Difficulty",
            st.session_state["mcq_difficulty"]
        )

    with col3:
        st.metric("Total Questions", len(questions))

    st.markdown(
        f"**Subject and topic:** {st.session_state['mcq_topic']}"
    )

    show_answers = st.checkbox(
        "👁️ Show correct answers and explanations"
    )

    st.divider()

    for index, item in enumerate(questions, start=1):

        st.markdown(
            f'<div class="question-card">'
            f'<div class="question-title">'
            f'Q{index}. {item["question"]}'
            f'</div></div>',
            unsafe_allow_html=True
        )

        options = item["options"]

        for label in ["A", "B", "C", "D"]:
            st.markdown(
                f'<div class="option">'
                f'<b>{label})</b> {options[label]}'
                f'</div>',
                unsafe_allow_html=True
            )

        if show_answers:
            answer = item.get("answer", "")

            if answer in options:
                st.success(
                    f'Correct Answer: {answer}) {options[answer]}'
                )

                st.info(
                    "Explanation: "
                    + item.get(
                        "explanation",
                        "No explanation provided."
                    )
                )
            else:
                st.warning(
                    f"Invalid answer for Question {index}."
                )

        st.write("")

# --------------------------------------------------
# 10. FOOTER
# --------------------------------------------------

st.divider()

st.markdown(
    "<div style='text-align:center; color:#64748b;'>"
    "CSM Exam Prep | AI-Powered Engineering Practice"
    "</div>",
    unsafe_allow_html=True
)
# python -m streamlit run ".\Milestone 1\task2.py"
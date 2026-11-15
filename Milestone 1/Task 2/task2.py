"""
Task 2: CSM Exam Prep - AI-Powered MCQ Practice Generator
Specialized practice test platform for Computer Science & Engineering (AI & ML) students.
Features 25 core curriculum subjects, custom unit selection, difficulty control,
and instant solution breakdown.
"""

import json
import os
import sys
from pathlib import Path
import streamlit as st
from dotenv import load_dotenv

# --------------------------------------------------
# 1. Environment & Path Setup
# --------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from ui_theme import DARK_THEME_CSS, render_hero, render_footer

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

openai_api_key = os.getenv("OPENAI_API_KEY", "").strip()
google_api_key = os.getenv("GOOGLE_API_KEY", "").strip()
raw_model = os.getenv("OPENAI_MODEL", "gpt-4o-mini").strip()
default_model = "gpt-4o-mini" if raw_model in ("gpt-3.5-turbo", "gpt-3.5-turbo-0125", "") else raw_model

# --------------------------------------------------
# 2. Curriculum Subjects List (Preserved)
# --------------------------------------------------
CSM_SUBJECTS = [
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
# 3. MCQ Generation Core
# --------------------------------------------------
def generate_csm_mcqs(subject_name, topic_focus, diff_level, count):
    """Generate university-grade MCQs with reliable JSON extraction and fallback."""
    if not openai_api_key and not google_api_key:
        raise ValueError(
            "No API key detected. Please configure OPENAI_API_KEY or GOOGLE_API_KEY in api_keys.env."
        )

    prompt = f"""
You are an experienced university-level B.Tech CSM (Computer Science & Engineering in AI & ML) examination setter.

Generate exactly {count} multiple-choice questions for the following specification:
- Branch: CSM - Computer Science and Engineering (AI & ML)
- Subject: {subject_name}
- Specific Focus: {topic_focus or "General subject curriculum"}
- Difficulty: {diff_level}

Requirements:
1. Questions must be strictly relevant to the B.Tech CSM syllabus.
2. Match the requested difficulty level accurately.
3. Every question must have exactly four options labeled A, B, C, and D.
4. Exactly one option must be correct.
5. Provide a clear, technically sound explanation for why the correct answer is right.
6. Return ONLY valid JSON without markdown code fences or conversational text.

Required JSON structure:
{{
    "questions": [
        {{
            "question": "Question text here",
            "options": {{
                "A": "First option",
                "B": "Second option",
                "C": "Third option",
                "D": "Fourth option"
            }},
            "answer": "A",
            "explanation": "Detailed rationale for the answer."
        }}
    ]
}}
"""

    raw_text = ""
    if openai_api_key:
        from langchain_openai import ChatOpenAI
        llm = ChatOpenAI(
            model=default_model,
            temperature=0.4,
            timeout=60,
            max_retries=2,
            api_key=openai_api_key,
        )
        response = llm.invoke(prompt)
        raw_text = response.content
    elif google_api_key:
        from langchain_google_genai import ChatGoogleGenerativeAI
        gemini_model_name = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
        llm = ChatGoogleGenerativeAI(
            model=gemini_model_name,
            temperature=0.4,
            timeout=60,
            max_retries=2,
            google_api_key=google_api_key,
        )
        response = llm.invoke(prompt)
        raw_text = response.content

    if isinstance(raw_text, list):
        raw_text = "".join(b.get("text", "") for b in raw_text if isinstance(b, dict))
    raw_text = str(raw_text).strip()

    if raw_text.startswith("```"):
        raw_text = raw_text.split("\n", 1)[1]
        raw_text = raw_text.rsplit("```", 1)[0].strip()

    try:
        data = json.loads(raw_text)
    except json.JSONDecodeError:
        start = raw_text.find("{")
        end = raw_text.rfind("}")
        if start != -1 and end != -1:
            data = json.loads(raw_text[start:end+1])
        else:
            raise ValueError("AI response did not contain valid JSON.")

    questions = data.get("questions", [])
    if not isinstance(questions, list) or len(questions) == 0:
        raise ValueError("No questions found in AI response.")

    validated = []
    for idx, q in enumerate(questions, start=1):
        if not isinstance(q, dict):
            continue
        q_text = q.get("question", "").strip()
        opts = q.get("options", {})
        ans = q.get("answer", "").strip().upper()
        expl = q.get("explanation", "Verified correct option.").strip()

        if not q_text or not isinstance(opts, dict):
            continue
        if set(opts.keys()) != {"A", "B", "C", "D"}:
            continue
        if ans not in {"A", "B", "C", "D"}:
            continue

        validated.append({
            "question": q_text,
            "options": opts,
            "answer": ans,
            "explanation": expl,
        })

    if not validated:
        raise ValueError("Failed to validate generated questions schema.")
    return validated

# --------------------------------------------------
# 4. Streamlit Application View Logic
# --------------------------------------------------
def main():
    st.set_page_config(
        page_title="CSM Exam Prep | AI Practice Generator",
        page_icon="🎓",
        layout="wide",
        initial_sidebar_state="collapsed",
    )

    st.markdown(DARK_THEME_CSS, unsafe_allow_html=True)

    render_hero(
        title="🎓 CSM Engineering Exam Prep",
        subtitle=(
            "AI-powered practice platform for Computer Science & Engineering students "
            "specializing in Artificial Intelligence and Machine Learning. Generate curriculum-aligned "
            "MCQs, test your problem-solving depth, and review comprehensive explanations."
        ),
        badge="B.TECH CSM PRACTICE ENGINE • TASK 2"
    )

    col1, col2, col3 = st.columns(3)
    with col1:
        st.markdown(
            """
            <div class="question-card" style="margin-top:0;">
                <div style="font-size:1.5rem; margin-bottom:8px;">📚</div>
                <div style="font-weight:700; color:#F8FAFC; margin-bottom:4px;">25 CSM Subjects</div>
                <div style="font-size:0.88rem; color:#94A3B8;">Full coverage across AI, ML, Systems, and Core Computer Science.</div>
            </div>
            """,
            unsafe_allow_html=True
        )
    with col2:
        st.markdown(
            """
            <div class="question-card" style="margin-top:0;">
                <div style="font-size:1.5rem; margin-bottom:8px;">🧠</div>
                <div style="font-weight:700; color:#F8FAFC; margin-bottom:4px;">Rigorous Question Engine</div>
                <div style="font-size:0.88rem; color:#94A3B8;">Single-choice questions formatted to university standard with rationale.</div>
            </div>
            """,
            unsafe_allow_html=True
        )
    with col3:
        st.markdown(
            """
            <div class="question-card" style="margin-top:0;">
                <div style="font-size:1.5rem; margin-bottom:8px;">🎯</div>
                <div style="font-weight:700; color:#F8FAFC; margin-bottom:4px;">Adaptive Difficulty</div>
                <div style="font-size:0.88rem; color:#94A3B8;">Tailor test depth from foundational recall to complex problem-solving.</div>
            </div>
            """,
            unsafe_allow_html=True
        )

    st.divider()

    st.subheader("⚙️ Configure Your Practice Test")
    st.write("Customize your subject focus, target syllabus unit, and evaluation difficulty.")

    col1, col2 = st.columns(2)
    with col1:
        subject = st.selectbox(
            "📘 Select CSM Subject",
            CSM_SUBJECTS,
            index=0,
            help="Select a core subject from the official B.Tech CSM curriculum."
        )
    with col2:
        difficulty = st.selectbox(
            "🎯 Difficulty Level",
            ["Easy", "Medium", "Hard"],
            index=1,
            help="Select appropriate depth of conceptual assessment."
        )

    col1, col2 = st.columns(2)
    with col1:
        number_of_questions = st.number_input(
            "🔢 Number of Questions",
            min_value=1,
            max_value=20,
            value=5,
            step=1,
            help="Choose between 1 and 20 practice questions."
        )
    with col2:
        st.markdown("**Question Standard & Format**")
        st.info("4 options per question (A, B, C, D) • Exactly 1 verified correct answer")

    custom_topic = st.text_input(
        "📝 Specific Unit or Topic (Optional)",
        placeholder="e.g., Graph Neural Networks, Unit 3: Dynamic Programming, Eigenvalues",
        help="Leave blank to cover the general syllabus of the selected subject."
    )

    generate = st.button(
        "🚀 Generate CSM Practice MCQs",
        use_container_width=True,
        type="primary"
    )

    if generate:
        topic_label = subject
        if custom_topic.strip():
            topic_label += f" — {custom_topic.strip()}"

        with st.spinner("Generating rigorous CSM practice questions..."):
            try:
                questions = generate_csm_mcqs(
                    subject_name=subject,
                    topic_focus=custom_topic.strip(),
                    diff_level=difficulty,
                    count=int(number_of_questions),
                )
                st.session_state["mcq_questions"] = questions
                st.session_state["mcq_topic"] = topic_label
                st.session_state["mcq_subject"] = subject
                st.session_state["mcq_difficulty"] = difficulty
                st.success(f"Generated {len(questions)} CSM questions successfully!")
            except Exception as err:
                st.error(f"Generation error: {err}")
                with st.expander("Technical details"):
                    st.code(str(err))

    if "mcq_questions" in st.session_state and st.session_state["mcq_questions"]:
        questions = st.session_state["mcq_questions"]

        st.divider()
        st.subheader("📋 Your Generated Practice Test")

        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("Branch / Track", "B.Tech CSM")
        with col2:
            st.metric("Difficulty", st.session_state.get("mcq_difficulty", "Medium"))
        with col3:
            st.metric("Total Questions", len(questions))

        st.markdown(f"**Curriculum Scope:** `{st.session_state.get('mcq_topic', '')}`")

        show_answers = st.checkbox(
            "👁️ Reveal Correct Answers and Technical Explanations",
            value=False,
            help="Toggle to view step-by-step rationales for each option."
        )

        st.write("")

        for index, item in enumerate(questions, start=1):
            st.markdown(
                f"""
                <div class="question-card">
                    <span class="question-meta">QUESTION {index} OF {len(questions)}</span>
                    <div class="question-title" style="margin-top:6px;">{item["question"]}</div>
                </div>
                """,
                unsafe_allow_html=True
            )

            options = item["options"]
            for label in ["A", "B", "C", "D"]:
                st.markdown(
                    f"""
                    <div class="option-item">
                        <span class="option-badge">{label}</span>
                        <span>{options[label]}</span>
                    </div>
                    """,
                    unsafe_allow_html=True
                )

            if show_answers:
                answer = item.get("answer", "")
                if answer in options:
                    st.success(f"**Correct Option:** **{answer}**) {options[answer]}")
                    st.info(f"**Technical Explanation:** {item.get('explanation', 'No explanation provided.')}")
                else:
                    st.warning(f"Answer key not found for Question {index}.")

            st.write("")

    render_footer(task_label="Task 2 • CSM Practice Engine")

if __name__ == "__main__":
    main()

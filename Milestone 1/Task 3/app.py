"""
Task 3: Interactive MCQ Quiz Application
Interactive examination workflow with real-time test execution, automated submission,
score breakdown, and detailed question-by-question technical review.
"""

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
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

# Ensure task-local mcq_generator is imported
if "mcq_generator" in sys.modules:
    del sys.modules["mcq_generator"]

from ui_theme import DARK_THEME_CSS, render_hero, render_footer
from mcq_generator import generate_mcqs

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

# --------------------------------------------------
# 2. Reset Helper
# --------------------------------------------------
def reset_task3_exam():
    st.session_state.questions = []
    st.session_state.user_answers = {}
    st.session_state.submitted = False
    st.session_state.quiz_topic = ""
    st.session_state.quiz_difficulty = ""

# --------------------------------------------------
# 3. Main Streamlit Execution
# --------------------------------------------------
def main():
    st.set_page_config(
        page_title="AI MCQ Quiz Engine | Task 3",
        page_icon="📝",
        layout="wide",
        initial_sidebar_state="collapsed",
    )

    st.markdown(DARK_THEME_CSS, unsafe_allow_html=True)

    if "questions" not in st.session_state:
        st.session_state.questions = []
    if "user_answers" not in st.session_state:
        st.session_state.user_answers = {}
    if "submitted" not in st.session_state:
        st.session_state.submitted = False
    if "quiz_topic" not in st.session_state:
        st.session_state.quiz_topic = ""
    if "quiz_difficulty" not in st.session_state:
        st.session_state.quiz_difficulty = ""

    render_hero(
        title="📝 Interactive AI MCQ Quiz Platform",
        subtitle=(
            "Generate topic-specific multiple-choice assessments, test your understanding in real time, "
            "and receive an instant breakdown of your score with technical explanations."
        ),
        badge="DYNAMIC QUIZ PLATFORM • TASK 3"
    )

    TOPIC_OPTIONS = [
        "Python Programming",
        "Java Programming",
        "C Programming",
        "Data Structures",
        "DBMS",
        "Operating Systems",
        "Computer Networks",
        "Artificial Intelligence",
        "Machine Learning",
        "HTML and CSS",
        "Other",
    ]

    st.subheader("⚙️ Create Your Quiz")
    st.write("Select your subject focus, target difficulty, and desired question count.")

    with st.container():
        col1, col2 = st.columns(2)
        with col1:
            selected_topic = st.selectbox(
                "Choose a Topic",
                TOPIC_OPTIONS,
                key="topic_selector"
            )
        with col2:
            difficulty = st.selectbox(
                "Select Difficulty",
                ["Easy", "Medium", "Hard"],
                index=1,
                key="diff_selector"
            )

        topic = selected_topic
        if selected_topic == "Other":
            custom_topic = st.text_input(
                "Enter Custom Topic Name",
                placeholder="e.g., Cloud Architecture, Discrete Mathematics"
            )
            topic = custom_topic.strip()

        number_of_questions = st.number_input(
            "Number of Questions",
            min_value=1,
            max_value=20,
            value=5,
            step=1
        )

        generate_clicked = st.button(
            "🚀 Generate Questions",
            use_container_width=True,
            type="primary"
        )

    if generate_clicked:
        if not topic:
            st.warning("Please specify a topic name before generating questions.")
        else:
            try:
                with st.spinner("Generating conceptual quiz questions with AI..."):
                    questions = generate_mcqs(
                        topic=topic,
                        difficulty=difficulty,
                        number_of_questions=int(number_of_questions),
                    )

                if not questions:
                    st.error("No questions could be generated. Please try again.")
                else:
                    st.session_state.questions = questions
                    st.session_state.user_answers = {}
                    st.session_state.submitted = False
                    st.session_state.quiz_topic = topic
                    st.session_state.quiz_difficulty = difficulty
                    st.success("Your practice test is ready! Scroll down to begin.")
                    st.rerun()

            except Exception as error:
                st.error("Unable to generate questions. Verify API key and configuration.")
                with st.expander("Technical error details"):
                    st.code(str(error))

    questions = st.session_state.questions

    if questions:
        st.divider()
        st.markdown("## 📝 Your Practice Test")
        st.markdown(
            f"**Topic:** `{st.session_state.quiz_topic}` &nbsp;|&nbsp; "
            f"**Difficulty:** `{st.session_state.quiz_difficulty}` &nbsp;|&nbsp; "
            f"**Total Questions:** `{len(questions)}`"
        )

        if not st.session_state.submitted:
            st.info("Select one answer for each question, then click **Submit Test** below.")

            with st.form("quiz_form"):
                selected_answers = {}

                for index, question in enumerate(questions):
                    st.markdown(
                        f"""
                        <div class="question-card">
                            <span class="question-meta">QUESTION {index + 1} OF {len(questions)}</span>
                            <div class="question-title" style="margin-top:6px;">{question["question"]}</div>
                        </div>
                        """,
                        unsafe_allow_html=True
                    )

                    options = question["options"]
                    option_labels = ["Not answered", "A", "B", "C", "D"]

                    previous_ans = st.session_state.user_answers.get(index, "Not answered")
                    default_idx = (
                        option_labels.index(previous_ans)
                        if previous_ans in option_labels
                        else 0
                    )

                    selected = st.radio(
                        f"Choose your answer for Question {index + 1}",
                        options=option_labels,
                        format_func=lambda c, opts=options: (
                            "Not answered" if c == "Not answered" else f"{c}. {opts.get(c, '')}"
                        ),
                        index=default_idx,
                        key=f"task3_q_{index}",
                        label_visibility="collapsed"
                    )

                    if selected and selected != "Not answered":
                        selected_answers[index] = selected

                    st.write("")

                submitted = st.form_submit_button(
                    "Submit Test for Evaluation",
                    use_container_width=True
                )

            if submitted:
                st.session_state.user_answers = selected_answers
                st.session_state.submitted = True
                st.rerun()

        else:
            correct_count = 0
            wrong_count = 0
            unanswered_count = 0

            for index, question in enumerate(questions):
                correct_ans = question["answer"].strip().upper()
                user_ans = st.session_state.user_answers.get(index)

                if not user_ans:
                    unanswered_count += 1
                elif user_ans == correct_ans:
                    correct_count += 1
                else:
                    wrong_count += 1

            total_questions = len(questions)
            percentage = (correct_count / total_questions * 100) if total_questions else 0.0

            st.markdown("## 📊 Evaluation Results")

            st.markdown(
                f"""
                <div class="edtech-hero" style="border-left-color: {'#22C55E' if percentage >= 70 else '#F59E0B'};">
                    <span class="edtech-badge">{"EXCELLENT MASTERY" if percentage >= 70 else "PRACTICE RECOMMENDED"}</span>
                    <h1 style="font-size:2.5rem; margin-bottom:4px;">{percentage:.1f}%</h1>
                    <p>You scored <strong>{correct_count}</strong> out of <strong>{total_questions}</strong> questions correctly.</p>
                </div>
                """,
                unsafe_allow_html=True
            )

            col1, col2, col3 = st.columns(3)
            with col1:
                st.metric("Correct Answers", correct_count)
            with col2:
                st.metric("Incorrect Answers", wrong_count)
            with col3:
                st.metric("Unanswered", unanswered_count)

            st.progress(min(1.0, max(0.0, percentage / 100)))

            st.divider()
            st.subheader("🔍 Detailed Question Review")

            for index, question in enumerate(questions):
                correct_ans = question["answer"].strip().upper()
                user_ans = st.session_state.user_answers.get(index)

                if not user_ans:
                    status_badge = "⚪ Unanswered"
                elif user_ans == correct_ans:
                    status_badge = "🟢 Correct"
                else:
                    status_badge = "🔴 Incorrect"

                with st.expander(f"Question {index + 1}: {question['question'][:90]}... — {status_badge}"):
                    st.markdown(f"**Question:** {question['question']}")
                    options = question["options"]

                    for letter in ["A", "B", "C", "D"]:
                        opt_text = options[letter]
                        if letter == correct_ans:
                            st.markdown(f"**{letter}. {opt_text}** `✓ Correct Answer`")
                        elif letter == user_ans:
                            st.markdown(f"**{letter}. {opt_text}** `✗ Your Selection`")
                        else:
                            st.markdown(f"{letter}. {opt_text}")

                    st.write("")
                    if user_ans:
                        st.write(f"**Your Choice:** {user_ans}. {options.get(user_ans, '')}")
                    else:
                        st.write("**Your Choice:** Not answered")

                    st.write(f"**Correct Answer:** {correct_ans}. {options.get(correct_ans, '')}")

                    st.info(f"**Technical Explanation:** {question.get('explanation', 'No explanation provided.')}")

            st.divider()
            if st.button("🔄 Create Another Quiz", use_container_width=True):
                reset_task3_exam()
                st.rerun()

    render_footer(task_label="Task 3 • Dynamic Quiz Engine")

if __name__ == "__main__":
    main()

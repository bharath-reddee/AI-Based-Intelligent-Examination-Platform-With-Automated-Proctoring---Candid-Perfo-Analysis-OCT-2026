"""
Task 4: Dual-Format Examination Platform
Section A (Multiple-Choice Questions) • Section B (Written Q&A) •
AI-Powered Descriptive Answer Grading • Concept Mastery Performance Tracking.
"""

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
from mcq_generator import (
    generate_mcqs,
    generate_qa_questions,
    evaluate_written_answer,
)

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
defaults = {
    "mcqs": None,
    "qa_questions": None,
    "results": None,
    "exam_topic": "",
    "exam_difficulty": "",
}

def reset_task4_exam():
    for k, v in defaults.items():
        st.session_state[k] = v

# --------------------------------------------------
# 3. Main Streamlit Execution
# --------------------------------------------------
def main():
    st.set_page_config(
        page_title="Intelligent Exam Platform | Task 4",
        page_icon="📝",
        layout="wide",
        initial_sidebar_state="collapsed",
    )

    st.markdown(DARK_THEME_CSS, unsafe_allow_html=True)

    for k, v in defaults.items():
        if k not in st.session_state:
            st.session_state[k] = v

    render_hero(
        title="📝 Dual-Format Examination Platform",
        subtitle=(
            "Comprehensive assessment suite featuring objective Section A multiple-choice evaluation "
            "and Section B in-depth written problem analysis with automated AI rubric grading."
        ),
        badge="DUAL-SECTION EVALUATION ENGINE • TASK 4"
    )

    st.subheader("⚙️ Configure Your Examination")

    col1, col2, col3, col4 = st.columns(4)
    with col1:
        topic_selection = st.selectbox(
            "Select Academic Topic",
            [
                "Python", "Java", "C Programming", "Data Structures", "DBMS",
                "Operating Systems", "Computer Networks", "Artificial Intelligence",
                "Machine Learning", "HTML and CSS", "Other"
            ],
            index=0,
        )
    with col2:
        difficulty = st.selectbox("Difficulty Level", ["Easy", "Medium", "Hard"], index=1)
    with col3:
        mcq_count = st.number_input("Number of MCQs", min_value=1, max_value=10, value=5, step=1)
    with col4:
        qa_count = st.number_input("Number of Written Q&A", min_value=1, max_value=5, value=3, step=1)

    custom_topic = ""
    if topic_selection == "Other":
        custom_topic = st.text_input("Specify Topic", placeholder="e.g., Cryptography & Network Security")
    final_topic = custom_topic.strip() if topic_selection == "Other" else topic_selection

    st.caption("Configures objective MCQs (1 mark each) and written descriptive questions (5 marks each).")

    if st.button("🚀 Generate Examination", use_container_width=True, type="primary"):
        if not final_topic:
            st.warning("Please specify a valid topic name.")
        else:
            reset_task4_exam()
            with st.spinner("Generating correlated MCQs and non-overlapping written questions..."):
                try:
                    gen_mcqs = generate_mcqs(final_topic, difficulty, int(mcq_count))
                    gen_qa = generate_qa_questions(final_topic, difficulty, int(qa_count), gen_mcqs)

                    if not gen_mcqs or not gen_qa:
                        raise ValueError("Generation produced an incomplete test set.")

                    st.session_state.mcqs = gen_mcqs
                    st.session_state.qa_questions = gen_qa
                    st.session_state.exam_topic = final_topic
                    st.session_state.exam_difficulty = difficulty
                    st.success("Examination prepared successfully! Proceed to answering below.")
                    st.rerun()

                except Exception as err:
                    st.error("Unable to generate the examination. Check model access and configuration.")
                    with st.expander("Technical details"):
                        st.code(str(err))

    mcqs = st.session_state.mcqs
    qa_questions = st.session_state.qa_questions

    if mcqs and qa_questions and st.session_state.results is None:
        st.divider()
        st.markdown(f"## 📋 Examination Paper: `{st.session_state.exam_topic}`")
        st.markdown(
            f"**Difficulty:** `{st.session_state.exam_difficulty}` &nbsp;|&nbsp; "
            f"**Structure:** `{len(mcqs)} MCQs` (1 mark each) + `{len(qa_questions)} Written Q&A` (5 marks each)"
        )
        st.info("Answer both sections before clicking **Submit Examination**. Written answers are evaluated by AI.")

        with st.form("task4_examination_form"):
            st.markdown("### Section A: Multiple-Choice Questions (1 Mark Each)")
            st.write("Select the single most accurate option for each question.")
            mcq_answers = {}

            for index, question in enumerate(mcqs):
                st.markdown(
                    f"""
                    <div class="question-card">
                        <span class="question-meta">QUESTION {index + 1} OF {len(mcqs)} • CONCEPT: {question.get('concept', 'General')}</span>
                        <div class="question-title" style="margin-top:6px;">{question["question"]}</div>
                    </div>
                    """,
                    unsafe_allow_html=True
                )

                options = question.get("options", [])
                selected = st.radio(
                    f"MCQ {index + 1} Option",
                    options=["Not answered", "A", "B", "C", "D"],
                    format_func=lambda c, opts=options: (
                        "Not answered" if c == "Not answered"
                        else f"{c}. {opts[ord(c) - ord('A')]}"
                    ),
                    key=f"task4_mcq_{index}",
                    label_visibility="collapsed"
                )
                mcq_answers[index] = selected

            st.divider()

            st.markdown("### Section B: Descriptive Written Questions (5 Marks Each)")
            st.write("Provide clear, technical explanations. Partial credit is awarded based on demonstrated understanding.")
            written_answers = {}

            for index, question in enumerate(qa_questions):
                st.markdown(
                    f"""
                    <div class="question-card">
                        <span class="question-meta">WRITTEN QUESTION {index + 1} OF {len(qa_questions)} • MAX MARKS: 5.0 • CONCEPT: {question.get('concept', 'General')}</span>
                        <div class="question-title" style="margin-top:6px;">{question["question"]}</div>
                    </div>
                    """,
                    unsafe_allow_html=True
                )

                written_answers[index] = st.text_area(
                    f"Candidate Response for Q{index + 1}",
                    placeholder="Type your structured solution, architectural explanation, or proof here...",
                    height=130,
                    key=f"task4_qa_{index}"
                )

            submit_exam = st.form_submit_button(
                "Finalize & Submit Examination",
                use_container_width=True
            )

        if submit_exam:
            with st.spinner("AI Engine is grading objective MCQs and evaluating descriptive answers..."):
                try:
                    mcq_results = []
                    mcq_score = 0
                    mcq_correct = 0
                    mcq_incorrect = 0
                    mcq_unanswered = 0
                    concept_results = {}

                    for index, question in enumerate(mcqs):
                        selected = mcq_answers[index]
                        correct = question["answer"]
                        options = question["options"]

                        selected_text = (
                            options[ord(selected) - ord("A")]
                            if selected in ("A", "B", "C", "D")
                            else None
                        )
                        is_correct = bool(selected_text and selected_text.strip() == correct.strip())

                        if selected == "Not answered":
                            mcq_unanswered += 1
                        elif is_correct:
                            mcq_correct += 1
                            mcq_score += 1
                        else:
                            mcq_incorrect += 1

                        c_name = question.get("concept", st.session_state.exam_topic)
                        concept_results.setdefault(c_name, {"earned": 0.0, "total": 0})
                        concept_results[c_name]["total"] += 1
                        if is_correct:
                            concept_results[c_name]["earned"] += 1.0

                        mcq_results.append({
                            "question": question["question"],
                            "selected": f"{selected}. {selected_text}" if selected_text else "Not answered",
                            "correct": correct,
                            "explanation": question.get("explanation", "Verified correct option."),
                            "concept": c_name,
                            "is_correct": is_correct,
                        })

                    qa_results = []
                    qa_score = 0.0
                    qa_max_score = len(qa_questions) * 5.0

                    for index, question in enumerate(qa_questions):
                        answer_text = written_answers[index]
                        evaluation = evaluate_written_answer(
                            question=question["question"],
                            expected_answer=question["expected_answer"],
                            key_points=question["key_points"],
                            answer=answer_text,
                        )
                        awarded_marks = float(evaluation["marks"])
                        qa_score += awarded_marks

                        c_name = question.get("concept", st.session_state.exam_topic)
                        concept_results.setdefault(c_name, {"earned": 0.0, "total": 0})
                        concept_results[c_name]["earned"] += awarded_marks / 5.0
                        concept_results[c_name]["total"] += 1

                        qa_results.append({
                            "question": question["question"],
                            "answer": answer_text,
                            "expected_answer": question["expected_answer"],
                            "marks": awarded_marks,
                            "feedback": evaluation.get("feedback", "Completed."),
                            "missing_points": evaluation.get("missing_points", []),
                            "concept": c_name,
                        })

                    total_score = mcq_score + qa_score
                    total_possible = len(mcqs) + qa_max_score
                    percentage = (total_score / total_possible * 100) if total_possible > 0 else 0.0

                    st.session_state.results = {
                        "mcq_results": mcq_results,
                        "qa_results": qa_results,
                        "mcq_score": mcq_score,
                        "qa_score": qa_score,
                        "qa_max_score": qa_max_score,
                        "total_score": total_score,
                        "total_possible": total_possible,
                        "percentage": percentage,
                        "mcq_correct": mcq_correct,
                        "mcq_incorrect": mcq_incorrect,
                        "mcq_unanswered": mcq_unanswered,
                        "concept_results": concept_results,
                    }
                    st.rerun()

                except Exception as err:
                    st.error("An error occurred during evaluation. Please try submitting again.")
                    with st.expander("Technical details"):
                        st.code(str(err))

    results = st.session_state.results
    if results:
        st.divider()
        st.markdown("## 📊 Comprehensive Examination Results")

        col1, col2, col3, col4 = st.columns(4)
        with col1:
            st.metric("Total Composite Score", f'{results["total_score"]:.2f} / {results["total_possible"]:.0f}')
        with col2:
            st.metric("Percentage Achieved", f'{results["percentage"]:.2f}%')
        with col3:
            st.metric("Section A (MCQ)", f'{results["mcq_score"]} / {len(results["mcq_results"])}')
        with col4:
            st.metric("Section B (Written)", f'{results["qa_score"]:.2f} / {results["qa_max_score"]:.0f}')

        st.progress(min(1.0, max(0.0, results["percentage"] / 100.0)))

        st.subheader("Section A Summary")
        c1, c2, c3 = st.columns(3)
        c1.metric("Correct Answers", results["mcq_correct"])
        c2.metric("Incorrect Answers", results["mcq_incorrect"])
        c3.metric("Unanswered", results["mcq_unanswered"])

        st.divider()
        st.subheader("🎯 Concept-Wise Performance Breakdown")
        strengths = []
        improvements = []

        for concept, data in results["concept_results"].items():
            if data["total"] == 0:
                continue
            accuracy = (data["earned"] / data["total"]) * 100
            if accuracy >= 70:
                strengths.append((concept, accuracy))
            else:
                improvements.append((concept, accuracy))

        left, right = st.columns(2)
        with left:
            st.markdown("### 🌟 Conceptual Strengths (≥ 70%)")
            if strengths:
                for concept, accuracy in strengths:
                    st.success(f"**{concept}** — {accuracy:.1f}% Mastery")
            else:
                st.info("No concepts met the 70% threshold. Regular revision is recommended.")
        with right:
            st.markdown("### ⚠️ Focus Areas for Improvement (< 70%)")
            if improvements:
                for concept, accuracy in improvements:
                    st.warning(f"**{concept}** — {accuracy:.1f}% Score")
            else:
                st.success("Outstanding! All tested concepts achieved strong mastery.")

        st.divider()
        st.subheader("🔍 Review: Section A (MCQs)")
        for index, item in enumerate(results["mcq_results"]):
            badge = "🟢 Correct" if item["is_correct"] else ("⚪ Unanswered" if item["selected"] == "Not answered" else "🔴 Incorrect")
            with st.expander(f"MCQ {index + 1}: {item['question'][:90]}... — {badge}"):
                st.markdown(f"**Question:** {item['question']}")
                st.write(f"**Your Answer:** {item['selected']}")
                st.write(f"**Correct Option:** {item['correct']}")
                st.info(f"**Explanation:** {item['explanation']}")
                st.caption(f"Tested Concept: {item['concept']}")

        st.divider()
        st.subheader("🔍 Review: Section B (Written Q&A)")
        for index, item in enumerate(results["qa_results"]):
            with st.expander(f"Written Q{index + 1}: {item['question'][:90]}... — Awarded: {item['marks']:.1f} / 5.0 Marks"):
                st.markdown(f"**Question:** {item['question']}")
                st.markdown("**Candidate Submitted Answer:**")
                st.write(item["answer"].strip() if item["answer"].strip() else "*No answer provided.*")
                st.markdown(f"**Assessed Marks:** `{item['marks']:.1f} / 5.0`")
                st.markdown(f"**Evaluator Feedback:** {item['feedback']}")
                st.markdown("**Expected Reference Solution:**")
                st.write(item["expected_answer"])
                if item["missing_points"]:
                    st.markdown("**Identified Gaps & Missing Key Points:**")
                    for pt in item["missing_points"]:
                        st.markdown(f"- ⚠️ {pt}")
                st.caption(f"Tested Concept: {item['concept']}")

        st.divider()
        if st.button("🔄 Create a New Examination", use_container_width=True):
            reset_task4_exam()
            st.rerun()

    render_footer(task_label="Task 4 • Dual-Section Exam Platform")

if __name__ == "__main__":
    main()

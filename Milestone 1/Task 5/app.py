"""
Task 5: Multimodal Intelligent Examination Platform
Integrates Section A (MCQs) • Section B (Written Q&A) • Handwritten Answer OCR Transcription
• Automated Rubric AI Grading • Concept Performance Mastery Analytics.
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
from mcq_generator import (
    generate_mcqs,
    generate_qa_questions,
    evaluate_written_answer,
    extract_text_from_image,
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
# 2. Session Reset Helper
# --------------------------------------------------
defaults = {
    "mcqs": None,
    "qa_questions": None,
    "results": None,
    "exam_topic": "",
    "exam_difficulty": "",
    "mcq_answers": {},
    "written_answers": {},
    "ocr_text": {},
}

def reset_task5_exam():
    """Clear all active test state and user inputs."""
    keys_to_clear = [
        k for k in list(st.session_state.keys())
        if k.startswith("mcq_answer_")
        or k.startswith("written_answer_")
        or k.startswith("answer_image_")
    ]
    for k in keys_to_clear:
        del st.session_state[k]

    for k, v in defaults.items():
        st.session_state[k] = v

# --------------------------------------------------
# 3. Main Streamlit Execution
# --------------------------------------------------
def main():
    st.set_page_config(
        page_title="AI Examination Platform | Flagship Edition",
        page_icon="🎓",
        layout="wide",
        initial_sidebar_state="collapsed",
    )

    st.markdown(DARK_THEME_CSS, unsafe_allow_html=True)

    for key, value in defaults.items():
        if key not in st.session_state:
            st.session_state[key] = value

    render_hero(
        title="🎓 AI-Based Intelligent Examination Platform",
        subtitle=(
            "Next-generation multimodal assessment platform. Features adaptive MCQ testing, "
            "descriptive written evaluation, vision-based OCR handwriting recognition, "
            "and automated concept-level mastery analytics."
        ),
        badge="MULTIMODAL FLAGSHIP ENGINE • TASK 5"
    )

    st.markdown(
        """
        <div style="background: rgba(35, 53, 84, 0.4); border: 1px solid #233554; border-radius: 10px; padding: 12px 20px; margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between;">
            <div style="display:flex; align-items:center; gap:12px;">
                <span style="display:inline-block; width:10px; height:10px; background:#22C55E; border-radius:50%; box-shadow:0 0 8px #22C55E;"></span>
                <span style="font-weight:600; color:#F8FAFC; font-size:0.92rem;">Proctoring & Exam Integrity Active</span>
                <span style="color:#64748B; font-size:0.85rem;">| Client focus tracking & multimodal submission verification enabled</span>
            </div>
            <span style="font-size:0.82rem; background:rgba(99,102,241,0.15); color:#818CF8; border:1px solid rgba(99,102,241,0.3); padding:3px 10px; border-radius:6px; font-weight:600;">
                SESSION SECURED
            </span>
        </div>
        """,
        unsafe_allow_html=True
    )

    st.subheader("⚙️ Configure Your Examination")

    col1, col2, col3, col4 = st.columns(4)
    with col1:
        topic_choice = st.selectbox(
            "Academic Subject",
            [
                "Python", "Java", "C Programming", "Data Structures", "DBMS",
                "Operating Systems", "Computer Networks", "Artificial Intelligence",
                "Machine Learning", "HTML and CSS", "Other",
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
    if topic_choice == "Other":
        custom_topic = st.text_input("Enter Topic Name", placeholder="e.g., Computer Vision & Deep Learning")
    final_topic = custom_topic.strip() if topic_choice == "Other" else topic_choice

    st.caption("Configures objective MCQs, descriptive questions with handwritten image upload, and AI evaluation.")

    if st.button("🚀 Generate Multimodal Examination", use_container_width=True, type="primary"):
        if not final_topic:
            st.warning("Please specify a valid examination topic.")
        elif not os.getenv("OPENAI_API_KEY") and not os.getenv("GOOGLE_API_KEY"):
            st.error("No API key detected in environment. Check your api_keys.env file.")
        else:
            reset_task5_exam()
            with st.spinner("Generating correlated MCQs and non-overlapping descriptive questions..."):
                try:
                    gen_mcqs = generate_mcqs(final_topic, difficulty, int(mcq_count))
                    gen_qa = generate_qa_questions(final_topic, difficulty, int(qa_count), gen_mcqs)

                    if not gen_mcqs or not gen_qa:
                        raise ValueError("Generation produced an incomplete test set.")

                    st.session_state.mcqs = gen_mcqs
                    st.session_state.qa_questions = gen_qa
                    st.session_state.exam_topic = final_topic
                    st.session_state.exam_difficulty = difficulty
                    st.success("Examination generated successfully! Please proceed to the questions below.")
                    st.rerun()

                except Exception as err:
                    st.error("Unable to generate the examination. Please try again.")
                    with st.expander("Technical details"):
                        st.code(str(err))

    mcqs = st.session_state.mcqs
    qa_questions = st.session_state.qa_questions

    if mcqs and qa_questions and st.session_state.results is None:
        st.divider()
        st.markdown(f"## 📋 Active Examination: `{st.session_state.exam_topic}`")
        st.markdown(
            f"**Difficulty:** `{st.session_state.exam_difficulty}` &nbsp;|&nbsp; "
            f"**Structure:** `{len(mcqs)} Objective MCQs` (1 mark each) + `{len(qa_questions)} Descriptive Questions` (5 marks each)"
        )
        st.info(
            "Complete both sections. For written questions, you may either type your response "
            "directly or upload a photo of your handwritten sheet for automatic OCR transcription."
        )

        st.markdown("### Section A: Objective Multiple-Choice Questions (1 Mark Each)")
        st.write("Select the single correct option for each question.")

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

            options = question["options"]
            selected = st.radio(
                f"Select Option for MCQ {index + 1}",
                options=["Not answered", "A", "B", "C", "D"],
                format_func=lambda c, opts=options: (
                    "Not answered" if c == "Not answered" else f"{c}. {opts.get(c, '')}"
                ),
                key=f"mcq_answer_{index}",
                label_visibility="collapsed"
            )
            mcq_answers[index] = selected

        st.session_state.mcq_answers = mcq_answers

        st.divider()

        st.markdown("### Section B: Descriptive Written Questions (5 Marks Each)")
        st.write("Type your response or upload a clear photo of your handwritten answer sheet for OCR transcription.")

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

            uploaded_image = st.file_uploader(
                f"📷 Upload photo of handwritten answer for Question {index + 1} (Optional)",
                type=["png", "jpg", "jpeg", "webp"],
                key=f"answer_image_{index}",
                help="Ensure handwriting is legible and adequately lit for optical character recognition."
            )

            if uploaded_image is not None:
                if st.button(f"🔍 Extract Text using AI Vision OCR (Q{index + 1})", key=f"extract_ocr_{index}"):
                    try:
                        ocr_model_name = os.getenv("OCR_MODEL", "gpt-4o")
                        mime = uploaded_image.type or "image/jpeg"

                        with st.spinner("Analyzing handwriting with vision OCR model..."):
                            extracted_text = extract_text_from_image(
                                image_bytes=uploaded_image.getvalue(),
                                mime_type=mime,
                                model=ocr_model_name,
                            )

                        if not extracted_text or not extracted_text.strip():
                            st.warning("No readable text detected in the uploaded image. Please try a clearer capture.")
                        else:
                            cleaned_extracted = extracted_text.strip()
                            st.session_state.ocr_text[index] = cleaned_extracted
                            st.session_state[f"written_answer_{index}"] = cleaned_extracted
                            st.session_state.written_answers[index] = cleaned_extracted
                            st.success("Handwritten text transcribed successfully! Review or edit below.")
                            st.rerun()

                    except Exception as ocr_err:
                        st.error(f"OCR transcription failed: {ocr_err}")

            default_val = st.session_state.ocr_text.get(index, st.session_state.written_answers.get(index, ""))
            ans_input = st.text_area(
                f"Candidate Written Answer for Question {index + 1}",
                value=default_val,
                placeholder="Type your structured solution here or use the OCR extractor above...",
                height=130,
                key=f"written_answer_{index}"
            )
            written_answers[index] = ans_input

        st.session_state.written_answers = written_answers

        st.write("")

        if st.button("Finalize & Submit Entire Examination", use_container_width=True, type="primary"):
            st.session_state.mcq_answers = mcq_answers
            st.session_state.written_answers = written_answers

            with st.spinner("Evaluating objective and multimodal submissions..."):
                try:
                    mcq_results = []
                    mcq_score = 0
                    mcq_correct = 0
                    mcq_incorrect = 0
                    mcq_unanswered = 0
                    concept_results = {}

                    for index, question in enumerate(mcqs):
                        selected = mcq_answers.get(index, "Not answered")
                        correct = question["answer"]
                        is_correct = bool(selected == correct)

                        if selected == "Not answered":
                            mcq_unanswered += 1
                        elif is_correct:
                            mcq_correct += 1
                            mcq_score += 1
                        else:
                            mcq_incorrect += 1

                        c_name = question["concept"]
                        concept_results.setdefault(c_name, {"earned": 0.0, "total": 0})
                        concept_results[c_name]["total"] += 1
                        if is_correct:
                            concept_results[c_name]["earned"] += 1.0

                        mcq_results.append({
                            "question": question["question"],
                            "selected": selected,
                            "correct": correct,
                            "explanation": question["explanation"],
                            "concept": c_name,
                            "is_correct": is_correct,
                        })

                    qa_results = []
                    qa_score = 0.0
                    qa_max_score = len(qa_questions) * 5.0

                    for index, question in enumerate(qa_questions):
                        answer_text = written_answers.get(index, "").strip()
                        evaluation = evaluate_written_answer(
                            question=question["question"],
                            expected_answer=question["expected_answer"],
                            key_points=question["key_points"],
                            answer=answer_text,
                        )

                        awarded_marks = float(evaluation["marks"])
                        qa_score += awarded_marks

                        c_name = question["concept"]
                        concept_results.setdefault(c_name, {"earned": 0.0, "total": 0})
                        concept_results[c_name]["earned"] += awarded_marks / 5.0
                        concept_results[c_name]["total"] += 1

                        qa_results.append({
                            "question": question["question"],
                            "answer": answer_text,
                            "expected_answer": question["expected_answer"],
                            "marks": awarded_marks,
                            "feedback": evaluation["feedback"],
                            "missing_points": evaluation["missing_points"],
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
        st.markdown("## 📊 Examination Performance Analytics")

        col1, col2, col3, col4 = st.columns(4)
        with col1:
            st.metric("Total Composite Score", f'{results["total_score"]:.2f} / {results["total_possible"]:.0f}')
        with col2:
            st.metric("Overall Percentage", f'{results["percentage"]:.2f}%')
        with col3:
            st.metric("Section A Score (MCQ)", f'{results["mcq_score"]} / {len(results["mcq_results"])}')
        with col4:
            st.metric("Section B Score (Written)", f'{results["qa_score"]:.2f} / {results["qa_max_score"]:.0f}')

        st.progress(min(1.0, max(0.0, results["percentage"] / 100.0)))

        st.subheader("Objective Summary (Section A)")
        c1, c2, c3 = st.columns(3)
        c1.metric("Correct Answers", results["mcq_correct"])
        c2.metric("Incorrect Answers", results["mcq_incorrect"])
        c3.metric("Unanswered Questions", results["mcq_unanswered"])

        st.divider()
        st.subheader("🎯 Concept Mastery & Weakness Analysis")
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
                st.info("No concepts met the 70% threshold. Practice is recommended.")
        with right:
            st.markdown("### ⚠️ Areas for Improvement (< 70%)")
            if improvements:
                for concept, accuracy in improvements:
                    st.warning(f"**{concept}** — {accuracy:.1f}% Score")
            else:
                st.success("Exceptional performance! All tested concepts reached high mastery.")

        st.divider()
        st.subheader("🔍 Review: Section A (MCQs)")
        for index, item in enumerate(results["mcq_results"]):
            badge = "🟢 Correct" if item["is_correct"] else ("⚪ Unanswered" if item["selected"] == "Not answered" else "🔴 Incorrect")
            with st.expander(f"MCQ {index + 1}: {item['question'][:90]}... — {badge}"):
                st.markdown(f"**Question:** {item['question']}")
                st.write(f"**Your Choice:** {item['selected']}")
                st.write(f"**Correct Answer Key:** {item['correct']}")
                st.info(f"**Technical Explanation:** {item['explanation']}")
                st.caption(f"Tested Concept: {item['concept']}")

        st.divider()
        st.subheader("🔍 Review: Section B (Written Q&A)")
        for index, item in enumerate(results["qa_results"]):
            with st.expander(f"Written Q{index + 1}: {item['question'][:90]}... — Awarded: {item['marks']:.1f} / 5.0"):
                st.markdown(f"**Question:** {item['question']}")
                st.markdown("**Submitted Candidate Answer:**")
                st.write(item["answer"].strip() if item["answer"].strip() else "*No answer recorded.*")
                st.markdown(f"**Assessed Marks:** `{item['marks']:.1f} / 5.0`")
                st.markdown(f"**Evaluator Feedback:** {item['feedback']}")
                st.markdown("**Reference Model Solution:**")
                st.write(item["expected_answer"])
                if item["missing_points"]:
                    st.markdown("**Missing Essential Points:**")
                    for pt in item["missing_points"]:
                        st.markdown(f"- ⚠️ {pt}")
                st.caption(f"Tested Concept: {item['concept']}")

        st.divider()
        if st.button("🔄 Create a New Examination", use_container_width=True):
            reset_task5_exam()
            st.rerun()

    render_footer(task_label="Task 5 • Multimodal Flagship Platform")

if __name__ == "__main__":
    main()

# ============================================================
# 1. IMPORT REQUIRED LIBRARIES
# ============================================================

import os
from pathlib import Path

import streamlit as st
from dotenv import load_dotenv

from mcq_generator import (
    generate_mcqs,
    generate_qa_questions,
    evaluate_written_answer,
    extract_text_from_image,
)


# ============================================================
# 2. LOAD ENVIRONMENT VARIABLES AND API KEY
# ============================================================

CURRENT_FOLDER = Path(__file__).resolve().parent

PROJECT_FOLDER = next(
    (
        folder
        for folder in [CURRENT_FOLDER, *CURRENT_FOLDER.parents]
        if (folder / ".env").exists()
        or (folder / "api_keys.env").exists()
    ),
    CURRENT_FOLDER,
)

ENV_FILE = PROJECT_FOLDER / ".env"

if not ENV_FILE.exists():
    ENV_FILE = PROJECT_FOLDER / "api_keys.env"

load_dotenv(ENV_FILE, override=True)


# ============================================================
# 3. CONFIGURE THE STREAMLIT PAGE
# ============================================================

st.set_page_config(
    page_title="Smart Examination Platform",
    page_icon="🌿",
    layout="wide",
)


# ============================================================
# 4. APPLY THE MINT-GREEN AND WHITE THEME
# This section controls backgrounds, text, buttons,
# question cards, input fields, dropdowns and progress bars.
# ============================================================

st.markdown(
    """
    <style>
    /* Main application background and text */
    .stApp {
        background-color: #F0FFF4;
        color: #244B32;
    }

    /* Headings */
    h1, h2, h3, h4 {
        color: #276749 !important;
    }

    p, label, li, span {
        color: #244B32;
    }

    /* Main application header */
    .main-header {
        background-color: #D5F2DC;
        padding: 25px 15px;
        border-radius: 16px;
        text-align: center;
        margin-bottom: 25px;
        border: 1px solid #B7E4C3;
    }

    .main-header h1 {
        color: #276749 !important;
        font-size: 2.3rem;
    }

    .main-header p {
        color: #244B32 !important;
        font-size: 1.05rem;
    }

    /* Examination question cards */
    .question-card {
        background-color: #FFFFFF;
        border: 1px solid #C6E8D0;
        border-radius: 12px;
        padding: 17px;
        margin: 12px 0;
        color: #244B32;
    }

    /* Buttons, including Generate and Submit */
    div.stButton > button,
    div.stFormSubmitButton > button {
        background-color: #A8DDB5;
        color: #244B32 !important;
        border: 1px solid #83C995;
        border-radius: 9px;
        font-weight: 600;
        min-height: 42px;
    }

    /* Button hover effect */
    div.stButton > button:hover,
    div.stFormSubmitButton > button:hover {
        background-color: #83C995;
        border-color: #65B97C;
        color: #183D27 !important;
    }

    /* MCQ radio button labels */
    div.stRadio label,
    div.stRadio label p,
    div.stRadio label span,
    div[data-testid="stRadio"] label,
    div[data-testid="stRadio"] label p,
    div[data-testid="stRadio"] label span {
        color: #244B32 !important;
        opacity: 1 !important;
    }

    /* Score and result cards */
    div[data-testid="stMetric"] {
        background-color: #FFFFFF;
        border: 1px solid #C6E8D0;
        border-radius: 12px;
        padding: 16px;
    }

    div[data-testid="stMetric"] label,
    div[data-testid="stMetricValue"],
    div[data-testid="stMetricLabel"] {
        color: #244B32 !important;
    }

    /* Dropdown menus */
    div[data-baseweb="select"] > div {
        background-color: #FFFFFF;
        color: #244B32;
        border-color: #B7DCC0;
    }

    div[data-baseweb="select"] * {
        color: #244B32 !important;
    }

    /* Text inputs and written-answer boxes */
    input,
    textarea {
        color: #244B32 !important;
        background-color: #FFFFFF !important;
        caret-color: #276749;
        border-color: #B7DCC0 !important;
    }

    /* Expandable answer-review sections */
    div[data-testid="stExpander"] {
        background-color: #FFFFFF;
        border: 1px solid #C6E8D0;
        border-radius: 10px;
    }

    div[data-testid="stExpander"] summary,
    div[data-testid="stExpander"] summary p {
        color: #244B32 !important;
    }

    /* Success, warning, error and information messages */
    div[data-testid="stAlert"] {
        border-radius: 10px;
    }

    div[data-testid="stAlert"] p {
        color: #244B32;
    }

    /* Dropdown option menu */
    div[data-baseweb="popover"] ul,
    div[data-baseweb="menu"] {
        background-color: #FFFFFF;
        border: 1px solid #B7DCC0;
    }

    div[data-baseweb="popover"] li,
    div[data-baseweb="menu"] li {
        color: #244B32 !important;
    }

    /* Disabled buttons */
    div.stButton > button:disabled,
    div.stFormSubmitButton > button:disabled {
        background-color: #E7F5EA;
        color: #52745B !important;
        border-color: #C6E8D0;
    }

    /* Examination progress bar */
    div[data-testid="stProgress"] > div > div {
        background-color: #65B97C;
    }

    /* Page spacing */
    .block-container {
        padding-top: 2rem;
        padding-bottom: 3rem;
    }
    </style>
    """,
    unsafe_allow_html=True,
)


# ============================================================
# 5. DISPLAY THE APPLICATION HEADER
# ============================================================

st.markdown(
    """
    <div class="main-header">
        <h1>AI-Based Intelligent Examination Platform</h1>
        <p>
            MCQ Test • Written Q&A • Handwritten OCR • AI-Based Evaluation
        </p>
    </div>
    """,
    unsafe_allow_html=True,
)


# ============================================================
# 6. INITIALIZE SESSION STATE
# Stores examination questions, answers and results between
# Streamlit reruns.
# ============================================================

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

for key, value in defaults.items():
    if key not in st.session_state:
        st.session_state[key] = value


# ============================================================
# 7. RESET EXAMINATION DATA
# Clears previous questions, answers and results so the
# candidate can start a new examination.
# ============================================================

def reset_exam():
    widget_keys = []

    for key in list(st.session_state.keys()):
        if (
            key.startswith("mcq_answer_")
            or key.startswith("written_answer_")
            or key.startswith("answer_image_")
        ):
            widget_keys.append(key)

    for key in widget_keys:
        del st.session_state[key]

    for key, value in defaults.items():
        st.session_state[key] = value


# ============================================================
# 8. EXAMINATION CONFIGURATION
# Allows the candidate to select a topic, difficulty and
# the number of MCQ and written questions.
# ============================================================

st.subheader("Configure Your Examination")

col1, col2, col3, col4 = st.columns(4)

with col1:
    topic = st.selectbox(
        "Select Topic",
        [
            "Python",
            "Java",
            "C Programming",
            "Data Structures",
            "DBMS",
            "Operating Systems",
            "Computer Networks",
            "Artificial Intelligence",
            "Machine Learning",
            "HTML and CSS",
            "Other",
        ],
    )

with col2:
    difficulty = st.selectbox(
        "Difficulty Level",
        ["Easy", "Medium", "Hard"],
    )

with col3:
    mcq_count = st.number_input(
        "Number of MCQs",
        min_value=1,
        max_value=10,
        value=5,
        step=1,
    )

with col4:
    qa_count = st.number_input(
        "Number of Q&A Questions",
        min_value=1,
        max_value=5,
        value=3,
        step=1,
    )

custom_topic = ""

if topic == "Other":
    custom_topic = st.text_input(
        "Enter Your Topic",
        placeholder="Example: Cloud Computing",
    )

final_topic = custom_topic.strip() if topic == "Other" else topic

st.caption(
    "Task 5: MCQs, written Q&A, handwritten image OCR, "
    "and AI-based answer evaluation."
)


# ============================================================
# 9. GENERATE EXAMINATION
# Calls the question-generation functions from mcq_generator.py
# to create MCQs and written questions using the selected
# topic, difficulty and question counts.
# ============================================================

if st.button("Generate Examination", use_container_width=True):

    if not final_topic:
        st.warning("Please enter a topic.")

    elif not os.getenv("OPENAI_API_KEY"):
        st.error(
            "OPENAI_API_KEY was not found. "
            "Please check your .env or api_keys.env file."
        )

    else:
        reset_exam()

        with st.spinner(
            "Generating MCQs and distinct written questions..."
        ):
            try:
                generated_mcqs = generate_mcqs(
                    final_topic,
                    difficulty,
                    int(mcq_count),
                )

                generated_qa = generate_qa_questions(
                    final_topic,
                    difficulty,
                    int(qa_count),
                    generated_mcqs,
                )

                st.session_state.mcqs = generated_mcqs
                st.session_state.qa_questions = generated_qa
                st.session_state.exam_topic = final_topic
                st.session_state.exam_difficulty = difficulty

                st.success("Examination generated successfully!")
                st.rerun()

            except Exception as error:
                st.error(
                    "Unable to generate the examination. Please try again."
                )

                with st.expander("Error details"):
                    st.code(str(error))


# ============================================================
# 10. DISPLAY GENERATED QUESTIONS
# Shows the generated MCQs and written questions when an
# examination has been created and not yet submitted.
# ============================================================

mcqs = st.session_state.mcqs
qa_questions = st.session_state.qa_questions

if mcqs and qa_questions and st.session_state.results is None:

    st.divider()

    st.subheader(
        f"Examination: {st.session_state.exam_topic}"
    )

    st.caption(
        f"Difficulty: {st.session_state.exam_difficulty} | "
        f"{len(mcqs)} MCQs + {len(qa_questions)} written Q&A questions"
    )

    st.info(
        "Answer the MCQs and written questions. "
        "For written questions, type your answer or upload "
        "a photo of your handwritten answer."
    )

    # --------------------------------------------------------
    # 10A. SECTION A: MULTIPLE-CHOICE QUESTIONS
    # Displays each MCQ and saves the selected option.
    # --------------------------------------------------------

    st.markdown("## Section A: Multiple-Choice Questions")
    st.write("Select one option for each question.")

    mcq_answers = {}

    for index, question in enumerate(mcqs):

        st.markdown(
            f"""
            <div class="question-card">
                <strong>Q{index + 1}. {question["question"]}</strong>
            </div>
            """,
            unsafe_allow_html=True,
        )

        options = question["options"]

        selected = st.radio(
            f"Select your answer for MCQ {index + 1}",
            options=["Not answered", "A", "B", "C", "D"],
            format_func=lambda choice, opts=options: (
                "Not answered"
                if choice == "Not answered"
                else f"{choice}. {opts[choice]}"
            ),
            key=f"mcq_answer_{index}",
            label_visibility="collapsed",
        )

        mcq_answers[index] = selected

    st.session_state.mcq_answers = mcq_answers

    # --------------------------------------------------------
    # 10B. SECTION B: WRITTEN QUESTIONS
    # Allows candidates to type answers or upload images
    # containing handwritten answers.
    # --------------------------------------------------------

    st.divider()
    st.markdown("## Section B: Written Questions and Answers")
    st.write("Each written question carries 5 marks.")

    written_answers = {}

    for index, question in enumerate(qa_questions):

        st.markdown(
            f"""
            <div class="question-card">
                <strong>Q{index + 1}. {question["question"]}</strong>
                <p>Maximum marks: 5</p>
            </div>
            """,
            unsafe_allow_html=True,
        )

        # ----------------------------------------------------
        # 10C. HANDWRITTEN ANSWER IMAGE UPLOAD
        # Accepts an image for OCR-based text extraction.
        # ----------------------------------------------------

        uploaded_image = st.file_uploader(
            "Upload a photo of your handwritten answer (optional)",
            type=["png", "jpg", "jpeg", "webp"],
            key=f"answer_image_{index}",
            help="Use a clear, well-lit photo with the handwriting in focus.",
        )

        # ----------------------------------------------------
        # 10D. OCR TEXT EXTRACTION
        # Extracts text from the uploaded image and places
        # the extracted text into the written-answer field.
        # ----------------------------------------------------

        if uploaded_image is not None:

            if st.button(
                "Extract text using OCR",
                key=f"extract_ocr_{index}",
            ):

                try:
                    ocr_model = os.getenv("OCR_MODEL", "gpt-4o")
                    mime_type = uploaded_image.type or "image/jpeg"

                    with st.spinner("Extracting text from the image..."):
                        extracted = extract_text_from_image(
                            uploaded_image.getvalue(),
                            mime_type,
                            model=ocr_model,
                        )

                    if not extracted or not extracted.strip():
                        st.warning(
                            "No text was detected. "
                            "Please try a clearer image."
                        )

                    else:
                        extracted = extracted.strip()

                        st.session_state[
                            f"written_answer_{index}"
                        ] = extracted

                        st.session_state.ocr_text[index] = extracted
                        st.session_state.written_answers[index] = extracted

                        st.success(
                            "Text extracted successfully! "
                            "Review and correct it below."
                        )

                        st.rerun()

                except Exception as error:
                    st.error(f"OCR extraction failed: {error}")

        # ----------------------------------------------------
        # 10E. WRITTEN ANSWER INPUT
        # Shows the candidate's answer text area and saves
        # the answer for evaluation.
        # ----------------------------------------------------

        answer = st.text_area(
            f"Your answer for written question {index + 1}",
            placeholder=(
                "Type your answer here, or upload a handwritten "
                "answer above..."
            ),
            height=130,
            key=f"written_answer_{index}",
        )

        written_answers[index] = answer

    st.session_state.written_answers = written_answers

    # ========================================================
    # 11. SUBMIT AND EVALUATE EXAMINATION
    # Checks MCQ answers, evaluates written answers through
    # the AI evaluation function, and calculates scores.
    # ========================================================

    if st.button("Submit Examination", use_container_width=True):

        st.session_state.mcq_answers = mcq_answers
        st.session_state.written_answers = written_answers

        with st.spinner("Evaluating your MCQs and written answers..."):

            try:
                # ------------------------------------------------
                # 11A. EVALUATE MCQ ANSWERS
                # Compares selected options with correct options.
                # ------------------------------------------------

                mcq_results = []
                mcq_score = 0
                mcq_correct = 0
                mcq_incorrect = 0
                mcq_unanswered = 0
                concept_results = {}

                for index, question in enumerate(mcqs):

                    selected = mcq_answers.get(index, "Not answered")
                    correct = question["answer"]
                    is_correct = selected == correct

                    if selected == "Not answered":
                        mcq_unanswered += 1

                    elif is_correct:
                        mcq_correct += 1
                        mcq_score += 1

                    else:
                        mcq_incorrect += 1

                    concept = question["concept"]

                    concept_results.setdefault(
                        concept,
                        {"earned": 0.0, "total": 0},
                    )

                    concept_results[concept]["total"] += 1

                    if is_correct:
                        concept_results[concept]["earned"] += 1

                    mcq_results.append(
                        {
                            "question": question["question"],
                            "selected": selected,
                            "correct": correct,
                            "explanation": question["explanation"],
                            "concept": concept,
                            "is_correct": is_correct,
                        }
                    )

                # ------------------------------------------------
                # 11B. EVALUATE WRITTEN ANSWERS
                # Sends each written answer to the AI evaluator
                # and collects marks, feedback and missing points.
                # ------------------------------------------------

                qa_results = []
                qa_score = 0.0
                qa_max_score = len(qa_questions) * 5

                for index, question in enumerate(qa_questions):

                    answer = written_answers.get(index, "").strip()

                    evaluation = evaluate_written_answer(
                        question=question["question"],
                        expected_answer=question["expected_answer"],
                        key_points=question["key_points"],
                        answer=answer,
                    )

                    marks = evaluation["marks"]
                    qa_score += marks

                    concept = question["concept"]

                    concept_results.setdefault(
                        concept,
                        {"earned": 0.0, "total": 0},
                    )

                    concept_results[concept]["earned"] += marks / 5
                    concept_results[concept]["total"] += 1

                    qa_results.append(
                        {
                            "question": question["question"],
                            "answer": answer,
                            "expected_answer": question["expected_answer"],
                            "marks": marks,
                            "feedback": evaluation["feedback"],
                            "missing_points": evaluation["missing_points"],
                            "concept": concept,
                        }
                    )

                # ------------------------------------------------
                # 11C. CALCULATE TOTAL SCORE AND PERCENTAGE
                # Combines MCQ and written-answer marks.
                # ------------------------------------------------

                total_score = mcq_score + qa_score
                total_possible = len(mcqs) + qa_max_score

                percentage = (
                    total_score / total_possible * 100
                    if total_possible
                    else 0
                )

                # Save all results for display after rerun.
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

            except Exception as error:
                st.error(
                    "An error occurred during evaluation. Please try again."
                )

                with st.expander("Error details"):
                    st.code(str(error))


# ============================================================
# 12. DISPLAY EXAMINATION RESULTS
# Shows total marks, percentage, MCQ score, written score
# and the candidate's overall performance.
# ============================================================

results = st.session_state.results

if results:

    st.divider()
    st.header("Your Examination Results")

    # --------------------------------------------------------
    # 12A. DISPLAY SCORE CARDS
    # --------------------------------------------------------

    col1, col2, col3, col4 = st.columns(4)

    col1.metric(
        "Total Score",
        f'{results["total_score"]:.2f}/{results["total_possible"]}',
    )

    col2.metric(
        "Percentage",
        f'{results["percentage"]:.2f}%',
    )

    col3.metric(
        "MCQ Score",
        f'{results["mcq_score"]}/{len(results["mcq_results"])}',
    )

    col4.metric(
        "Written Q&A Score",
        f'{results["qa_score"]:.2f}/{results["qa_max_score"]}',
    )

    # --------------------------------------------------------
    # 12B. DISPLAY PROGRESS BAR
    # Visualizes the percentage achieved in the examination.
    # --------------------------------------------------------

    st.progress(
        min(
            1.0,
            max(0.0, results["percentage"] / 100),
        )
    )

    # --------------------------------------------------------
    # 12C. MCQ PERFORMANCE SUMMARY
    # Displays correct, incorrect and unanswered counts.
    # --------------------------------------------------------

    st.subheader("MCQ Summary")

    c1, c2, c3 = st.columns(3)

    c1.metric("Correct", results["mcq_correct"])
    c2.metric("Incorrect", results["mcq_incorrect"])
    c3.metric("Unanswered", results["mcq_unanswered"])

    # --------------------------------------------------------
    # 12D. STRENGTHS AND AREAS FOR IMPROVEMENT
    # Calculates concept-level performance to identify
    # topics the candidate understands or needs to review.
    # --------------------------------------------------------

    st.subheader("Strengths and Areas for Improvement")

    strengths = []
    improvements = []

    for concept, data in results["concept_results"].items():

        if not data["total"]:
            continue

        accuracy = data["earned"] / data["total"] * 100

        if accuracy >= 70:
            strengths.append((concept, accuracy))
        else:
            improvements.append((concept, accuracy))

    left, right = st.columns(2)

    with left:
        st.markdown("### Strengths")

        if strengths:
            for concept, accuracy in strengths:
                st.success(f"{concept} — {accuracy:.0f}%")
        else:
            st.write(
                "No concepts reached 70% yet. Keep practising!"
            )

    with right:
        st.markdown("### Areas to Improve")

        if improvements:
            for concept, accuracy in improvements:
                st.warning(f"{concept} — {accuracy:.0f}%")
        else:
            st.write(
                "Great work! No concepts are below 70%."
            )

    # --------------------------------------------------------
    # 12E. REVIEW MCQ ANSWERS
    # Shows selected answers, correct answers and explanations.
    # --------------------------------------------------------

    st.divider()
    st.subheader("Review: MCQ Answers")

    for index, item in enumerate(results["mcq_results"]):

        with st.expander(
            f"MCQ {index + 1}: {item['question']}"
        ):

            st.write(f"**Your answer:** {item['selected']}")
            st.write(f"**Correct answer:** {item['correct']}")

            if item["selected"] == "Not answered":
                st.info("You did not answer this question.")

            elif item["is_correct"]:
                st.success("Correct answer!")

            else:
                st.error("Incorrect answer.")

            st.write(f"**Explanation:** {item['explanation']}")
            st.caption(f"Concept: {item['concept']}")

    # --------------------------------------------------------
    # 12F. REVIEW WRITTEN ANSWERS
    # Shows submitted answers, AI marks, feedback, reference
    # answers and missing points for further study.
    # --------------------------------------------------------

    st.divider()
    st.subheader("Review: Written Answers")

    for index, item in enumerate(results["qa_results"]):

        with st.expander(
            f"Written Q&A {index + 1}: {item['question']}"
        ):

            st.write("**Your submitted answer:**")
            st.write(item["answer"] or "No answer provided.")

            st.write(
                f"**AI-assessed marks:** {item['marks']}/5"
            )

            st.write(f"**Feedback:** {item['feedback']}")

            st.write("**Reference answer:**")
            st.write(item["expected_answer"])

            if item["missing_points"]:
                st.write("**Points to review:**")

                for point in item["missing_points"]:
                    st.write(f"- {point}")

            st.caption(f"Concept: {item['concept']}")

    # --------------------------------------------------------
    # 12G. CREATE A NEW EXAMINATION
    # Clears previous examination data and returns to setup.
    # --------------------------------------------------------

    if st.button(
        "Create a New Examination",
        use_container_width=True,
    ):
        reset_exam()
        st.rerun()


# ============================================================
# 13. INITIAL INSTRUCTIONS
# Displays guidance when no examination results are available.
# ============================================================

else:
    st.info(
        "Choose your topic and question counts, then click "
        "'Generate Examination' to begin."
    )
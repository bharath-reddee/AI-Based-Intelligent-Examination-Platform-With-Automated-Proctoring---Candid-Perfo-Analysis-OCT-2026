import streamlit as st

from mcq_generator import (
    generate_mcqs,
    generate_qa_questions,
    evaluate_written_answer,
)

st.set_page_config(page_title="Smart Examination Platform", page_icon="📝", layout="wide")

st.markdown(
    """
    <style>
    .stApp { background-color: #FFF8FA; color: #513B46; }
    h1, h2, h3, h4 { color: #92566F !important; }
    p, label, li, span { color: #513B46; }
    .main-header {
        background-color: #F8DCE7; padding: 25px 15px;
        border-radius: 16px; text-align: center; margin-bottom: 25px;
    }
    .main-header h1 { color: #92566F !important; font-size: 2.3rem; }
    .main-header p { color: #513B46 !important; font-size: 1.05rem; }
    .question-card {
        background-color: #FFFFFF; border: 1px solid #F0CADA;
        border-radius: 12px; padding: 17px; margin: 12px 0; color: #513B46;
    }
    div.stButton > button, div.stFormSubmitButton > button {
        background-color: #EFAFC8; color: #513B46 !important;
        border: 1px solid #EFAFC8; border-radius: 9px;
        font-weight: 600; min-height: 42px;
    }
    div.stButton > button:hover, div.stFormSubmitButton > button:hover {
        background-color: #E69AB9; border-color: #E69AB9; color: #513B46 !important;
    }
    div[data-testid="stRadio"] label,
    div[data-testid="stRadio"] label p,
    div[data-testid="stRadio"] label span {
        color: #513B46 !important; opacity: 1 !important;
    }
    div[data-testid="stRadio"] [role="radiogroup"] { gap: 10px; }
    div[data-testid="stMetric"] {
        background-color: #FFFFFF; border: 1px solid #F0CADA;
        border-radius: 12px; padding: 16px;
    }
    div[data-testid="stMetric"] label,
    div[data-testid="stMetric"] label p,
    div[data-testid="stMetricValue"],
    div[data-testid="stMetricLabel"] { color: #513B46 !important; opacity: 1 !important; }
    div[data-baseweb="select"] > div { background-color: #FFFFFF; color: #513B46; }
    div[data-baseweb="select"] * { color: #513B46 !important; }
    input, textarea {
        color: #513B46 !important; background-color: #FFFFFF !important;
        caret-color: #92566F;
    }
    textarea::placeholder, input::placeholder { color: #927987 !important; opacity: 1 !important; }
    div[data-testid="stExpander"] {
        background-color: #FFFFFF; border: 1px solid #F0CADA; border-radius: 10px;
    }
    div[data-testid="stExpander"] summary,
    div[data-testid="stExpander"] summary p { color: #513B46 !important; }
    button[data-baseweb="tab"] { color: #92566F !important; }
    .block-container { padding-top: 2rem; padding-bottom: 3rem; }
    </style>
    """,
    unsafe_allow_html=True,
)

st.markdown(
    """
    <div class="main-header">
        <h1>AI-Based Intelligent Examination Platform</h1>
        <p>MCQ Test • Written Q&A • AI-Based Evaluation</p>
    </div>
    """,
    unsafe_allow_html=True,
)

# -------------------- SESSION STATE --------------------
if "mcqs" not in st.session_state:
    st.session_state.mcqs = None
if "qa_questions" not in st.session_state:
    st.session_state.qa_questions = None
if "results" not in st.session_state:
    st.session_state.results = None
if "exam_topic" not in st.session_state:
    st.session_state.exam_topic = ""

def reset_exam():
    st.session_state.mcqs = None
    st.session_state.qa_questions = None
    st.session_state.results = None
    st.session_state.exam_topic = ""

# -------------------- EXAM CONFIGURATION --------------------
st.subheader("Configure Your Examination")
col1, col2, col3, col4 = st.columns(4)

with col1:
    topic = st.selectbox(
        "Select Topic",
        ["Python", "Java", "C Programming", "Data Structures", "DBMS",
         "Operating Systems", "Computer Networks", "Artificial Intelligence",
         "Machine Learning", "HTML and CSS", "Other"],
    )
with col2:
    difficulty = st.selectbox("Difficulty Level", ["Easy", "Medium", "Hard"])
with col3:
    mcq_count = st.number_input("Number of MCQs", min_value=1, max_value=10, value=5, step=1)
with col4:
    qa_count = st.number_input("Number of Q&A Questions", min_value=1, max_value=5, value=3, step=1)

custom_topic = ""
if topic == "Other":
    custom_topic = st.text_input("Enter Your Topic", placeholder="Example: Cloud Computing")
final_topic = custom_topic.strip() if topic == "Other" else topic
st.caption("Choose the number of MCQs and written Q&A questions separately.")

# -------------------- GENERATE EXAM --------------------
if st.button("Generate Examination", use_container_width=True):
    if not final_topic:
        st.warning("Please enter a topic.")
    else:
        reset_exam()
        with st.spinner("Generating MCQs and different written questions..."):
            try:
                generated_mcqs = generate_mcqs(final_topic, difficulty, int(mcq_count))
                generated_qa = generate_qa_questions(
                    final_topic, difficulty, int(qa_count), generated_mcqs
                )
                if not generated_mcqs:
                    raise ValueError("No MCQs were generated.")
                if not generated_qa:
                    raise ValueError("No written questions were generated.")
                st.session_state.mcqs = generated_mcqs
                st.session_state.qa_questions = generated_qa
                st.session_state.exam_topic = final_topic
                st.success("Examination generated successfully!")
                st.rerun()
            except Exception as error:
                st.error(
                    "Unable to generate the examination. "
                    "Please check your API key/model access and try again."
                )
                st.caption(f"Error details: {error}")

mcqs = st.session_state.mcqs
qa_questions = st.session_state.qa_questions

# -------------------- EXAM QUESTIONS --------------------
if mcqs and qa_questions:
    st.divider()
    st.subheader(f"Examination: {st.session_state.exam_topic}")
    st.caption(
        f"Total questions: {len(mcqs)} MCQs + "
        f"{len(qa_questions)} written Q&A questions"
    )
    st.info("Answer both sections before submitting. Written answers are evaluated by AI.")

    with st.form("examination_form"):
        st.markdown("## Section A: Multiple-Choice Questions")
        st.write("Select one option for each question.")
        mcq_answers = {}

        for index, question in enumerate(mcqs):
            st.markdown(
                f'<div class="question-card"><strong>Q{index + 1}. '
                f'{question["question"]}</strong></div>',
                unsafe_allow_html=True,
            )
            options = question.get("options", [])
            if not isinstance(options, list) or len(options) != 4:
                st.error(f"MCQ {index + 1} has invalid options. Please generate the examination again.")
                options = ["Invalid option"] * 4

            selected = st.radio(
                f"Select your answer for MCQ {index + 1}",
                options=["Not answered", "A", "B", "C", "D"],
                format_func=lambda choice, opts=options: (
                    "Not answered"
                    if choice == "Not answered"
                    else f"{choice}. {opts[ord(choice) - ord('A')]}"
                ),
                key=f"mcq_answer_{index}",
                label_visibility="collapsed",
            )
            mcq_answers[index] = selected

        st.divider()
        st.markdown("## Section B: Written Questions and Answers")
        st.write("Write your answers in your own words. Each question carries 5 marks.")
        written_answers = {}

        for index, question in enumerate(qa_questions):
            st.markdown(
                f'<div class="question-card"><strong>Q{index + 1}. '
                f'{question["question"]}</strong><p>Maximum marks: 5</p></div>',
                unsafe_allow_html=True,
            )
            written_answers[index] = st.text_area(
                f"Your answer for written question {index + 1}",
                placeholder="Type your answer here...",
                height=120,
                key=f"written_answer_{index}",
            )

        submitted = st.form_submit_button("Submit Examination", use_container_width=True)

    # -------------------- EVALUATION --------------------
    if submitted:
        with st.spinner("Evaluating your MCQs and written answers..."):
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
                    is_correct = selected_text is not None and selected_text == correct

                    if selected == "Not answered":
                        mcq_unanswered += 1
                    elif is_correct:
                        mcq_correct += 1
                        mcq_score += 1
                    else:
                        mcq_incorrect += 1

                    concept = question.get("concept", st.session_state.exam_topic)
                    if concept not in concept_results:
                        concept_results[concept] = {"earned": 0.0, "total": 0}
                    concept_results[concept]["total"] += 1
                    if is_correct:
                        concept_results[concept]["earned"] += 1

                    mcq_results.append({
                        "question": question["question"],
                        "selected": f"{selected}. {selected_text}" if selected_text is not None else "Not answered",
                        "correct": correct,
                        "explanation": question.get("explanation", "No explanation provided."),
                        "concept": concept,
                        "is_correct": is_correct,
                    })

                qa_results = []
                qa_score = 0.0
                qa_max_score = len(qa_questions) * 5

                for index, question in enumerate(qa_questions):
                    answer = written_answers[index]
                    evaluation = evaluate_written_answer(
                        question=question["question"],
                        expected_answer=question["expected_answer"],
                        key_points=question["key_points"],
                        answer=answer,
                    )
                    marks = max(0.0, min(float(evaluation["marks"]), 5.0))
                    qa_score += marks

                    concept = question.get("concept", st.session_state.exam_topic)
                    if concept not in concept_results:
                        concept_results[concept] = {"earned": 0.0, "total": 0}
                    concept_results[concept]["earned"] += marks / 5
                    concept_results[concept]["total"] += 1

                    qa_results.append({
                        "question": question["question"],
                        "answer": answer,
                        "expected_answer": question["expected_answer"],
                        "marks": marks,
                        "feedback": evaluation.get("feedback", "Evaluation completed."),
                        "missing_points": evaluation.get("missing_points", []),
                        "concept": concept,
                    })

                total_score = mcq_score + qa_score
                total_possible = len(mcqs) + qa_max_score
                percentage = (total_score / total_possible) * 100 if total_possible > 0 else 0

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
                st.error("An error occurred during evaluation. Please try submitting again.")
                st.caption(f"Error details: {error}")

# -------------------- DISPLAY RESULTS --------------------
results = st.session_state.results
if results:
    st.divider()
    st.header("Your Examination Results")
    col1, col2, col3, col4 = st.columns(4)

    with col1:
        st.metric("Total Score", f'{results["total_score"]:.2f}/{results["total_possible"]}')
    with col2:
        st.metric("Percentage", f'{results["percentage"]:.2f}%')
    with col3:
        st.metric("MCQ Score", f'{results["mcq_score"]}/{len(results["mcq_results"])}')
    with col4:
        st.metric("Written Q&A Score", f'{results["qa_score"]:.2f}/{results["qa_max_score"]}')

    st.progress(min(1.0, max(0.0, results["percentage"] / 100)))
    st.subheader("MCQ Summary")
    col1, col2, col3 = st.columns(3)
    col1.metric("Correct", results["mcq_correct"])
    col2.metric("Incorrect", results["mcq_incorrect"])
    col3.metric("Unanswered", results["mcq_unanswered"])

    st.subheader("Strengths and Areas for Improvement")
    strengths = []
    improvements = []
    for concept, data in results["concept_results"].items():
        if data["total"] == 0:
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
            st.write("No concepts reached 70% yet. Keep practising!")
    with right:
        st.markdown("### Areas to Improve")
        if improvements:
            for concept, accuracy in improvements:
                st.warning(f"{concept} — {accuracy:.0f}%")
        else:
            st.write("Great work! No concepts are below 70%.")

    st.divider()
    st.subheader("Review: MCQ Answers")
    for index, item in enumerate(results["mcq_results"]):
        with st.expander(f"MCQ {index + 1}: {item['question']}"):
            st.write(f'**Your answer:** {item["selected"]}')
            st.write(f'**Correct answer:** {item["correct"]}')
            if item["selected"] == "Not answered":
                st.info("You did not answer this question.")
            elif item["is_correct"]:
                st.success("Correct answer!")
            else:
                st.error("Incorrect answer.")
            st.write(f'**Explanation:** {item["explanation"]}')
            st.caption(f'Concept: {item["concept"]}')

    st.divider()
    st.subheader("Review: Written Answers")
    for index, item in enumerate(results["qa_results"]):
        with st.expander(f'Written Q&A {index + 1}: {item["question"]}'):
            st.write("**Your answer:**")
            st.write(item["answer"].strip() if item["answer"].strip() else "No answer provided.")
            st.write(f'**AI-assessed marks:** {item["marks"]}/5')
            st.write(f'**Feedback:** {item["feedback"]}')
            st.write("**Reference answer:**")
            st.write(item["expected_answer"])
            if item["missing_points"]:
                st.write("**Points to review:**")
                for point in item["missing_points"]:
                    st.write(f"- {point}")
            st.caption(f'Concept: {item["concept"]}')

    if st.button("Create a New Examination", use_container_width=True):
        reset_exam()
        st.rerun()
else:
    st.info("Choose your topic and question counts, then click 'Generate Examination' to begin.")

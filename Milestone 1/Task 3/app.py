import os
from pathlib import Path
import streamlit as st
from dotenv import load_dotenv
from mcq_generator import generate_mcqs


BASE_DIR = Path(__file__).resolve().parent
ENV_PATH = BASE_DIR.parent / "api_keys.env"

load_dotenv(ENV_PATH, override=True)

# ---------------- PAGE CONFIGURATION ----------------

st.set_page_config(
    page_title="AI MCQ Generator",
    layout="centered"
)

# ---------------- BABY PINK THEME ----------------


# ---------------- GREEN THEME ----------------

st.markdown("""
<style>
.stApp {
    background-color: #E8F5E9 !important;
}

[data-testid="stAppViewContainer"] {
    background-color: #E8F5E9 !important;
}

.block-container {
    max-width: 900px;
    padding-top: 2rem;
    padding-bottom: 3rem;
}

h1, h2, h3, h4 {
    color: #1B5E20 !important;
}

p, label, .stMarkdown, li {
    color: #2E4D32;
}

[data-testid="stHeader"] {
    background-color: #E8F5E9 !important;
}

[data-testid="stSidebar"] {
    background-color: #C8E6C9 !important;
}

div[data-baseweb="select"] > div {
    background-color: #FFFFFF !important;
    border-color: #A5D6A7 !important;
    border-radius: 10px;
}

.stTextInput input,
.stNumberInput input,
.stTextArea textarea {
    background-color: #FFFFFF !important;
    color: #1B5E20 !important;
    border: 1px solid #A5D6A7 !important;
    border-radius: 10px !important;
}

.stButton > button,
.stFormSubmitButton > button {
    background-color: #2E7D32 !important;
    color: #FFFFFF !important;
    border: 1px solid #2E7D32 !important;
    border-radius: 10px !important;
    font-weight: 600 !important;
    min-height: 42px;
}

.stButton > button p,
.stFormSubmitButton > button p {
    color: #FFFFFF !important;
}

.stButton > button:hover,
.stFormSubmitButton > button:hover {
    background-color: #1B5E20 !important;
    border-color: #1B5E20 !important;
}

div[role="radiogroup"] label {
    background-color: #FFFFFF !important;
    border: 1px solid #A5D6A7 !important;
    border-radius: 9px;
    padding: 8px 12px;
    margin-bottom: 6px;
}

.question-card {
    background-color: #FFFFFF;
    border: 1px solid #A5D6A7;
    border-radius: 14px;
    padding: 18px;
    margin: 12px 0;
}

.question-card h4,
.question-card p {
    color: #1B5E20 !important;
}

.hero {
    background-color: #C8E6C9;
    border: 1px solid #A5D6A7;
    padding: 26px 20px;
    border-radius: 18px;
    text-align: center;
    margin-bottom: 24px;
}

.hero h1,
.hero h3 {
    color: #1B5E20 !important;
    margin-bottom: 8px;
}

.hero p {
    color: #2E4D32 !important;
    margin-bottom: 0;
}

.result-card {
    background-color: #FFFFFF;
    border: 1px solid #A5D6A7;
    border-radius: 14px;
    padding: 20px;
    margin: 12px 0;
}

.correct-answer {
    background-color: #E8F5E9;
    border-left: 4px solid #2E7D32;
    color: #1B5E20;
    padding: 12px;
    border-radius: 7px;
    margin-top: 10px;
}

.wrong-answer {
    background-color: #FFF3F3;
    border-left: 4px solid #D32F2F;
    padding: 12px;
    border-radius: 7px;
    margin-top: 10px;
}

hr {
    border-color: #A5D6A7 !important;
}

.stProgress > div > div > div {
    background-color: #2E7D32 !important;
}

[data-testid="stMetric"] {
    background-color: #FFFFFF;
    border: 1px solid #A5D6A7;
    border-radius: 12px;
    padding: 15px;
}

[data-testid="stMetricValue"] {
    color: #1B5E20 !important;
}

[data-testid="stAlert"] {
    border-radius: 10px;
}

#MainMenu, footer {
    visibility: hidden;
}
</style>
""", unsafe_allow_html=True)


# ---------------- SESSION STATE ----------------

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


# ---------------- HEADER ----------------

st.markdown("""
<div class="hero">
    <h1> AI MCQ Generator</h1>
    <p>Create your own practice test with AI</p>
</div>
""", unsafe_allow_html=True)


# ---------------- QUIZ SETTINGS ----------------

st.markdown("## Create Your Quiz")
st.write("Choose your topic, difficulty, and number of questions.")

topic_options = [
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
    "Other"
]

with st.container(border=True):
    selected_topic = st.selectbox(
        "Choose a topic",
        topic_options,
        key="topic_selector"
    )

    if selected_topic == "Other":
        custom_topic = st.text_input(
            "Enter your custom topic",
            placeholder="e.g. Cloud Computing"
        )
        topic = custom_topic.strip()
    else:
        topic = selected_topic

    difficulty = st.selectbox(
        "Select difficulty",
        ["Easy", "Medium", "Hard"]
    )

    number_of_questions = st.number_input(
        "Number of questions",
        min_value=1,
        max_value=20,
        value=5,
        step=1
    )

    generate_clicked = st.button(
        " Generate Questions",
        use_container_width=True
    )


# ---------------- GENERATE QUESTIONS ----------------

if generate_clicked:
    if not topic:
        st.warning("Please enter a topic before generating questions.")
    else:
        try:
            with st.spinner("Creating your questions... Please wait."):
                questions = generate_mcqs(
                    topic,
                    difficulty,
                    int(number_of_questions)
                )

            if not questions:
                st.error("No questions were generated. Please try again.")
            else:
                st.session_state.questions = questions
                st.session_state.user_answers = {}
                st.session_state.submitted = False
                st.session_state.quiz_topic = topic
                st.session_state.quiz_difficulty = difficulty

                st.success("Your quiz is ready!")
                st.rerun()

        except Exception as error:
            st.error(
                "Unable to generate questions. Please check your API key, "
                "internet connection, and installed packages."
            )
            with st.expander("Technical error details"):
                st.code(str(error))


# ---------------- EXAM SCREEN ----------------

questions = st.session_state.questions

if questions:
    st.divider()

    st.markdown("## 📝 Your Practice Test")

    st.write(
        f"**Topic:** {st.session_state.quiz_topic}  \n"
        f"**Difficulty:** {st.session_state.quiz_difficulty}  \n"
        f"**Total questions:** {len(questions)}"
    )

    if not st.session_state.submitted:
        st.info("Select one answer for each question, then submit your test.")

        with st.form("quiz_form"):
            selected_answers = {}

            for index, question in enumerate(questions):
                st.markdown(
                    f'<div class="question-card">'
                    f'<h4>Question {index + 1} of {len(questions)}</h4>'
                    f'<p><strong>{question["question"]}</strong></p>'
                    f'</div>',
                    unsafe_allow_html=True
                )

                options = question["options"]
                option_labels = [
                    f"{letter}. {options[letter]}"
                    for letter in ["A", "B", "C", "D"]
                ]

                previous_answer = st.session_state.user_answers.get(
                    index, ""
                )

                default_index = None
                if previous_answer in options:
                    default_index = ["A", "B", "C", "D"].index(
                        previous_answer
                    )

                selected_label = st.radio(
                    f"Choose your answer for Question {index + 1}",
                    option_labels,
                    index=default_index,
                    key=f"question_{index}",
                    label_visibility="collapsed"
                )

                if selected_label:
                    selected_answers[index] = selected_label[0]

                st.write("")

            submitted = st.form_submit_button(
                "Submit Test",
                use_container_width=True
            )

        if submitted:
            st.session_state.user_answers = selected_answers
            st.session_state.submitted = True
            st.rerun()

    # ---------------- RESULTS SCREEN ----------------

    else:
        correct_count = 0
        wrong_count = 0
        unanswered_count = 0

        for index, question in enumerate(questions):
            correct_answer = question["answer"].strip().upper()
            user_answer = st.session_state.user_answers.get(index)

            if not user_answer:
                unanswered_count += 1
            elif user_answer == correct_answer:
                correct_count += 1
            else:
                wrong_count += 1

        total_questions = len(questions)
        percentage = (correct_count / total_questions) * 100

        st.markdown("##  Your Results")

        st.markdown(
            f"""
            <div class="hero">
                <h1>{percentage:.1f}%</h1>
                <h3>Test Completed!</h3>
                <p>You scored {correct_count} out of {total_questions}</p>
            </div>
            """,
            unsafe_allow_html=True
        )

        col1, col2 = st.columns(2)

        with col1:
            st.metric("Correct Answers", correct_count)

        with col2:
            st.metric("Incorrect Answers", wrong_count)

        st.metric("Unanswered Questions", unanswered_count)

        st.progress(int(percentage))

        st.divider()
        st.markdown("## Answer Review")

        for index, question in enumerate(questions):
            correct_answer = question["answer"].strip().upper()
            user_answer = st.session_state.user_answers.get(index)

            if not user_answer:
                status = "Not answered"
            elif user_answer == correct_answer:
                status = "Correct"
            else:
                status = "Incorrect"

            with st.container(border=True):
                st.markdown(f"### Question {index + 1}")
                st.write(question["question"])

                options = question["options"]

                for letter in ["A", "B", "C", "D"]:
                    option_text = options[letter]

                    if letter == correct_answer:
                        st.markdown(
                            f"**{letter}. {option_text}** ✓ Correct answer"
                        )
                    elif letter == user_answer:
                        st.markdown(
                            f"**{letter}. {option_text}** — Your answer"
                        )
                    else:
                        st.write(f"{letter}. {option_text}")

                st.markdown(f"**Result:** {status}")

                if user_answer:
                    st.write(
                        f"**Your selected answer:** "
                        f"{user_answer}. {options[user_answer]}"
                    )
                else:
                    st.write("**Your selected answer:** Not answered")

                st.markdown(
                    f"**Correct answer:** "
                    f"{correct_answer}. {options[correct_answer]}"
                )

                st.markdown(
                    f"""
                    <div class="correct-answer">
                        <strong>Explanation</strong><br>
                        {question.get("explanation", "No explanation provided.")}
                    </div>
                    """,
                    unsafe_allow_html=True
                )

        st.divider()

        if st.button("🔄 Create Another Quiz", use_container_width=True):
            st.session_state.questions = []
            st.session_state.user_answers = {}
            st.session_state.submitted = False
            st.session_state.quiz_topic = ""
            st.session_state.quiz_difficulty = ""
            st.rerun()

# ---------------- FOOTER ----------------

st.divider()

st.markdown(
    """
    <p style="text-align:center; color:#94677B;">
        Made with ♡ using Streamlit and AI
    </p>
    """,
    unsafe_allow_html=True
)

# .\.venv\Scripts\Activate.ps1
# cd "Milestone 1\Task 3"
# python -m pip install streamlit python-dotenv langchain-openai
# python -m streamlit run app.py
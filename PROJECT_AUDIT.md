# PROJECT AUDIT REPORT
**Project Title:** AI-Based Intelligent Examination Platform with Automated Proctoring and Candidate Performance Analysis  
**Repository Branch:** `Bharath-Milestone-1`  
**Date of Audit:** November 14, 2026  
**Auditor:** Senior Software Architect, AI/ML Engineer & QA Automation Lead  

---

## 1. Executive Summary

An exhaustive project discovery and code inspection was conducted on the repository. The project represents **Milestone 1** of an EdTech platform aimed at AI-driven question generation, interactive candidate testing, automated multimodal answer evaluation (MCQ + descriptive text + handwritten image OCR), and concept-level performance analysis.

### Current Implementation State
The repository comprises five distinct tasks under `Milestone 1/`:
1. **Task 1 (`Milestone 1/Task 1/task1.py`):** AI Model Connection & Diagnostics CLI tool verifying OpenAI and Google Gemini connections using LangChain.
2. **Task 2 (`Milestone 1/Task 2/task2.py`):** Streamlit-based CSM (Computer Science & Engineering - AI & ML) Practice Exam Generator across 25 B.Tech curriculum subjects.
3. **Task 3 (`Milestone 1/Task 3/`):** Streamlit interactive MCQ quiz application with exam submission, instant grading, score metrics, and detailed question-by-question review.
4. **Task 4 (`Milestone 1/Task 4/`):** Dual-section examination platform (Section A: MCQs, Section B: Descriptive Written Questions) with automated AI grading of written answers, rubric marking (0–5), key-point checks, and concept-level strength/weakness analysis.
5. **Task 5 (`Milestone 1/Task 5/`):** The flagship multimodal examination platform integrating Section A MCQs, Section B Written Q&A, Handwritten Answer Image Uploads with Vision OCR extraction (`gpt-4o`), automated AI evaluation with feedback/missing points, and concept mastery tracking.

A complete backup of the pre-modification state has been safely created under `_backup_original/`.

---

## 2. Complete Folder & File Inventory

```
AI-Based-Intelligent-Examination-Platform-With-Automated-Proctoring---Candid-Perfo-Analysis-OCT-2026/
├── .git/                                 # Git version control metadata
├── .gitignore                            # Git ignore rules (secrets, venv, pycache)
├── README.md                             # Repository header (currently minimal)
├── _backup_original/                     # Full unmodified project backup
│   ├── Milestone 1/
│   │   ├── Task 1/task1.py
│   │   ├── Task 2/task2.py
│   │   ├── Task 3/
│   │   │   ├── app.py
│   │   │   └── mcq_generator.py
│   │   ├── Task 4/
│   │   │   ├── app.py
│   │   │   └── mcq_generator.py
│   │   ├── Task 5/
│   │   │   ├── app.py
│   │   │   └── mcq_generator.py
│   │   ├── api_keys.env
│   │   └── executioncommands.py
│   ├── README.md
│   └── .gitignore
├── Milestone 1/
│   ├── api_keys.env                      # Environment file holding provider API keys and models
│   ├── executioncommands.py              # Reference execution script comments
│   ├── Task 1/
│   │   └── task1.py                      # Task 1: AI Provider connection & diagnostic script
│   ├── Task 2/
│   │   └── task2.py                      # Task 2: CSM Practice Test MCQ generator UI
│   ├── Task 3/
│   │   ├── app.py                        # Task 3: Streamlit Quiz UI & grading flow
│   │   └── mcq_generator.py              # Task 3: LangChain OpenAI MCQ generation module
│   ├── Task 4/
│   │   ├── app.py                        # Task 4: Streamlit Dual-format Examination Platform
│   │   └── mcq_generator.py              # Task 4: Direct OpenAI client MCQ/QA generator & evaluator
│   └── Task 5/
│       ├── app.py                        # Task 5: Streamlit Multimodal Exam UI + OCR + Analytics
│       └── mcq_generator.py              # Task 5: Multimodal LangChain generator, OCR & evaluator
└── .venv/                                # Python 3.14 virtual environment
```

---

## 3. File-by-File Analysis & Functionality Mapping

### Root Files
| File | Size (Bytes) | Role & Content | Status |
| :--- | :--- | :--- | :--- |
| `.gitignore` | 178 | Excludes `.env`, `api_keys.env`, `.venv/`, `__pycache__/`, `*.py[cod]` | Working, needs `_backup_original/` |
| `README.md` | 102 | Contains only project title header | Needs complete overhaul |

### Milestone 1 Shared Configuration
| File | Role & Content | Observations & Potential Issues |
| :--- | :--- | :--- |
| `Milestone 1/api_keys.env` | Defines `OPENAI_API_KEY`, `GOOGLE_API_KEY`, `OPENAI_MODEL`, `GEMINI_MODEL`, `OCR_MODEL`. | Must be preserved securely without exposing secrets in logs/code. |
| `Milestone 1/executioncommands.py` | Commented shell commands for activating venv, pip install, and running Streamlit. | Minimal scratchpad; paths should be kept accurate. |

### Task 1: AI Model Diagnostics
- **File:** `Milestone 1/Task 1/task1.py` (143 lines)
- **Primary Entry Point:** `python "Milestone 1/Task 1/task1.py"`
- **Dependencies:** `dotenv`, `langchain_openai.ChatOpenAI`, `langchain_google_genai.ChatGoogleGenerativeAI`
- **Functionality:**
  - Loads environment from `api_keys.env` (either parent or local folder).
  - Validates presence of `OPENAI_API_KEY` and `GOOGLE_API_KEY`.
  - Instantiates `openai_model` (`gpt-4o-mini`) and `gemini_model` (`gemini-3.8-flash`).
  - Lists available OpenAI models via `root_client.models.list()`.
  - Lists available Gemini models via `client.models.list()`.
  - Prompts user via CLI for a prompt input (`input("\nEnter your prompt: ")`).
  - Dispatches the prompt to both OpenAI and Gemini and prints their responses.
- **Bugs & Issues:**
  - `gemini-3.8-flash` model string may fail depending on API version availability; should read `GEMINI_MODEL` with fallback.
  - Interactive `input()` causes non-interactive automated test suites to hang.
  - Error handling prints error strings but lacks structured retry or fallback.

### Task 2: CSM Practice Test MCQ Generator
- **File:** `Milestone 1/Task 2/task2.py` (450 lines)
- **Primary Entry Point:** `streamlit run "Milestone 1/Task 2/task2.py"`
- **Dependencies:** `streamlit`, `json`, `dotenv`, `langchain_openai.ChatOpenAI`
- **Functionality:**
  - Dedicated B.Tech CSM (AI & ML) syllabus practice dashboard with 25 preloaded subjects.
  - Controls for Subject, Difficulty (Easy, Medium, Hard), Question Count (1–20), Custom Unit/Topic.
  - Prompts `ChatOpenAI(model="gpt-3.5-turbo")` with specialized prompt enforcing JSON schema with 4 options and explanations.
  - Displays questions in cards with toggle checkbox "Show correct answers and explanations".
- **Bugs & Issues:**
  - Hardcodes `gpt-3.5-turbo` instead of reading `OPENAI_MODEL`.
  - Cyan/slate theme (`#0891b2`) does not conform to the required Dark Navy & Electric Blue design identity.
  - Comment at line 450 has incorrect command path (`task2.py` in `Milestone 1` instead of `Milestone 1/Task 2/task2.py`).
  - No session state reset when re-generating questions.

### Task 3: Interactive MCQ Quiz Application
- **Files:** `Milestone 1/Task 3/mcq_generator.py` (189 lines), `Milestone 1/Task 3/app.py` (506 lines)
- **Primary Entry Point:** `streamlit run "Milestone 1/Task 3/app.py"`
- **Dependencies:** `streamlit`, `json`, `dotenv`, `langchain_openai.ChatOpenAI`
- **Functionality:**
  - `mcq_generator.py`: Generates MCQs for a given topic and difficulty. Validates schema, options set `{A, B, C, D}`, answer key validity, non-empty text.
  - `app.py`: Streamlit interactive exam session. Candidates choose answers via `st.radio` within `st.form`.
  - Evaluation: Computes score percentage, correct/wrong/unanswered count, displays progress bar, question review breakdown with explanation.
- **Bugs & Issues:**
  - UI uses pale green theme (`#E8F5E9`, `#C8E6C9`, `#1B5E20`) and contains leftover "BABY PINK THEME" comment headers.
  - Does not support Google Gemini as an alternative LLM provider.
  - Radio options state handling within form can lead to default-selection quirks on rerun.
  - Generates duplicate questions if LLM repeats them; lacks duplicate detection found in Task 5.

### Task 4: Dual-Format Examination & AI Evaluation
- **Files:** `Milestone 1/Task 4/mcq_generator.py` (324 lines), `Milestone 1/Task 4/app.py` (395 lines)
- **Primary Entry Point:** `streamlit run "Milestone 1/Task 4/app.py"`
- **Dependencies:** `streamlit`, `openai` (direct client), `dotenv`, `json`
- **Functionality:**
  - `mcq_generator.py`:
    - Generates Section A MCQs with concept tags.
    - Generates Section B Written Questions with model answers and key points; prevents overlapping with concepts in MCQs!
    - Evaluates student written answers against model answers and key points, awarding 0 to 5 marks with constructive feedback and missing key points.
  - `app.py`:
    - Examination UI with Section A (MCQs) and Section B (Written textareas).
    - Submits both sections, computes total composite score (MCQs + Written marks).
    - Analytics: Concept-wise mastery analysis categorizing into Strengths (>= 70%) and Areas to Improve (< 70%).
    - Accordion review for every MCQ and Written answer.
- **Bugs & Issues:**
  - `mcq_generator.py` directly executes `client = OpenAI(api_key=API_KEY)` at module root. If `OPENAI_API_KEY` is not present, import raises an unhandled `ValueError` crashing Streamlit on load.
  - Uses direct `openai` library rather than LangChain, differing from Tasks 1, 2, 3, and 5.
  - Options data structure in Task 4 is a list of strings (`["Option A", ...]`) and `answer` is the option string, while Tasks 3 & 5 use dict `{"A": ...}` and letter answers.
  - Pink/mauve theme (`#FFF8FA`, `#92566F`) does not match the required Dark Navy & Electric Blue design identity.

### Task 5: Multimodal Intelligent Examination Platform
- **Files:** `Milestone 1/Task 5/mcq_generator.py` (367 lines), `Milestone 1/Task 5/app.py` (937 lines)
- **Primary Entry Point:** `streamlit run "Milestone 1/Task 5/app.py"`
- **Dependencies:** `streamlit`, `langchain_openai.ChatOpenAI`, `dotenv`, `base64`, `json`, `re`
- **Functionality:**
  - State-of-the-art implementation among the Milestone 1 tasks.
  - `mcq_generator.py`:
    - `generate_mcqs()`: Generates MCQs with normalization and in-memory duplicate detection (`seen = set()`).
    - `generate_qa_questions()`: Generates written questions, cross-checks against MCQ texts and concepts to strictly prevent repetition.
    - `extract_text_from_image()`: Uses `gpt-4o` vision model via base64 data URI to transcribe handwritten candidate answers from uploaded images (PNG, JPEG, WebP, GIF).
    - `evaluate_written_answer()`: AI-based rubric marking (0 to 5 marks), qualitative feedback, and missing key point deduction.
  - `app.py`:
    - Comprehensive UI with Section A (MCQs) and Section B (Written Q&A + Image OCR uploader + Text editor).
    - "Extract text using OCR" button transfers recognized handwriting into candidate's answer box.
    - Scoring engine: Combines MCQ score with AI-assessed descriptive marks.
    - Performance analytics: Computes concept accuracy and segregates into Strengths (>= 70%) and Areas to Improve (< 70%).
    - Detailed feedback drawers with model answers, candidate answers, and missing points.
- **Bugs & Issues:**
  - OCR session state assignment: Directly setting `st.session_state[f"written_answer_{index}"]` right before `st.rerun()` can trigger Streamlit widget key mutation conflicts.
  - In `mcq_generator.py`, duplicate detection raises an exception (`ValueError("Duplicate MCQs were generated. Try again.")`), causing the entire generation process to abort rather than internally retrying.
  - Mint-Green & White theme (`#F0FFF4`) needs complete redesign to Dark Navy & Electric Blue.
  - No fallback to Google Gemini when OpenAI API quota is exhausted or key is missing.

---

## 4. Dependencies & Environment State

### Current Environment (`.venv`)
- Python version: `Python 3.14.8`
- Installed core packages:
  - `openai (3.51.0)`
  - `langchain-openai (1.8.0)`, `langchain-core (1.8.0)`, `langchain-google-genai (4.5.0)`
  - `google-genai (3.3.0)`, `google-auth (2.62.2)`
  - `python-dotenv (1.2.4)`, `pydantic (2.14.3)`, `httpx (0.28.1)`
- Missing package in `.venv`:
  - `streamlit` is **not yet installed** in the virtual environment. It must be installed to run and test Tasks 2, 3, 4, and 5.
  - `Pillow` (PIL) for image verification.

### Requirements Specification
A unified `requirements.txt` is required at the root level specifying tested, compatible package versions.

---

## 5. Duplicate, Outdated, and Conflicting Files

1. **`mcq_generator.py` variations:**
   - Exists in Task 3, Task 4, and Task 5 with slightly different signatures, data structures (dict options vs list options), and libraries (`langchain_openai` vs direct `openai`).
   - Task 5 contains the most advanced multimodal implementation with OCR and deduplication.
   - *Recommendation:* Keep task-specific implementations functional and compatible with each task's existing signature and data contracts, while upgrading each task's reliability, error handling, model flexibility, and styling.
2. **`__pycache__` artifacts:**
   - Stale `.pyc` files from Python 3.10 and Python 3.14 reside in `Milestone 1/__pycache__/` and task subfolders. These should be cleaned and managed via `.gitignore`.
3. **Themes across tasks:**
   - Task 2: Cyan & Slate Blue.
   - Task 3: Pale Green & Baby Pink.
   - Task 4: Light Mauve & Pink.
   - Task 5: Mint-Green & White.
   - *Recommendation:* Unify all tasks under the required **Premium Dark Navy & Electric Blue** visual identity (`#0B1020`, `#111A2E`, `#17243A`, `#6366F1`, `#38BDF8`).

---

## 6. Proctoring Architecture & Analysis

The user request highlights proctoring features (face detection, tracking, looking away, missing face, multiple faces, browser monitoring).
- **Audit Findings:** No computer vision / proctoring code (`cv2`, `mediapipe`, `dlib`) or browser tab tracking was present in the original Milestone 1 commit `ea062e0`. The repository represents the Milestone 1 delivery of the examination platform.
- **Architecture Strategy:**
  - Preserve all existing examination mechanisms in Tasks 1–5 without removing or breaking any interfaces.
  - Add client-side examination integrity and browser monitoring mechanisms (such as tab-switch/blur detection and fullscreen tracking) where appropriate, without disrupting existing examination workflows.
  - Document the proctoring feature roadmap clearly in documentation.

---

## 7. Improvement Action Plan

1. **Phase 1 (Complete):** Project discovery and `PROJECT_AUDIT.md` created.
2. **Phase 2 & 10 (Complete):** Backup created in `_backup_original/`. Existing features cataloged.
3. **Environment Setup:** Install `streamlit` and required dependencies in `.venv` outside sandbox.
4. **Phase 3 & 4 (UI/UX Redesign):** Build a unified, reusable premium design system with CSS tokens in Dark Navy (`#0B1020`), Deep Navy (`#111A2E`), Card Navy (`#17243A`), Electric Blue (`#38BDF8`), Indigo Accent (`#6366F1`), and high-contrast typography (`#F8FAFC`, `#A8B3C7`).
5. **Phase 5 (Task-by-Task Refactoring & Hardening):**
   - **Task 1:** Enhance AI diagnostics, support non-interactive testing mode, robustly handle model listing, support both OpenAI and Gemini models gracefully.
   - **Task 2:** Refactor CSM practice quiz generator with dark theme, environment-based model selection, reliable JSON parsing, and clean session state.
   - **Task 3:** Upgrade interactive quiz app with dark theme, robust answer collection, score analytics, and dual-provider support.
   - **Task 4:** Refactor dual-section exam platform with dark theme, safe client initialization (preventing import crashes when keys are missing), and robust grading.
   - **Task 5:** Refactor flagship multimodal platform with dark theme, fix Streamlit OCR state rerun conflict, add graceful generation retry, and provide robust OCR fallback and error messaging.
6. **Phase 6 & 7 (Bug Fixing & Safety):** Root-cause bug fixes across all tasks, safe API key handling, .env.example template creation.
7. **Phase 8 (Testing & Verification):** Static code compilation, mock-based unit tests for all tasks, end-to-end workflow verification.
8. **Phase 9 (Documentation):** Create `README.md`, `requirements.txt`, `TEST_REPORT.md`, and `CHANGELOG.md`.

---
*Audit Completed on 2026-11-14. Ready to proceed to implementation.*

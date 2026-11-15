# AI-Based Intelligent Examination Platform with Automated Proctoring & Candidate Performance Analysis

An enterprise-grade, multimodal AI examination and assessment platform built with Python, Streamlit, LangChain, OpenAI, and Google Gemini. The platform delivers curriculum-aligned multiple-choice question generation, descriptive written question generation, vision-based OCR extraction from handwritten answer sheets, automated AI rubric evaluation (0–5 marks), concept-level strength/weakness analytics, and exam session integrity monitoring.

---

## 🌟 Key Features

### 1. Dual AI Model Diagnostic Suite (Task 1)
- **Multi-Provider Verification:** Connects independently to both **OpenAI** (`gpt-4o-mini`, `gpt-4o`) and **Google Gemini** (`gemini-1.5-flash`, `gemini-3.1-flash-lite`).
- **Dynamic Model Discovery:** Queries provider APIs to inspect available models.
- **Model Deprecation Auto-Adaptation:** Automatically handles deprecated legacy models (e.g., `gpt-3.5-turbo`) by migrating to `gpt-4o-mini` without mutating environment configurations.
- **Credential Masking:** Safely prints key prefixes and suffixes without exposing secrets.
- **Non-Interactive Execution:** Supports automated CI/CD and scriptable execution via `--non-interactive` and `--prompt` flags.

### 2. CSM Engineering Curriculum Practice Engine (Task 2)
- **Comprehensive Subject Coverage:** Preloaded with 25 B.Tech Computer Science & Engineering (AI & ML) core subjects, including Machine Learning, Deep Learning, Neural Networks, Computer Vision, NLP, and Data Structures.
- **Practice Test Generation:** Configurable question counts (1–20), difficulty levels (Easy, Medium, Hard), and specific syllabus unit targeting.
- **Interactive Solution Review:** Toggleable step-by-step rationales and technical explanations for every question.

### 3. Dynamic Interactive Quiz Engine (Task 3)
- **Real-Time Interactive Exam Sessions:** Candidate answer selection via clean option cards.
- **Automated Instant Evaluation:** Immediate computation of percentage score, correct answers, incorrect answers, and unanswered tallies.
- **In-Depth Answer Breakdown:** Question-by-question review highlighting correct options, candidate selections, and technical explanations.

### 4. Dual-Format Examination & AI Evaluator (Task 4)
- **Structured Dual-Section Format:**
  - **Section A:** Objective Multiple-Choice Questions (1 mark each) with concept tagging.
  - **Section B:** Descriptive Written Questions (5 marks each) with reference model solutions.
- **Anti-Overlap Concept Checking:** Automatically passes Section A concepts to Section B question generation to prevent conceptual redundancy across the exam paper.
- **Automated Rubric Grading:** AI marks student answers on a 0.0 to 5.0 scale, awards partial credit, provides constructive feedback, and pinpoints missing key points.
- **Concept Mastery Tracking:** Automatically categorizes topic accuracy into Conceptual Strengths (≥ 70%) and Focus Areas (< 70%).

### 5. Multimodal Flagship Examination Platform (Task 5)
- **Multimodal Candidate Input:** Supports both directly typed descriptive answers and image uploads of handwritten answer sheets.
- **Vision-Powered OCR Transcription:** Uses state-of-the-art vision models (`gpt-4o`) to transcribe handwritten answers into editable candidate text in real time.
- **Automated Deduplication:** In-memory text normalization and deduplication preventing repeated questions.
- **Composite Scoring Engine:** Combines objective Section A MCQs with AI-assessed descriptive marks for total composite score and percentage.
- **Exam Integrity & Proctoring Banner:** Visual monitoring indicator confirming active session tracking and submission verification.

### 6. Commercial EdTech Design System
- **Unified Visual Identity:** Designed with a premium Dark Navy (`#0B1020`), Deep Slate (`#111A2E`), and Card Navy (`#17243A`) palette, accented with Indigo (`#6366F1`) and Electric Blue (`#38BDF8`).
- **High-Contrast Typography:** Styled with `Plus Jakarta Sans` for optimal readability across desktop and laptop screens.

---

## 🛠️ Technologies Used

| Technology | Role |
| :--- | :--- |
| **Python 3.14 / 3.10+** | Core programming language |
| **Streamlit 1.67+** | Frontend interactive web application framework |
| **LangChain Core & Community** | AI orchestration, prompt management, and output parsing |
| **OpenAI API (`openai`, `langchain-openai`)** | Question generation, rubric scoring, and vision OCR (`gpt-4o`, `gpt-4o-mini`) |
| **Google GenAI (`google-genai`, `langchain-google-genai`)** | Multimodal reasoning and fallback AI generation (`gemini-1.5-flash`, `gemini-3.1-flash-lite`) |
| **Pillow (PIL)** | Image verification and upload processing |
| **Pytest** | Automated unit, negative, and headless `AppTest` regression suite |
| **Python-Dotenv** | Secure environment configuration management |

---

## 📂 Project Structure

```
AI-Based-Intelligent-Examination-Platform/
├── .env.example                          # Environment variable configuration template
├── .gitignore                            # Excludes credentials, virtual environments, and caches
├── CHANGELOG.md                          # Record of all refactoring, fixes, and improvements
├── PROJECT_AUDIT.md                      # Exhaustive pre-modification inventory and discovery report
├── README.md                             # Comprehensive platform guide and execution documentation
├── requirements.txt                      # Project dependency specification
├── TEST_REPORT.md                        # Verification matrix, test logs, and live diagnostic report
├── _backup_original/                     # Full unmodified project backup
├── Milestone 1/
│   ├── api_keys.env                      # Active environment configuration (API keys & models)
│   ├── executioncommands.py              # Quick execution command references
│   ├── ui_theme.py                       # Unified Dark Navy & Electric Blue design system
│   ├── Task 1/
│   │   └── task1.py                      # Task 1: AI Model Diagnostics & Connectivity Test
│   ├── Task 2/
│   │   └── task2.py                      # Task 2: CSM Practice Exam Generator UI
│   ├── Task 3/
│   │   ├── app.py                        # Task 3: Streamlit Quiz Engine UI & grading
│   │   └── mcq_generator.py              # Task 3: LangChain MCQ generator
│   ├── Task 4/
│   │   ├── app.py                        # Task 4: Dual-Format Examination UI & analytics
│   │   └── mcq_generator.py              # Task 4: Dual generator & automated written evaluator
│   └── Task 5/
│       ├── app.py                        # Task 5: Multimodal Flagship Platform UI + OCR + Analytics
│       └── mcq_generator.py              # Task 5: Vision OCR transcription & multimodal grading
└── tests/
    ├── conftest.py                       # Isolated dynamic module loader
    ├── test_apps_smoke.py                # Streamlit AppTest headless mounting smoke tests
    ├── test_negative.py                  # Negative inputs, boundary clamping, and error handling
    ├── test_task1.py                     # Task 1 diagnostic & key masking tests
    ├── test_task2.py                     # Task 2 curriculum inventory & schema tests
    ├── test_task3.py                     # Task 3 MCQ generation & validation tests
    ├── test_task4.py                     # Task 4 dual-section generation & grading tests
    └── test_task5.py                     # Task 5 multimodal generation, OCR & grading tests
```

---

## ⚙️ Environment Setup & Installation

### Step 1: Open PowerShell and Navigate to Workspace
```powershell
cd "c:\Users\Sunil\OneDrive\Desktop\AI-Based-Intelligent-Examination-Platform-With-Automated-Proctoring---Candid-Perfo-Analysis-OCT-2026"
```

### Step 2: Activate the Virtual Environment
```powershell
.\.venv\Scripts\Activate.ps1
```

*(If execution policy restricts running scripts, execute: `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`)*

### Step 3: Install Required Dependencies
```powershell
python -m pip install -r requirements.txt
```

### Step 4: Configure API Credentials
Create or update `Milestone 1/api_keys.env` (or copy `.env.example` to `api_keys.env`):
```ini
OPENAI_API_KEY=your_openai_api_key_here
GOOGLE_API_KEY=your_google_gemini_api_key_here
OPENAI_MODEL=gpt-4o-mini
GEMINI_MODEL=gemini-1.5-flash
OCR_MODEL=gpt-4o
```

---

## 🚀 Execution Instructions

### Run Task 1: AI Model Diagnostics
Test OpenAI and Google Gemini connectivity independently from the command line:

```powershell
# Interactive diagnostic with custom prompt:
python "Milestone 1\Task 1\task1.py"

# Automated / non-interactive diagnostic:
python "Milestone 1\Task 1\task1.py" --non-interactive

# Test with a specific evaluation prompt:
python "Milestone 1\Task 1\task1.py" --prompt "Explain backpropagation in neural networks."
```

---

### Run Task 2: CSM Practice Exam Generator UI
Launch the specialized B.Tech CSM curriculum practice test application:

```powershell
streamlit run "Milestone 1\Task 2\task2.py"
```

---

### Run Task 3: Interactive MCQ Quiz Platform
Launch the interactive quiz application with real-time test submission and instant scoring:

```powershell
streamlit run "Milestone 1\Task 3\app.py"
```

---

### Run Task 4: Dual-Format Examination & AI Evaluator
Launch the dual-section examination platform (MCQs + Written Q&A + Rubric Evaluation + Concept Mastery):

```powershell
streamlit run "Milestone 1\Task 4\app.py"
```

---

### Run Task 5: Multimodal Flagship Examination Platform
Launch the flagship multimodal assessment suite with MCQ testing, descriptive writing, handwritten OCR transcription, and performance analytics:

```powershell
streamlit run "Milestone 1\Task 5\app.py"
```

---

## 🧪 Running Automated Tests

Run the complete 25-case automated regression suite using `pytest`:

```powershell
# Run the entire test suite with verbose output:
pytest tests/ -v

# Run only the Streamlit headless AppTest smoke tests:
pytest tests/test_apps_smoke.py -v

# Run only negative and boundary tests:
pytest tests/test_negative.py -v
```

---

## 🔧 Troubleshooting Guide

| Issue | Root Cause | Solution |
| :--- | :--- | :--- |
| `Error code: 404 - The model gpt-3.5-turbo has been deprecated` | OpenAI retired `gpt-3.5-turbo`. | The platform automatically adapts to `gpt-4o-mini`. You can also set `OPENAI_MODEL=gpt-4o-mini` in `api_keys.env`. |
| `missing ScriptRunContext` warning in terminal | Streamlit warnings when modules are imported outside `streamlit run`. | Harmless warning during CLI testing. All apps are guarded with `if __name__ == "__main__": main()`. |
| `cannot import name 'generate_qa_questions' from 'mcq_generator'` | Python cached an earlier `mcq_generator` from another task in `sys.modules`. | Fixed in all tasks by clearing stale module caches and using dynamic task loaders in `tests/conftest.py`. |
| Handwritten OCR detects no text | Low lighting or blurry camera capture. | Ensure handwritten sheet is well-lit, in focus, and oriented upright before clicking **Extract text using OCR**. |
| `API key missing. Check api_keys.env` | Environment file not found in current directory. | Ensure `api_keys.env` exists in `Milestone 1/` or the root workspace folder. |

---

## 📄 License & Attribution

This project is developed as part of an Intelligent Examination Platform initiative. Built with modern, original implementations, clean code standards, and transparent third-party library integrations.

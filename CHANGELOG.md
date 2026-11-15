# CHANGELOG

All notable changes to the **AI-Based Intelligent Examination Platform with Automated Proctoring and Candidate Performance Analysis** are documented in this file.

---

## [Milestone 1 Overhaul] - 2026-11-14

### 🌟 Major Architecture & Visual Redesign
- **Commercial EdTech Design System (`Milestone 1/ui_theme.py`):**
  - Replaced legacy disparate themes (Cyan slate, Baby Pink, Pale Green, Mint-White) with a unified **Premium Dark Navy & Electric Blue** visual identity.
  - Implemented color palette tokens: Primary background (`#0B1020`), Deep slate (`#111A2E`), Card navy (`#17243A`), Accent Indigo (`#6366F1`), and Electric Blue (`#38BDF8`).
  - Added reusable hero headers (`render_hero`), footer branding (`render_footer`), metric cards, option pills, and question cards.
  - Custom responsive typography using `Plus Jakarta Sans` with high contrast ratios (`#F8FAFC`, `#A8B3C7`).

### 🛠️ Task 1: AI Model Diagnostics (`Milestone 1/Task 1/task1.py`)
- **Key Discovery & Secure Masking:**
  - Added dynamic search across local and parent directories for `api_keys.env` or `.env`.
  - Added secure key masking (`mask_key()`) preventing accidental credential leaks.
- **Model Deprecation Auto-Adaptation:**
  - Resolved `Error code: 404 - The model gpt-3.5-turbo has been deprecated` by automatically adapting deprecated model IDs to `gpt-4o-mini` while preserving environment integrity.
- **Non-Interactive Execution Support:**
  - Added CLI flag `--non-interactive` and `--prompt "<text>"` so automated QA suites can run diagnostics without blocking on terminal input.
- **Independent Provider Diagnostics:**
  - Decoupled OpenAI and Google Gemini execution blocks so failure or absence of one provider does not prevent the other from running and reporting diagnostics.

### 🎓 Task 2: CSM Practice Exam Generator (`Milestone 1/Task 2/task2.py`)
- **UI & Layout Overhaul:**
  - Redesigned into a professional B.Tech CSM curriculum practice dashboard with feature highlight cards.
- **Curriculum Preservation:**
  - Preserved all 25 core CSM subjects (Engineering Mathematics, AI, ML, Deep Learning, Neural Networks, Computer Vision, etc.).
- **Model Resilience:**
  - Integrated `OPENAI_MODEL` with fallback to `gpt-4o-mini` and Google Gemini.
- **Execution Guard:**
  - Wrapped execution in `def main(): ... if __name__ == "__main__": main()` preventing import side-effects.

### 📝 Task 3: Interactive MCQ Quiz Platform (`Milestone 1/Task 3/`)
- **Engine Hardening (`mcq_generator.py`):**
  - Cleaned unneeded startup console prints.
  - Added robust markdown code-fence stripping and JSON regex extraction.
  - Added dual-provider fallback (OpenAI `gpt-4o-mini` and Gemini `gemini-1.5-flash`).
- **Interactive UI (`app.py`):**
  - Redesigned with dark card layouts, option radio buttons, and animated score percentage hero banners.
  - Fixed session state management and question answer tracking on rerun.

### 📑 Task 4: Dual-Format Examination Platform (`Milestone 1/Task 4/`)
- **Lazy Client Initialization (`mcq_generator.py`):**
  - Fixed critical bug where `client = OpenAI(...)` was called at module root level, crashing on import if environment keys were missing.
  - Added multi-provider fallback support.
- **Concept-Based Anti-Duplication:**
  - Preserved and hardened concept-exclusion logic between Section A (MCQs) and Section B (Written Q&A).
- **Rubric Grading & Mastery Analysis (`app.py`):**
  - Upgraded written evaluation engine with 0–5 marking, detailed feedback, and missing key point deduction.
  - Added concept mastery categorization (Strengths ≥ 70%, Focus Areas < 70%).

### 🚀 Task 5: Multimodal Flagship Examination Platform (`Milestone 1/Task 5/`)
- **Streamlit State Mutation Fix:**
  - Fixed Streamlit widget mutation error where assigning OCR text directly to widget session keys right before `st.rerun()` caused conflicts.
  - Decoupled OCR buffer state (`st.session_state.ocr_text`) from widget value binding.
- **Deduplication Resilience:**
  - Fixed bug where duplicate questions raised a fatal `ValueError` aborting generation; replaced with resilient in-memory deduplication and normalization.
- **Multimodal OCR & Vision Transcription:**
  - Enhanced `extract_text_from_image()` supporting PNG, JPEG, WebP, and GIF with base64 data URIs and `gpt-4o` vision model.
- **Exam Integrity Status Banner:**
  - Added proctoring and exam integrity status monitor banner.

### 🧪 Automated QA & Testing Suite (`tests/`)
- Created automated test suite with 25 test cases across 6 modules:
  - `tests/conftest.py`: Dynamic task module loader preventing cross-task `sys.modules` collisions.
  - `tests/test_task1.py`: Key masking, path resolution, and model connectivity.
  - `tests/test_task2.py`: Subject inventory and JSON schema validation.
  - `tests/test_task3.py`: MCQ validation and error handling.
  - `tests/test_task4.py`: Dual-section generation, concept checking, and rubric scoring.
  - `tests/test_task5.py`: Multimodal generation, anti-overlap, and vision OCR.
  - `tests/test_negative.py`: Clamping, empty inputs, invalid JSON, and normalization.
  - `tests/test_apps_smoke.py`: Streamlit `AppTest` headless browser smoke testing for all apps.

### 📚 Documentation & Safety
- Created `PROJECT_AUDIT.md`: Complete folder and file inventory, task analysis, bugs identified, and improvement roadmap.
- Created `TEST_REPORT.md`: Comprehensive test report with detailed results matrix.
- Created `.env.example`: Safe environment variable template with placeholder credentials.
- Created `requirements.txt`: Standardized dependency file.
- Created `_backup_original/`: Complete pre-modification safety backup.

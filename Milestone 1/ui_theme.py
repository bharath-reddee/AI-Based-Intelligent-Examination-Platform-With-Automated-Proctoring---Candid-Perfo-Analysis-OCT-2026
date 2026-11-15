"""
Unified UI Theme & Design System
AI-Based Intelligent Examination Platform
Colors: Dark Navy (#0B1020), Deep Slate (#111A2E), Card Navy (#17243A),
        Primary Accent Indigo (#6366F1), Secondary Electric Blue (#38BDF8),
        Text (#F8FAFC, #A8B3C7).
"""

DARK_THEME_CSS = """
<style>
/* ============================================================
   GLOBAL STYLES & TYPOGRAPHY
   ============================================================ */
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

html, body, [class*="css"] {
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
}

/* Background canvas */
.stApp, [data-testid="stAppViewContainer"] {
    background-color: #0B1020 !important;
    color: #F8FAFC !important;
}

[data-testid="stHeader"] {
    background-color: rgba(11, 16, 32, 0.85) !important;
    backdrop-filter: blur(8px);
}

.block-container {
    max-width: 1100px;
    padding-top: 2rem;
    padding-bottom: 4rem;
}

/* Headings */
h1, h2, h3, h4, h5, h6 {
    color: #F8FAFC !important;
    font-weight: 700 !important;
    letter-spacing: -0.02em;
}

p, span, label, li {
    color: #A8B3C7;
    font-size: 0.95rem;
}

/* ============================================================
   HERO / BANNER COMPONENT
   ============================================================ */
.edtech-hero {
    background: linear-gradient(135deg, #111A2E 0%, #17243A 60%, #1E1B4B 100%);
    border: 1px solid #233554;
    border-left: 4px solid #38BDF8;
    border-radius: 16px;
    padding: 28px 32px;
    margin-bottom: 28px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);
    position: relative;
    overflow: hidden;
}

.edtech-hero::after {
    content: '';
    position: absolute;
    top: -50px;
    right: -50px;
    width: 200px;
    height: 200px;
    background: radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%);
    border-radius: 50%;
    pointer-events: none;
}

.edtech-hero h1 {
    color: #F8FAFC !important;
    font-size: 2rem;
    font-weight: 800;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 12px;
}

.edtech-hero p {
    color: #94A3B8 !important;
    font-size: 1rem;
    margin: 0;
    max-width: 800px;
    line-height: 1.55;
}

.edtech-badge {
    display: inline-block;
    background: rgba(56, 189, 248, 0.12);
    color: #38BDF8 !important;
    border: 1px solid rgba(56, 189, 248, 0.28);
    padding: 4px 10px;
    border-radius: 9999px;
    font-size: 0.78rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    margin-bottom: 10px;
}

/* ============================================================
   QUESTION & SECTION CARDS
   ============================================================ */
.question-card {
    background: #17243A;
    border: 1px solid #233554;
    border-radius: 14px;
    padding: 20px 22px;
    margin: 16px 0;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.question-card:hover {
    border-color: #2D4369;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35);
}

.question-title {
    color: #F8FAFC !important;
    font-size: 1.05rem;
    font-weight: 700;
    line-height: 1.5;
    margin-bottom: 4px;
}

.question-meta {
    color: #64748B !important;
    font-size: 0.82rem;
    font-weight: 500;
}

/* Option pill inside practice mode */
.option-item {
    background: #111A2E;
    border: 1px solid #233554;
    border-radius: 10px;
    padding: 12px 16px;
    margin: 8px 0;
    color: #E2E8F0 !important;
    font-size: 0.95rem;
    display: flex;
    align-items: center;
    gap: 12px;
    transition: all 0.15s ease;
}

.option-item:hover {
    background: #17243A;
    border-color: #38BDF8;
}

.option-badge {
    background: rgba(99, 102, 241, 0.2);
    color: #818CF8;
    border: 1px solid rgba(99, 102, 241, 0.35);
    width: 26px;
    height: 26px;
    border-radius: 6px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 0.82rem;
}

/* ============================================================
   FORM INPUTS, TEXTAREAS & DROPDOWNS
   ============================================================ */
input, textarea, div[data-baseweb="select"] > div {
    background-color: #111A2E !important;
    color: #F8FAFC !important;
    border: 1px solid #233554 !important;
    border-radius: 10px !important;
    font-size: 0.95rem;
}

input:focus, textarea:focus {
    border-color: #6366F1 !important;
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.25) !important;
}

div[data-testid="stWidgetLabel"] label,
div[data-testid="stWidgetLabel"] p {
    color: #E2E8F0 !important;
    font-weight: 600;
    font-size: 0.92rem;
}

/* Radio Group styling */
div[data-testid="stRadio"] [role="radiogroup"] {
    gap: 8px;
}

div[data-testid="stRadio"] label {
    background: #111A2E !important;
    border: 1px solid #233554 !important;
    border-radius: 10px !important;
    padding: 10px 16px !important;
    color: #E2E8F0 !important;
    transition: all 0.15s ease;
}

div[data-testid="stRadio"] label:hover {
    border-color: #38BDF8 !important;
    background: #17243A !important;
}

div[data-testid="stRadio"] label p {
    color: #E2E8F0 !important;
    font-size: 0.93rem;
}

/* ============================================================
   BUTTONS
   ============================================================ */
div.stButton > button,
div.stFormSubmitButton > button {
    background: linear-gradient(135deg, #4F46E5 0%, #6366F1 60%, #38BDF8 100%) !important;
    color: #FFFFFF !important;
    border: none !important;
    border-radius: 10px !important;
    padding: 12px 24px !important;
    font-weight: 650 !important;
    font-size: 0.95rem !important;
    box-shadow: 0 4px 14px rgba(79, 70, 229, 0.35) !important;
    transition: all 0.2s ease !important;
    min-height: 44px;
}

div.stButton > button:hover,
div.stFormSubmitButton > button:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(99, 102, 241, 0.5) !important;
    color: #FFFFFF !important;
}

div.stButton > button:active,
div.stFormSubmitButton > button:active {
    transform: translateY(0);
}

div.stButton > button p,
div.stFormSubmitButton > button p {
    color: #FFFFFF !important;
    font-weight: 650;
}

/* Secondary Button variant */
div.stButton > button[kind="secondary"] {
    background: #17243A !important;
    color: #E2E8F0 !important;
    border: 1px solid #233554 !important;
    box-shadow: none !important;
}

/* ============================================================
   METRICS & SCORE CARDS
   ============================================================ */
div[data-testid="stMetric"] {
    background: #17243A !important;
    border: 1px solid #233554 !important;
    border-radius: 12px !important;
    padding: 16px 20px !important;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
}

div[data-testid="stMetricLabel"] p,
div[data-testid="stMetricLabel"] label {
    color: #94A3B8 !important;
    font-size: 0.85rem !important;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
}

div[data-testid="stMetricValue"] {
    color: #38BDF8 !important;
    font-size: 1.8rem !important;
    font-weight: 800;
}

/* Progress bar */
div[data-testid="stProgress"] > div > div > div {
    background: linear-gradient(90deg, #6366F1, #38BDF8) !important;
    border-radius: 8px;
}

/* ============================================================
   EXPANDERS & REVIEW ACCORDIONS
   ============================================================ */
div[data-testid="stExpander"] {
    background-color: #17243A !important;
    border: 1px solid #233554 !important;
    border-radius: 12px !important;
    margin-bottom: 12px;
}

div[data-testid="stExpander"] summary {
    color: #F8FAFC !important;
    font-weight: 600;
    padding: 14px 18px;
}

div[data-testid="stExpander"] summary p {
    color: #F8FAFC !important;
    font-weight: 600;
}

div[data-testid="stExpander"] [data-testid="stExpanderDetails"] {
    padding: 16px 20px;
    border-top: 1px solid #233554;
    color: #CBD5E1;
}

/* Alerts */
div[data-testid="stAlert"] {
    background-color: #17243A !important;
    border-radius: 12px !important;
    border: 1px solid #233554 !important;
}

div[data-testid="stAlert"] p {
    color: #E2E8F0 !important;
}

hr {
    border-color: #233554 !important;
    margin: 28px 0;
}

/* Footer note */
.edtech-footer {
    text-align: center;
    color: #64748B;
    font-size: 0.85rem;
    padding: 24px 0 10px 0;
    border-top: 1px solid #1E2D4A;
    margin-top: 36px;
}
</style>
"""

def render_hero(title: str, subtitle: str, badge: str = "AI EXAMINATION PLATFORM"):
    """Render the standard professional EdTech hero section."""
    import streamlit as st
    st.markdown(
        f"""
        <div class="edtech-hero">
            <span class="edtech-badge">{badge}</span>
            <h1>{title}</h1>
            <p>{subtitle}</p>
        </div>
        """,
        unsafe_allow_html=True,
    )

def render_footer(task_label: str = "Milestone 1"):
    """Render the standard platform footer."""
    import streamlit as st
    st.markdown(
        f"""
        <div class="edtech-footer">
            AI-Based Intelligent Examination Platform • {task_label} • Commercial EdTech Edition
        </div>
        """,
        unsafe_allow_html=True,
    )

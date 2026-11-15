"""
Task 1: AI Model Diagnostics & Connectivity Testing
Verifies independent connectivity, authentication, model listing,
and prompt response generation for both OpenAI and Google Gemini providers.
"""

import os
import sys
import argparse
from pathlib import Path
from dotenv import load_dotenv

# --------------------------------------------------
# 1. Environment Loading & Key Discovery
# --------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent

POSSIBLE_ENV_PATHS = [
    BASE_DIR / "api_keys.env",
    BASE_DIR.parent / "api_keys.env",
    BASE_DIR.parent.parent / "api_keys.env",
    BASE_DIR.parent / ".env",
    BASE_DIR.parent.parent / ".env",
]

env_path = next((p for p in POSSIBLE_ENV_PATHS if p.exists()), None)
if env_path:
    load_dotenv(env_path, override=True)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "").strip()
OPENAI_MODEL_NAME = os.getenv("OPENAI_MODEL", "gpt-4o-mini").strip()
GEMINI_MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-1.5-flash").strip()

ACTIVE_OPENAI_MODEL = "gpt-4o-mini" if OPENAI_MODEL_NAME in ("gpt-3.5-turbo", "gpt-3.5-turbo-0125", "") else OPENAI_MODEL_NAME
ACTIVE_GEMINI_MODEL = GEMINI_MODEL_NAME

def mask_key(key: str) -> str:
    """Mask key for display without exposing secrets."""
    if not key:
        return "[NOT SET]"
    if len(key) <= 8:
        return f"{key[:2]}...{key[-2:]} (Length: {len(key)})"
    return f"{key[:4]}...{key[-4:]} (Length: {len(key)})"

def run_diagnostics(prompt_override: str = None, non_interactive: bool = False):
    """Execute AI diagnostics for OpenAI and Gemini."""
    print("=" * 65)
    print("  AI MODEL TESTING & DIAGNOSTICS - TASK 1")
    print("=" * 65)
    print(f"Environment file found : {bool(env_path)} ({env_path if env_path else 'None'})")
    print(f"OpenAI API Key         : {mask_key(OPENAI_API_KEY)}")
    print(f"Google Gemini API Key  : {mask_key(GOOGLE_API_KEY)}")
    print(f"Configured OpenAI Model: {OPENAI_MODEL_NAME}")
    if ACTIVE_OPENAI_MODEL != OPENAI_MODEL_NAME:
        print(f"  └─ Adapted Active OAI: {ACTIVE_OPENAI_MODEL} (due to gpt-3.5-turbo deprecation)")
    print(f"Target Gemini Model    : {ACTIVE_GEMINI_MODEL}")
    print("=" * 65)

    # Test OpenAI Integration
    print("\n[1/2] TESTING OPENAI INTEGRATION")
    print("-" * 50)
    openai_model = None
    openai_status = "Skipped (No Key)"

    if not OPENAI_API_KEY:
        print("WARNING: OPENAI_API_KEY is not set in environment.")
    else:
        try:
            from langchain_openai import ChatOpenAI
            openai_model = ChatOpenAI(
                model=ACTIVE_OPENAI_MODEL,
                temperature=0,
                timeout=30,
                max_retries=1,
                api_key=OPENAI_API_KEY,
            )
            print(f"OpenAI model client initialized with '{ACTIVE_OPENAI_MODEL}'.")

            print("\nAvailable OpenAI Models (sample):")
            try:
                if hasattr(openai_model, "root_client") and hasattr(openai_model.root_client, "models"):
                    models_data = openai_model.root_client.models.list().data
                    sample_models = [m.id for m in models_data if "gpt" in m.id.lower()][:8]
                    for mid in sample_models:
                        print(f"  • {mid}")
            except Exception as list_err:
                print(f"  Note: Could not list OpenAI models: {list_err}")

            openai_status = "Initialized"
        except Exception as init_err:
            print(f"ERROR: OpenAI initialization failed: {init_err}")
            openai_status = f"Init Failed: {init_err}"

    # Test Google Gemini Integration
    print("\n[2/2] TESTING GOOGLE GEMINI INTEGRATION")
    print("-" * 50)
    gemini_model = None
    gemini_status = "Skipped (No Key)"

    if not GOOGLE_API_KEY:
        print("WARNING: GOOGLE_API_KEY is not set in environment.")
    else:
        try:
            from langchain_google_genai import ChatGoogleGenerativeAI
            gemini_model = ChatGoogleGenerativeAI(
                model=ACTIVE_GEMINI_MODEL,
                temperature=0,
                timeout=30,
                max_retries=1,
                google_api_key=GOOGLE_API_KEY,
            )
            print(f"Gemini model client initialized with '{ACTIVE_GEMINI_MODEL}'.")

            print("\nAvailable Gemini Models (sample):")
            try:
                if hasattr(gemini_model, "client") and hasattr(gemini_model.client, "models"):
                    models_list = gemini_model.client.models.list()
                    sample_gemini = [
                        m.name for m in models_list
                        if hasattr(m, "name") and ("gemini" in m.name.lower() or "flash" in m.name.lower())
                    ][:8]
                    for gname in sample_gemini:
                        print(f"  • {gname}")
            except Exception as list_err:
                print(f"  Note: Could not list Gemini models: {list_err}")

            gemini_status = "Initialized"
        except Exception as init_err:
            print(f"ERROR: Gemini initialization failed: {init_err}")
            gemini_status = f"Init Failed: {init_err}"

    # Prompt Acquisition
    test_prompt = ""
    if prompt_override:
        test_prompt = prompt_override.strip()
    elif non_interactive or not sys.stdin.isatty():
        test_prompt = "Explain in one sentence what a compiler does."
        print(f"\nNon-interactive execution: Using default test prompt -> '{test_prompt}'")
    else:
        try:
            user_input = input("\nEnter your prompt (Press Enter for default): ").strip()
            test_prompt = user_input if user_input else "Explain in one sentence what a compiler does."
        except (EOFError, KeyboardInterrupt):
            test_prompt = "Explain in one sentence what a compiler does."
            print(f"\nUsing default test prompt -> '{test_prompt}'")

    # OpenAI Response
    print("\n" + "=" * 50)
    print("OPENAI RESPONSE")
    print("=" * 50)
    if openai_model is not None:
        try:
            response = openai_model.invoke(test_prompt)
            content = response.content if hasattr(response, "content") else str(response)
            print(content)
            openai_status = "Success (Operational)"
        except Exception as req_err:
            print(f"OpenAI request failed: {req_err}")
            openai_status = f"Request Failed: {req_err}"
    else:
        print(f"OpenAI invocation skipped. Status: {openai_status}")

    # Gemini Response
    print("\n" + "=" * 50)
    print("GEMINI RESPONSE")
    print("=" * 50)
    if gemini_model is not None:
        try:
            response = gemini_model.invoke(test_prompt)
            content = response.content if hasattr(response, "content") else str(response)
            print(content)
            gemini_status = "Success (Operational)"
        except Exception as req_err:
            print(f"Gemini request failed: {req_err}")
            gemini_status = f"Request Failed: {req_err}"
    else:
        print(f"Gemini invocation skipped. Status: {gemini_status}")

    # Diagnostic Summary
    print("\n" + "=" * 65)
    print("  DIAGNOSTIC SUMMARY REPORT")
    print("=" * 65)
    print(f"  • OpenAI Connection  : {openai_status}")
    print(f"  • Gemini Connection  : {gemini_status}")
    print(f"  • Tested Prompt      : '{test_prompt}'")
    print("=" * 65)
    print("TASK 1 COMPLETED\n")
    return {"openai": openai_status, "gemini": gemini_status}

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Task 1: AI Model Connectivity Diagnostic")
    parser.add_argument("--prompt", type=str, default=None, help="Prompt to test models with")
    parser.add_argument("--non-interactive", action="store_true", help="Run without blocking input")
    cli_args, _ = parser.parse_known_args()
    run_diagnostics(prompt_override=cli_args.prompt, non_interactive=cli_args.non_interactive)

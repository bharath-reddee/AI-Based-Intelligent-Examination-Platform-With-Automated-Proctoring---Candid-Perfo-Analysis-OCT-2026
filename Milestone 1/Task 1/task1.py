
import os
from pathlib import Path

from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI

# --------------------------------------------------
# 1. Load API keys from api_keys.env
# --------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent

ENV_PATH = BASE_DIR.parent / "api_keys.env"

if not ENV_PATH.exists():
    ENV_PATH = BASE_DIR / "api_keys.env"

load_dotenv(ENV_PATH, override=True)


OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

print("=" * 50)
print("AI MODEL TESTING - TASK 1")
print("=" * 50)

print("Environment file found:", ENV_PATH.exists())
print("OpenAI API key loaded:", bool(OPENAI_API_KEY))
print("Gemini API key loaded:", bool(GOOGLE_API_KEY))

if not ENV_PATH.exists():
    raise FileNotFoundError(
        f"api_keys.env not found at: {ENV_PATH}"
    )

if not OPENAI_API_KEY or not GOOGLE_API_KEY:
    raise ValueError(
        "API key missing. Check api_keys.env and its variable names."
    )

# --------------------------------------------------
# 2. Initialize the AI models
# --------------------------------------------------

openai_model = ChatOpenAI(
    model="gpt-4o-mini",
    temperature=0,
    api_key=OPENAI_API_KEY
)

gemini_model = ChatGoogleGenerativeAI(
    model="gemini-3.8-flash",
    temperature=0,
    google_api_key=GOOGLE_API_KEY
)

# --------------------------------------------------
# 3. Display available OpenAI models
# --------------------------------------------------

print("\n" + "=" * 50)
print("AVAILABLE OPENAI MODELS")
print("=" * 50)

try:
    models = openai_model.root_client.models.list().data

    for model in models:
        print(model.id)

except Exception as error:
    print("Could not list OpenAI models.")
    print("Reason:", error)

# --------------------------------------------------
# 4. Display available Gemini models
# --------------------------------------------------

print("\n" + "=" * 50)
print("AVAILABLE GEMINI MODELS")
print("=" * 50)

try:
    models = gemini_model.client.models.list()

    for model in models:
        name = model.name or ""

        if "flash" in name.lower():
            print(name)

except Exception as error:
    print("Could not list Gemini models.")
    print("Reason:", error)

# --------------------------------------------------
# 5. Get input from the user
# --------------------------------------------------

prompt = input("\nEnter your prompt: ").strip()

if not prompt:
    print("Prompt cannot be empty.")
    raise SystemExit

# --------------------------------------------------
# 6. Get response from OpenAI
# --------------------------------------------------

print("\n" + "=" * 50)
print("OPENAI RESPONSE")
print("=" * 50)

try:
    response = openai_model.invoke(prompt)
    print(response.content)

except Exception as error:
    print("OpenAI request failed.")
    print("Reason:", error)

# --------------------------------------------------
# 7. Get response from Gemini
# --------------------------------------------------

print("\n" + "=" * 50)
print("GEMINI RESPONSE")
print("=" * 50)

try:
    response = gemini_model.invoke(prompt)
    print(response.content)

except Exception as error:
    print("Gemini request failed.")
    print("Reason:", error)

print("\n" + "=" * 50)
print("TASK 1 FINISHED")
print("=" * 50)

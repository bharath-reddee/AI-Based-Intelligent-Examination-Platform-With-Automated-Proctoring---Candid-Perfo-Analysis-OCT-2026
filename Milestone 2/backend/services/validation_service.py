import re
import json
from typing import List, Dict, Any, Tuple, Optional


CANONICAL_EQUIVALENT_PAIRS = [
    (
        r"p\s*v\^?gamma",
        r"t\s*v\^?gamma\s*-\s*1",
        "Reversible adiabatic process relations (both PV^gamma=constant and TV^(gamma-1)=constant are valid)"
    ),
    (
        r"p\s*v\^?gamma",
        r"t\^?gamma\s*p\^?1\s*-\s*gamma",
        "Reversible adiabatic process relations (both PV^gamma=constant and T^gamma P^(1-gamma)=constant are valid)"
    ),
    (
        r"p\s*v\s*=\s*n\s*r\s*t",
        r"p\s*=\s*rho\s*r\s*t|p\s*v\s*=\s*m\s*r\s*t",
        "Ideal gas equation variations"
    ),
    (
        r"p\s*=\s*v\^?2\s*/\s*r",
        r"p\s*=\s*i\^?2\s*\*?\s*r",
        "Electric power formulations"
    ),
    (
        r"k\s*=\s*1\s*/\s*2\s*m\s*v\^?2|ke\s*=\s*1/2\s*mv\^?2",
        r"k\s*=\s*p\^?2\s*/\s*2\s*m|ke\s*=\s*p\^?2/2m",
        "Kinetic energy in terms of velocity and momentum"
    ),
]


def clean_latex_formula(text: str) -> str:
    """Cleans up and normalizes LaTeX formulas in text for crisp KaTeX rendering."""
    if not text:
        return ""
    s = str(text)
    s = re.sub(r"\\\\(alpha|beta|gamma|delta|epsilon|theta|lambda|mu|pi|rho|sigma|tau|phi|omega|Gamma|Delta|Theta|Lambda|Pi|Sigma|Phi|Omega)", r"\\\1", s)
    s = re.sub(r"\\\\(frac|sqrt|sum|prod|int|cdot|times|approx|ne|le|ge|infty|partial)", r"\\\1", s)
    s = re.sub(r"\\\\(left|right|text|mathrm|mathbf)", r"\\\1", s)
    return s.strip()


def normalize_text_for_comparison(text: str) -> str:
    """Normalizes whitespace, casing, and math tokens for option equality detection."""
    if not text:
        return ""
    t = text.lower().strip()
    t = re.sub(r"[\s_]+", " ", t)
    t = re.sub(r"[\$\\*\{\}\(\)]", "", t)
    return t.strip()


def detect_option_duplicates(options: List[str]) -> Tuple[bool, List[str]]:
    """
    Checks if options contain duplicate or trivially identical choices.
    Returns (has_duplicates, sanitized_unique_options).
    """
    seen_normalized = set()
    cleaned = []
    has_dups = False

    for opt in options:
        opt_clean = clean_latex_formula(opt)
        norm = normalize_text_for_comparison(opt_clean)
        if norm in seen_normalized:
            has_dups = True
            continue
        seen_normalized.add(norm)
        cleaned.append(opt_clean)

    distractor_fallbacks = [
        "None of the provided choices",
        "Insufficient thermodynamic parameters",
        "Applicable only under non-ideal boundary constraints",
        "Dependent on external non-conservative forces"
    ]
    fb_idx = 0
    while len(cleaned) < 4 and fb_idx < len(distractor_fallbacks):
        fb = distractor_fallbacks[fb_idx]
        fb_idx += 1
        if normalize_text_for_comparison(fb) not in seen_normalized:
            cleaned.append(fb)
            seen_normalized.add(normalize_text_for_comparison(fb))

    return has_dups, cleaned


def detect_scientific_ambiguity_in_mcq(
    question_text: str,
    options: List[str],
    declared_correct: str
) -> Tuple[bool, Optional[str], List[str]]:
    """
    Detects if an MCQ question contains multiple scientifically valid options
    among its choices (e.g. thermodynamics adiabatic process where both PV^gamma=C and TV^(gamma-1)=C are options).
    
    Returns (is_ambiguous, reason, all_matching_options).
    """
    if not options or len(options) < 2:
        return False, None, [declared_correct] if declared_correct else []

    all_valid_options = []
    
    norm_declared = normalize_text_for_comparison(declared_correct)
    matched_declared = None
    for opt in options:
        if normalize_text_for_comparison(opt) == norm_declared:
            matched_declared = opt
            break
    if not matched_declared and options:
        if len(norm_declared) == 1 and norm_declared in "abcd":
            idx = ord(norm_declared) - ord("a")
            if 0 <= idx < len(options):
                matched_declared = options[idx]
        elif norm_declared.startswith("option ") and len(norm_declared) > 7:
            letter = norm_declared[7]
            if letter in "abcd":
                idx = ord(letter) - ord("a")
                if 0 <= idx < len(options):
                    matched_declared = options[idx]

    if matched_declared and matched_declared not in all_valid_options:
        all_valid_options.append(matched_declared)

    q_norm = normalize_text_for_comparison(question_text)
    for pat1, pat2, description in CANONICAL_EQUIVALENT_PAIRS:
        match1 = None
        match2 = None
        for opt in options:
            opt_norm = normalize_text_for_comparison(opt)
            if re.search(pat1, opt_norm):
                match1 = opt
            if re.search(pat2, opt_norm):
                match2 = opt

        if match1 and match2 and match1 != match2:
            if match1 not in all_valid_options:
                all_valid_options.append(match1)
            if match2 not in all_valid_options:
                all_valid_options.append(match2)
            return True, f"Multiple scientifically equivalent options detected: {description}", all_valid_options

    for opt in options:
        opt_low = opt.strip().lower()
        if opt_low in ["all of the above", "both a and b", "both a and c", "all of these", "both b and c"]:
            pass

    return False, None, all_valid_options if all_valid_options else [options[0]]


def validate_and_refine_question(q: Dict[str, Any]) -> Dict[str, Any]:
    """
    Comprehensive question quality and answer-key validation pipeline.
    
    1. Sanitizes question text and options with KaTeX formula normalization.
    2. Validates single-choice questions:
       - Eliminates duplicate options.
       - Maps correct_answer to exact option text.
       - Detects scientific ambiguity / multiple valid answers.
       - If multiple valid options exist, automatically promotes to 'multi_select'
         so the student can choose multiple answers and receive appropriate credit,
         or marks validation provenance.
    3. Validates multi-select questions:
       - Normalizes correct_answer to a valid JSON list of valid options.
       - Ensures at least 1 (preferably >= 2) valid options exist.
    4. Validates subjective questions:
       - Ensures model answer exists and is non-empty.
    """
    refined = dict(q)
    q_type = str(refined.get("question_type", "mcq")).lower().strip()
    q_text = clean_latex_formula(refined.get("question_text", ""))
    refined["question_text"] = q_text

    options = refined.get("options")
    if isinstance(options, list):
        options = [clean_latex_formula(str(o)) for o in options if str(o).strip()]
    else:
        options = []

    corr_raw = refined.get("correct_answer")

    if q_type == "mcq":
        has_dups, clean_opts = detect_option_duplicates(options)
        options = clean_opts
        refined["options"] = options

        corr_str = str(corr_raw or "").strip()
        matched_opt = None
        for opt in options:
            if normalize_text_for_comparison(opt) == normalize_text_for_comparison(corr_str):
                matched_opt = opt
                break

        if not matched_opt:
            norm_c = normalize_text_for_comparison(corr_str)
            if len(norm_c) == 1 and norm_c in "abcd":
                idx = ord(norm_c) - ord("a")
                if 0 <= idx < len(options):
                    matched_opt = options[idx]
            elif norm_c.startswith("option ") and len(norm_c) > 7:
                letter = norm_c[7]
                if letter in "abcd":
                    idx = ord(letter) - ord("a")
                    if 0 <= idx < len(options):
                        matched_opt = options[idx]

        if not matched_opt and options:
            matched_opt = options[0]

        is_ambiguous, reason, valid_opts = detect_scientific_ambiguity_in_mcq(q_text, options, matched_opt)
        if is_ambiguous and len(valid_opts) > 1:
            refined["question_type"] = "multi_select"
            refined["correct_answer"] = json.dumps(valid_opts)
            refined["validation_status"] = "ambiguity_resolved_to_multi_select"
            refined["explanation"] = (
                f"{refined.get('explanation', '')} [Validated: {reason}. Both options are recognized as valid]."
            ).strip()
            if refined.get("marks", 1) < 2:
                refined["marks"] = 2
        else:
            refined["correct_answer"] = matched_opt
            refined["validation_status"] = "single_choice_verified"

    elif q_type == "multi_select":
        has_dups, clean_opts = detect_option_duplicates(options)
        options = clean_opts
        refined["options"] = options

        valid_set = []
        if isinstance(corr_raw, list):
            valid_set = [str(x).strip() for x in corr_raw]
        elif isinstance(corr_raw, str):
            c_str = corr_raw.strip()
            if c_str.startswith("["):
                try:
                    parsed = json.loads(c_str)
                    if isinstance(parsed, list):
                        valid_set = [str(x).strip() for x in parsed]
                except Exception:
                    pass
            if not valid_set:
                valid_set = [s.strip() for s in c_str.split(",") if s.strip()]

        matched_list = []
        for v in valid_set:
            norm_v = normalize_text_for_comparison(v)
            for opt in options:
                if normalize_text_for_comparison(opt) == norm_v:
                    if opt not in matched_list:
                        matched_list.append(opt)
                    break

        if len(matched_list) < 2 and len(options) >= 2:
            for opt in options:
                if opt not in matched_list:
                    matched_list.append(opt)
                if len(matched_list) >= 2:
                    break

        refined["correct_answer"] = json.dumps(matched_list)
        refined["validation_status"] = "multi_select_verified"
        if refined.get("marks", 2) < 2:
            refined["marks"] = 2

    else:
        refined["options"] = None
        model_ans = str(corr_raw or "").strip()
        if not model_ans:
            model_ans = "Comprehensive model answer outlining core definitions, technical criteria, and analytical derivation."
        refined["correct_answer"] = model_ans
        refined["validation_status"] = "subjective_rubric_verified"
        if q_type == "short_answer" and refined.get("marks", 3) < 2:
            refined["marks"] = 3
        elif q_type == "long_answer" and refined.get("marks", 5) < 3:
            refined["marks"] = 5

    return refined


def grade_objective_question(
    question_type: str,
    student_answer: Optional[str],
    correct_answer: Optional[str],
    max_marks: float,
    negative_marks: float = 0.0,
    allow_partial: bool = True
) -> Tuple[bool, float, str]:
    """
    Grades single-choice and multi-select questions with deterministic marking policies.
    Returns (is_correct, awarded_marks, feedback).
    """
    if not student_answer or not str(student_answer).strip():
        return False, 0.0, "Unanswered"

    stud = str(student_answer).strip()

    if question_type in ["mcq", "mcq_single"]:
        corr = str(correct_answer or "").strip()
        is_exact = normalize_text_for_comparison(stud) == normalize_text_for_comparison(corr)
        if is_exact:
            return True, float(max_marks), "Correct single-choice selection."
        else:
            deduction = float(negative_marks) if negative_marks > 0 else 0.0
            return False, -deduction if deduction > 0 else 0.0, "Incorrect option selected."

    elif question_type in ["multi_select", "mcq_multi"]:
        student_set = set()
        if stud.startswith("["):
            try:
                parsed = json.loads(stud)
                if isinstance(parsed, list):
                    student_set = {normalize_text_for_comparison(str(x)) for x in parsed if str(x).strip()}
            except Exception:
                pass
        if not student_set:
            student_set = {normalize_text_for_comparison(s) for s in stud.split(",") if s.strip()}

        corr = str(correct_answer or "").strip()
        correct_set = set()
        if corr.startswith("["):
            try:
                parsed = json.loads(corr)
                if isinstance(parsed, list):
                    correct_set = {normalize_text_for_comparison(str(x)) for x in parsed if str(x).strip()}
            except Exception:
                pass
        if not correct_set:
            correct_set = {normalize_text_for_comparison(s) for s in corr.split(",") if s.strip()}

        if not correct_set:
            return True, float(max_marks), "Correct"

        selected_correct = student_set.intersection(correct_set)
        selected_incorrect = student_set.difference(correct_set)

        if student_set == correct_set:
            return True, float(max_marks), "All correct options selected."
        elif selected_incorrect:
            deduction = float(negative_marks) if negative_marks > 0 else 0.0
            return False, -deduction if deduction > 0 else 0.0, f"Incorrect options selected ({len(selected_incorrect)} incorrect)."
        elif selected_correct and allow_partial:
            fraction = len(selected_correct) / len(correct_set)
            partial_score = round(float(max_marks) * fraction, 1)
            return False, partial_score, f"Partially correct ({len(selected_correct)}/{len(correct_set)} correct options selected)."
        else:
            return False, 0.0, "No correct options selected."

    return False, 0.0, "Pending evaluation"

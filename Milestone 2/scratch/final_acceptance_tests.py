import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_login(title, endpoint, payload, expected_status, expected_substring=None):
    res = requests.post(f"{BASE_URL}{endpoint}", json=payload)
    status_match = (res.status_code == expected_status)
    content = res.text
    content_match = (expected_substring is None) or (expected_substring.lower() in content.lower())
    passed = status_match and content_match
    mark = "PASS" if passed else "FAIL"
    print(f"[{mark}] {title}")
    if not passed:
        print(f"      Expected Status: {expected_status}, Got: {res.status_code}")
        print(f"      Response: {content}")
        if expected_substring:
            print(f"      Expected substring: {expected_substring}")
    return passed, res

def run_acceptance_tests():
    print("=" * 60)
    print("RUNNING FINAL AUTHENTICATION ACCEPTANCE TEST SUITE")
    print("=" * 60)

    results = []

    p, r = test_login(
        "1. Valid Approved Student Login",
        "/auth/student/login",
        {"email": "user@gmail.com", "password": "Password123!"},
        200,
        "access_token"
    )
    student_token = r.json().get("access_token") if p else None
    results.append(p)

    p, r = test_login(
        "1b. Case-insensitive Student Login (USER@GMAIL.COM)",
        "/auth/student/login",
        {"email": "USER@GMAIL.COM", "password": "Password123!"},
        200,
        "access_token"
    )
    results.append(p)

    p, r = test_login(
        "2. Valid Approved Teacher Login",
        "/auth/teacher/login",
        {"email": "ashish@gmail.com", "password": "Password123!"},
        200,
        "access_token"
    )
    teacher_token = r.json().get("access_token") if p else None
    results.append(p)

    p, r = test_login(
        "2b. Case-insensitive Teacher Login (ASHISH@GMAIL.COM)",
        "/auth/teacher/login",
        {"email": "ASHISH@GMAIL.COM", "password": "Password123!"},
        200,
        "access_token"
    )
    results.append(p)

    p, _ = test_login(
        "3a. Invalid Password for Student",
        "/auth/student/login",
        {"email": "user@gmail.com", "password": "WrongPassword999!"},
        401,
        "invalid email or password"
    )
    results.append(p)

    p, _ = test_login(
        "3b. Invalid Password for Teacher",
        "/auth/teacher/login",
        {"email": "ashish@gmail.com", "password": "WrongPassword999!"},
        401,
        "invalid email or password"
    )
    results.append(p)

    p, _ = test_login(
        "4. Unknown Account Login",
        "/auth/student/login",
        {"email": "nonexistent.account.999@example.edu", "password": "AnyPassword123!"},
        401,
        "invalid email or password"
    )
    results.append(p)

    p, _ = test_login(
        "5. Student Credentials Submitted in Teacher Mode",
        "/auth/teacher/login",
        {"email": "user@gmail.com", "password": "Password123!"},
        401,
        "student"
    )
    results.append(p)

    p, _ = test_login(
        "6. Teacher Credentials Submitted in Student Mode",
        "/auth/student/login",
        {"email": "ashish@gmail.com", "password": "Password123!"},
        401,
        "teacher"
    )
    results.append(p)

    p, r = test_login(
        "7. Admin Login (admin@gmail.com / Admin@12345)",
        "/auth/admin/login",
        {"email": "admin@gmail.com", "password": "Admin@12345"},
        200,
        "access_token"
    )
    admin_token = r.json().get("access_token") if p else None
    results.append(p)

    headers_student = {"Authorization": f"Bearer {student_token}"}
    r_me_student = requests.get(f"{BASE_URL}/students/me", headers=headers_student)
    p_me_student = r_me_student.status_code == 200 and r_me_student.json().get("email") == "user@gmail.com"
    print(f"[{'PASS' if p_me_student else 'FAIL'}] 8a. Student Session Verification (/students/me)")
    results.append(p_me_student)

    headers_teacher = {"Authorization": f"Bearer {teacher_token}"}
    r_me_teacher = requests.get(f"{BASE_URL}/teachers/me", headers=headers_teacher)
    p_me_teacher = r_me_teacher.status_code == 200 and r_me_teacher.json().get("email") == "ashish@gmail.com"
    print(f"[{'PASS' if p_me_teacher else 'FAIL'}] 8b. Teacher Session Verification (/teachers/me)")
    results.append(p_me_teacher)

    headers_admin = {"Authorization": f"Bearer {admin_token}"}
    r_me_admin = requests.get(f"{BASE_URL}/admins/me", headers=headers_admin)
    p_me_admin = r_me_admin.status_code == 200 and r_me_admin.json().get("email") == "admin@gmail.com"
    print(f"[{'PASS' if p_me_admin else 'FAIL'}] 8c. Admin Session Verification (/admins/me)")
    results.append(p_me_admin)

    r_unauth_cross = requests.get(f"{BASE_URL}/exams/teacher/my-exams", headers=headers_student)
    p_cross = r_unauth_cross.status_code in [401, 403]
    print(f"[{'PASS' if p_cross else 'FAIL'}] 9. RBAC Enforcement (Student token rejected on Teacher endpoints: HTTP {r_unauth_cross.status_code})")
    results.append(p_cross)

    r_unauth = requests.get(f"{BASE_URL}/students/me")
    p_unauth = r_unauth.status_code == 401
    print(f"[{'PASS' if p_unauth else 'FAIL'}] 10. Unauthenticated Requests Rejected (HTTP 401)")
    results.append(p_unauth)

    print("=" * 60)
    total = len(results)
    passed_count = sum(1 for x in results if x)
    print(f"RESULT: {passed_count}/{total} TESTS PASSED")
    print("=" * 60)

if __name__ == "__main__":
    run_acceptance_tests()

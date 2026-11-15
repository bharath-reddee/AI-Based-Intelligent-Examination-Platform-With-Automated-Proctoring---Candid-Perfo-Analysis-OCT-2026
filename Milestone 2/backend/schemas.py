from datetime import datetime, timezone
from typing import Optional, Literal, List, Dict, Any
from pydantic import BaseModel, EmailStr, Field, model_validator, field_serializer


class StudentBase(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=50, description="First name")
    last_name: str = Field(..., min_length=1, max_length=50, description="Last name")
    email: EmailStr = Field(..., max_length=50, description="Valid email address")
    institute: str = Field(..., min_length=1, max_length=50, description="Institute / College name")
    roll_number: str = Field(..., min_length=1, max_length=50, description="Roll number")
    class_year: str = Field(..., min_length=1, max_length=50, description="Class or academic year")


class TeacherBase(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=50, description="First name")
    last_name: str = Field(..., min_length=1, max_length=50, description="Last name")
    email: EmailStr = Field(..., max_length=50, description="Valid email address")
    institute: str = Field(..., min_length=1, max_length=100, description="Institute / College name")
    department: str = Field(..., min_length=1, max_length=50, description="Department name")


class AdminBase(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=50, description="First name")
    last_name: str = Field(..., min_length=1, max_length=50, description="Last name")
    email: EmailStr = Field(..., max_length=50, description="Valid email address")


class StudentRegisterRequest(StudentBase):
    password: str = Field(..., min_length=6, max_length=50, description="Plaintext password")
    confirm_password: str = Field(..., min_length=6, max_length=50, description="Confirm plaintext password")

    @model_validator(mode="after")
    def passwords_match(self):
        if self.password != self.confirm_password:
            raise ValueError("Password and Confirm Password do not match.")
        return self


class TeacherRegisterRequest(TeacherBase):
    password: str = Field(..., min_length=6, max_length=50, description="Plaintext password")
    confirm_password: str = Field(..., min_length=6, max_length=50, description="Confirm plaintext password")

    @model_validator(mode="after")
    def passwords_match(self):
        if self.password != self.confirm_password:
            raise ValueError("Password and Confirm Password do not match.")
        return self


class AdminRegisterRequest(AdminBase):
    password: str = Field(..., min_length=6, max_length=50, description="Plaintext password")
    confirm_password: str = Field(..., min_length=6, max_length=50, description="Confirm plaintext password")

    @model_validator(mode="after")
    def passwords_match(self):
        if self.password != self.confirm_password:
            raise ValueError("Password and Confirm Password do not match.")
        return self


class LoginRequest(BaseModel):
    email: str = Field(..., min_length=1, description="Email address or student identifier/roll number")
    password: str = Field(..., min_length=1)


class StudentResponse(BaseModel):
    first_name: str
    last_name: str
    email: str
    institute: str
    roll_number: str
    class_year: str
    approval_status: Optional[str] = "pending"
    is_active: Optional[bool] = True
    rejection_reason: Optional[str] = None
    created_at: Optional[datetime] = None
    role: Literal["student"] = "student"

    class Config:
        from_attributes = True


class TeacherResponse(BaseModel):
    first_name: str
    last_name: str
    email: str
    institute: Optional[str] = "Not Specified"
    department: str
    approval_status: Optional[str] = "pending"
    is_active: Optional[bool] = True
    rejection_reason: Optional[str] = None
    created_at: Optional[datetime] = None
    role: Literal["teacher"] = "teacher"

    class Config:
        from_attributes = True


class AdminResponse(BaseModel):
    first_name: str
    last_name: str
    email: str
    is_active: Optional[bool] = True
    created_at: Optional[datetime] = None
    role: Literal["admin"] = "admin"

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user: dict
    message: str = "Authentication successful"


class RegistrationPendingResponse(BaseModel):
    message: str
    approval_status: str = "pending"
    email: str
    role: str
    user: dict


class AdminUserApprovalRequest(BaseModel):
    email: EmailStr
    role: Literal["student", "teacher"]


class AdminUserRejectionRequest(BaseModel):
    email: EmailStr
    role: Literal["student", "teacher"]
    reason: str = Field(..., min_length=1, max_length=500, description="Rejection reason")


class AdminUserStatusToggleRequest(BaseModel):
    email: EmailStr
    role: Literal["student", "teacher", "admin"]
    is_active: bool



class HealthCheckResponse(BaseModel):
    status: str
    environment: str
    database_connected: bool
    version: str = "2.0.0"
    redis_connected: Optional[bool] = None



class QuestionBase(BaseModel):
    question_text: str = Field(..., min_length=1, description="Question text")
    question_type: str = Field(default="mcq", description="mcq, multi_select, short_answer, long_answer")
    difficulty: Optional[str] = Field(default="Medium", description="Easy, Medium, Hard")
    options: Optional[List[str]] = Field(default=None, description="List of options for MCQ / Multi-select")
    marks: int = Field(default=1, ge=1, description="Marks for question")
    negative_marks: Optional[float] = Field(default=0.0, description="Negative marks if wrong")
    min_words: Optional[int] = None
    max_words: Optional[int] = None
    order_index: int = Field(default=0, ge=0)
    explanation: Optional[str] = None


class QuestionCreate(QuestionBase):
    correct_answer: Optional[str] = None


class QuestionTeacherResponse(QuestionCreate):
    id: int
    exam_id: int

    class Config:
        from_attributes = True


class QuestionStudentResponse(BaseModel):
    id: int
    exam_id: int
    question_text: str
    question_type: str
    difficulty: Optional[str] = "Medium"
    options: Optional[List[str]] = None
    marks: int
    order_index: int
    min_words: Optional[int] = None
    max_words: Optional[int] = None

    class Config:
        from_attributes = True


class ExamBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    subject: str = Field(..., min_length=1, max_length=100)
    topic: Optional[str] = None
    description: Optional[str] = None
    instructions: Optional[str] = None
    difficulty: Optional[str] = Field(default="Medium", description="Easy, Medium, Hard")
    duration_minutes: int = Field(..., ge=1, le=600, description="Duration in minutes")
    total_marks: int = Field(default=100, ge=1, description="Total marks")
    passing_marks: int = Field(default=40, ge=1, description="Passing marks")
    number_of_questions: int = Field(default=10, ge=1)
    max_tab_switches: Optional[int] = 3
    status: Optional[str] = "draft"
    ai_proctoring_enabled: Optional[bool] = True
    negative_marking_enabled: Optional[bool] = False
    negative_marking_score: Optional[float] = 0.25
    shuffle_questions: Optional[bool] = False
    shuffle_options: Optional[bool] = False
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    is_published: bool = False

    @field_serializer("start_time", "end_time", check_fields=False)
    def serialize_dt_utc(self, dt: Optional[datetime]) -> Optional[str]:
        if dt is None:
            return None
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.isoformat()


class ExamCreate(ExamBase):
    questions: Optional[List[QuestionCreate]] = []

    @model_validator(mode="after")
    def check_marks_and_dates(self):
        if self.passing_marks > self.total_marks:
            raise ValueError("Passing marks cannot exceed total marks.")
        if self.start_time and self.end_time and self.start_time >= self.end_time:
            raise ValueError("Opening date/time must be strictly before closing date/time.")
        return self


class ExamUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    subject: Optional[str] = Field(None, min_length=1, max_length=100)
    topic: Optional[str] = None
    description: Optional[str] = None
    instructions: Optional[str] = None
    difficulty: Optional[str] = None
    duration_minutes: Optional[int] = Field(None, ge=1, le=600)
    total_marks: Optional[int] = Field(None, ge=1)
    passing_marks: Optional[int] = Field(None, ge=1)
    number_of_questions: Optional[int] = Field(None, ge=1)
    max_tab_switches: Optional[int] = None
    status: Optional[str] = None
    ai_proctoring_enabled: Optional[bool] = None
    negative_marking_enabled: Optional[bool] = None
    negative_marking_score: Optional[float] = None
    shuffle_questions: Optional[bool] = None
    shuffle_options: Optional[bool] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    is_published: Optional[bool] = None

    @model_validator(mode="after")
    def check_marks_and_dates(self):
        if self.passing_marks is not None and self.total_marks is not None:
            if self.passing_marks > self.total_marks:
                raise ValueError("Passing marks cannot exceed total marks.")
        if self.start_time and self.end_time and self.start_time >= self.end_time:
            raise ValueError("Opening date/time must be strictly before closing date/time.")
        return self


class ExamTeacherResponse(ExamBase):
    id: int
    teacher_email: str
    created_at: datetime
    questions: List[QuestionTeacherResponse] = []
    assigned_students_count: Optional[int] = 0
    submissions_count: Optional[int] = 0
    submission_rate_percent: Optional[float] = 0.0

    @field_serializer("created_at", check_fields=False)
    def serialize_created_at_utc(self, dt: Optional[datetime]) -> Optional[str]:
        if dt is None:
            return None
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.isoformat()

    class Config:
        from_attributes = True


class ExamStudentResponse(BaseModel):
    id: int
    title: str
    subject: str
    topic: Optional[str] = None
    description: Optional[str] = None
    instructions: Optional[str] = None
    difficulty: Optional[str] = "Medium"
    duration_minutes: int
    total_marks: int
    passing_marks: int
    number_of_questions: int
    max_tab_switches: Optional[int] = 3
    ai_proctoring_enabled: Optional[bool] = True
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    is_published: bool
    status: Optional[str] = "published"
    teacher_name: Optional[str] = None
    attempt_status: Optional[str] = "not_started"
    attempt_id: Optional[int] = None
    score: Optional[float] = None
    created_at: datetime
    questions: List[QuestionStudentResponse] = []

    @field_serializer("start_time", "end_time", "created_at", check_fields=False)
    def serialize_dt_utc(self, dt: Optional[datetime]) -> Optional[str]:
        if dt is None:
            return None
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.isoformat()

    class Config:
        from_attributes = True



class ExamAssignmentItem(BaseModel):
    id: int
    student_email: str
    student_name: str
    roll_number: Optional[str] = "N/A"
    class_year: Optional[str] = "N/A"
    institute: Optional[str] = "N/A"
    assigned_at: Optional[datetime] = None
    has_started: bool = False


class ExamAssignmentRequest(BaseModel):
    student_emails: List[str]


class AIGenerateQuestionsRequest(BaseModel):
    subject: str
    topic: str
    difficulty: str = "Medium"
    mcq_count: int = Field(default=0, ge=0, le=60)
    multi_select_count: int = Field(default=0, ge=0, le=60)
    short_answer_count: int = Field(default=0, ge=0, le=60)
    long_answer_count: int = Field(default=0, ge=0, le=60)
    instructions: Optional[str] = None


class AIGeneratedQuestionItem(BaseModel):
    question_text: str
    question_type: str
    difficulty: str = "Medium"
    options: Optional[List[str]] = None
    correct_answer: Optional[str] = None
    explanation: Optional[str] = None
    marks: int = 1
    negative_marks: Optional[float] = 0.0
    min_words: Optional[int] = None
    max_words: Optional[int] = None


class BatchQuestionsAddRequest(BaseModel):
    questions: List[QuestionCreate]



class AnswerSubmit(BaseModel):
    question_id: int
    answer_text: str


class AttemptSubmit(BaseModel):
    answers: List[AnswerSubmit]


class StudentAnswerResponse(BaseModel):
    question_id: int
    answer_text: Optional[str]
    is_correct: Optional[bool]
    awarded_marks: float

    class Config:
        from_attributes = True


class AttemptResponse(BaseModel):
    id: int
    exam_id: int
    student_email: str
    status: str
    start_time: datetime
    submit_time: Optional[datetime]
    score: Optional[float]
    total_marks: Optional[float]
    is_mock: bool
    answers: List[StudentAnswerResponse] = []

    class Config:
        from_attributes = True



class MockTestCreate(BaseModel):
    subject: str = Field(..., min_length=1)
    question_count: int = Field(default=5, ge=1, le=50)
    duration_minutes: int = Field(default=15, ge=1, le=180)


class PracticeTestGenerateRequest(BaseModel):
    subject: str = Field(..., min_length=1, description="Subject name")
    topic: Optional[str] = Field(default="", description="Specific topic or sub-discipline")
    difficulty: str = Field(default="Medium", description="Easy, Medium, or Hard")
    mcq_count: int = Field(default=5, ge=0, le=30, description="Single-choice multiple-choice count")
    multi_select_count: int = Field(default=0, ge=0, le=30, description="Multiple-select question count")
    short_answer_count: int = Field(default=0, ge=0, le=20, description="Short-answer question count")
    long_answer_count: int = Field(default=0, ge=0, le=10, description="Long-answer question count")
    is_timed: bool = Field(default=True, description="Whether test is timed or untimed practice")
    duration_minutes: int = Field(default=15, ge=1, le=180, description="Duration in minutes if timed")


class PracticeQuestionItem(BaseModel):
    id: int
    question_text: str
    question_type: str
    options: Optional[List[str]] = None
    marks: int
    order_index: int
    min_words: Optional[int] = None
    max_words: Optional[int] = None
    difficulty: Optional[str] = "Medium"
    validation_status: Optional[str] = "validated"


class PracticeTestAttemptResponse(BaseModel):
    attempt_id: int
    exam_id: int
    title: str
    subject: str
    topic: Optional[str] = None
    difficulty: str
    is_timed: bool = True
    duration_minutes: int
    remaining_seconds: Optional[int] = None
    total_marks: float
    total_questions: int
    is_mock: bool = True
    status: str
    questions: List[PracticeQuestionItem]
    saved_answers: Dict[str, Any] = {}
    saved_images: Dict[str, str] = {}
    flagged_questions: List[int] = []


class PracticeSaveAnswerRequest(BaseModel):
    question_id: int
    answer_text: Optional[str] = None
    image_url: Optional[str] = None
    is_flagged: Optional[bool] = None


class PracticeSubmitAnswerItem(BaseModel):
    question_id: int
    answer_text: Optional[str] = None
    image_url: Optional[str] = None


class PracticeTestSubmitRequest(BaseModel):
    answers: List[PracticeSubmitAnswerItem] = []


class PracticeQuestionResultItem(BaseModel):
    question_id: int
    question_text: str
    question_type: str
    options: Optional[List[str]] = None
    user_answer: Optional[str] = None
    user_image_url: Optional[str] = None
    correct_answer: Optional[str] = None
    explanation: Optional[str] = None
    is_correct: Optional[bool] = None
    awarded_marks: float
    max_marks: int
    feedback: Optional[str] = None
    validation_status: Optional[str] = "validated"


class PracticeDetailedResult(BaseModel):
    attempt_id: int
    exam_id: int
    title: str
    subject: str
    topic: Optional[str] = None
    difficulty: str
    status: str
    is_timed: bool
    duration_minutes: int
    time_spent_seconds: Optional[int] = None
    submit_time: Optional[datetime] = None
    score: float
    total_marks: float
    percentage: float
    passed: bool
    total_questions: int
    answered_count: int
    unanswered_count: int
    correct_count: int
    incorrect_count: int
    partially_correct_count: int
    objective_marks: float
    objective_max_marks: float
    written_marks: float
    written_max_marks: float
    pending_evaluation_count: int
    has_pending_written: bool
    question_results: List[PracticeQuestionResultItem]


class MockQuestionResult(BaseModel):
    question_id: int
    question_text: str
    question_type: str
    options: Optional[List[str]] = None
    user_answer: Optional[str] = None
    correct_answer: Optional[str] = None
    explanation: Optional[str] = None
    is_correct: Optional[bool] = None
    awarded_marks: float
    max_marks: int


class MockTestResult(BaseModel):
    attempt_id: int
    subject: str
    status: str
    score: float
    total_marks: float
    percentage: float
    passed: bool
    total_questions: int
    correct_count: int
    has_pending_subjective: bool = False
    question_results: List[MockQuestionResult]


class TeacherMockTestAttemptItem(BaseModel):
    attempt_id: int
    student_id: str
    student_name: str
    student_email: str
    roll_number: Optional[str] = "N/A"
    mock_title: str
    subject: str
    difficulty: Optional[str] = "Standard"
    total_questions: int
    questions_answered: int
    correct_count: int
    incorrect_count: int
    score: Optional[float] = None
    total_marks: Optional[float] = None
    percentage: Optional[float] = None
    passed: Optional[bool] = None
    status: str
    evaluation_status: str
    start_time: Optional[datetime] = None
    submit_time: Optional[datetime] = None

    class Config:
        from_attributes = True


class TeacherMockTestActivityResponse(BaseModel):
    total_attempts: int
    attempts: List[TeacherMockTestAttemptItem]



class SubjectiveEvaluationRequest(BaseModel):
    question_id: int
    awarded_marks: float = Field(..., ge=0.0, description="Marks awarded to student")
    feedback: Optional[str] = Field(default=None, max_length=2000, description="Examiner feedback")


class QuestionReviewDetail(BaseModel):
    question_id: int
    answer_id: Optional[int] = None
    question_text: str
    question_type: str
    options: Optional[List[str]] = None
    user_answer: Optional[str] = None
    correct_answer: Optional[str] = None
    explanation: Optional[str] = None
    is_correct: Optional[bool] = None
    awarded_marks: float = 0.0
    max_marks: int = 1
    evaluation_status: str
    teacher_feedback: Optional[str] = None
    evaluated_at: Optional[datetime] = None


class AttemptHistoryItem(BaseModel):
    attempt_id: int
    exam_id: int
    title: str
    subject: str
    date: Optional[datetime] = None
    score: float
    total_marks: float
    percentage: float
    status: str
    evaluation_status: str
    is_current: bool = False


class SubjectPerformanceItem(BaseModel):
    subject: str
    attempts_count: int
    average_score: float
    average_percentage: float
    accuracy: float


class StudentProgressAnalytics(BaseModel):
    total_attempts_count: int
    average_score: float
    average_percentage: float
    highest_score: float
    highest_percentage: float
    lowest_score: float
    lowest_percentage: float
    improvement_percentage: Optional[float] = None
    trend: Optional[str] = None
    has_trend: bool = False
    accuracy_rate: float
    completion_rate: float
    subject_breakdown: List[SubjectPerformanceItem] = []
    weak_areas: List[str] = []
    strong_areas: List[str] = []


class TeacherAttemptDetailResponse(BaseModel):
    student_name: str
    student_email: str
    roll_number: Optional[str] = "N/A"
    institute: Optional[str] = "N/A"
    class_year: Optional[str] = "N/A"

    exam_id: int
    exam_title: str
    subject: str
    instructions: Optional[str] = None
    duration_minutes: int
    passing_marks: int

    attempt_id: int
    status: str
    evaluation_status: str
    start_time: Optional[datetime] = None
    submit_time: Optional[datetime] = None
    duration_used_seconds: Optional[int] = None
    score: float
    total_marks: float
    percentage: float
    passed: bool

    total_questions: int
    questions_answered: int
    questions_unanswered: int
    correct_count: int
    incorrect_count: int
    pending_subjective_count: int

    questions: List[QuestionReviewDetail]

    history: List[AttemptHistoryItem]
    analytics: StudentProgressAnalytics



class ProctoringEventCreate(BaseModel):
    event_type: str = Field(..., min_length=1, max_length=100)
    severity: Optional[str] = Field(default="medium", max_length=20)
    details: Optional[str] = Field(default=None, max_length=1000)


class ProctoringIncidentResponse(BaseModel):
    id: int
    attempt_id: Optional[int] = None
    exam_id: Optional[int] = None
    exam_title: Optional[str] = "Examination"
    student_name: str
    student_email: str
    roll_number: Optional[str] = "N/A"
    event_type: str
    severity: str
    details: Optional[str] = None
    review_status: str
    created_at: Optional[datetime] = None


class ProctoringIncidentReviewRequest(BaseModel):
    review_status: Literal["reviewed", "dismissed", "flagged"]
    notes: Optional[str] = None



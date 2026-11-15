import datetime
from sqlalchemy import Column, String, Integer, Text, Boolean, DateTime, ForeignKey, Float, JSON
from sqlalchemy.orm import relationship
from database import Base


class Student(Base):
    __tablename__ = "Student"

    first_name = Column("First_Name", String(50), nullable=False)
    last_name = Column("Last_Name", String(50), nullable=False)
    email = Column("Email", String(50), primary_key=True, nullable=False)
    institute = Column("Institute", String(50), nullable=False)
    roll_number = Column("Roll_Number", String(50), nullable=False)
    class_year = Column("Class/Year", String(50), nullable=False)
    password = Column("Password", String(255), nullable=False)
    confirm_password = Column("Confirm_Password", String(50), nullable=True)
    approval_status = Column("approval_status", String(20), default="pending", nullable=True)
    is_active = Column("is_active", Boolean, default=True, nullable=True)
    rejection_reason = Column("rejection_reason", Text, nullable=True)
    created_at = Column("created_at", DateTime, default=datetime.datetime.utcnow, nullable=True)


class Teacher(Base):
    __tablename__ = "Teacher"

    first_name = Column("First_Name", String(50), nullable=False)
    last_name = Column("Last_Name", String(50), nullable=False)
    email = Column("Email", String(50), primary_key=True, nullable=False)
    institute = Column("Institute", String(100), nullable=False, default="Engineering Faculty")
    department = Column("Department", String(50), nullable=False)
    password = Column("Password", String(255), nullable=False)
    confirm_password = Column("Confirm_Password", String(50), nullable=True)
    approval_status = Column("approval_status", String(20), default="pending", nullable=True)
    is_active = Column("is_active", Boolean, default=True, nullable=True)
    rejection_reason = Column("rejection_reason", Text, nullable=True)
    created_at = Column("created_at", DateTime, default=datetime.datetime.utcnow, nullable=True)


class Admin(Base):
    __tablename__ = "Admin"

    first_name = Column("First_Name", String(50), nullable=False)
    last_name = Column("Last_Name", String(50), nullable=False)
    email = Column("Email", String(50), primary_key=True, nullable=False)
    password = Column("Password", String(255), nullable=False)
    confirm_password = Column("Confirm_Password", String(50), nullable=True)
    is_active = Column("is_active", Boolean, default=True, nullable=True)
    created_at = Column("created_at", DateTime, default=datetime.datetime.utcnow, nullable=True)



class Exam(Base):
    __tablename__ = "exams"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    instructions = Column(Text, nullable=True)
    subject = Column(String(100), nullable=False)
    topic = Column(String(200), nullable=True)
    difficulty = Column(String(20), default="Medium", nullable=True)
    duration_minutes = Column(Integer, nullable=False, default=60)
    total_marks = Column(Integer, nullable=False, default=100)
    passing_marks = Column(Integer, nullable=False, default=40)
    number_of_questions = Column(Integer, nullable=False, default=10)
    max_tab_switches = Column(Integer, default=3, nullable=True)
    status = Column(String(20), default="draft", nullable=True)
    ai_proctoring_enabled = Column(Boolean, default=True, nullable=True)
    negative_marking_enabled = Column(Boolean, default=False, nullable=True)
    negative_marking_score = Column(Float, default=0.25, nullable=True)
    shuffle_questions = Column(Boolean, default=False, nullable=True)
    shuffle_options = Column(Boolean, default=False, nullable=True)
    start_time = Column(DateTime, nullable=True)
    end_time = Column(DateTime, nullable=True)
    is_published = Column(Boolean, default=False)
    is_mock = Column(Boolean, default=False, nullable=True)
    created_by_student = Column(String(50), nullable=True)
    teacher_email = Column(String(50), ForeignKey("Teacher.Email"), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    questions = relationship("Question", back_populates="exam", cascade="all, delete-orphan")
    attempts = relationship("ExamAttempt", back_populates="exam", cascade="all, delete-orphan")
    assignments = relationship("ExamAssignment", back_populates="exam", cascade="all, delete-orphan")


class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    exam_id = Column(Integer, ForeignKey("exams.id"), nullable=False)
    question_text = Column(Text, nullable=False)
    question_type = Column(String(50), nullable=False, default="mcq")
    difficulty = Column(String(20), default="Medium", nullable=True)
    options = Column(JSON, nullable=True)
    correct_answer = Column(Text, nullable=True)
    explanation = Column(Text, nullable=True)
    marks = Column(Integer, nullable=False, default=1)
    negative_marks = Column(Float, default=0.0, nullable=True)
    min_words = Column(Integer, nullable=True)
    max_words = Column(Integer, nullable=True)
    order_index = Column(Integer, default=0)
    validation_status = Column(String(50), default="validated", nullable=True)

    exam = relationship("Exam", back_populates="questions")


class ExamAssignment(Base):
    __tablename__ = "exam_assignments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    exam_id = Column(Integer, ForeignKey("exams.id", ondelete="CASCADE"), nullable=False)
    student_email = Column(String(50), ForeignKey("Student.Email", ondelete="CASCADE"), nullable=False)
    assigned_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=True)

    exam = relationship("Exam", back_populates="assignments")
    student = relationship("Student")


class ExamAttempt(Base):
    __tablename__ = "exam_attempts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    exam_id = Column(Integer, ForeignKey("exams.id"), nullable=False)
    student_email = Column(String(50), ForeignKey("Student.Email"), nullable=False)
    status = Column(String(50), nullable=False, default="in_progress")
    start_time = Column(DateTime, default=datetime.datetime.utcnow)
    submit_time = Column(DateTime, nullable=True)
    score = Column(Float, nullable=True)
    total_marks = Column(Float, nullable=True)
    tab_switch_count = Column(Integer, default=0, nullable=True)
    face_warning_count = Column(Integer, default=0, nullable=True)
    question_order = Column(JSON, nullable=True)
    option_order = Column(JSON, nullable=True)
    is_mock = Column(Boolean, default=False)
    is_timed = Column(Boolean, default=True, nullable=True)
    flagged_questions = Column(JSON, nullable=True)

    exam = relationship("Exam", back_populates="attempts")
    student_answers = relationship("StudentAnswer", back_populates="attempt", cascade="all, delete-orphan")


class StudentAnswer(Base):
    __tablename__ = "student_answers"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    attempt_id = Column(Integer, ForeignKey("exam_attempts.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    answer_text = Column(Text, nullable=True)
    image_url = Column(Text, nullable=True)
    is_correct = Column(Boolean, nullable=True)
    awarded_marks = Column(Float, default=0.0)
    teacher_feedback = Column(Text, nullable=True)
    evaluated_at = Column(DateTime, nullable=True)

    attempt = relationship("ExamAttempt", back_populates="student_answers")
    question = relationship("Question")


class ProctoringEvent(Base):
    __tablename__ = "proctoring_events"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    attempt_id = Column(Integer, ForeignKey("exam_attempts.id"), nullable=True)
    exam_id = Column(Integer, ForeignKey("exams.id"), nullable=True)
    student_email = Column(String(50), ForeignKey("Student.Email"), nullable=False)
    event_type = Column(String(100), nullable=False)
    severity = Column(String(20), default="medium")
    details = Column(Text, nullable=True)
    review_status = Column(String(20), default="flagged")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    attempt = relationship("ExamAttempt")
    exam = relationship("Exam")
    student = relationship("Student")


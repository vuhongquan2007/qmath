export interface Student {
  id: string; // The Student ID used for login (e.g. "HS001", "HS002")
  name: string;
  classGroup: string;
  password?: string; // Password (minimum 8 characters)
}

export interface Lecture {
  id: string;
  title: string;
  fileName: string;
  fileData: string; // Base64 PDF/image data
  uploadedAt: string;
}

export interface ClassGroup {
  id: string;
  name: string;
  description?: string;
  lectures: Lecture[];
}

export interface QuestionPartI {
  id: string;
  questionNumber: number;
  content: string; // LaTeX formatted string
  options: string[]; // exactly 4 choices (A, B, C, D)
  correctOption: number; // 0, 1, 2, 3 corresponding to A, B, C, D
  explanation?: string;
}

export interface StatementPartII {
  text: string; // statement content (a, b, c, d)
  correctAnswer: boolean; // true = Đúng, false = Sai
}

export interface QuestionPartII {
  id: string;
  questionNumber: number;
  content: string; // LaTeX formatted root problem context
  statements: StatementPartII[]; // exactly 4 sub-questions (a, b, c, d)
  explanation?: string;
}

export interface QuestionPartIII {
  id: string;
  questionNumber: number;
  content: string; // LaTeX formatted question description
  correctAnswer: string; // numeric value represented as string (e.g., "1.5", "-4")
  explanation?: string;
}

export interface Assignment {
  id: string;
  title: string;
  duration: number; // in minutes, e.g., 90 minutes
  createdDate: string;
  partIQuestions: QuestionPartI[];   // 12 questions (3 points total)
  partIIQuestions: QuestionPartII[]; // 4 questions (4 points total)
  partIIIQuestions: QuestionPartIII[]; // 6 questions (3 points total)
  isPublished: boolean;
  examType?: "THPTQG" | "TSA" | "HSA" | "QDA" | "BCA";
  fileData?: string; // base64 representation of uploaded PDF, image or word document text
  fileName?: string; // original uploaded filename
  targetClassId?: string; // optional specific class ID assigned to (undefined or "all" means all classes)
  openTime?: string; // Opening time for the exam, format YYYY-MM-DDTHH:mm
  closeTime?: string; // Closing time for the exam, format YYYY-MM-DDTHH:mm
}

export interface StudentAnswers {
  partI: { [questionId: string]: number }; // questionId -> index of selected option (0..3)
  partII: { [questionId: string]: { [statementIndex: number]: boolean | null } }; // questionId -> {0: true/false, 1: true/false...}
  partIII: { [questionId: string]: string }; // questionId -> numeric typed answer (e.g., "3.5")
}

export interface GradedAttemptDetails {
  scorePartI: number;   // max 3.0
  scorePartII: number;  // max 4.0
  scorePartIII: number; // max 3.0
  partIResult: { [questionId: string]: boolean }; // questionId -> correct or not
  partIIDetail: { 
    [questionId: string]: { 
      correctCount: number; // 0..4 correct sub-questions
      points: number;       // 0.1, 0.25, 0.5, or 1.0 points
      results: boolean[];   // boolean array of sub-question correctness [a, b, c, d]
    } 
  };
  partIIIResult: { [questionId: string]: boolean }; // questionId -> correct or not
}

export interface ExamAttempt {
  id: string;
  assignmentId: string;
  studentId: string;
  startTime: string;
  submitTime: string;
  score: number; // total score out of 10.0, rounded to 2 decimals
  answers: StudentAnswers;
  gradedDetails: GradedAttemptDetails;
}

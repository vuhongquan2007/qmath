import { useState, useEffect } from "react";
import { Assignment, Student, ExamAttempt, ClassGroup } from "./types";
// Chỉ dùng Sample Data làm fallback nếu DB trống, không dùng làm giá trị mặc định ban đầu
import { DEFAULT_STUDENTS, DEFAULT_ASSIGNMENTS, DEFAULT_ATTEMPTS } from "./data/sampleExams";
import StudentDashboard from "./components/StudentDashboard";
import TutorDashboard from "./components/TutorDashboard";
import ExamTaker from "./components/ExamTaker";
import ExamReview from "./components/ExamReview";
import ConfirmModal from "./components/ConfirmModal";
import { GraduationCap, Users, Layers, Loader2 } from "lucide-react";
import { saveStateToStorage } from "./utils/largeStorage";
import { supabase } from "./utils/supabaseClient";

export default function App() {
  // 1. Core States - Khởi tạo là mảng rỗng để tránh xung đột dữ liệu cũ/mới
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [classGroups, setClassGroups] = useState<ClassGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Trạng thái chờ tải dữ liệu

  // Tải dữ liệu từ Supabase
  useEffect(() => {
    async function fetchAllDataFromSupabase() {
      setIsLoading(true);
      try {
        // Chạy song song các request để tối ưu tốc độ
        const [asmRes, stdRes, attRes, clsRes] = await Promise.all([
          supabase.from("assignments").select("*").order('created_date', { ascending: false }),
          supabase.from("students").select("*"),
          supabase.from("attempts").select("*"),
          supabase.from("class_groups").select("*")
        ]);

        // Xử lý Assignments
        if (asmRes.data && asmRes.data.length > 0) {
          setAssignments(asmRes.data.map((item: any) => ({
            id: String(item.id),
            title: item.title,
            subject: item.subject,
            duration: item.duration,
            questions: item.questions || [],
            examType: item.exam_type || "THPTQG",
            partIQuestions: item.part_i_questions || [],
            partIIQuestions: item.part_ii_questions || [],
            partIIIQuestions: item.part_iii_questions || [],
            fileData: item.file_data || "",
            fileName: item.file_name || "",
            createdDate: item.created_date || new Date().toISOString(),
            isPublished: item.is_published ?? true,
            targetClassId: item.target_class_id || "all",
            openTime: item.open_time,
            closeTime: item.close_time
          })));
        } else {
          setAssignments(DEFAULT_ASSIGNMENTS); // Nếu DB trống thì dùng mẫu
        }

        // Xử lý Students
        if (stdRes.data && stdRes.data.length > 0) {
          setStudents(stdRes.data.map((item: any) => ({
            id: String(item.id),
            name: item.name,
            email: item.email,
            phone: item.phone,
            classGroup: item.class_group,
            password: item.password || "12345678"
          })));
        } else {
          setStudents(DEFAULT_STUDENTS);
        }

        // Xử lý Attempts
        if (attRes.data) {
          setAttempts(attRes.data.map((item: any) => ({
            id: String(item.id),
            assignmentId: String(item.assignment_id),
            studentId: String(item.student_id),
            score: item.score,
            totalQuestions: item.total_questions,
            correctCount: item.correct_count,
            answers: item.answers || {},
            submittedAt: item.submitted_at,
            submitTime: item.submit_time,
            gradedDetails: item.graded_details || { partIResult: {}, partIIDetail: {}, partIIIResult: {} }
          })));
        }

        // Xử lý Class Groups
        if (clsRes.data && clsRes.data.length > 0) {
          setClassGroups(clsRes.data.map((item: any) => ({
            id: String(item.id),
            name: item.name,
            description: item.description,
            lectures: item.lectures || []
          })));
        }

      } catch (err) {
        console.error("Lỗi khi đồng bộ dữ liệu:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchAllDataFromSupabase();
  }, []);

  // 2. Auth States
  const [persona, setPersona] = useState<"student" | "tutor">(() => {
    return (localStorage.getItem("qmath_persona") as "student" | "tutor") || "student";
  });
  
  const [isTutorAuth, setIsTutorAuth] = useState<boolean>(() => {
    return localStorage.getItem("qmath_tutor_auth") === "true" || sessionStorage.getItem("qmath_tutor_auth") === "true";
  });

  const [currentStudent, setCurrentStudent] = useState<Student | null>(() => {
    const saved = localStorage.getItem("thptqg_logged_student");
    return saved ? JSON.parse(saved) : null;
  });

  const [tutorUsername, setTutorUsername] = useState("Quan.VHTutor");
  const [tutorRememberMe, setTutorRememberMe] = useState(true);
  const [activeExam, setActiveExam] = useState<Assignment | null>(null);
  const [activeReview, setActiveReview] = useState<{ attempt: ExamAttempt; assignment: Assignment } | null>(null);
  const [showSwitchPersonaConfirm, setShowSwitchPersonaConfirm] = useState(false);

  // Lưu persona mỗi khi thay đổi để tab mới nhận đúng giao diện
  useEffect(() => {
    localStorage.setItem("qmath_persona", persona);
  }, [persona]);

  // --- ACTIONS ---
  const handleStudentLogin = (student: Student) => {
    setCurrentStudent(student);
    localStorage.setItem("thptqg_logged_student", JSON.stringify(student));
  };

  const handleStudentLogout = () => {
    setCurrentStudent(null);
    localStorage.removeItem("thptqg_logged_student");
    setActiveReview(null);
  };

  const handleAddAssignment = async (newAssignment: Assignment) => {
    const { error } = await supabase.from("assignments").insert([{
      id: newAssignment.id,
      title: newAssignment.title,
      subject: newAssignment.subject,
      duration: newAssignment.duration,
      questions: newAssignment.questions,
      exam_type: newAssignment.examType,
      part_i_questions: newAssignment.partIQuestions,
      part_ii_questions: newAssignment.partIIQuestions,
      part_iii_questions: newAssignment.partIIIQuestions,
      file_data: newAssignment.fileData,
      file_name: newAssignment.fileName,
      is_published: newAssignment.isPublished,
      target_class_id: newAssignment.targetClassId,
      open_time: newAssignment.openTime,
      close_time: newAssignment.closeTime
    }]);
    if (!error) setAssignments(prev => [newAssignment, ...prev]);
  };

  const handleExamSubmit = async (newAttempt: ExamAttempt) => {
    const { error } = await supabase.from("attempts").insert([{
      id: newAttempt.id,
      assignment_id: newAttempt.assignmentId,
      student_id: newAttempt.studentId,
      score: newAttempt.score,
      total_questions: newAttempt.totalQuestions,
      correct_count: newAttempt.correctCount,
      answers: newAttempt.answers,
      submitted_at: newAttempt.submittedAt,
      submit_time: newAttempt.submitTime,
      graded_details: newAttempt.gradedDetails
    }]);

    if (!error) {
      setAttempts(prev => [...prev, newAttempt]);
      setActiveExam(null);
      const assign = assignments.find(a => a.id === newAttempt.assignmentId);
      if (assign) setActiveReview({ attempt: newAttempt, assignment: assign });
    }
  };

  // Màn hình Loading
  if (isLoading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
        <p className="text-slate-600 font-bold animate-pulse">Đang đồng bộ dữ liệu từ Cloud...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md">
                <Layers size={20} className="stroke-[2.5]" />
              </div>
              <div>
                <span className="text-xs font-black uppercase tracking-widest text-indigo-600 block">QMath</span>
                <h1 className="text-sm font-black text-slate-800 mt-0.5">MATH HUB</h1>
              </div>
            </div>

            {!activeExam && (
              <div className="flex items-center gap-3">
                <div className="flex p-0.5 bg-slate-100 rounded-xl border border-slate-200/40">
                  <button
                    onClick={() => setPersona("student")}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-black transition-all ${
                      persona === "student" ? "bg-white text-indigo-700 shadow-xs" : "text-slate-500"
                    }`}
                  >
                    <Users size={13} /> Student
                  </button>
                  <button
                    onClick={() => {
                      if (currentStudent) setShowSwitchPersonaConfirm(true);
                      else setPersona("tutor");
                    }}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-black transition-all ${
                      persona === "tutor" ? "bg-white text-indigo-700 shadow-xs" : "text-slate-500"
                    }`}
                  >
                    <GraduationCap size={14} /> Tutor
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeExam && currentStudent ? (
          <ExamTaker
            assignment={activeExam}
            studentId={currentStudent.id}
            onSubmit={handleExamSubmit}
            onCancel={() => setActiveExam(null)}
          />
        ) : activeReview && currentStudent ? (
          <ExamReview
            attempt={activeReview.attempt}
            assignment={activeReview.assignment}
            student={currentStudent}
            onClose={() => setActiveReview(null)}
          />
        ) : persona === "student" ? (
          <StudentDashboard
            students={students}
            assignments={assignments}
            attempts={attempts}
            classGroups={classGroups}
            onStartExam={setActiveExam}
            onViewReview={(att, ass) => setActiveReview({ attempt: att, assignment: ass })}
            currentStudent={currentStudent}
            onLogin={handleStudentLogin}
            onLogout={handleStudentLogout}
            onUpdateStudent={(s) => setStudents(prev => prev.map(item => item.id === s.id ? s : item))}
          />
        ) : !isTutorAuth ? (
          /* Login Form Tutor (Giữ nguyên logic của bạn nhưng dùng Supabase fetch) */
          <div className="max-w-md mx-auto my-12 bg-white rounded-3xl border p-8 shadow-xl">
             <h2 className="text-2xl font-black text-center mb-6">Cổng Tutor</h2>
             <form onSubmit={async (e) => {
               e.preventDefault();
               const target = e.target as any;
               const user = target[0].value;
               const pass = target[1].value;
               
               const { data, error } = await supabase
                .from("tutor")
                .select("*")
                .eq("name", user)
                .eq("password", pass)
                .single();

               if (data) {
                 setIsTutorAuth(true);
                 localStorage.setItem("qmath_tutor_auth", "true");
               } else {
                 alert("Sai tài khoản hoặc mật khẩu!");
               }
             }} className="space-y-4">
                <input placeholder="Username" className="w-full p-3 border rounded-xl" />
                <input type="password" placeholder="Password" className="w-full p-3 border rounded-xl" />
                <button className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold">Đăng Nhập</button>
             </form>
          </div>
        ) : (
          <TutorDashboard
            students={students}
            assignments={assignments}
            attempts={attempts}
            classGroups={classGroups}
            onAddAssignment={handleAddAssignment}
            onDeleteAssignment={async (id) => {
              await supabase.from("assignments").delete().eq("id", id);
              setAssignments(prev => prev.filter(a => a.id !== id));
            }}
            onAddStudent={async (s) => {
              await supabase.from("students").insert([s]);
              setStudents(prev => [...prev, s]);
            }}
            onDeleteStudent={async (id) => {
              await supabase.from("students").delete().eq("id", id);
              setStudents(prev => prev.filter(s => s.id !== id));
            }}
            onUpdateStudent={(s) => setStudents(prev => prev.map(item => item.id === s.id ? s : item))}
            onResetData={() => { localStorage.clear(); window.location.reload(); }}
            tutorUsername={tutorUsername}
            onUpdateTutorCredentials={() => {}}
          />
        )}
      </main>

      <ConfirmModal
        isOpen={showSwitchPersonaConfirm}
        title="Đăng xuất Học Sinh"
        message="Bạn cần đăng xuất Student để vào cổng Tutor."
        onConfirm={() => {
          handleStudentLogout();
          setPersona("tutor");
          setShowSwitchPersonaConfirm(false);
        }}
        onCancel={() => setShowSwitchPersonaConfirm(false)}
      />
    </div>
  );
}
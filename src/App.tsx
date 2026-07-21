import { useState, useEffect, useCallback } from "react";
import { Assignment, Student, ExamAttempt, ClassGroup } from "./types";
import StudentDashboard from "./components/StudentDashboard";
import TutorDashboard from "./components/TutorDashboard";
import ExamTaker from "./components/ExamTaker";
import ExamReview from "./components/ExamReview";
import ConfirmModal from "./components/ConfirmModal";
import { GraduationCap, Users, Layers, Loader2, Lock, ArrowRight, LogOut } from "lucide-react";
import { supabase } from "./utils/supabaseClient";

export default function App() {
  // --- STATES ---
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [classGroups, setClassGroups] = useState<ClassGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [persona, setPersona] = useState<"student" | "tutor">(() => {
    return (localStorage.getItem("qmath_persona") as "student" | "tutor") || "student";
  });
  
  const [isTutorAuth, setIsTutorAuth] = useState<boolean>(() => {
    return localStorage.getItem("qmath_tutor_auth") === "true";
  });

  const [currentStudent, setCurrentStudent] = useState<Student | null>(() => {
    const saved = localStorage.getItem("thptqg_logged_student");
    return saved ? JSON.parse(saved) : null;
  });

  const [tutorUsername, setTutorUsername] = useState("Quan.VHTutor");
  const [loginError, setLoginError] = useState("");

  // --- HÀM TẢI DỮ LIỆU (FETCH) ---
  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [asmRes, stdRes, attRes, clsRes] = await Promise.all([
        supabase.from("assignments").select("*").order('created_date', { ascending: false }),
        supabase.from("students").select("*"),
        supabase.from("attempts").select("*"),
        supabase.from("class_groups").select("*")
      ]);

      if (asmRes.data) setAssignments(asmRes.data.map(item => ({
        ...item,
        id: String(item.id),
        examType: item.exam_type,
        partIQuestions: item.part_i_questions,
        partIIQuestions: item.part_ii_questions,
        partIIIQuestions: item.part_iii_questions,
        fileData: item.file_data,
        fileName: item.file_name,
        createdDate: item.created_date,
        isPublished: item.is_published,
        targetClassId: item.target_class_id
      })));

      if (stdRes.data) setStudents(stdRes.data.map(item => ({
        ...item,
        id: String(item.id),
        classGroup: item.class_group
      })));

      if (attRes.data) setAttempts(attRes.data.map(item => ({
        ...item,
        id: String(item.id),
        assignmentId: String(item.assignment_id),
        studentId: String(item.student_id),
        totalQuestions: item.total_questions,
        correctCount: item.correct_count,
        submittedAt: item.submitted_at,
        submitTime: item.submit_time,
        gradedDetails: item.graded_details
      })));

      if (clsRes.data) setClassGroups(clsRes.data);

    } catch (err) {
      console.error("Lỗi kết nối Supabase:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  useEffect(() => { localStorage.setItem("qmath_persona", persona); }, [persona]);

  // --- CÁC HÀM XỬ LÝ DATABASE (CRUD) ---

  const handleAddAssignment = async (newAsm: Assignment) => {
    const { error } = await supabase.from("assignments").insert([{
      id: newAsm.id,
      title: newAsm.title,
      subject: newAsm.subject,
      duration: newAsm.duration,
      questions: newAsm.questions,
      exam_type: newAsm.examType,
      part_i_questions: newAsm.partIQuestions,
      part_ii_questions: newAsm.partIIQuestions,
      part_iii_questions: newAsm.partIIIQuestions,
      file_data: newAsm.fileData,
      file_name: newAsm.fileName,
      is_published: newAsm.isPublished,
      target_class_id: newAsm.targetClassId
    }]);
    if (!error) fetchAllData(); // Refresh lại dữ liệu sạch từ DB
  };

  const handleDeleteAssignment = async (id: string) => {
    const { error } = await supabase.from("assignments").delete().eq("id", id);
    if (!error) setAssignments(prev => prev.filter(a => a.id !== id));
  };

  const handleExamSubmit = async (attempt: ExamAttempt) => {
    const { error } = await supabase.from("attempts").insert([{
      id: attempt.id,
      assignment_id: attempt.assignmentId,
      student_id: attempt.studentId,
      score: attempt.score,
      total_questions: attempt.totalQuestions,
      correct_count: attempt.correctCount,
      answers: attempt.answers,
      submitted_at: attempt.submittedAt,
      submit_time: attempt.submitTime,
      graded_details: attempt.gradedDetails
    }]);
    if (!error) {
      setAttempts(prev => [...prev, attempt]);
      // Chuyển sang màn hình xem kết quả
      const assign = assignments.find(a => a.id === attempt.assignmentId);
      if (assign) setActiveReview({ attempt, assignment: assign });
      setActiveExam(null);
    }
  };

  const handleTutorLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = e.target as any;
    const user = target[0].value;
    const pass = target[1].value;

    const { data } = await supabase.from("tutor").select("*").eq("name", user).eq("password", pass).single();

    if (data) {
      setIsTutorAuth(true);
      setTutorUsername(data.name);
      localStorage.setItem("qmath_tutor_auth", "true");
      setLoginError("");
    } else {
      setLoginError("Sai tài khoản hoặc mật khẩu quản trị!");
    }
  };

  const handleUpdateTutorCredentials = async (u: string, p: string) => {
    const { data: tutors } = await supabase.from("tutor").select("id").limit(1);
    if (tutors?.[0]) {
      const { error } = await supabase.from("tutor").update({ name: u, password: p }).eq("id", tutors[0].id);
      if (!error) alert("Cập nhật mật khẩu Tutor thành công!");
    }
  };

  // --- NAVIGATION STATE ---
  const [activeExam, setActiveExam] = useState<Assignment | null>(null);
  const [activeReview, setActiveReview] = useState<{ attempt: ExamAttempt; assignment: Assignment } | null>(null);
  const [showSwitchConfirm, setShowSwitchConfirm] = useState(false);

  if (isLoading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50">
      <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
      <p className="text-slate-600 font-bold">Đang kết nối Cloud QMath...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-md">
              <Layers size={18} />
            </div>
            <h1 className="font-black text-slate-800 tracking-tight">QMATH HUB</h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex p-1 bg-slate-100 rounded-xl border">
              <button onClick={() => setPersona("student")} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${persona === "student" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500"}`}>
                Học viên
              </button>
              <button onClick={() => currentStudent ? setShowSwitchConfirm(true) : setPersona("tutor")} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${persona === "tutor" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500"}`}>
                Gia sư
              </button>
            </div>
            {persona === "tutor" && isTutorAuth && (
              <button onClick={() => { setIsTutorAuth(false); localStorage.removeItem("qmath_tutor_auth"); setPersona("student"); }} className="p-2 text-rose-500 hover:bg-rose-50 rounded-full">
                <LogOut size={20} />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        {activeExam ? (
          <ExamTaker assignment={activeExam} studentId={currentStudent?.id || ""} onSubmit={handleExamSubmit} onCancel={() => setActiveExam(null)} />
        ) : activeReview ? (
          <ExamReview attempt={activeReview.attempt} assignment={activeReview.assignment} student={currentStudent!} onClose={() => setActiveReview(null)} />
        ) : persona === "student" ? (
          <StudentDashboard
            students={students} assignments={assignments} attempts={attempts} classGroups={classGroups}
            onStartExam={setActiveExam} onViewReview={(att, ass) => setActiveReview({ attempt: att, assignment: ass })}
            currentStudent={currentStudent}
            onLogin={(s) => { setCurrentStudent(s); localStorage.setItem("thptqg_logged_student", JSON.stringify(s)); }}
            onLogout={() => { setCurrentStudent(null); localStorage.rem
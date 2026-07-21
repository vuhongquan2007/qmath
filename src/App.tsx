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
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [classGroups, setClassGroups] = useState<ClassGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- 1. HÀM FETCH DỮ LIỆU TỪ SUPABASE ---
  const fetchAllData = useCallback(async () => {
    try {
      const [asm, std, att, cls] = await Promise.all([
        supabase.from("assignments").select("*").order('created_date', { ascending: false }),
        supabase.from("students").select("*"),
        supabase.from("attempts").select("*"),
        supabase.from("class_groups").select("*")
      ]);

      if (asm.data) setAssignments(asm.data.map(i => ({
        ...i, id: String(i.id), examType: i.exam_type, 
        partIQuestions: i.part_i_questions, partIIQuestions: i.part_ii_questions, 
        partIIIQuestions: i.part_iii_questions, fileData: i.file_data, 
        fileName: i.file_name, createdDate: i.created_date,
        isPublished: i.is_published, targetClassId: i.target_class_id
      })));

      if (std.data) setStudents(std.data.map(i => ({ ...i, id: String(i.id), classGroup: i.class_group })));
      if (att.data) setAttempts(att.data.map(i => ({
        ...i, id: String(i.id), assignmentId: String(i.assignment_id),
        studentId: String(i.student_id), totalQuestions: i.total_questions,
        correctCount: i.correct_count, submittedAt: i.submitted_at,
        submitTime: i.submit_time, gradedDetails: i.graded_details
      })));
      if (cls.data) setClassGroups(cls.data.map(i => ({ ...i, id: String(i.id) })));

    } catch (error) {
      console.error("Lỗi Fetch:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchAllData(); }, [fetchAllData]);

  // --- 2. HÀM THÊM BÀI TẬP (FIX ĐỒNG BỘ) ---
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
      target_class_id: newAsm.targetClassId,
      created_date: newAsm.createdDate || new Date().toISOString()
    }]);

    if (error) {
      alert("Lỗi lưu bài tập: " + error.message);
    } else {
      fetchAllData(); // Refresh để cập nhật state
    }
  };

  // --- 3. HÀM THÊM HỌC SINH (FIX ĐỒNG BỘ) ---
  const handleAddStudent = async (s: Student) => {
    const { error } = await supabase.from("students").insert([{
      id: s.id,
      name: s.name,
      email: s.email,
      phone: s.phone,
      class_group: s.classGroup,
      password: s.password
    }]);

    if (error) {
      alert("Lỗi lưu học sinh: " + error.message);
    } else {
      fetchAllData();
    }
  };

  // --- 4. HÀM NỘP BÀI (FIX ĐỒNG BỘ) ---
  const handleExamSubmit = async (att: ExamAttempt) => {
    const { error } = await supabase.from("attempts").insert([{
      id: att.id,
      assignment_id: att.assignmentId,
      student_id: att.studentId,
      score: att.score,
      total_questions: att.totalQuestions,
      correct_count: att.correctCount,
      answers: att.answers,
      submitted_at: att.submittedAt,
      submit_time: att.submitTime,
      graded_details: att.gradedDetails
    }]);

    if (error) {
      alert("Lỗi nộp bài: " + error.message);
    } else {
      setAttempts(prev => [...prev, att]);
      const assign = assignments.find(a => a.id === att.assignmentId);
      if (assign) setActiveReview({ attempt: att, assignment: assign });
      setActiveExam(null);
    }
  };

  // --- 5. QUẢN LÝ TRẠNG THÁI UI ---
  const [persona, setPersona] = useState<"student" | "tutor">(() => (localStorage.getItem("qmath_persona") as any) || "student");
  const [isTutorAuth, setIsTutorAuth] = useState(() => localStorage.getItem("qmath_tutor_auth") === "true");
  const [currentStudent, setCurrentStudent] = useState<Student | null>(() => {
    const s = localStorage.getItem("thptqg_logged_student");
    return s ? JSON.parse(s) : null;
  });
  const [activeExam, setActiveExam] = useState<Assignment | null>(null);
  const [activeReview, setActiveReview] = useState<{ attempt: ExamAttempt; assignment: Assignment } | null>(null);
  const [showSwitchConfirm, setShowSwitchConfirm] = useState(false);

  useEffect(() => { localStorage.setItem("qmath_persona", persona); }, [persona]);

  if (isLoading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50">
      <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-2" />
      <p className="font-bold text-slate-500">Đang đồng bộ dữ liệu Cloud...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b sticky top-0 z-40 h-16 flex items-center shadow-sm">
        <div className="max-w-7xl mx-auto w-full px-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center text-white"><Layers size={20}/></div>
            <span className="font-black text-slate-800">QMATH HUB</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex p-1 bg-slate-100 rounded-xl border">
              <button onClick={() => setPersona("student")} className={`px-4 py-1.5 rounded-lg text-xs font-bold ${persona === "student" ? "bg-white shadow-sm text-indigo-600" : "text-slate-500"}`}>Học viên</button>
              <button onClick={() => currentStudent ? setShowSwitchConfirm(true) : setPersona("tutor")} className={`px-4 py-1.5 rounded-lg text-xs font-bold ${persona === "tutor" ? "bg-white shadow-sm text-indigo-600" : "text-slate-500"}`}>Gia sư</button>
            </div>
            {isTutorAuth && persona === "tutor" && (
              <button onClick={() => { setIsTutorAuth(false); localStorage.removeItem("qmath_tutor_auth"); setPersona("student"); }} className="p-2 text-rose-500 hover:bg-rose-50 rounded-full"><LogOut size={20} /></button>
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
            onLogout={() => { setCurrentStudent(null); localStorage.removeItem("thptqg_logged_student"); }}
            onUpdateStudent={() => {}}
          />
        ) : !isTutorAuth ? (
          <div className="max-w-md mx-auto my-12 bg-white rounded-[2.5rem] border shadow-2xl p-10">
             <div className="flex justify-center mb-6"><div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center"><Lock size={32} /></div></div>
             <h2 className="text-2xl font-black text-center mb-8">Cổng Gia Sư</h2>
             <form onSubmit={async (e) => {
               e.preventDefault();
               const user = (e.target as any)[0].value;
               const pass = (e.target as any)[1].value;
               const { data } = await supabase.from("tutor").select("*").eq("name", user).eq("password", pass).single();
               if (data) {
                 setIsTutorAuth(true);
                 localStorage.setItem("qmath_tutor_auth", "true");
               } else { alert("Sai thông tin quản trị!"); }
             }} className="space-y-4">
                <input placeholder="ID Quản Trị" className="w-full px-5 py-4 bg-slate-50 border rounded-2xl outline-none" required />
                <input type="password" placeholder="Mật khẩu" className="w-full px-5 py-4 bg-slate-50 border rounded-2xl outline-none" required />
                <button className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black flex items-center justify-center gap-2">Vào Quản Trị <ArrowRight size={18}/></button>
             </form>
          </div>
        ) : (
          <TutorDashboard
            students={students} assignments={assignments} attempts={attempts} classGroups={classGroups}
            onAddAssignment={handleAddAssignment}
            onDeleteAssignment={async (id) => { await supabase.from("assignments").delete().eq("id", id); fetchAllData(); }}
            onAddStudent={handleAddStudent}
            onDeleteStudent={async (id) => { await supabase.from("students").delete().eq("id", id); fetchAllData(); }}
            onUpdateStudent={async (s) => { await supabase.from("students").update(s).eq("id", s.id); fetchAllData(); }}
            onUpdateClassGroups={async (groups) => { setClassGroups(groups); }}
            onResetData={() => { localStorage.clear(); window.location.reload(); }}
            tutorUsername="Admin"
            onUpdateTutorCredentials={async (u, p) => { 
                const { data } = await supabase.from("tutor").select("id").limit(1);
                if (data?.[0]) {
                    await supabase.from("tutor").update({ name: u, password: p }).eq("id", data[0].id);
                    alert("Đã cập nhật mật khẩu Tutor!");
                }
            }}
          />
        )}
      </main>

      <ConfirmModal
        isOpen={showSwitchConfirm}
        title="Đăng xuất học viên?"
        message="Bạn cần thoát tài khoản học viên để vào cổng gia sư."
        onConfirm={() => { setCurrentStudent(null); localStorage.removeItem("thptqg_logged_student"); setPersona("tutor"); setShowSwitchConfirm(false); }}
        onCancel={() => setShowSwitchConfirm(false)}
      />
    </div>
  );
}
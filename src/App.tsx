import { useState, useEffect } from "react";
import { Assignment, Student, ExamAttempt, ClassGroup } from "./types";
import { DEFAULT_STUDENTS, DEFAULT_ASSIGNMENTS } from "./data/sampleExams";
import StudentDashboard from "./components/StudentDashboard";
import TutorDashboard from "./components/TutorDashboard";
import ExamTaker from "./components/ExamTaker";
import ExamReview from "./components/ExamReview";
import ConfirmModal from "./components/ConfirmModal";
import { GraduationCap, Users, Layers, Loader2, Lock, ArrowRight, LogOut } from "lucide-react";
import { saveStateToStorage } from "./utils/largeStorage";
import { supabase } from "./utils/supabaseClient";

export default function App() {
  // 1. Core States
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [classGroups, setClassGroups] = useState<ClassGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 2. Auth States
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
  const [tutorLoginInput, setTutorLoginInput] = useState({ user: "", pass: "" });
  const [loginError, setLoginError] = useState("");

  // Tải dữ liệu từ Supabase
  useEffect(() => {
    async function fetchAllData() {
      setIsLoading(true);
      try {
        const [asmRes, stdRes, attRes, clsRes] = await Promise.all([
          supabase.from("assignments").select("*").order('created_date', { ascending: false }),
          supabase.from("students").select("*"),
          supabase.from("attempts").select("*"),
          supabase.from("class_groups").select("*")
        ]);

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
        } else { setAssignments(DEFAULT_ASSIGNMENTS); }

        if (stdRes.data) setStudents(stdRes.data.map((item: any) => ({
            id: String(item.id), name: item.name, email: item.email,
            phone: item.phone, classGroup: item.class_group, password: item.password || "12345678"
        })));
        else { setStudents(DEFAULT_STUDENTS); }

        if (attRes.data) setAttempts(attRes.data.map((item: any) => ({
            id: String(item.id), assignmentId: String(item.assignment_id),
            studentId: String(item.student_id), score: item.score,
            totalQuestions: item.total_questions, correctCount: item.correct_count,
            answers: item.answers || {}, submittedAt: item.submitted_at,
            submitTime: item.submit_time, gradedDetails: item.graded_details || {}
        })));

        if (clsRes.data) setClassGroups(clsRes.data.map((item: any) => ({
            id: String(item.id), name: item.name, description: item.description, lectures: item.lectures || []
        })));
      } finally {
        setIsLoading(false);
      }
    }
    fetchAllData();
  }, []);

  useEffect(() => { localStorage.setItem("qmath_persona", persona); }, [persona]);

  // --- LOGIC XỬ LÝ ---
  
  const handleTutorLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    const { data, error } = await supabase
      .from("tutor")
      .select("*")
      .eq("name", tutorLoginInput.user.trim())
      .eq("password", tutorLoginInput.pass)
      .single();

    if (data) {
      setIsTutorAuth(true);
      setTutorUsername(data.name);
      localStorage.setItem("qmath_tutor_auth", "true");
    } else {
      setLoginError("ID hoặc Mật khẩu quản trị không đúng!");
    }
  };

  const handleTutorLogout = () => {
    setIsTutorAuth(false);
    localStorage.removeItem("qmath_tutor_auth");
    setPersona("student"); // Đẩy về portal học sinh cho an toàn
  };

  const handleUpdateTutorCredentials = async (newUsername: string, newPass: string) => {
    const { data: tutors } = await supabase.from("tutor").select("id").limit(1);
    if (tutors && tutors[0]) {
      const { error } = await supabase.from("tutor").update({ name: newUsername, password: newPass }).eq("id", tutors[0].id);
      if (!error) {
        setTutorUsername(newUsername);
        alert("🎉 Cập nhật thông tin quản trị thành công!");
      }
    }
  };

  const [activeExam, setActiveExam] = useState<Assignment | null>(null);
  const [activeReview, setActiveReview] = useState<{ attempt: ExamAttempt; assignment: Assignment } | null>(null);
  const [showSwitchConfirm, setShowSwitchConfirm] = useState(false);

  if (isLoading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50">
      <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
      <p className="text-slate-600 font-bold">Đang đồng bộ dữ liệu QMath...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
              <Layers size={20} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 block leading-none">QMath</span>
              <h1 className="text-sm font-black text-slate-800 mt-1">MATH HUB</h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button onClick={() => setPersona("student")} className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${persona === "student" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500"}`}>
                <Users size={14} /> Học viên
              </button>
              <button onClick={() => currentStudent ? setShowSwitchConfirm(true) : setPersona("tutor")} className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${persona === "tutor" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500"}`}>
                <GraduationCap size={15} /> Gia sư
              </button>
            </div>
            
            {persona === "tutor" && isTutorAuth && (
              <button onClick={handleTutorLogout} className="p-2 text-rose-600 hover:bg-rose-50 rounded-full transition-colors" title="Đăng xuất Tutor">
                <LogOut size={20} />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
        {activeExam ? (
          <ExamTaker assignment={activeExam} studentId={currentStudent?.id || ""} onSubmit={() => {}} onCancel={() => setActiveExam(null)} />
        ) : persona === "student" ? (
          <StudentDashboard
            students={students} assignments={assignments} attempts={attempts} classGroups={classGroups}
            onStartExam={setActiveExam} onViewReview={(att, ass) => setActiveReview({ attempt: att, assignment: ass })}
            currentStudent={currentStudent} onLogin={(s) => { setCurrentStudent(s); localStorage.setItem("thptqg_logged_student", JSON.stringify(s)); }}
            onLogout={() => { setCurrentStudent(null); localStorage.removeItem("thptqg_logged_student"); }}
            onUpdateStudent={() => {}}
          />
        ) : !isTutorAuth ? (
          /* ĐĂNG NHẬP TUTOR - GIAO DIỆN LÀM ĐẸP GIỐNG STUDENT */
          <div className="max-w-md mx-auto my-12">
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden">
              <div className="p-8 md:p-10">
                <div className="flex justify-center mb-6">
                   <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center border border-indigo-100 shadow-inner">
                      <Lock size={32} />
                   </div>
                </div>
                
                <div className="text-center space-y-2 mb-8">
                  <h2 className="text-2xl font-black text-slate-800">Cổng Quản Trị (Tutor)</h2>
                  <p className="text-sm text-slate-500 font-medium px-4">Vui lòng xác thực quyền Gia sư để quản lý lớp học và đề thi</p>
                </div>

                <form onSubmit={handleTutorLogin} className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider ml-1">ID Quản Trị:</label>
                    <input
                      required
                      type="text"
                      value={tutorLoginInput.user}
                      onChange={(e) => setTutorLoginInput({...tutorLoginInput, user: e.target.value})}
                      placeholder="Nhập ID gia sư..."
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none font-semibold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider ml-1">Mật khẩu bảo mật:</label>
                    <input
                      required
                      type="password"
                      value={tutorLoginInput.pass}
                      onChange={(e) => setTutorLoginInput({...tutorLoginInput, pass: e.target.value})}
                      placeholder="Nhập mật khẩu..."
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none font-semibold"
                    />
                  </div>

                  {loginError && (
                    <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-xs font-bold text-center">
                      {loginError}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 group"
                  >
                    Xác Thực Truy Cập
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </form>
              </div>
              <div className="bg-slate-50 p-6 text-center border-t border-slate-100">
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-tighter">Hệ thống quản trị QMath Math Hub v2.0</p>
              </div>
            </div>
          </div>
        ) : (
          /* DASHBOARD CHÍNH CHO TUTOR */
          <TutorDashboard
            students={students} assignments={assignments} attempts={attempts} classGroups={classGroups}
            onUpdateClassGroups={async (next) => { setClassGroups(next); }}
            onAddAssignment={async (a) => { setAssignments([a, ...assignments]); }}
            onDeleteAssignment={(id) => setAssignments(prev => prev.filter(a => a.id !== id))}
            onAddStudent={(s) => setStudents([...students, s])}
            onDeleteStudent={(id) => setStudents(prev => prev.filter(s => s.id !== id))}
            onUpdateStudent={() => {}}
            onResetData={() => { localStorage.clear(); window.location.reload(); }}
            tutorUsername={tutorUsername}
            onUpdateTutorCredentials={handleUpdateTutorCredentials}
          />
        )}
      </main>

      <ConfirmModal
        isOpen={showSwitchConfirm}
        title="Đăng xuất Học viên?"
        message="Bạn cần đăng xuất khỏi tài khoản Học viên để truy cập cổng Gia sư."
        onConfirm={() => {
          setCurrentStudent(null);
          localStorage.removeItem("thptqg_logged_student");
          setPersona("tutor");
          setShowSwitchConfirm(false);
        }}
        onCancel={() => setShowSwitchConfirm(false)}
      />
    </div>
  );
}
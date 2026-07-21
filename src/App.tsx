import { useState, useEffect, useCallback } from "react";
import { GraduationCap, Users, Layers, Loader2, Lock, ArrowRight, LogOut } from "lucide-react";
import { supabase } from "./utils/supabaseClient";
import { Assignment, Student, ExamAttempt, ClassGroup } from "./types";
import { DEFAULT_STUDENTS, DEFAULT_ASSIGNMENTS } from "./data/sampleExams";
import StudentDashboard from "./components/StudentDashboard";
import TutorDashboard from "./components/TutorDashboard";
import ExamTaker from "./components/ExamTaker";
import ExamReview from "./components/ExamReview";
import ConfirmModal from "./components/ConfirmModal";

export default function App() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [classGroups, setClassGroups] = useState<ClassGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [persona, setPersona] = useState<"student" | "tutor">("student");
  const [isTutorAuth, setIsTutorAuth] = useState(false);
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
  const [activeExam, setActiveExam] = useState<Assignment | null>(null);
  const [activeReview, setActiveReview] = useState<{ attempt: ExamAttempt; assignment: Assignment } | null>(null);
  const [showSwitchConfirm, setShowSwitchConfirm] = useState(false);

  // --- 1. HÀM TẢI DỮ LIỆU ---
  const fetchAllData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [asmRes, stdRes, attRes, clsRes] = await Promise.all([
        supabase.from("assignments").select("*").order('created_date', { ascending: false }),
        supabase.from("students").select("*"),
        supabase.from("attempts").select("*").order('submit_time', { ascending: false }),
        supabase.from("class_groups").select("*")
      ]);

      if (asmRes.data && asmRes.data.length > 0) {
        setAssignments(asmRes.data.map(i => ({
          ...i, id: String(i.id), examType: i.exam_type,
          createdDate: i.created_date ? i.created_date.split('T')[0] : "",
          isPublished: i.is_published ?? true,
          partIQuestions: i.part_i_questions || [], partIIQuestions: i.part_ii_questions || [],
          partIIIQuestions: i.part_iii_questions || [], fileData: i.file_data,
          fileName: i.file_name, targetClassId: i.target_class_id || "all"
        })));
      } else { setAssignments(DEFAULT_ASSIGNMENTS); }

      if (stdRes.data && stdRes.data.length > 0) {
        setStudents(stdRes.data.map(i => ({
          id: String(i.id), name: i.name, password: i.password, classGroup: i.class_group
        })));
      } else { setStudents(DEFAULT_STUDENTS); }

      if (attRes.data) {
        setAttempts(attRes.data.map(i => ({
          id: String(i.id), assignmentId: String(i.assignment_id), studentId: String(i.student_id),
          score: i.score, totalQuestions: i.total_questions, correctCount: i.correct_count,
          answers: i.answers || {}, submitTime: i.submit_time, gradedDetails: i.graded_details || {}
        })));
      }
      if (clsRes.data) setClassGroups(clsRes.data);
    } catch (err) { console.error(err); } finally { setIsLoading(false); }
  }, []);

  useEffect(() => {
    const savedPersona = localStorage.getItem("qmath_persona") as any;
    if (savedPersona) setPersona(savedPersona);
    const savedTutor = localStorage.getItem("qmath_tutor_auth");
    if (savedTutor === "true") setIsTutorAuth(true);
    const savedStudent = localStorage.getItem("thptqg_logged_student");
    if (savedStudent) setCurrentStudent(JSON.parse(savedStudent));
    fetchAllData();
  }, [fetchAllData]);

  // --- 2. LOGIC CẬP NHẬT HỌC VIÊN (ĐÃ HOÀN THIỆN) ---
  const handleUpdateStudent = async (s: Student) => {
    try {
      const { error } = await supabase
        .from("students")
        .update({ 
          name: s.name, 
          class_group: s.classGroup, 
          password: s.password 
        })
        .eq("id", s.id);

      if (error) {
        alert("Lỗi cập nhật học viên: " + error.message);
        return;
      }

      // Cập nhật state cục bộ
      setStudents(prev => prev.map(item => item.id === s.id ? s : item));

      // Nếu đang cập nhật chính mình (Học viên tự đổi pass), cập nhật localStorage để không bị logout
      if (currentStudent && currentStudent.id === s.id) {
        setCurrentStudent(s);
        localStorage.setItem("thptqg_logged_student", JSON.stringify(s));
      }
      
      alert("Cập nhật thông tin thành công!");
      fetchAllData();
    } catch (err) {
      console.error(err);
    }
  };

  // --- 3. LOGIC NỘP BÀI ---
  const handleExamSubmit = async (attempt: ExamAttempt) => {
    const { error } = await supabase.from("attempts").insert([{
      id: attempt.id, assignment_id: attempt.assignmentId, student_id: attempt.studentId,
      score: attempt.score, total_questions: attempt.totalQuestions, correct_count: attempt.correctCount,
      answers: attempt.answers, submit_time: attempt.submitTime || new Date().toISOString(),
      graded_details: attempt.gradedDetails
    }]);
    if (error) { alert("Lỗi nộp bài: " + error.message); return; }
    setAttempts(prev => [attempt, ...prev]);
    const assignment = assignments.find(a => a.id === attempt.assignmentId);
    if (assignment) setActiveReview({ attempt, assignment });
    setActiveExam(null);
  };

  const handleTutorLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as any;
    const { data } = await supabase.from("tutor").select("*").eq("name", form[0].value).eq("password", form[1].value).single();
    if (data) { setIsTutorAuth(true); localStorage.setItem("qmath_tutor_auth", "true"); } else { alert("Sai thông tin!"); }
  };

  if (isLoading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 font-sans">
      <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
      <p className="text-slate-600 font-bold animate-pulse">Đang tải dữ liệu...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="bg-white border-b h-16 flex items-center px-4 shadow-sm">
        <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
          <div className="flex items-center gap-2 font-black text-slate-800"><Layers size={20}/><span className="tracking-tight">QMATH HUB</span></div>
          <div className="flex p-1 bg-slate-100 rounded-xl border">
              <button onClick={() => { setPersona("student"); localStorage.setItem("qmath_persona", "student"); }} className={`px-4 py-1.5 rounded-lg text-xs font-bold ${persona === "student" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"}`}>Học viên</button>
              <button onClick={() => { if(currentStudent) setShowSwitchConfirm(true); else { setPersona("tutor"); localStorage.setItem("qmath_persona", "tutor"); } }} className={`px-4 py-1.5 rounded-lg text-xs font-bold ${persona === "tutor" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"}`}>Gia sư</button>
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
            onUpdateStudent={handleUpdateStudent} // Đã thêm hàm xử lý cho học viên
          />
        ) : !isTutorAuth ? (
          <div className="max-w-md mx-auto my-12 bg-white rounded-[2.5rem] border shadow-2xl p-10 text-center">
             <Lock size={32} className="mx-auto mb-4 text-indigo-600" />
             <h2 className="text-2xl font-black mb-8 text-slate-800">Cổng Gia Sư</h2>
             <form onSubmit={handleTutorLogin} className="space-y-4">
                <input placeholder="ID Quản Trị" className="w-full px-5 py-4 bg-slate-50 border rounded-2xl outline-none" required />
                <input type="password" placeholder="Mật khẩu" className="w-full px-5 py-4 bg-slate-50 border rounded-2xl outline-none" required />
                <button className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg">Xác thực đăng nhập</button>
             </form>
          </div>
        ) : (
          <TutorDashboard
            students={students} assignments={assignments} attempts={attempts} classGroups={classGroups}
            onAddAssignment={async (a) => { 
                await supabase.from("assignments").insert([{ 
                  id: a.id, title: a.title, duration: a.duration, exam_type: a.examType,
                  part_i_questions: a.partIQuestions, part_ii_questions: a.partIIQuestions,
                  part_iii_questions: a.partIIIQuestions, file_data: a.fileData,
                  file_name: a.fileName, target_class_id: a.targetClassId,
                  is_published: true, created_date: new Date().toISOString() 
                }]); 
                fetchAllData(); 
            }}
            onDeleteAssignment={async (id) => { await supabase.from("assignments").delete().eq("id", id); fetchAllData(); }}
            onAddStudent={async (s) => { 
                await supabase.from("students").insert([{ id: s.id, name: s.name, class_group: s.classGroup, password: s.password }]); 
                fetchAllData(); 
            }}
            onDeleteStudent={async (id) => { await supabase.from("students").delete().eq("id", id); fetchAllData(); }}
            onUpdateStudent={handleUpdateStudent} // Đã thêm hàm xử lý cho gia sư
            onUpdateClassGroups={async (updater) => {
                const next = typeof updater === "function" ? updater(classGroups) : updater;
                const currentIds = classGroups.map(c => c.id);
                const nextIds = next.map(c => c.id);
                const deletedIds = currentIds.filter(id => !nextIds.includes(id));
                if (deletedIds.length > 0) { await supabase.from("class_groups").delete().in("id", deletedIds); }
                if (next.length > 0) {
                    await supabase.from("class_groups").upsert(next.map(g => ({
                        id: g.id, name: g.name, description: g.description, lectures: g.lectures
                    })));
                }
                fetchAllData();
            }}
            onResetData={() => { localStorage.clear(); window.location.reload(); }}
            tutorUsername="Admin" tutorPassword=""
            onUpdateTutorCredentials={async (u, p) => { 
                const { data } = await supabase.from("tutor").select("id").limit(1);
                if (data?.[0]) { await supabase.from("tutor").update({ name: u, password: p }).eq("id", data[0].id); alert("Đã cập nhật!"); }
            }}
          />
        )}
      </main>

      <ConfirmModal
        isOpen={showSwitchConfirm} title="Đăng xuất?" message="Thoát Student để vào Tutor."
        onConfirm={() => { setCurrentStudent(null); localStorage.removeItem("thptqg_logged_student"); setPersona("tutor"); setShowSwitchConfirm(false); }}
        onCancel={() => setShowSwitchConfirm(false)}
      />
    </div>
  );
}
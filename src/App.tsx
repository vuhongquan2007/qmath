import { useState, useEffect, useCallback } from "react";
import { GraduationCap, Users, Layers, Loader2, Lock } from "lucide-react";
import { supabase } from "./utils/supabaseClient";
import { Assignment, Student, ExamAttempt, ClassGroup } from "./types";
// Chỉ giữ import để dùng nếu cần, không tự động nạp vào giao diện nữa
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

  const [persona, setPersona] = useState<"student" | "tutor">(() => (localStorage.getItem("qmath_persona") as any) || "student");
  const [isTutorAuth, setIsTutorAuth] = useState<boolean>(() => localStorage.getItem("qmath_tutor_auth") === "true");
  const [currentStudent, setCurrentStudent] = useState<Student | null>(() => {
    try {
      const saved = localStorage.getItem("thptqg_logged_student");
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const [activeExam, setActiveExam] = useState<Assignment | null>(null);
  const [activeReview, setActiveReview] = useState<{ attempt: ExamAttempt; assignment: Assignment } | null>(null);
  const [showSwitchConfirm, setShowSwitchConfirm] = useState(false);

  // --- HÀM TẢI DỮ LIỆU SẠCH TỪ SUPABASE ---
  const fetchAllData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [asmRes, stdRes, attRes, clsRes] = await Promise.all([
        supabase.from("assignments").select("*").order('created_date', { ascending: false }),
        supabase.from("students").select("*"),
        supabase.from("attempts").select("*").order('submit_time', { ascending: false }),
        supabase.from("class_groups").select("*").order('name', { ascending: true })
      ]);

      // Trong App.tsx -> fetchAllData
      if (asmRes.data) {
        setAssignments(asmRes.data.map(i => {
          // Console log để bạn kiểm tra xem dữ liệu có thực sự về không
          console.log("Đang nạp đề:", i.title, "FileData tồn tại:", !!i.file_data);

          return {
            ...i,
            id: String(i.id),
            examType: i.exam_type,
            createdDate: i.created_date ? i.created_date.split('T')[0] : "",
            isPublished: i.is_published ?? true,
            partIQuestions: i.part_i_questions || [],
            partIIQuestions: i.part_ii_questions || [],
            partIIIQuestions: i.part_iii_questions || [],
            targetClassId: i.target_class_id || "all",
            // ĐẢM BẢO LẤY ĐÚNG 2 CỘT NÀY
            fileData: i.file_data || i.fileData || "", 
            fileName: i.file_name || i.fileName || ""
          };
        }));
      }
      // ... (Các phần stdRes, attRes, clsRes bên dưới giữ nguyên)
      if (stdRes.data) {
        setStudents(stdRes.data.map(i => ({
          id: String(i.id), name: i.name, password: i.password, classGroup: i.class_group
        })));
      }
      if (attRes.data) {
        setAttempts(attRes.data.map(i => ({
          ...i, id: String(i.id), assignmentId: String(i.assignment_id), studentId: String(i.student_id), gradedDetails: i.graded_details || {}
        })));
      }
      if (clsRes.data) {
        setClassGroups(clsRes.data.map(i => ({ id: String(i.id), name: i.name, description: i.description || "", lectures: i.lectures || [] })));
      }
    } catch (err) { console.error(err); } finally { setIsLoading(false); }
  }, []);

  useEffect(() => { fetchAllData(); }, [fetchAllData]);

  // --- LOGIC XỬ LÝ DỮ LIỆU (CRUD) ---

  const handleUpdateStudent = async (s: Student) => {
    const { error } = await supabase.from("students").update({ 
      name: s.name, class_group: s.classGroup, password: s.password 
    }).eq("id", s.id);
    if (!error) { fetchAllData(); } else { alert("Lỗi: " + error.message); }
  };

  const handleUpdateClassGroups = async (updater: any) => {
    const next = typeof updater === "function" ? updater(classGroups) : updater;
    const currentIds = classGroups.map(c => c.id);
    const nextIds = next.map((c: any) => c.id);
    const deletedIds = currentIds.filter(id => !nextIds.includes(id));

    if (deletedIds.length > 0) {
        const deletedNames = classGroups.filter(c => deletedIds.includes(c.id)).map(c => c.name);
        await Promise.all([
          supabase.from("students").delete().in("class_group", deletedNames),
          supabase.from("assignments").delete().in("target_class_id", deletedIds),
          supabase.from("class_groups").delete().in("id", deletedIds)
        ]);
    }
    if (next.length > 0) {
        await supabase.from("class_groups").upsert(next.map((g: any) => ({
            id: g.id, name: g.name, description: g.description || "", lectures: g.lectures || []
        })));
    }
    fetchAllData();
  };

  const handleExamSubmit = async (attempt: ExamAttempt) => {
    const { error } = await supabase.from("attempts").insert([{
      id: attempt.id,
      assignment_id: attempt.assignmentId,
      student_id: attempt.studentId,
      score: attempt.score,
      total_questions: attempt.totalQuestions,
      correct_count: attempt.correctCount,
      // --- QUAN TRỌNG: LƯU ĐÁP ÁN HỌC SINH ĐÃ CHỌN ---
      answers: attempt.answers, 
      submit_time: new Date().toISOString(),
      graded_details: attempt.gradedDetails
    }]);

    if (!error) {
      setAttempts(prev => [attempt, ...prev]);
      fetchAllData(); // Tải lại để Gia sư thấy bài mới ngay
      
      // Hiện bảng điểm cho học sinh xem luôn
      const assignment = assignments.find(a => a.id === attempt.assignmentId);
      if (assignment) setActiveReview({ attempt, assignment });
      setActiveExam(null);
    }
  };

  if (isLoading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50">
      <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
      <p className="text-slate-600 font-bold animate-pulse">Đang tải dữ liệu QMath...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="bg-white border-b h-16 flex items-center px-4 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
          <div className="flex items-center gap-2 font-black text-slate-800"><Layers size={20}/><span className="tracking-tight uppercase">QMath Hub</span></div>
          <div className="flex p-1 bg-slate-100 rounded-xl border">
              <button onClick={() => { setPersona("student"); localStorage.setItem("qmath_persona", "student"); }} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${persona === "student" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"}`}>Học viên</button>
              <button onClick={() => { if(currentStudent) setShowSwitchConfirm(true); else { setPersona("tutor"); localStorage.setItem("qmath_persona", "tutor"); } }} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${persona === "tutor" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"}`}>Gia sư</button>
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
            currentStudent={currentStudent} onLogin={(s) => { setCurrentStudent(s); localStorage.setItem("thptqg_logged_student", JSON.stringify(s)); }}
            onLogout={() => { setCurrentStudent(null); localStorage.removeItem("thptqg_logged_student"); }}
            onUpdateStudent={handleUpdateStudent}
          />
        ) : !isTutorAuth ? (
          <div className="max-w-md mx-auto my-12 bg-white rounded-[2.5rem] border shadow-2xl p-10 text-center font-sans">
             <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6"><Lock size={32} /></div>
             <h2 className="text-2xl font-black mb-8 text-slate-800">Cổng Gia Sư</h2>
             <form onSubmit={async (e) => {
               e.preventDefault();
               const user = (e.target as any)[0].value;
               const pass = (e.target as any)[1].value;
               const { data } = await supabase.from("tutor").select("*").eq("name", user).eq("password", pass).single();
               if (data) { setIsTutorAuth(true); localStorage.setItem("qmath_tutor_auth", "true"); } else { alert("Sai thông tin quản trị!"); }
             }} className="space-y-4">
                <input placeholder="ID Quản Trị" className="w-full px-5 py-4 bg-slate-50 border rounded-2xl outline-none focus:border-indigo-500 transition-all font-semibold" required />
                <input type="password" placeholder="Mật khẩu" className="w-full px-5 py-4 bg-slate-50 border rounded-2xl outline-none focus:border-indigo-500 transition-all font-semibold" required />
                <button className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg">Xác thực đăng nhập</button>
             </form>
          </div>
        ) : (
          <TutorDashboard
            students={students} assignments={assignments} attempts={attempts} classGroups={classGroups}
            // Trong App.tsx -> onAddAssignment
            onAddAssignment={async (a) => { 
                const { error } = await supabase.from("assignments").insert([{ 
                  id: a.id, 
                  title: a.title, 
                  duration: a.duration, 
                  exam_type: a.examType,
                  part_i_questions: a.partIQuestions, 
                  part_ii_questions: a.partIIQuestions,
                  part_iii_questions: a.partIIIQuestions, 
                  target_class_id: a.targetClassId,
                  is_published: true, 
                  created_date: new Date().toISOString(),
                  // GỬI LÊN DƯỚI DẠNG SNAKE_CASE
                  file_data: a.fileData, 
                  file_name: a.fileName
                }]); 
                
                if (error) alert("Lỗi: " + error.message);
                else fetchAllData(); 
            }}
            onDeleteAssignment={async (id) => { await supabase.from("assignments").delete().eq("id", id); fetchAllData(); }}
            onAddStudent={async (s) => { await supabase.from("students").insert([{ id: s.id, name: s.name, class_group: s.classGroup, password: s.password }]); fetchAllData(); }}
            onDeleteStudent={async (id) => { await supabase.from("students").delete().eq("id", id); fetchAllData(); }}
            onUpdateStudent={handleUpdateStudent}
            onUpdateClassGroups={handleUpdateClassGroups}
            onResetData={() => { localStorage.clear(); window.location.reload(); }}
            tutorUsername="Admin" tutorPassword=""
            onUpdateTutorCredentials={async (u, p) => { 
                const { data } = await supabase.from("tutor").select("id").limit(1);
                if (data?.[0]) { await supabase.from("tutor").update({ name: u, password: p }).eq("id", data[0].id); alert("Đã cập nhật!"); }
            }}
          />
        )}
      </main>
      <ConfirmModal isOpen={showSwitchConfirm} title="Đăng xuất?" message="Thoát học viên để vào quyền gia sư." onConfirm={() => { setCurrentStudent(null); localStorage.removeItem("thptqg_logged_student"); setPersona("tutor"); setShowSwitchConfirm(false); }} onCancel={() => setShowSwitchConfirm(false)} />
    </div>
  );
}
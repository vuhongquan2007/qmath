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
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]); // State mới cho điểm danh
  const [isLoading, setIsLoading] = useState(true);

  const [persona, setPersona] = useState<"student" | "tutor">("student");
  const [isTutorAuth, setIsTutorAuth] = useState(false);
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
  const [activeExam, setActiveExam] = useState<Assignment | null>(null);
  const [activeReview, setActiveReview] = useState<{ attempt: ExamAttempt; assignment: Assignment } | null>(null);
  const [showSwitchConfirm, setShowSwitchConfirm] = useState(false);

  const fetchAllData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [asmRes, stdRes, attRes, clsRes, attendanceRes] = await Promise.all([
        supabase.from("assignments").select("*").order('created_date', { ascending: false }),
        supabase.from("students").select("*"),
        supabase.from("attempts").select("*"),
        supabase.from("class_groups").select("*"),
        supabase.from("attendance").select("*").order('date', { ascending: false }) // Tải dữ liệu điểm danh
      ]);

      if (asmRes.data && asmRes.data.length > 0) {
        setAssignments(asmRes.data.map(i => ({
          ...i, 
          id: String(i.id), 
          examType: i.exam_type,
          // VẤN ĐỀ 1: CHỈ LẤY NGÀY THÁNG NĂM (YYYY-MM-DD)
          createdDate: i.created_date ? i.created_date.split('T')[0] : new Date().toISOString().split('T')[0],
          partIQuestions: i.part_i_questions || [], 
          partIIQuestions: i.part_ii_questions || [], 
          partIIIQuestions: i.part_iii_questions || []
        })));
      } else { setAssignments(DEFAULT_ASSIGNMENTS); }

      if (clsRes.data) setClassGroups(clsRes.data);
      if (stdRes.data) setStudents(stdRes.data.map(i => ({ ...i, id: String(i.id), classGroup: i.class_group })));
      else { setStudents(DEFAULT_STUDENTS); }
      
      if (attendanceRes.data) setAttendanceRecords(attendanceRes.data);

      if (attRes.data) {
        setAttempts(attRes.data.map(i => ({
          ...i, id: String(i.id), assignmentId: String(i.assignment_id), studentId: String(i.student_id)
        })));
      }
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

  const handleTutorLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as any;
    const { data } = await supabase.from("tutor").select("*").eq("name", form[0].value).eq("password", form[1].value).single();
    if (data) { setIsTutorAuth(true); localStorage.setItem("qmath_tutor_auth", "true"); } else { alert("Sai thông tin!"); }
  };

  // VẤN ĐỀ 2: THÊM DÒNG CHỮ "ĐANG TẢI DỮ LIỆU"
  if (isLoading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50">
      <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
      <p className="text-slate-600 font-bold animate-pulse">Đang tải dữ liệu...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b sticky top-0 z-40 h-16 flex items-center shadow-sm px-4">
        <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
          <div className="flex items-center gap-2"><Layers size={20}/><span className="font-black">QMATH HUB</span></div>
          <div className="flex items-center gap-4">
            <div className="flex p-1 bg-slate-100 rounded-xl border">
              <button onClick={() => { setPersona("student"); localStorage.setItem("qmath_persona", "student"); }} className={`px-4 py-1.5 rounded-lg text-xs font-bold ${persona === "student" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"}`}>Học viên</button>
              <button onClick={() => { if(currentStudent) setShowSwitchConfirm(true); else { setPersona("tutor"); localStorage.setItem("qmath_persona", "tutor"); } }} className={`px-4 py-1.5 rounded-lg text-xs font-bold ${persona === "tutor" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"}`}>Gia sư</button>
            </div>
            {isTutorAuth && persona === "tutor" && (
              <button onClick={() => { setIsTutorAuth(false); localStorage.removeItem("qmath_tutor_auth"); setPersona("student"); }} className="p-2 text-rose-500"><LogOut size={20}/></button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        {activeExam ? (
          <ExamTaker assignment={activeExam} studentId={currentStudent?.id || ""} onSubmit={() => {}} onCancel={() => setActiveExam(null)} />
        ) : activeReview ? (
          <ExamReview attempt={activeReview.attempt} assignment={activeReview.assignment} student={currentStudent!} onClose={() => setActiveReview(null)} />
        ) : persona === "student" ? (
          <StudentDashboard
            students={students} assignments={assignments} attempts={attempts} classGroups={classGroups}
            onStartExam={setActiveExam} onViewReview={(att, ass) => setActiveReview({ attempt: att, assignment: ass })}
            currentStudent={currentStudent} onLogin={(s) => { setCurrentStudent(s); localStorage.setItem("thptqg_logged_student", JSON.stringify(s)); }}
            onLogout={() => { setCurrentStudent(null); localStorage.removeItem("thptqg_logged_student"); }}
            onUpdateStudent={() => {}}
          />
        ) : !isTutorAuth ? (
          <div className="max-w-md mx-auto my-12 bg-white rounded-[2.5rem] border shadow-2xl p-10 text-center font-sans">
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
                  ...a, exam_type: a.examType, part_i_questions: a.partIQuestions, part_ii_questions: a.partIIQuestions, part_iii_questions: a.partIIIQuestions,
                  created_date: new Date().toISOString() 
                }]); 
                fetchAllData(); 
            }}
            onDeleteAssignment={async (id) => { await supabase.from("assignments").delete().eq("id", id); fetchAllData(); }}
            onAddStudent={async (s) => { await supabase.from("students").insert([{ ...s, class_group: s.classGroup }]); fetchAllData(); }}
            onDeleteStudent={async (id) => { await supabase.from("students").delete().eq("id", id); fetchAllData(); }}
            onUpdateStudent={async (s) => { await supabase.from("students").update({ name: s.name, class_group: s.classGroup, password: s.password }).eq("id", s.id); fetchAllData(); }}
            onUpdateClassGroups={async (groups) => {
                const next = typeof groups === "function" ? groups(classGroups) : groups;
                await supabase.from("class_groups").upsert(next.map(g => ({ id: g.id, name: g.name, description: g.description, lectures: g.lectures })));
                fetchAllData();
            }}
            // VẤN ĐỀ 3: LOGIC ĐIỂM DANH HỌC SINH
            attendanceRecords={attendanceRecords}
            onCreateAttendance={async (classId, studentsInClass) => {
                const newRecord = {
                    id: "att_" + Date.now(),
                    class_id: classId,
                    date: new Date().toISOString(),
                    record_data: studentsInClass.map(s => ({ studentId: s.id, name: s.name, status: 'present' }))
                };
                await supabase.from("attendance").insert([newRecord]);
                fetchAllData();
            }}
            onUpdateAttendance={async (recordId, updatedData) => {
                await supabase.from("attendance").update({ record_data: updatedData }).eq("id", recordId);
                fetchAllData();
            }}
            onResetData={() => { localStorage.clear(); window.location.reload(); }}
            tutorUsername="Admin" onUpdateTutorCredentials={() => {}}
          />
        )}
      </main>

      <ConfirmModal
        isOpen={showSwitchConfirm} title="Đăng xuất học viên?" message="Thoát Student để vào Tutor."
        onConfirm={() => { setCurrentStudent(null); localStorage.removeItem("thptqg_logged_student"); setPersona("tutor"); setShowSwitchConfirm(false); }}
        onCancel={() => setShowSwitchConfirm(false)}
      />
    </div>
  );
}
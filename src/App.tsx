import { useState, useEffect } from "react";
import { Assignment, Student, ExamAttempt, ClassGroup } from "./types";
import { DEFAULT_STUDENTS, DEFAULT_ASSIGNMENTS, DEFAULT_ATTEMPTS } from "./data/sampleExams";
import StudentDashboard from "./components/StudentDashboard";
import TutorDashboard from "./components/TutorDashboard";
import ExamTaker from "./components/ExamTaker";
import ExamReview from "./components/ExamReview";
import ConfirmModal from "./components/ConfirmModal";
import { GraduationCap, Users, Layers } from "lucide-react";
import { saveStateToStorage, getLargeFile } from "./utils/largeStorage";

import { supabase } from "./utils/supabaseClient";

export default function App() {
  // 1. Core States (Đồng bộ trực tiếp qua Supabase)
  const [assignments, setAssignments] = useState<Assignment[]>(DEFAULT_ASSIGNMENTS);
  const [students, setStudents] = useState<Student[]>(DEFAULT_STUDENTS);
  const [attempts, setAttempts] = useState<ExamAttempt[]>(DEFAULT_ATTEMPTS);
  const [classGroups, setClassGroups] = useState<ClassGroup[]>([
    {
      id: "class_12A1",
      name: "12A1",
      description: "Lớp 12A1 - Toán nâng cao HSA & TSA",
      lectures: [
        {
          id: "lec_1",
          title: "Bài giảng Chuyên đề Khảo sát Sự biến thiên & Đồ thị Hàm số",
          fileName: "chuyen_de_khao_sat_ham_so.pdf",
          fileData: "demo_lecture_pdf",
          uploadedAt: "2026-07-15"
        },
        {
          id: "lec_2",
          title: "Tài liệu lý thuyết Tích phân và Ứng dụng thực tế",
          fileName: "ly_thuyet_tich_phan_toan_12.docx",
          fileData: "demo_lecture_word",
          uploadedAt: "2026-07-18"
        }
      ]
    },
    {
      id: "class_12A2",
      name: "12A2",
      description: "Lớp 12A2 - Toán cơ bản THPTQG",
      lectures: [
        {
          id: "lec_3",
          title: "Hướng dẫn giải nhanh Toán trắc nghiệm tốt nghiệp THPT",
          fileName: "giai_nhanh_trac_nghiem_thpt.pdf",
          fileData: "demo_lecture_pdf_thpt",
          uploadedAt: "2026-07-19"
        }
      ]
    }
  ]);

  // Load toàn bộ dữ liệu từ Supabase khi khởi động app
  useEffect(() => {
    async function fetchAllDataFromSupabase() {
      try {
        // 1. Tải assignments
        const { data: asmData, error: asmError } = await supabase.from("assignments").select("*");
        if (!asmError && asmData && asmData.length > 0) {
          setAssignments(asmData.map((item: any) => ({
            id: String(item.id),
            title: item.title,
            subject: item.subject,
            duration: item.duration,
            questions: item.questions || []
          })));
        }

        // 2. Tải students
        const { data: stdData, error: stdError } = await supabase.from("students").select("*");
        if (!stdError && stdData && stdData.length > 0) {
          setStudents(stdData.map((item: any) => ({
            id: String(item.id),
            name: item.name,
            email: item.email,
            phone: item.phone,
            classGroup: item.class_group || item.classGroup
          })));
        }

        // 3. Tải attempts
        const { data: attData, error: attError } = await supabase.from("attempts").select("*");
        if (!attError && attData && attData.length > 0) {
          setAttempts(attData.map((item: any) => ({
            id: String(item.id),
            assignmentId: String(item.assignment_id || item.assignmentId),
            studentId: String(item.student_id || item.studentId),
            score: item.score,
            totalQuestions: item.total_questions || item.totalQuestions,
            correctCount: item.correct_count || item.correctCount,
            answers: item.answers || {},
            submittedAt: item.submitted_at || item.submittedAt
          })));
        }

        // 4. Tải class_groups
        const { data: clsData, error: clsError } = await supabase.from("class_groups").select("*");
        if (!clsError && clsData && clsData.length > 0) {
          setClassGroups(clsData.map((item: any) => ({
            id: String(item.id),
            name: item.name,
            description: item.description,
            lectures: item.lectures || []
          })));
        }
      } catch (err) {
        console.error("Lỗi khi đồng bộ dữ liệu từ Supabase:", err);
      }
    }

    fetchAllDataFromSupabase();
  }, []);

  // 2. Navigation & User Persona State
  const [persona, setPersona] = useState<"student" | "tutor">("student");
  
  const [tutorUsername, setTutorUsername] = useState<string>(() => {
    return localStorage.getItem("qmath_tutor_username") || "Quan.VHTutor";
  });
  const [tutorPassword, setTutorPassword] = useState<string>(() => {
    return localStorage.getItem("qmath_tutor_password") || "tutor123";
  });
  const [isTutorAuth, setIsTutorAuth] = useState<boolean>(() => {
    return localStorage.getItem("qmath_tutor_auth") === "true" || sessionStorage.getItem("qmath_tutor_auth") === "true";
  });
  const [tutorRememberMe, setTutorRememberMe] = useState<boolean>(() => {
    return localStorage.getItem("qmath_tutor_remember_me") !== "false";
  });

  const handleUpdateTutorCredentials = async (newUsername: string, newPass: string) => {
    try {
      const { data: tutorsData, error: fetchError } = await supabase
        .from("tutor")
        .select("id")
        .limit(1);

      if (fetchError || !tutorsData || tutorsData.length === 0) {
        alert("Không tìm thấy tài khoản gia sư trên Supabase!");
        return;
      }

      const tutorId = tutorsData[0].id;

      const { error: updateError } = await supabase
        .from("tutor")
        .update({ name: newUsername, password: newPass })
        .eq("id", tutorId);

      if (updateError) {
        console.error("Lỗi cập nhật mật khẩu lên Supabase:", updateError);
        alert("Không thể cập nhật mật khẩu lên mây!");
        return;
      }

      setTutorUsername(newUsername);
      setTutorPassword(newPass);
      alert("Đổi thông tin đăng nhập thành công trên Supabase!");
    } catch (err) {
      console.error(err);
      alert("Đã xảy ra lỗi khi kết nối Supabase.");
    }
  };

  const [tutorLoginUsernameInput, setTutorLoginUsernameInput] = useState("");
  const [tutorLoginPasswordInput, setTutorLoginPasswordInput] = useState("");
  const [tutorLoginError, setTutorLoginError] = useState("");
  
  const [currentStudent, setCurrentStudent] = useState<Student | null>(() => {
    const saved = localStorage.getItem("thptqg_logged_student");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return null;
  });

  // 3. Active Session Screens
  const [activeExam, setActiveExam] = useState<Assignment | null>(null);
  const [activeReview, setActiveReview] = useState<{ attempt: ExamAttempt; assignment: Assignment } | null>(null);
  const [showSwitchPersonaConfirm, setShowSwitchPersonaConfirm] = useState(false);

  // Backup lưu bộ nhớ đệm cục bộ cho các tệp dung lượng lớn (IndexedDB)
  useEffect(() => {
    saveStateToStorage(assignments, classGroups);
  }, [assignments, classGroups]);

  // Load heavy file data từ IndexedDB trên thiết bị
  useEffect(() => {
    let active = true;

    async function loadHeavyData() {
      try {
        const loadedAssignments = await Promise.all(
          assignments.map(async (asm) => {
            if (asm.fileData && asm.fileData.startsWith("IndexedDB:")) {
              const fileKey = asm.fileData.replace("IndexedDB:", "");
              const data = await getLargeFile(fileKey);
              if (data && active) {
                return { ...asm, fileData: data };
              }
            }
            return asm;
          })
        );

        const loadedClassGroups = await Promise.all(
          classGroups.map(async (cg) => {
            const loadedLectures = await Promise.all(
              (cg.lectures || []).map(async (lec) => {
                if (lec.fileData && lec.fileData.startsWith("IndexedDB:")) {
                  const fileKey = lec.fileData.replace("IndexedDB:", "");
                  const data = await getLargeFile(fileKey);
                  if (data && active) {
                    return { ...lec, fileData: data };
                  }
                }
                return lec;
              })
            );
            return { ...cg, lectures: loadedLectures };
          })
        );

        if (active) {
          let assignmentsChanged = false;
          for (let i = 0; i < loadedAssignments.length; i++) {
            if (loadedAssignments[i].fileData !== assignments[i].fileData) {
              assignmentsChanged = true;
              break;
            }
          }

          let classGroupsChanged = false;
          for (let i = 0; i < loadedClassGroups.length; i++) {
            const origLectures = classGroups[i].lectures || [];
            const loadedLectures = loadedClassGroups[i].lectures || [];
            if (origLectures.length !== loadedLectures.length) {
              classGroupsChanged = true;
              break;
            }
            for (let j = 0; j < loadedLectures.length; j++) {
              if (loadedLectures[j].fileData !== origLectures[j].fileData) {
                classGroupsChanged = true;
                break;
              }
            }
          }

          if (assignmentsChanged) setAssignments(loadedAssignments);
          if (classGroupsChanged) setClassGroups(loadedClassGroups);
        }
      } catch (err) {
        console.error("Error loading heavy data:", err);
      }
    }

    loadHeavyData();
    return () => { active = false; };
  }, []);

  const handleStudentLogin = (student: Student) => {
    setCurrentStudent(student);
    localStorage.setItem("thptqg_logged_student", JSON.stringify(student));
  };

  const handleStudentLogout = () => {
    setCurrentStudent(null);
    localStorage.removeItem("thptqg_logged_student");
    setActiveReview(null);
  };

  // --- CÁC HÀM THAO TÁC ĐỒNG BỘ TRỰC TIẾP LÊN SUPABASE ---

  const handleAddAssignment = async (newAssignment: Assignment) => {
    try {
      const { data, error } = await supabase
        .from("assignments")
        .insert([{
          title: newAssignment.title,
          subject: newAssignment.subject,
          duration: newAssignment.duration,
          questions: newAssignment.questions
        }])
        .select();

      if (error) {
        console.error("Lỗi thêm assignment:", error);
        return;
      }

      if (data && data[0]) {
        const created: Assignment = {
          ...newAssignment,
          id: String(data[0].id)
        };
        setAssignments((prev) => [created, ...prev]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAssignment = async (id: string) => {
    try {
      await supabase.from("assignments").delete().eq("id", id);
      await supabase.from("attempts").delete().eq("assignment_id", id);

      setAssignments((prev) => prev.filter((a) => a.id !== id));
      setAttempts((prev) => prev.filter((att) => att.assignmentId !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddStudent = async (newStudent: Student) => {
    try {
      const { data, error } = await supabase
        .from("students")
        .insert([{
          name: newStudent.name,
          email: newStudent.email,
          phone: newStudent.phone,
          class_group: newStudent.classGroup
        }])
        .select();

      if (error) {
        console.error("Lỗi thêm student:", error);
        return;
      }

      if (data && data[0]) {
        const created: Student = {
          ...newStudent,
          id: String(data[0].id)
        };
        setStudents((prev) => [...prev, created]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteStudent = async (id: string) => {
    try {
      await supabase.from("students").delete().eq("id", id);
      setStudents((prev) => prev.filter((s) => s.id !== id));
      if (currentStudent && currentStudent.id === id) {
        handleStudentLogout();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateStudent = async (updatedStudent: Student) => {
    try {
      await supabase
        .from("students")
        .update({
          name: updatedStudent.name,
          email: updatedStudent.email,
          phone: updatedStudent.phone,
          class_group: updatedStudent.classGroup
        })
        .eq("id", updatedStudent.id);

      setStudents((prev) => prev.map((s) => s.id === updatedStudent.id ? updatedStudent : s));
      if (currentStudent && currentStudent.id === updatedStudent.id) {
        setCurrentStudent(updatedStudent);
        localStorage.setItem("thptqg_logged_student", JSON.stringify(updatedStudent));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleExamSubmit = async (newAttempt: ExamAttempt) => {
    try {
      const { data, error } = await supabase
        .from("attempts")
        .insert([{
          assignment_id: newAttempt.assignmentId,
          student_id: newAttempt.studentId,
          score: newAttempt.score,
          total_questions: newAttempt.totalQuestions,
          correct_count: newAttempt.correctCount,
          answers: newAttempt.answers,
          submitted_at: newAttempt.submittedAt
        }])
        .select();

      if (!error && data && data[0]) {
        const savedAttempt: ExamAttempt = {
          ...newAttempt,
          id: String(data[0].id)
        };
        setAttempts((prev) => [...prev, savedAttempt]);
        setActiveExam(null);
        
        const assign = assignments.find((a) => a.id === newAttempt.assignmentId);
        if (assign) {
          setActiveReview({ attempt: savedAttempt, assignment: assign });
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSwitchPersona = (target: "student" | "tutor") => {
    if (target === "tutor") {
      if (currentStudent) {
        setShowSwitchPersonaConfirm(true);
      } else {
        setPersona("tutor");
        setActiveReview(null);
      }
    } else {
      setPersona("student");
      setActiveReview(null);
    }
  };

  const handleSystemReset = () => {
    localStorage.clear();
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* 1. PRIMARY SYSTEM HEADER */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            {/* Left: Branding */}
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-100">
                <Layers size={20} className="stroke-[2.5]" />
              </div>
              <div>
                <span className="text-xs font-black uppercase tracking-widest text-indigo-600 leading-none block">QMath</span>
                <h1 className="text-sm font-black text-slate-800 tracking-tight leading-none mt-0.5">MATH HUB</h1>
              </div>
            </div>

            {/* Right: Mode Switcher */}
            {!activeExam && (
              <div className="flex items-center gap-3">
                <div className="flex p-0.5 bg-slate-100 rounded-xl border border-slate-200/40">
                  <button
                    id="tab-student-persona"
                    onClick={() => handleSwitchPersona("student")}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-black transition-all ${
                      persona === "student"
                        ? "bg-white text-indigo-700 shadow-xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Users size={13} />
                    Student
                  </button>
                  <button
                    id="tab-tutor-persona"
                    onClick={() => handleSwitchPersona("tutor")}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-black transition-all ${
                      persona === "tutor"
                        ? "bg-white text-indigo-700 shadow-xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <GraduationCap size={14} />
                    Tutor
                  </button>
                </div>

                {persona === "tutor" && isTutorAuth && (
                  <button
                    onClick={() => {
                      setIsTutorAuth(false);
                      localStorage.removeItem("qmath_tutor_auth");
                      sessionStorage.removeItem("qmath_tutor_auth");
                    }}
                    className="px-3 py-1.5 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1"
                    title="Khóa cổng quản trị Tutor"
                  >
                    Khóa Tutor
                  </button>
                )}
              </div>
            )}

          </div>
        </div>
      </header>

      {/* 2. MAIN HUB SHELL */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        
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
            onStartExam={(assign) => setActiveExam(assign)}
            onViewReview={(attempt, assign) => setActiveReview({ attempt, assignment: assign })}
            currentStudent={currentStudent}
            onLogin={handleStudentLogin}
            onLogout={handleStudentLogout}
            onUpdateStudent={handleUpdateStudent}
          />
        ) : !isTutorAuth ? (
          <div className="max-w-md mx-auto my-12 bg-white rounded-3xl border border-slate-200/80 shadow-xl p-8 space-y-6">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-indigo-100">
                <GraduationCap size={28} />
              </div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Đăng Nhập Cổng Tutor</h2>
              <p className="text-xs text-slate-500 font-medium">Bạn đang truy cập Cổng Quản Trị dành riêng cho Gia sư & Admin</p>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              setTutorLoginError("");
              
              try {
                const { data, error } = await supabase
                  .from("tutor")
                  .select("*")
                  .eq("name", tutorLoginUsernameInput.trim())
                  .eq("password", tutorLoginPasswordInput)
                  .single();

                if (error || !data) {
                  setTutorLoginError("ID đăng nhập hoặc mật khẩu không chính xác!");
                  return;
                }

                setIsTutorAuth(true);
                setTutorUsername(data.name);

                if (tutorRememberMe) {
                  localStorage.setItem("qmath_tutor_auth", "true");
                  localStorage.setItem("qmath_tutor_remember_me", "true");
                } else {
                  sessionStorage.setItem("qmath_tutor_auth", "true");
                  localStorage.removeItem("qmath_tutor_auth");
                  localStorage.setItem("qmath_tutor_remember_me", "false");
                }
                setTutorLoginUsernameInput("");
                setTutorLoginPasswordInput("");
              } catch (err) {
                console.error(err);
                setTutorLoginError("Lỗi kết nối tới cơ sở dữ liệu Supabase!");
              }
            }} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="tutor-login-id" className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  ID Đăng Nhập:
                </label>
                <input
                  id="tutor-login-id"
                  type="text"
                  value={tutorLoginUsernameInput}
                  onChange={(e) => setTutorLoginUsernameInput(e.target.value)}
                  placeholder="Nhập ID..."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-semibold transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="tutor-login-password" className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Mật Khẩu Cổng Tutor:
                </label>
                <input
                  id="tutor-login-password"
                  type="password"
                  value={tutorLoginPasswordInput}
                  onChange={(e) => setTutorLoginPasswordInput(e.target.value)}
                  placeholder="Nhập mật khẩu..."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-semibold transition-all"
                />
              </div>

              <div className="flex items-center justify-between py-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={tutorRememberMe}
                    onChange={(e) => setTutorRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                  />
                  <span className="text-xs text-slate-500 font-bold">Ghi nhớ đăng nhập</span>
                </label>
              </div>

              {tutorLoginError && (
                <div className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-150 p-3 rounded-xl leading-relaxed">
                  {tutorLoginError}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-md shadow-indigo-100 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                Xác Thực Đăng Nhập
              </button>
            </form>
          </div>
        ) : (
          <TutorDashboard
            students={students}
            assignments={assignments}
            attempts={attempts}
            classGroups={classGroups}
            onUpdateClassGroups={setClassGroups}
            onAddAssignment={handleAddAssignment}
            onDeleteAssignment={handleDeleteAssignment}
            onAddStudent={handleAddStudent}
            onDeleteStudent={handleDeleteStudent}
            onUpdateStudent={handleUpdateStudent}
            onResetData={handleSystemReset}
            tutorUsername={tutorUsername}
            tutorPassword={tutorPassword}
            onUpdateTutorCredentials={handleUpdateTutorCredentials}
          />
        )}

      </main>

      {/* 3. FOOTER */}
      {!activeExam && (
        <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-400 font-medium">
          <div className="max-w-7xl mx-auto px-4">
            <p>© {new Date().getFullYear()} QMath Math Hub. Nền tảng luyện đề và theo dõi kết quả học tập thông minh.</p>
            <p className="mt-1 text-[10px] text-slate-300">Tính toán cấu trúc đề thi đa dạng HSA, TSA, QDA, THPTQG, BCA thời gian thực.</p>
          </div>
        </footer>
      )}

      {/* Switch Persona Confirm Modal */}
      <ConfirmModal
        isOpen={showSwitchPersonaConfirm}
        title="Đăng xuất Học Sinh"
        message="Bạn đang đăng nhập dưới quyền Student. Bạn cần đăng xuất khỏi tài khoản Student để truy cập cổng quản trị Tutor. Bạn có muốn tiếp tục?"
        confirmText="Đăng xuất & Tiếp tục"
        cancelText="Hủy"
        onConfirm={() => {
          handleStudentLogout();
          setPersona("tutor");
          setActiveReview(null);
          setShowSwitchPersonaConfirm(false);
        }}
        onCancel={() => setShowSwitchPersonaConfirm(false)}
      />
    </div>
  );
}
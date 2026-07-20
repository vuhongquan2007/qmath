import { useState, useEffect } from "react";
import { Assignment, Student, ExamAttempt, ClassGroup } from "./types";
import { DEFAULT_STUDENTS, DEFAULT_ASSIGNMENTS, DEFAULT_ATTEMPTS } from "./data/sampleExams";
import StudentDashboard from "./components/StudentDashboard";
import TutorDashboard from "./components/TutorDashboard";
import ExamTaker from "./components/ExamTaker";
import ExamReview from "./components/ExamReview";
import ConfirmModal from "./components/ConfirmModal";
import { GraduationCap, Users, BookOpen, Layers, BarChart } from "lucide-react";
import { saveStateToStorage, getLargeFile } from "./utils/largeStorage";

export default function App() {
  // 1. Core Persistent States via localStorage
  const [assignments, setAssignments] = useState<Assignment[]>(() => {
    const saved = localStorage.getItem("thptqg_assignments");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return DEFAULT_ASSIGNMENTS;
  });

  const [students, setStudents] = useState<Student[]>(() => {
    const saved = localStorage.getItem("thptqg_students");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return DEFAULT_STUDENTS;
  });

  const [attempts, setAttempts] = useState<ExamAttempt[]>(() => {
    const saved = localStorage.getItem("thptqg_attempts");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return DEFAULT_ATTEMPTS;
  });

  const [classGroups, setClassGroups] = useState<ClassGroup[]>(() => {
    const saved = localStorage.getItem("thptqg_class_groups");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [
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
    ];
  });

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

  const handleUpdateTutorCredentials = (newUsername: string, newPass: string) => {
    setTutorUsername(newUsername);
    setTutorPassword(newPass);
    localStorage.setItem("qmath_tutor_username", newUsername);
    localStorage.setItem("qmath_tutor_password", newPass);
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

  // Sync state modifications back to local storage (assignments and class groups use safe IndexedDB storage for large files)
  useEffect(() => {
    saveStateToStorage(assignments, classGroups);
  }, [assignments, classGroups]);

  useEffect(() => {
    localStorage.setItem("thptqg_students", JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    localStorage.setItem("thptqg_attempts", JSON.stringify(attempts));
  }, [attempts]);

  // Load heavy file data from IndexedDB on startup
  useEffect(() => {
    let active = true;

    async function loadHeavyData() {
      try {
        // Load assignments fileData
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

        // Load class lectures fileData
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

          if (assignmentsChanged) {
            setAssignments(loadedAssignments);
          }
          if (classGroupsChanged) {
            setClassGroups(loadedClassGroups);
          }
        }
      } catch (err) {
        console.error("Error loading heavy data on startup:", err);
      }
    }

    loadHeavyData();

    return () => {
      active = false;
    };
  }, []);

  // Handle active student login
  const handleStudentLogin = (student: Student) => {
    setCurrentStudent(student);
    localStorage.setItem("thptqg_logged_student", JSON.stringify(student));
  };

  const handleStudentLogout = () => {
    setCurrentStudent(null);
    localStorage.removeItem("thptqg_logged_student");
    setActiveReview(null);
  };

  // State handlers for additions & deletions (triggered by Teacher Dashboard)
  const handleAddAssignment = (newAssignment: Assignment) => {
    setAssignments((prev) => [newAssignment, ...prev]);
  };

  const handleDeleteAssignment = (id: string) => {
    setAssignments((prev) => prev.filter((a) => a.id !== id));
    // Purge associated attempts if necessary
    setAttempts((prev) => prev.filter((att) => att.assignmentId !== id));
  };

  const handleAddStudent = (newStudent: Student) => {
    setStudents((prev) => [...prev, newStudent]);
  };

  const handleDeleteStudent = (id: string) => {
    setStudents((prev) => prev.filter((s) => s.id !== id));
    // If deleted student is current, log out
    if (currentStudent && currentStudent.id === id) {
      handleStudentLogout();
    }
  };

  const handleUpdateStudent = (updatedStudent: Student) => {
    setStudents((prev) => prev.map((s) => s.id === updatedStudent.id ? updatedStudent : s));
    if (currentStudent && currentStudent.id === updatedStudent.id) {
      setCurrentStudent(updatedStudent);
      localStorage.setItem("thptqg_logged_student", JSON.stringify(updatedStudent));
    }
  };

  // Exam Attempt submit
  const handleExamSubmit = (newAttempt: ExamAttempt) => {
    setAttempts((prev) => [...prev, newAttempt]);
    setActiveExam(null);
    // Automatically launch results overview after submit!
    const assign = assignments.find((a) => a.id === newAttempt.assignmentId);
    if (assign) {
      setActiveReview({ attempt: newAttempt, assignment: assign });
    }
  };

  // Handle switching between student and tutor role
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

  // Full System Reset Data
  const handleSystemReset = () => {
    localStorage.clear();
    setAssignments(DEFAULT_ASSIGNMENTS);
    setStudents(DEFAULT_STUDENTS);
    setAttempts(DEFAULT_ATTEMPTS);
    setClassGroups([
      {
        id: "class_12A1",
        name: "12A1",
        description: "Lớp 12A1 - Ôn thi Toán nâng cao HSA & TSA",
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
    setCurrentStudent(null);
    setActiveExam(null);
    setActiveReview(null);
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

            {/* Right: Mode Switcher (Hide entirely if student is actively taking an exam) */}
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
        
        {/* Scenario A: Student taking an active Exam */}
        {activeExam && currentStudent ? (
          <ExamTaker
            assignment={activeExam}
            studentId={currentStudent.id}
            onSubmit={handleExamSubmit}
            onCancel={() => setActiveExam(null)}
          />
        ) : activeReview && currentStudent ? (
          /* Scenario B: Student reviewing completed score & steps */
          <ExamReview
            attempt={activeReview.attempt}
            assignment={activeReview.assignment}
            student={currentStudent}
            onClose={() => setActiveReview(null)}
          />
        ) : persona === "student" ? (
          /* Scenario C: Student landing screen / Authentication Gate */
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
          /* Scenario D-1: Tutor Security Authentication ID & Password Gate */
          <div className="max-w-md mx-auto my-12 bg-white rounded-3xl border border-slate-200/80 shadow-xl p-8 space-y-6">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-indigo-100">
                <GraduationCap size={28} />
              </div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Đăng Nhập Cổng Tutor</h2>
              <p className="text-xs text-slate-500 font-medium">Bạn đang truy cập Cổng Quản Trị dành riêng cho Gia sư & Admin</p>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              setTutorLoginError("");
              if (tutorLoginUsernameInput.trim() === tutorUsername && tutorLoginPasswordInput === tutorPassword) {
                setIsTutorAuth(true);
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
              } else {
                setTutorLoginError("ID đăng nhập hoặc mật khẩu không chính xác!");
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

            {/* Footer space removed */}
          </div>
        ) : (
          /* Scenario D-2: Authenticated Tutor Management Panel */
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

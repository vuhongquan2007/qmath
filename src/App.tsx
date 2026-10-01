import { useState, useEffect, useCallback } from "react";
import type { FormEvent } from "react";
import { GraduationCap, Users, Loader2, Lock, ArrowRight, ArrowUpRight, BookOpen, FileText, BarChart3, LogOut } from "lucide-react";
import { supabase } from "./utils/supabaseClient";
import { Assignment, Student, ExamAttempt, ClassGroup } from "./types";
import StudentDashboard from "./components/StudentDashboard";
import TutorDashboard from "./components/TutorDashboard";
import ExamTaker from "./components/ExamTaker";
import ExamReview from "./components/ExamReview";
import ConfirmModal from "./components/ConfirmModal";

type AppRoute = "home" | "login" | "portal";
type Persona = "student" | "tutor";

const getRouteFromPath = (): AppRoute => {
  if (window.location.pathname === "/login") return "login";
  if (window.location.pathname === "/portal") return "portal";
  return "home";
};

interface AppNavbarProps {
  isAuthenticated: boolean;
  persona: Persona;
  studentName?: string;
  isExamActive: boolean;
  onHome: () => void;
  onOpenPortal: () => void;
  onLogin: () => void;
  onLogout: () => void;
}

function AppNavbar({ isAuthenticated, persona, studentName, isExamActive, onHome, onOpenPortal, onLogin, onLogout }: AppNavbarProps) {
  return (
    <header className="qmath-topbar">
      <div className="qmath-topbar__inner">
        <button className="qmath-brand" type="button" onClick={onHome} disabled={isExamActive}>
          <img className="qmath-brand__image" src="/logo.png" alt="QMath" />
        </button>
        <nav className="qmath-public-nav" aria-label="Tính năng">
          <button type="button" onClick={onOpenPortal} disabled={isExamActive}>Thi Thử</button>
          <button type="button" onClick={onOpenPortal} disabled={isExamActive}>Kết Quả</button>
          <button type="button" onClick={onOpenPortal} disabled={isExamActive}>Tài Liệu</button>
        </nav>
        <div className="qmath-topbar__actions">
          {isAuthenticated && (
            <span className="qmath-session-name">
              {persona === "student" ? studentName : "Gia sư"}
            </span>
          )}
          {isAuthenticated ? (
            <button
              type="button"
              className="qmath-header-action qmath-header-action--quiet"
              onClick={onLogout}
              disabled={isExamActive}
              aria-label="Đăng xuất"
              title="Đăng xuất"
            >
              <LogOut size={16} />
            </button>
          ) : (
            <button type="button" className="qmath-header-action" onClick={onLogin}>
              Đăng nhập <ArrowRight size={15} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

interface LandingPageProps {
  onOpenPortal: () => void;
  onLogin: () => void;
}

function LandingPage({ onOpenPortal, onLogin }: LandingPageProps) {
  return (
    <div className="qmath-home">
      <section className="qmath-home-hero">
        <div className="qmath-home-copy">
          <h1>QMath Hub</h1>
          <p className="qmath-home-lead">Học có lộ trình. Luyện tập đúng trọng tâm. Tiến bộ qua từng lần thử.</p>
          <p className="qmath-home-description">Một cổng học tập dành cho học viên và gia sư, kết nối đề thi, kết quả và tài liệu trong cùng một không gian.</p>
          <div className="qmath-home-actions">
            <button type="button" className="qmath-primary-action" onClick={onOpenPortal}>
              Khám phá không gian học <ArrowRight size={17} />
            </button>
            <button type="button" className="qmath-text-action" onClick={onLogin}>
              Đăng nhập <ArrowUpRight size={16} />
            </button>
          </div>
          <div className="qmath-home-proof">
            <span className="qmath-proof-mark"><Lock size={14} /></span>
            <span>Nội dung học tập riêng tư, dành cho thành viên</span>
          </div>
        </div>
        <img className="qmath-home-hero-image" src="/math-hero.png" alt="" />
      </section>

      <section className="qmath-feature-section" aria-labelledby="qmath-features-title">
        <div className="qmath-section-heading">
          <div>
            <span className="qmath-section-kicker">BẮT ĐẦU TẠI ĐÂY</span>
            <h2 id="qmath-features-title">Một không gian, đủ mọi chặng học</h2>
          </div>
          <p>Đăng nhập để mở khóa các công cụ học tập và nội dung dành riêng cho lớp của bạn.</p>
        </div>
        <div className="qmath-feature-grid">
          <button type="button" className="qmath-feature-link" onClick={onOpenPortal}>
            <span className="qmath-feature-icon"><GraduationCap size={20} /></span>
            <span className="qmath-feature-copy"><strong>Thi Thử</strong><small>Luyện đề theo lịch và mục tiêu học tập.</small></span>
            <Lock size={15} className="qmath-feature-lock" />
          </button>
          <button type="button" className="qmath-feature-link" onClick={onOpenPortal}>
            <span className="qmath-feature-icon"><BarChart3 size={20} /></span>
            <span className="qmath-feature-copy"><strong>Kết Quả</strong><small>Xem lại bài làm và theo dõi tiến bộ.</small></span>
            <Lock size={15} className="qmath-feature-lock" />
          </button>
          <button type="button" className="qmath-feature-link" onClick={onOpenPortal}>
            <span className="qmath-feature-icon"><FileText size={20} /></span>
            <span className="qmath-feature-copy"><strong>Tài Liệu</strong><small>Truy cập bài giảng và tài nguyên lớp học.</small></span>
            <Lock size={15} className="qmath-feature-lock" />
          </button>
        </div>
      </section>
      <footer className="qmath-home-footer"><span>QMath Hub</span><span>Học tập tập trung. Tiến bộ bền vững.</span></footer>
    </div>
  );
}

export default function App() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [classGroups, setClassGroups] = useState<ClassGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [persona, setPersona] = useState<Persona>(() => (localStorage.getItem("qmath_persona") as Persona) || "student");
  const [appRoute, setAppRoute] = useState<AppRoute>(getRouteFromPath);
  const [isTutorAuth, setIsTutorAuth] = useState<boolean>(() => localStorage.getItem("qmath_tutor_auth") === "true");
  const [tutorUsernameInput, setTutorUsernameInput] = useState("");
  const [tutorPasswordInput, setTutorPasswordInput] = useState("");
  const [tutorLoginError, setTutorLoginError] = useState("");
  const [currentStudent, setCurrentStudent] = useState<Student | null>(() => {
    try {
      const saved = localStorage.getItem("thptqg_logged_student");
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const [activeExam, setActiveExam] = useState<Assignment | null>(null);
  const [activeReview, setActiveReview] = useState<{ attempt: ExamAttempt; assignment: Assignment } | null>(null);
  const [showSwitchConfirm, setShowSwitchConfirm] = useState(false);

  const isAuthenticated = persona === "student" ? Boolean(currentStudent) : isTutorAuth;
  const routeForRender = appRoute === "portal" && !isAuthenticated
    ? "login"
    : appRoute === "login" && isAuthenticated
      ? "portal"
      : appRoute;

  const navigateTo = (route: AppRoute) => {
    const path = route === "home" ? "/" : `/${route}`;
    if (window.location.pathname !== path) window.history.pushState({}, "", path);
    setAppRoute(route);
  };

  useEffect(() => {
    const handlePopState = () => setAppRoute(getRouteFromPath());
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (appRoute !== routeForRender) {
      const path = routeForRender === "home" ? "/" : `/${routeForRender}`;
      window.history.replaceState({}, "", path);
      setAppRoute(routeForRender);
    }
  }, [appRoute, routeForRender]);

  const openPortal = () => navigateTo(isAuthenticated ? "portal" : "login");

  const selectPersona = (nextPersona: Persona) => {
    if (nextPersona === "tutor" && currentStudent) {
      setShowSwitchConfirm(true);
      return;
    }
    setPersona(nextPersona);
    localStorage.setItem("qmath_persona", nextPersona);
  };

  const handleTutorLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTutorLoginError("");
    const { data, error } = await supabase.from("tutor").select("*")
      .eq("name", tutorUsernameInput.trim())
      .eq("password", tutorPasswordInput)
      .single();

    if (error || !data) {
      setTutorLoginError("Thông tin đăng nhập chưa chính xác. Vui lòng thử lại.");
      return;
    }

    setIsTutorAuth(true);
    localStorage.setItem("qmath_tutor_auth", "true");
    navigateTo("portal");
  };

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

      // 1. Xử lý Đề thi (Giữ nguyên logic của bạn)
      // 1. Xử lý Đề thi (Đã thêm mapping thời gian)
      if (asmRes.data) {
        setAssignments(asmRes.data.map(i => ({
          ...i,
          id: String(i.id),
          examType: i.exam_type,
          createdDate: i.created_date ? i.created_date.split('T')[0] : "",
          isPublished: i.is_published ?? true,
          partIQuestions: i.part_i_questions || [],
          partIIQuestions: i.part_ii_questions || [],
          partIIIQuestions: i.part_iii_questions || [],
          targetClassId: i.target_class_id || "all",
          fileData: i.file_data || "", 
          fileName: i.file_name || "",
          
          // --- CHỈ GIỮ 2 DÒNG NÀY Ở ĐÂY, XÓA HẾT CÁC DÒNG openTime/closeTime KHÁC TRONG CÙNG KHỐI NÀY ---
          openTime: i.open_time, 
          closeTime: i.close_time
          // ---------------------------------------------------------------------------------------
        })));
      }

      // 2. Xử lý Học sinh (Giữ nguyên logic của bạn)
      if (stdRes.data) {
        setStudents(stdRes.data.map(i => ({
          id: String(i.id), name: i.name, password: i.password, classGroup: i.class_group
        })));
      }

      // 3. Xử lý Bài làm - ĐÃ SỬA ĐỂ FIX LỖI INVALID DATE
      if (attRes.data) {
        setAttempts(attRes.data.map(i => ({
          ...i, 
          id: String(i.id), 
          assignmentId: String(i.assignment_id), 
          studentId: String(i.student_id),
          // QUAN TRỌNG: Chuyển từ submit_time (DB) sang submitTime (Giao diện)
          // Đồng thời lấy ngày hiện tại nếu trong database bị trống
          submitTime: i.submit_time || i.created_at || new Date().toISOString(),
          gradedDetails: i.graded_details || {}
        })));
      }

      // 4. Xử lý Lớp học (Giữ nguyên logic của bạn)
      if (clsRes.data) {
        setClassGroups(clsRes.data.map(i => ({ 
          id: String(i.id), 
          name: i.name, 
          description: i.description || "", 
          lectures: i.lectures || [] 
        })));
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

  // LOGIC NỘP BÀI: GHI ĐÈ LÊN BẢN GHI ĐÃ KHÓA (CHỐNG F5)
  const handleExamSubmit = async (attempt: ExamAttempt) => {
    try {
      if (!currentStudent) return;

      const finalId = `lock_${currentStudent.id}_${attempt.assignmentId}`;

      // 1. Lưu/Cập nhật lên Supabase
      const { error } = await supabase.from("attempts").upsert([{
        id: finalId,
        assignment_id: attempt.assignmentId,
        student_id: attempt.studentId,
        score: attempt.score,
        total_questions: attempt.totalQuestions,
        correct_count: attempt.correctCount,
        answers: attempt.answers,
        submit_time: new Date().toISOString(),
        graded_details: attempt.gradedDetails
      }]);

      if (error) {
        alert("Lỗi nộp bài: " + error.message);
        return;
      }

      // 2. Tắt màn hình làm bài
      setActiveExam(null);

      // 3. Tìm đề thi - CỰC KỲ QUAN TRỌNG: Kiểm tra kỹ xem đề có tồn tại không
      const assignment = assignments.find(a => a.id === attempt.assignmentId);

      if (!assignment) {
        alert("Nộp bài thành công nhưng không tìm thấy dữ liệu đề thi để xem lại.");
        fetchAllData();
        return;
      }

      // 4. Tạo object Attempt "Sạch" để truyền sang Review, tránh thiếu trường gây trắng trang
      const safeAttempt: ExamAttempt = {
        ...attempt,
        id: finalId,
        gradedDetails: attempt.gradedDetails || { 
          scorePartI: 0, scorePartII: 0, scorePartIII: 0, 
          partIResult: {}, partIIDetail: {}, partIIIResult: {} 
        }
      };

      // 5. Mở màn hình Review
      setActiveReview({ attempt: safeAttempt, assignment });
      
      // 6. Đồng bộ dữ liệu
      fetchAllData();

    } catch (err) {
      console.error("Lỗi sập ứng dụng khi nộp bài:", err);
      setActiveExam(null);
      setActiveReview(null); // Trở về màn hình chính nếu có lỗi render
    }
  };

  // Hàm cho phép học viên làm lại bài (Xóa kết quả cũ trên Cloud)
  const handleResetAttempt = async (studentId: string, assignmentId: string) => {
    try {
      // ID chúng ta đặt khi học sinh bắt đầu làm bài là: lock_IDHocSinh_IDDe
      const lockId = `lock_${studentId}_${assignmentId}`;

      const { error } = await supabase
        .from("attempts")
        .delete()
        .eq("id", lockId);

      if (error) {
        alert("Lỗi khi reset: " + error.message);
      } else {
        alert("Đã mở khóa! Học sinh có thể vào làm lại bài thi này.");
        // Sau khi xóa xong phải tải lại dữ liệu để cập nhật danh sách bài làm
        fetchAllData(); 
      }
    } catch (err) {
      console.error("Lỗi Reset bài làm:", err);
    }
  };

  return (
    <div className="qmath-app-shell">
      <AppNavbar
        isAuthenticated={isAuthenticated}
        persona={persona}
        studentName={currentStudent?.name}
        isExamActive={Boolean(activeExam)}
        onHome={() => navigateTo("home")}
        onOpenPortal={openPortal}
        onLogin={() => navigateTo("login")}
        onLogout={() => {
          if (persona === "student") {
            setCurrentStudent(null);
            localStorage.removeItem("thptqg_logged_student");
          } else {
            setIsTutorAuth(false);
            localStorage.removeItem("qmath_tutor_auth");
          }
          navigateTo("home");
        }}
      />

      <main className={`qmath-content${routeForRender === "home" ? " qmath-content--home" : ""}`}>
        {activeExam ? (
          <ExamTaker assignment={activeExam} studentId={currentStudent?.id || ""} onSubmit={handleExamSubmit} onCancel={() => setActiveExam(null)} />
        ) : activeReview ? (
          <ExamReview attempt={activeReview.attempt} assignment={activeReview.assignment} student={currentStudent!} onClose={() => setActiveReview(null)} />
        ) : routeForRender === "home" ? (
          <LandingPage onOpenPortal={openPortal} onLogin={() => navigateTo("login")} />
        ) : routeForRender === "login" ? (
          <section className="qmath-auth-layout">
            <div className="qmath-auth-intro">
              <span className="qmath-section-kicker">CỔNG THÀNH VIÊN</span>
              <h1>Tiếp tục hành trình học tập</h1>
              <p>Đăng nhập để truy cập đề thi, kết quả và học liệu được gia sư chia sẻ.</p>
              <button type="button" className="qmath-back-link" onClick={() => navigateTo("home")}>← Trở về trang chủ</button>
            </div>
            <div className="qmath-auth-panel">
              <div className="qmath-auth-role-tabs" role="tablist" aria-label="Loại tài khoản">
                <button type="button" role="tab" aria-selected={persona === "student"} onClick={() => selectPersona("student")}>
                  <GraduationCap size={16} /> Học viên
                </button>
                <button type="button" role="tab" aria-selected={persona === "tutor"} onClick={() => selectPersona("tutor")}>
                  <Users size={16} /> Gia sư
                </button>
              </div>
              {persona === "student" ? (
                isLoading ? (
                  <div className="qmath-auth-loading"><Loader2 size={30} className="animate-spin" /><span>Đang kết nối cổng học tập...</span></div>
                ) : (
                  <div className="qmath-login-view">
                    <StudentDashboard
                      students={students} assignments={assignments} attempts={attempts} classGroups={classGroups}
                      onStartExam={setActiveExam} onViewReview={(att, ass) => setActiveReview({ attempt: att, assignment: ass })}
                      currentStudent={currentStudent}
                      onLogin={(student) => {
                        setCurrentStudent(student);
                        localStorage.setItem("thptqg_logged_student", JSON.stringify(student));
                        navigateTo("portal");
                      }}
                      onLogout={() => {
                        setCurrentStudent(null);
                        localStorage.removeItem("thptqg_logged_student");
                        navigateTo("home");
                      }}
                      onUpdateStudent={handleUpdateStudent}
                    />
                  </div>
                )
              ) : (
                <div className="qmath-login">
                  <div className="qmath-login__mark"><Lock size={25} /></div>
                  <h2>Cổng Gia Sư</h2>
                  <p className="qmath-login__subtitle">Đăng nhập để quản lý lớp học của bạn</p>
                  <form onSubmit={handleTutorLogin}>
                    <input
                      placeholder="ID Quản trị"
                      autoComplete="username"
                      value={tutorUsernameInput}
                      onChange={(event) => setTutorUsernameInput(event.target.value)}
                      required
                    />
                    <input
                      type="password"
                      placeholder="Mật khẩu"
                      autoComplete="current-password"
                      value={tutorPasswordInput}
                      onChange={(event) => setTutorPasswordInput(event.target.value)}
                      required
                    />
                    {tutorLoginError && <p className="qmath-login-error" role="alert">{tutorLoginError}</p>}
                    <button type="submit">Xác thực đăng nhập</button>
                  </form>
                </div>
              )}
            </div>
          </section>
        ) : isLoading ? (
          <div className="qmath-auth-loading"><Loader2 size={30} className="animate-spin" /><span>Đang tải không gian học tập...</span></div>
        ) : persona === "student" ? (
          <StudentDashboard
            students={students} assignments={assignments} attempts={attempts} classGroups={classGroups}
            onStartExam={setActiveExam} onViewReview={(att, ass) => setActiveReview({ attempt: att, assignment: ass })}
            currentStudent={currentStudent}
            onLogin={(student) => { setCurrentStudent(student); localStorage.setItem("thptqg_logged_student", JSON.stringify(student)); }}
            onLogout={() => { setCurrentStudent(null); localStorage.removeItem("thptqg_logged_student"); navigateTo("home"); }}
            onUpdateStudent={handleUpdateStudent}
          />
        ) : (
          <TutorDashboard
            students={students}
            assignments={assignments}
            attempts={attempts}
            classGroups={classGroups}
            // 1. Thêm prop Reset bài làm
            onResetAttempt={handleResetAttempt} 
            // 2. Giữ nguyên logic thêm đề thi
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
                file_data: a.fileData,
                file_name: a.fileName,
                open_time: a.openTime || null,
                close_time: a.closeTime || null
              }]);
              if (error) alert("Lỗi: " + error.message);
              else fetchAllData();
            }}
            // 3. Giữ nguyên các hàm xóa/sửa khác
            onDeleteAssignment={async (id) => { await supabase.from("assignments").delete().eq("id", id); fetchAllData(); }}
            onAddStudent={async (s) => { await supabase.from("students").insert([{ id: s.id, name: s.name, class_group: s.classGroup, password: s.password }]); fetchAllData(); }}
            onDeleteStudent={async (id) => { await supabase.from("students").delete().eq("id", id); fetchAllData(); }}
            onUpdateStudent={handleUpdateStudent}
            onUpdateClassGroups={handleUpdateClassGroups}
            onResetData={() => { localStorage.clear(); window.location.reload(); }}
            tutorUsername="Admin" 
            tutorPassword=""
            // 4. Giữ nguyên cập nhật tài khoản Gia sư (Đã sửa lỗi typo alert)
            onUpdateTutorCredentials={async (u, p) => {
              const { data } = await supabase.from("tutor").select("id").limit(1);
              if (data?.[0]) {
                const { error } = await supabase.from("tutor").update({ name: u, password: p }).eq("id", data[0].id);
                if (!error) alert("Đã cập nhật!");
              }
            }}
          />
        )}
      </main>
      <ConfirmModal isOpen={showSwitchConfirm} title="Đổi sang tài khoản gia sư?" message="Bạn sẽ được đăng xuất khỏi tài khoản học viên hiện tại." onConfirm={() => {
        setCurrentStudent(null);
        localStorage.removeItem("thptqg_logged_student");
        setPersona("tutor");
        localStorage.setItem("qmath_persona", "tutor");
        setShowSwitchConfirm(false);
        navigateTo("login");
      }} onCancel={() => setShowSwitchConfirm(false)} />
    </div>
  );
}
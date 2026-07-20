import React, { useState } from "react";
import { Student, Assignment, ExamAttempt, ClassGroup } from "../types";
import { Award, BookOpen, Clock, FileText, CheckCircle2, BarChart2, LogOut, ArrowRight, Lock, Trophy, TrendingUp, FolderOpen, Download } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import ConfirmModal from "./ConfirmModal";
import { openBase64InNewTab } from "../utils/fileHelpers";

interface StudentDashboardProps {
  students: Student[];
  assignments: Assignment[];
  attempts: ExamAttempt[];
  classGroups: ClassGroup[];
  onStartExam: (assignment: Assignment) => void;
  onViewReview: (attempt: ExamAttempt, assignment: Assignment) => void;
  currentStudent: Student | null;
  onLogin: (student: Student) => void;
  onLogout: () => void;
  onUpdateStudent: (student: Student) => void;
}

export default function StudentDashboard({
  students,
  assignments,
  attempts,
  classGroups,
  onStartExam,
  onViewReview,
  currentStudent,
  onLogin,
  onLogout,
  onUpdateStudent,
}: StudentDashboardProps) {
  const [savedStudentId, setSavedStudentId] = useState<string>(() => {
    return localStorage.getItem("qmath_saved_student_id") || "";
  });
  const [studentIdInput, setStudentIdInput] = useState(() => {
    return localStorage.getItem("qmath_saved_student_id") || "";
  });
  const [passwordInput, setPasswordInput] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [loginError, setLoginError] = useState("");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showStartExamConfirm, setShowStartExamConfirm] = useState<Assignment | null>(null);

  // Handle student login check with ID & Password
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    const targetId = (savedStudentId || studentIdInput).trim().toUpperCase();
    const targetPassword = passwordInput.trim();

    if (!targetId) {
      setLoginError("Vui lòng nhập ID Học Viên.");
      return;
    }

    if (!targetPassword) {
      setLoginError("Vui lòng nhập mật khẩu đăng nhập.");
      return;
    }

    const matched = students.find((s) => s.id.toUpperCase() === targetId);
    if (matched) {
      const correctPassword = matched.password || "12345678";
      if (targetPassword !== correctPassword) {
        setLoginError("Mật khẩu đăng nhập không chính xác! Vui lòng thử lại.");
        return;
      }

      onLogin(matched);

      if (rememberMe) {
        localStorage.setItem("qmath_saved_student_id", matched.id);
        setSavedStudentId(matched.id);
      } else {
        localStorage.removeItem("qmath_saved_student_id");
        setSavedStudentId("");
      }

      setPasswordInput("");
    } else {
      setLoginError(`ID Học Viên "${targetId}" không tồn tại trên hệ thống. Vui lòng liên hệ Gia sư.`);
    }
  };

  // If not logged in, show student login gate
  if (!currentStudent) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white rounded-3xl border border-slate-200/80 shadow-xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-indigo-100">
            <Lock size={28} />
          </div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Cổng Học Tập (Student Portal)</h2>
          <p className="text-xs text-slate-500 font-medium">Đăng nhập bằng ID và Mật khẩu được Gia sư cấp để bắt đầu luyện đề</p>
        </div>

        <form onSubmit={handleLoginSubmit} className="space-y-4">
          {savedStudentId ? (
            <div className="space-y-3 bg-indigo-50/50 border border-indigo-100/50 p-4 rounded-2xl">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-indigo-500">Tài khoản ghi nhớ</span>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem("qmath_saved_student_id");
                    setSavedStudentId("");
                    setStudentIdInput("");
                  }}
                  className="text-[11px] font-black text-rose-600 hover:underline"
                >
                  Sử dụng ID khác
                </button>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500">Học Viên ID:</p>
                <p className="text-base font-black text-indigo-700 font-mono mt-0.5">{savedStudentId}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label htmlFor="student-id" className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                ID Học Viên:
              </label>
              <input
                id="student-id"
                type="text"
                value={studentIdInput}
                onChange={(e) => setStudentIdInput(e.target.value)}
                placeholder="Nhập ID học viên..."
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-semibold transition-all"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="student-password" className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Mật Khẩu Đăng Nhập:
            </label>
            <input
              id="student-password"
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Mật khẩu (mặc định '12345678')..."
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-semibold transition-all"
            />
          </div>

          <div className="flex items-center justify-between py-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
              />
              <span className="text-xs text-slate-500 font-bold">Lưu thông tin đăng nhập</span>
            </label>
          </div>

          {loginError && (
            <div className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl p-3 px-3.5 leading-relaxed">
              {loginError}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-md shadow-indigo-100 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            Đăng Nhập Học Viên
            <ArrowRight size={16} />
          </button>
        </form>
      </div>
    );
  }

  // Once logged in, load attempts for this specific student
  const studentAttempts = attempts.filter((att) => att.studentId === currentStudent.id);

  const studentClassGroup = classGroups.find(
    (c) => c.name.toLowerCase() === (currentStudent.classGroup || "").toLowerCase()
  );
  
  // Separate assignments into active vs completed
  const activeAssignments = assignments.filter((assign) => {
    // Students can take any published assignment exactly 1 time
    const attemptCount = studentAttempts.filter((att) => att.assignmentId === assign.id).length;
    const isTargetedClass = !assign.targetClassId || assign.targetClassId === "all" || (studentClassGroup && assign.targetClassId === studentClassGroup.id);
    return attemptCount < 1 && assign.isPublished && isTargetedClass;
  });

  const completedAssignments = studentAttempts.map((att) => {
    const assignment = assignments.find((a) => a.id === att.assignmentId);
    
    // Find attempt number for this specific assignment
    const assignmentAttempts = studentAttempts.filter((a) => a.assignmentId === att.assignmentId);
    const sortedAssignAttempts = [...assignmentAttempts].sort((a, b) => new Date(a.submitTime).getTime() - new Date(b.submitTime).getTime());
    const attemptNumber = sortedAssignAttempts.findIndex((a) => a.id === att.id) + 1;

    return {
      attempt: att,
      assignment: assignment || { title: "Đợt thi đã bị xóa", duration: 90, id: "" },
      attemptNumber,
    };
  }).sort((a, b) => new Date(b.attempt.submitTime).getTime() - new Date(a.attempt.submitTime).getTime());

  // Calculate statistics
  const totalTaken = studentAttempts.length;
  const scores = studentAttempts.map((a) => a.score);
  const averageScore = totalTaken > 0 ? scores.reduce((sum, s) => sum + s, 0) / totalTaken : 0;
  const highestScore = totalTaken > 0 ? Math.max(...scores) : 0;

  // Parts average proficiency
  let partIAvg = 0;
  let partIIAvg = 0;
  let partIIIAvg = 0;
  if (totalTaken > 0) {
    partIAvg = studentAttempts.reduce((sum, a) => sum + a.gradedDetails.scorePartI, 0) / totalTaken;
    partIIAvg = studentAttempts.reduce((sum, a) => sum + a.gradedDetails.scorePartII, 0) / totalTaken;
    partIIIAvg = studentAttempts.reduce((sum, a) => sum + a.gradedDetails.scorePartIII, 0) / totalTaken;
  }

  // Generate student rankings based on average score & total assignments completed
  const studentRankings = students.map((std) => {
    const stdAttempts = attempts.filter((a) => a.studentId === std.id);
    const total = stdAttempts.length;
    const avg = total > 0 ? stdAttempts.reduce((sum, a) => sum + a.score, 0) / total : 0;
    const max = total > 0 ? Math.max(...stdAttempts.map((a) => a.score)) : 0;
    return {
      ...std,
      totalAttempts: total,
      averageScore: avg,
      maxScore: max
    };
  })
  .sort((a, b) => {
    if (b.averageScore !== a.averageScore) {
      return b.averageScore - a.averageScore;
    }
    return b.totalAttempts - a.totalAttempts;
  });

  // Format progress history for Recharts
  const chartData = [...studentAttempts]
    .sort((a, b) => new Date(a.submitTime).getTime() - new Date(b.submitTime).getTime())
    .map((att) => {
      const assignment = assignments.find((a) => a.id === att.assignmentId);
      const title = assignment ? assignment.title : "Đề thi";
      const displayName = title.length > 12 ? title.substring(0, 12) + "..." : title;
      return {
        name: displayName,
        score: Number(att.score.toFixed(2)),
        date: new Date(att.submitTime).toLocaleDateString("vi-VN", { month: "numeric", day: "numeric" }),
      };
    });

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-950 to-slate-900 rounded-3xl border border-slate-800 text-white p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-md">
        <div className="space-y-1.5">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400 bg-indigo-950/80 px-2.5 py-1 rounded-full border border-indigo-900/50">
            Học Sinh Lớp {currentStudent.classGroup}
          </span>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight mt-1.5">
            Xin chào, {currentStudent.name}!
          </h1>
          <p className="text-xs md:text-sm text-slate-400 font-medium">
            ID học viên: <strong className="text-indigo-300 font-mono">{currentStudent.id}</strong> • Hoàn thành tốt bài luyện thi môn Toán của bạn nhé!
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0 w-full md:w-auto">
          <button
            onClick={() => {
              const currentPass = currentStudent.password || "12345678";
              const newPass = prompt("Nhập mật khẩu mới của bạn (Tối thiểu 8 ký tự):");
              if (newPass !== null) {
                const cleaned = newPass.trim();
                if (cleaned.length < 8) {
                  alert("Mật khẩu mới phải dài tối thiểu 8 ký tự!");
                  return;
                }
                onUpdateStudent({ ...currentStudent, password: cleaned });
                alert("Đã thay đổi mật khẩu thành công!");
              }
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600/90 hover:bg-indigo-600 border border-indigo-500 rounded-xl text-white text-xs font-bold transition-all cursor-pointer"
          >
            <Lock size={14} />
            Đổi Mật Khẩu
          </button>
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 rounded-xl text-slate-300 hover:text-white text-xs font-bold transition-all shrink-0 cursor-pointer"
          >
            <LogOut size={14} />
            Đăng Xuất
          </button>
        </div>
      </div>

      {/* DASHBOARD CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT & CENTER: ASSIGNMENT LISTS */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Active Assignments Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
            <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
              <BookOpen size={18} className="text-indigo-600" />
              Đề Thi Đang Mở ({activeAssignments.length})
            </h2>

            {activeAssignments.length === 0 ? (
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-8 text-center text-slate-400 text-xs">
                Tuyệt vời! Bạn không còn đề thi nào chưa hoàn thành tại thời điểm này.
              </div>
            ) : (
              <div className="space-y-3">
                {activeAssignments.map((assign) => {
                  const pastCount = studentAttempts.filter((att) => att.assignmentId === assign.id).length;
                  const now = new Date();
                  let isNotOpenYet = false;
                  let isAlreadyClosed = false;
                  
                  if (assign.openTime) {
                    const openDate = new Date(assign.openTime);
                    if (now < openDate) {
                      isNotOpenYet = true;
                    }
                  }
                  
                  if (assign.closeTime) {
                    const closeDate = new Date(assign.closeTime);
                    if (now > closeDate) {
                      isAlreadyClosed = true;
                    }
                  }

                  const isDisabled = isNotOpenYet || isAlreadyClosed;

                  return (
                    <div
                      key={assign.id}
                      className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border transition-all shadow-xs ${
                        isDisabled 
                          ? "bg-slate-50/70 border-slate-200 opacity-80" 
                          : "bg-white border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-800">{assign.title}</h3>
                          {(() => {
                            const configs: Record<string, { label: string; className: string }> = {
                              THPTQG: { label: "THPTQG Math", className: "bg-indigo-50 border border-indigo-100 text-indigo-700" },
                              TSA: { label: "TSA Math", className: "bg-orange-50 border border-orange-100 text-orange-700" },
                              HSA: { label: "HSA Math", className: "bg-teal-50 border border-teal-100 text-teal-700" },
                              QDA: { label: "QDA Math", className: "bg-rose-50 border border-rose-100 text-rose-700" },
                              BCA: { label: "Bài thi đánh giá của Bộ Công an", className: "bg-blue-50 border border-blue-100 text-blue-700" },
                            };
                            const type = assign.examType || "THPTQG";
                            const conf = configs[type] || configs.THPTQG;
                            return (
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black tracking-wide ${conf.className}`}>
                                {conf.label}
                              </span>
                            );
                          })()}
                          {isNotOpenYet && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black tracking-wide bg-amber-50 border border-amber-100 text-amber-700">
                              Chưa mở đề
                            </span>
                          )}
                          {isAlreadyClosed && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black tracking-wide bg-rose-50 border border-rose-100 text-rose-700">
                              Đã quá hạn đóng đề
                            </span>
                          )}
                          {!isDisabled && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black tracking-wide bg-emerald-50 border border-emerald-100 text-emerald-700">
                              Chưa làm (1 lần duy nhất)
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 font-medium">
                          <span className="flex items-center gap-1">
                            <Clock size={13} />
                            Thời gian: {assign.duration} phút
                          </span>
                          <span>•</span>
                          <span>
                            Số câu: {assign.partIQuestions.length + assign.partIIQuestions.length + assign.partIIIQuestions.length} câu (3 phần)
                          </span>
                          {(assign.openTime || assign.closeTime) && (
                            <>
                              <span>•</span>
                              <span className="text-slate-500 font-bold bg-slate-100 border border-slate-200/50 px-2 py-0.5 rounded-md text-[10px] flex items-center gap-1">
                                🕒{" "}
                                {assign.openTime && (
                                  <span>Mở: {new Date(assign.openTime).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}</span>
                                )}
                                {assign.openTime && assign.closeTime && <span className="mx-0.5">|</span>}
                                {assign.closeTime && (
                                  <span>Đóng: {new Date(assign.closeTime).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}</span>
                                )}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                       <button
                        id={`btn-start-exam-${assign.id}`}
                        onClick={() => !isDisabled && setShowStartExamConfirm(assign)}
                        disabled={isDisabled}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1 ${
                          isDisabled
                            ? "bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed"
                            : "text-white bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100 shadow-sm cursor-pointer"
                        }`}
                      >
                        {isNotOpenYet ? (
                          <span>Chưa mở</span>
                        ) : isAlreadyClosed ? (
                          <span>Đã đóng</span>
                        ) : (
                          <>
                            Bắt Đầu Làm
                            <ArrowRight size={13} />
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Class Lecture Vault Card */}
          {(() => {
            const studentClass = classGroups.find(
              (c) => c.name.toLowerCase() === (currentStudent.classGroup || "").toLowerCase()
            );
            if (!studentClass) return null;
            
            return (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
                <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
                  <FolderOpen size={18} className="text-indigo-600" />
                  Kho Bài Giảng & Tài Liệu Lớp {studentClass.name}
                </h2>
                <p className="text-xs text-slate-400">Các bài giảng PDF, chuyên đề do giáo viên giao riêng cho lớp để ôn tập.</p>

                {!studentClass.lectures || studentClass.lectures.length === 0 ? (
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-8 text-center text-slate-400 text-xs">
                    Hiện chưa có tài liệu hay bài giảng nào được đăng tải cho lớp của bạn.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {studentClass.lectures.map((lec) => (
                      <div key={lec.id} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl hover:border-slate-200 transition-all shadow-xs">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
                            <FileText size={16} />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-slate-800 truncate leading-snug">{lec.title}</h4>
                            <span className="text-[10px] text-slate-400 block truncate">{lec.fileName}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => openBase64InNewTab(lec.fileData, lec.fileName)}
                          className="px-3 py-1.5 bg-white hover:bg-indigo-50 border border-indigo-250 rounded-lg text-[10px] font-black text-indigo-600 flex items-center gap-1 shrink-0 transition-all cursor-pointer border-solid"
                        >
                          <Download size={11} />
                          Xem bài giảng ↗
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Completed Attempts Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
            <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
              <FileText size={18} className="text-emerald-600" />
              Lịch Sử Luyện Đề ({completedAssignments.length})
            </h2>

            {completedAssignments.length === 0 ? (
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-8 text-center text-slate-400 text-xs">
                Bạn chưa hoàn thành bài thi nào. Hãy bắt đầu một đề thi ở trên để xem kết quả và lời giải.
              </div>
            ) : (
              <div className="space-y-3">
                {completedAssignments.map(({ attempt, assignment, attemptNumber }) => (
                  <div
                    key={attempt.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50/20 hover:border-slate-300 transition-all shadow-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-800">{assignment.title}</h3>
                        {(() => {
                          const configs: Record<string, { label: string; className: string }> = {
                            THPTQG: { label: "THPTQG Math", className: "bg-indigo-50 border border-indigo-100 text-indigo-700" },
                            TSA: { label: "TSA Math", className: "bg-orange-50 border border-orange-100 text-orange-700" },
                            HSA: { label: "HSA Math", className: "bg-teal-50 border border-teal-100 text-teal-700" },
                            QDA: { label: "QDA Math", className: "bg-rose-50 border border-rose-100 text-rose-700" },
                            BCA: { label: "Bài thi đánh giá của Bộ Công an", className: "bg-blue-50 border border-blue-100 text-blue-700" },
                          };
                          const type = (assignment as any).examType || "THPTQG";
                          const conf = configs[type] || configs.THPTQG;
                          return (
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black tracking-wide ${conf.className}`}>
                              {conf.label}
                            </span>
                          );
                        })()}
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black tracking-wide bg-emerald-50 border border-emerald-100 text-emerald-700">
                          Đã hoàn thành
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 font-medium">
                        <span>Hoàn thành: {new Date(attempt.submitTime).toLocaleDateString("vi-VN")}</span>
                        <span>•</span>
                        <span>Mã: {attempt.id.slice(-6)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <p className="text-[9px] font-bold text-slate-400 uppercase">Đạt Điểm</p>
                        <p className={`text-base font-black ${
                          attempt.score >= 8.0 
                            ? "text-emerald-600" 
                            : attempt.score >= 5.0 
                              ? "text-amber-500" 
                              : "text-rose-500"
                        }`}>
                          {attempt.score.toFixed(2)} / 10.0
                        </p>
                      </div>

                      <button
                        onClick={() => onViewReview(attempt, assignment as Assignment)}
                        className="px-3.5 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                      >
                        Lời Giải Chi Tiết
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* RIGHT: STUDENT ANALYTICS */}
        <div className="space-y-6">
          
          {/* Quick Metrics */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <BarChart2 size={16} className="text-indigo-600" />
              Thống Kê Học Tập
            </h2>

            <div className="grid grid-cols-2 gap-3.5">
              
              {/* Total Completed */}
              <div className="bg-indigo-50/40 p-4 rounded-xl border border-indigo-100/50 text-center">
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block">Đã Luyện</span>
                <span className="text-2xl font-black text-indigo-950 block mt-1">{totalTaken}</span>
                <span className="text-[10px] text-indigo-500 font-semibold block mt-0.5">Đề thi</span>
              </div>

              {/* Average Score */}
              <div className="bg-emerald-50/40 p-4 rounded-xl border border-emerald-100/50 text-center">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block">Trung Bình</span>
                <span className="text-2xl font-black text-emerald-950 block mt-1">{averageScore.toFixed(2)}</span>
                <span className="text-[10px] text-emerald-500 font-semibold block mt-0.5">Điểm số</span>
              </div>

            </div>

            {/* Highest Score */}
            <div className="bg-amber-50/30 p-3.5 rounded-xl border border-amber-100/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award size={18} className="text-amber-500" />
                <span className="text-xs font-semibold text-slate-600">Điểm số cao nhất</span>
              </div>
              <span className="text-base font-black text-amber-600 font-mono">{highestScore.toFixed(2)}</span>
            </div>
          </div>

          {/* Progress Chart */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp size={16} className="text-indigo-600" />
              Tiến Trình Luyện Đề (Trục Thời Gian)
            </h2>
            {chartData.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">Chưa có đủ dữ liệu lịch sử làm đề.</p>
            ) : (
              <div className="space-y-5">
                <div className="h-44 w-full text-xs font-mono">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" tickLine={false} stroke="#94a3b8" />
                      <YAxis domain={[0, 10]} tickLine={false} stroke="#94a3b8" />
                      <Tooltip 
                        contentStyle={{ background: "#1e293b", borderRadius: "10px", border: "none", color: "#fff" }}
                        labelStyle={{ fontWeight: "bold" }}
                        formatter={(value: any, name: any, props: any) => [
                          `${value} / 10.0`,
                          `${props.payload.name}`
                        ]}
                      />
                      <Line type="monotone" dataKey="score" stroke="#4f46e5" strokeWidth={2.5} activeDot={{ r: 6 }} dot={{ strokeWidth: 2, r: 3 }} name="Điểm số" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Timeline Axis underneath the chart */}
                <div className="pt-4 border-t border-slate-100">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3">
                    Lịch sử luyện tập theo thời gian
                  </h3>
                  <div className="relative pl-3.5 border-l-2 border-indigo-100 space-y-4 max-h-[220px] overflow-y-auto pr-1">
                    {[...studentAttempts]
                      .sort((a, b) => new Date(b.submitTime).getTime() - new Date(a.submitTime).getTime())
                      .map((att) => {
                        const assignment = assignments.find((as) => as.id === att.assignmentId);
                        const title = assignment ? assignment.title : "Đề thi";
                        const submitDate = new Date(att.submitTime).toLocaleString("vi-VN", {
                          month: "numeric",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        });
                        const score = att.score;
                        const scoreColor = score >= 8.0 
                          ? "text-emerald-600 bg-emerald-50 border-emerald-100" 
                          : score >= 5.0 
                            ? "text-amber-600 bg-amber-50 border-amber-100" 
                            : "text-rose-600 bg-rose-50 border-rose-100";
                        
                        return (
                          <div key={att.id} className="relative group">
                            {/* Dot */}
                            <div className="absolute -left-[20.5px] top-1.5 w-2.5 h-2.5 rounded-full bg-indigo-600 ring-4 ring-indigo-50 border border-white group-hover:scale-125 transition-transform" />
                            <div className="space-y-0.5">
                              <span className="text-[10px] font-bold text-slate-400 font-mono block">
                                {submitDate}
                              </span>
                              <p className="text-xs font-bold text-slate-800 line-clamp-1">
                                {title}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold border ${scoreColor}`}>
                                  {score.toFixed(2)} điểm
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Confirmation Modals */}
      <ConfirmModal
        isOpen={showLogoutConfirm}
        title="Xác nhận Đăng xuất"
        message="Bạn có chắc chắn muốn đăng xuất khỏi cổng học tập không?&#10;&#10;CẢNH BÁO: Mọi phiên làm bài thi đang mở có thể bị gián đoạn. Vui lòng xác nhận bạn muốn tiếp tục đăng xuất."
        confirmText="Đăng xuất"
        cancelText="Quay lại"
        onConfirm={() => {
          setShowLogoutConfirm(false);
          onLogout();
        }}
        onCancel={() => setShowLogoutConfirm(false)}
        isDanger={true}
      />

      <ConfirmModal
        isOpen={!!showStartExamConfirm}
        title="Bắt đầu Luyện Đề"
        message={showStartExamConfirm ? `Bạn có chắc chắn muốn bắt đầu làm đề thi "${showStartExamConfirm.title}"?\n\nThời gian làm bài là ${showStartExamConfirm.duration} phút và sẽ bắt đầu tính giờ đếm ngược ngay lập tức khi vào phòng thi. Bạn đã sẵn sàng chưa?` : ""}
        confirmText="Vào thi ngay"
        cancelText="Hủy"
        onConfirm={() => {
          if (showStartExamConfirm) {
            onStartExam(showStartExamConfirm);
            setShowStartExamConfirm(null);
          }
        }}
        onCancel={() => setShowStartExamConfirm(null)}
      />

    </div>
  );
}

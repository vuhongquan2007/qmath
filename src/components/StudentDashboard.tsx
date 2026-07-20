import React, { useState } from "react";
import { Student, Assignment, ExamAttempt, ClassGroup } from "../types";
import { Award, BookOpen, Clock, FileText, CheckCircle2, BarChart2, LogOut, ArrowRight, Lock, Trophy, TrendingUp, FolderOpen, Download } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import ConfirmModal from "./ConfirmModal";
import { openBase64InNewTab } from "../utils/fileHelpers";

import logoSvg from "./logo.svg";

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

  const studentAttempts = attempts.filter((att) => att.studentId === currentStudent.id);

  const studentClassGroup = classGroups.find(
    (c) => c.name.toLowerCase() === (currentStudent.classGroup || "").toLowerCase()
  );
  
  const activeAssignments = assignments.filter((assign) => {
    const attemptCount = studentAttempts.filter((att) => att.assignmentId === assign.id).length;
    const isTargetedClass = !assign.targetClassId || assign.targetClassId === "all" || (studentClassGroup && assign.targetClassId === studentClassGroup.id);
    return attemptCount < 1 && assign.isPublished && isTargetedClass;
  });

  const completedAssignments = studentAttempts.map((att) => {
    const assignment = assignments.find((a) => a.id === att.assignmentId);
    const assignmentAttempts = studentAttempts.filter((a) => a.assignmentId === att.assignmentId);
    const sortedAssignAttempts = [...assignmentAttempts].sort((a, b) => new Date(a.submitTime).getTime() - new Date(b.submitTime).getTime());
    const attemptNumber = sortedAssignAttempts.findIndex((a) => a.id === att.id) + 1;

    return {
      attempt: att,
      assignment: assignment || { title: "Đợt thi đã bị xóa", duration: 90, id: "" },
      attemptNumber,
    };
  }).sort((a, b) => new Date(b.attempt.submitTime).getTime() - new Date(a.attempt.submitTime).getTime());

  const totalTaken = studentAttempts.length;
  const scores = studentAttempts.map((a) => a.score);
  const averageScore = totalTaken > 0 ? scores.reduce((sum, s) => sum + s, 0) / totalTaken : 0;
  const highestScore = totalTaken > 0 ? Math.max(...scores) : 0;

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
      {/* Welcome Banner kèm Logo */}
      <div className="bg-gradient-to-r from-indigo-950 to-slate-900 rounded-3xl border border-slate-800 text-white p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-md">
        <div className="flex items-center gap-4">
          <img src={logoSvg} alt="QMath Logo" className="w-12 h-12 object-contain rounded-2xl shadow-md bg-indigo-900/50 p-1.5 border border-indigo-700/50 shrink-0" />
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
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0 w-full md:w-auto">
          <button
            onClick={() => {
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
                  const now = new Date();
                  let isNotOpenYet = false;
                  let isAlreadyClosed = false;
                  
                  if (assign.openTime && now < new Date(assign.openTime)) isNotOpenYet = true;
                  if (assign.closeTime && now > new Date(assign.closeTime)) isAlreadyClosed = true;

                  const isDisabled = isNotOpenYet || isAlreadyClosed;

                  return (
                    <div
                      key={assign.id}
                      className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border transition-all shadow-xs ${
                        isDisabled ? "bg-slate-50/70 border-slate-200 opacity-80" : "bg-white border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-800">{assign.title}</h3>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black tracking-wide bg-indigo-50 border border-indigo-100 text-indigo-700">
                            {assign.examType || "THPTQG"} Math
                          </span>
                          {isNotOpenYet && <span className="px-2 py-0.5 rounded-full text-[9px] font-black tracking-wide bg-amber-50 border border-amber-100 text-amber-700">Chưa mở đề</span>}
                          {isAlreadyClosed && <span className="px-2 py-0.5 rounded-full text-[9px] font-black tracking-wide bg-rose-50 border border-rose-100 text-rose-700">Đã quá hạn đóng đề</span>}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                          <span className="flex items-center gap-1"><Clock size={13} /> Thời gian: {assign.duration} phút</span>
                          <span>•</span>
                          <span>Số câu: {assign.partIQuestions.length + assign.partIIQuestions.length + assign.partIIIQuestions.length} câu</span>
                        </div>
                      </div>

                      <button
                        onClick={() => !isDisabled && setShowStartExamConfirm(assign)}
                        disabled={isDisabled}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1 ${
                          isDisabled ? "bg-slate-100 border text-slate-400 cursor-not-allowed" : "text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm cursor-pointer"
                        }`}
                      >
                        {isNotOpenYet ? "Chưa mở" : isAlreadyClosed ? "Đã đóng" : <>Bắt Đầu Làm <ArrowRight size={13} /></>}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Class Lecture Vault Card */}
          {(() => {
            const studentClass = classGroups.find((c) => c.name.toLowerCase() === (currentStudent.classGroup || "").toLowerCase());
            if (!studentClass || !studentClass.lectures || studentClass.lectures.length === 0) return null;
            
            return (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
                <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
                  <FolderOpen size={18} className="text-indigo-600" />
                  Kho Bài Giảng & Tài Liệu Lớp {studentClass.name}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {studentClass.lectures.map((lec) => (
                    <div key={lec.id} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl shadow-xs">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
                          <FileText size={16} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-800 truncate">{lec.title}</h4>
                          <span className="text-[10px] text-slate-400 block truncate">{lec.fileName}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => openBase64InNewTab(lec.fileData, lec.fileName)}
                        className="px-3 py-1.5 bg-white hover:bg-indigo-50 border border-indigo-250 rounded-lg text-[10px] font-black text-indigo-600 flex items-center gap-1 shrink-0 transition-all cursor-pointer"
                      >
                        <Download size={11} /> Xem bài giảng ↗
                      </button>
                    </div>
                  ))}
                </div>
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
                {completedAssignments.map(({ attempt, assignment }) => (
                  <div key={attempt.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50/20 shadow-xs">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-800">{assignment.title}</h3>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black tracking-wide bg-emerald-50 border border-emerald-100 text-emerald-700">Đã hoàn thành</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                        <span>Hoàn thành: {new Date(attempt.submitTime).toLocaleDateString("vi-VN")}</span>
                        <span>•</span>
                        <span>Mã: {attempt.id.slice(-6)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <p className="text-[9px] font-bold text-slate-400 uppercase">Đạt Điểm</p>
                        <p className="text-base font-black text-indigo-600">{attempt.score.toFixed(2)} / 10.0</p>
                      </div>

                      <button
                        onClick={() => {
                          const fullAssignment = assignments.find(a => a.id === attempt.assignmentId) || (assignment as Assignment);
                          onViewReview(attempt, fullAssignment);
                        }}
                        className="px-3.5 py-2 border border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
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
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <BarChart2 size={16} className="text-indigo-600" />
              Thống Kê Học Tập
            </h2>

            <div className="grid grid-cols-2 gap-3.5">
              <div className="bg-indigo-50/40 p-4 rounded-xl border border-indigo-100/50 text-center">
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block">Đã Luyện</span>
                <span className="text-2xl font-black text-indigo-950 block mt-1">{totalTaken}</span>
              </div>
              <div className="bg-emerald-50/40 p-4 rounded-xl border border-emerald-100/50 text-center">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block">Trung Bình</span>
                <span className="text-2xl font-black text-emerald-950 block mt-1">{averageScore.toFixed(2)}</span>
              </div>
            </div>

            <div className="bg-amber-50/30 p-3.5 rounded-xl border border-amber-100/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award size={18} className="text-amber-500" />
                <span className="text-xs font-semibold text-slate-600">Điểm số cao nhất</span>
              </div>
              <span className="text-base font-black text-amber-600 font-mono">{highestScore.toFixed(2)}</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp size={16} className="text-indigo-600" />
              Tiến Trình Luyện Đề
            </h2>
            {chartData.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">Chưa có đủ dữ liệu lịch sử làm đề.</p>
            ) : (
              <div className="h-44 w-full text-xs font-mono">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" tickLine={false} stroke="#94a3b8" />
                    <YAxis domain={[0, 10]} tickLine={false} stroke="#94a3b8" />
                    <Tooltip contentStyle={{ background: "#1e293b", borderRadius: "10px", color: "#fff" }} />
                    <Line type="monotone" dataKey="score" stroke="#4f46e5" strokeWidth={2.5} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showLogoutConfirm}
        title="Xác nhận Đăng xuất"
        message="Bạn có chắc chắn muốn đăng xuất khỏi cổng học tập không?"
        confirmText="Đăng xuất"
        cancelText="Quay lại"
        onConfirm={() => { setShowLogoutConfirm(false); onLogout(); }}
        onCancel={() => setShowLogoutConfirm(false)}
        isDanger={true}
      />

      <ConfirmModal
        isOpen={!!showStartExamConfirm}
        title="Bắt đầu Luyện Đề"
        message={showStartExamConfirm ? `Vào thi đề "${showStartExamConfirm.title}" ngay bây giờ?` : ""}
        confirmText="Vào thi ngay"
        cancelText="Hủy"
        onConfirm={() => { if (showStartExamConfirm) { onStartExam(showStartExamConfirm); setShowStartExamConfirm(null); } }}
        onCancel={() => setShowStartExamConfirm(null)}
      />
    </div>
  );
}
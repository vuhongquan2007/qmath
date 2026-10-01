import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  BookOpen,
  CircleUserRound,
  Clock3,
  FilePlus2,
  FileText,
  GraduationCap,
  LockKeyhole,
  LogOut,
  Menu,
  Plus,
  Radio,
  Save,
  ShieldCheck,
  Upload,
  Users,
  X,
} from "lucide-react";
import { supabase } from "../utils/supabaseClient";
import { openBase64InNewTab } from "../utils/fileHelpers";
import type {
  Assignment,
  ClassGroup,
  ExamAttempt,
  ExamSession,
  Lecture,
  Student,
} from "../types";
import ExamTaker from "./ExamTaker";
import ExamReview from "./ExamReview";
import TutorAnalytics from "./TutorAnalytics";

type Role = "student" | "tutor";
type Area = "exams" | "results" | "materials";
type Account = { role: Role; id: string; name: string; classGroup?: string };
type ExamDraft = {
  id?: string;
  title: string;
  description: string;
  duration: number;
  maxAttempts: number;
  examType: NonNullable<Assignment["examType"]>;
  startTime: string;
  endTime: string;
  targetClassId: string;
  partICount: number;
  partIICount: number;
  partIIICount: number;
  keysI: string;
  keysII: string;
  keysIII: string;
  fileData: string;
  fileName: string;
};

const accountKey = "qmath_account";
const sessionsKey = "qmath_local_exam_sessions";
const remoteSessionsEnabled = import.meta.env.VITE_SUPABASE_EXAM_SESSIONS === "true";
const examTypeLabels: Record<NonNullable<Assignment["examType"]>, string> = {
  THPTQG: "TN THPT",
  TSA: "TSA",
  HSA: "HSA",
  QDA: "QDA",
  BCA: "BCA",
};

function mapAssignment(row: any): Assignment {
  let metadata: Record<string, any> = {};
  try {
    metadata = JSON.parse(localStorage.getItem("qmath_assignment_meta") || "{}")[String(row.id)] || {};
  } catch { /* Ignore malformed optional metadata cache. */ }
  const startTime = row.start_time ?? row.open_time ?? metadata.startTime ?? "";
  const endTime = row.end_time ?? row.close_time ?? metadata.endTime ?? "";
  return {
    ...row,
    id: String(row.id),
    title: row.title || "Đề thi chưa đặt tên",
    description: row.description || metadata.description || "",
    duration: Number(row.duration) || 90,
    maxAttempts: Math.max(1, Number(row.max_attempts ?? metadata.maxAttempts) || 1),
    createdDate: row.created_date ? String(row.created_date).split("T")[0] : "",
    examType: row.exam_type || "THPTQG",
    isPublished: row.is_published ?? true,
    partIQuestions: row.part_i_questions || [],
    partIIQuestions: row.part_ii_questions || [],
    partIIIQuestions: row.part_iii_questions || [],
    targetClassId: row.target_class_id || "all",
    fileData: row.file_data || "",
    fileName: row.file_name || "",
    startTime,
    endTime,
    openTime: startTime,
    closeTime: endTime,
  };
}

function mapAttempt(row: any): ExamAttempt {
  return {
    ...row,
    id: String(row.id),
    assignmentId: String(row.assignment_id),
    studentId: String(row.student_id),
    startTime: row.start_time || row.created_at || new Date().toISOString(),
    submitTime: row.submit_time || row.created_at || new Date().toISOString(),
    score: Number(row.score) || 0,
    totalQuestions: Number(row.total_questions) || 0,
    correctCount: Number(row.correct_count) || 0,
    answers: row.answers || { partI: {}, partII: {}, partIII: {} },
    gradedDetails: row.graded_details || {
      scorePartI: 0,
      scorePartII: 0,
      scorePartIII: 0,
      partIResult: {},
      partIIDetail: {},
      partIIIResult: {},
    },
  };
}

function mapSession(row: any): ExamSession {
  return {
    id: String(row.id),
    assignmentId: String(row.assignment_id),
    studentId: String(row.student_id),
    studentName: row.student_name || row.student_id,
    status: row.status || "in_progress",
    progress: Number(row.progress) || 0,
    totalItems: Number(row.total_items) || 0,
    startedAt: row.started_at || row.created_at || new Date().toISOString(),
    lastSeenAt: row.last_seen_at || row.updated_at || new Date().toISOString(),
  };
}

function localDateTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 16);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Không thể đọc tệp đã chọn."));
    reader.readAsDataURL(file);
  });
}

function makeDraft(assignment?: Assignment): ExamDraft {
  const partI = assignment?.partIQuestions || [];
  const partII = assignment?.partIIQuestions || [];
  const partIII = assignment?.partIIIQuestions || [];
  return {
    id: assignment?.id,
    title: assignment?.title || "",
    description: assignment?.description || "",
    duration: assignment?.duration || 90,
    maxAttempts: assignment?.maxAttempts || 1,
    examType: assignment?.examType || "THPTQG",
    startTime: localDateTime(assignment?.startTime || assignment?.openTime),
    endTime: localDateTime(assignment?.endTime || assignment?.closeTime),
    targetClassId: assignment?.targetClassId || "all",
    partICount: partI.length || 12,
    partIICount: partII.length || 4,
    partIIICount: partIII.length || 6,
    keysI: partI
      .map((question) => "ABCD"[question.correctOption] || "A")
      .join(", "),
    keysII: partII
      .map((question) =>
        question.statements
          .map((statement) => (statement.correctAnswer ? "Đ" : "S"))
          .join(""),
      )
      .join(", "),
    keysIII: partIII.map((question) => question.correctAnswer).join(", "),
    fileData: assignment?.fileData || "",
    fileName: assignment?.fileName || "",
  };
}

function LoginDialog({
  onClose,
  onLogin,
}: {
  onClose: () => void;
  onLogin: (role: Role, id: string, password: string) => Promise<string | null>;
}) {
  const [role, setRole] = useState<Role>("student");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const message = await onLogin(role, identifier.trim(), password);
    setBusy(false);
    if (message) setError(message);
  };
  return (
    <div
      className="qm-overlay"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        className="qm-dialog qm-login-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-heading"
      >
        <button
          className="qm-icon-button qm-dialog-close"
          type="button"
          aria-label="Đóng"
          onClick={onClose}
        >
          <X size={18} />
        </button>
        <div className="qm-dialog-emblem">
          <ShieldCheck size={22} />
        </div>
        <span className="qm-overline">QMath</span>
        <h2 id="login-heading">Đăng nhập không gian học</h2>
        <p className="qm-muted">
          Dùng thông tin tài khoản được cấp bởi gia sư.
        </p>
        <div className="qm-segment" role="tablist" aria-label="Loại tài khoản">
          <button
            type="button"
            role="tab"
            aria-selected={role === "student"}
            onClick={() => setRole("student")}
          >
            <GraduationCap size={15} /> Học viên
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={role === "tutor"}
            onClick={() => setRole("tutor")}
          >
            <Users size={15} /> Gia sư
          </button>
        </div>
        <form className="qm-form" onSubmit={submit}>
          <label>
            {role === "student" ? "Mã học viên" : "Tên đăng nhập"}
            <input
              autoFocus
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              autoComplete="username"
              required
              placeholder={
                role === "student"
                  ? "Ví dụ: QM20261001"
                  : "Tên tài khoản gia sư"
              }
            />
          </label>
          <label>
            Mật khẩu
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {error && (
            <p className="qm-error" role="alert">
              {error}
            </p>
          )}
          <button
            className="qm-button qm-button-primary qm-button-wide"
            disabled={busy}
            type="submit"
          >
            {busy ? "Đang xác thực…" : "Đăng nhập"}
            <ArrowRight size={16} />
          </button>
        </form>
        <p className="qm-dialog-foot">
          <LockKeyhole size={13} /> Kết quả và tài liệu được lưu an toàn trên QMath.
        </p>
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: typeof Activity;
}) {
  return (
    <article className="qm-metric">
      <span className="qm-metric-icon">
        <Icon size={17} />
      </span>
      <span className="qm-metric-label">{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function splitAnswerKeys(value: string) {
  if (!value.trim()) return [];
  return value
    .split(/[,\n;|]/)
    .map((token) => token.trim());
}

function updateAnswerKey(value: string, index: number, nextValue: string) {
  const keys = splitAnswerKeys(value);
  while (keys.length <= index) keys.push("");
  keys[index] = nextValue;
  return keys.join(", ");
}

function ExamEditor({
  draft,
  classes,
  onClose,
  onSave,
}: {
  draft: ExamDraft;
  classes: ClassGroup[];
  onClose: () => void;
  onSave: (draft: ExamDraft) => Promise<string | null>;
}) {
  const [form, setForm] = useState(draft);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [scanBusy, setScanBusy] = useState(false);
  const [scanMessage, setScanMessage] = useState("");
  const patch = (values: Partial<ExamDraft>) =>
    setForm((current) => ({ ...current, ...values }));
  const partIKeys = splitAnswerKeys(form.keysI);
  const partIIKeys = splitAnswerKeys(form.keysII);
  const partIIIKeys = splitAnswerKeys(form.keysIII);
  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      patch({ fileData: await readFile(file), fileName: file.name });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Lỗi tải tệp.");
    }
  };
  const handleAnswerScan = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setScanBusy(true);
    setScanMessage("");
    setError("");
    try {
      const response = await fetch("/api/parse-answer-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileData: await readFile(file),
          fileName: file.name,
          numPartI: form.partICount,
          numPartII: form.partIICount,
          numPartIII: form.partIIICount,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Không thể đọc bảng đáp án.");
      }
      patch({
        keysI: (data.keysPartI || [])
          .map((answer: number) => "ABCD"[answer] || "A")
          .join(", "),
        keysII: (data.keysPartII || [])
          .map((answers: boolean[]) => answers.map((answer) => answer ? "Đ" : "S").join(""))
          .join(", "),
        keysIII: (data.keysPartIII || []).join(", "),
      });
      setScanMessage(`Đã nhận diện đáp án từ ${file.name}. Hãy kiểm tra lại trước khi lưu.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Lỗi quét bảng đáp án.");
    } finally {
      setScanBusy(false);
      event.target.value = "";
    }
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (
      !form.startTime ||
      !form.endTime ||
      new Date(form.endTime) <= new Date(form.startTime)
    ) {
      setError("Hãy nhập thời gian bắt đầu và kết thúc hợp lệ.");
      return;
    }
    if (!form.id && !form.fileData) {
      setError("Cần đính kèm tệp đề thi PDF trước khi xuất bản.");
      return;
    }
    if (
      partIKeys.length < form.partICount ||
      partIKeys.slice(0, form.partICount).some((key) => !/^[ABCD]$/i.test(key))
    ) {
      setError("Hãy điền đáp án cho toàn bộ câu trắc nghiệm.");
      return;
    }
    if (
      partIIKeys.length < form.partIICount ||
      partIIKeys
        .slice(0, form.partIICount)
        .some((key) => !/^[DĐS]{4}$/i.test(key))
    ) {
      setError("Hãy chọn Đúng/Sai cho đủ 4 ý của mỗi câu phần II.");
      return;
    }
    if (
      partIIIKeys.length < form.partIIICount ||
      partIIIKeys.slice(0, form.partIIICount).some((key) => !key.trim())
    ) {
      setError("Hãy nhập đáp số cho toàn bộ câu trả lời ngắn.");
      return;
    }
    setBusy(true);
    setError("");
    const message = await onSave(form);
    setBusy(false);
    if (message) setError(message);
  };
  return (
    <div className="qm-overlay" role="presentation">
      <section
        className="qm-dialog qm-editor-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="editor-title"
      >
        <header className="qm-dialog-header">
          <div>
            <span className="qm-overline">Cấu hình đề thi</span>
            <h2 id="editor-title">
              {form.id ? "Chỉnh sửa đề thi" : "Tạo đề thi mới"}
            </h2>
          </div>
          <button
            className="qm-icon-button"
            type="button"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </header>
        <form className="qm-editor-form" onSubmit={submit}>
          <div className="qm-editor-grid">
            <label className="qm-span-2">
              Tên đề thi
              <input
                required
                value={form.title}
                onChange={(event) => patch({ title: event.target.value })}
                placeholder="Đề luyện tập Toán 12"
              />
            </label>
            <label className="qm-span-2">
              Mô tả
              <textarea
                value={form.description}
                onChange={(event) => patch({ description: event.target.value })}
                rows={2}
                placeholder="Mục tiêu hoặc ghi chú cho học viên"
              />
            </label>
            <label>
              Thời lượng (phút)
              <input
                type="number"
                min={1}
                max={300}
                value={form.duration}
                onChange={(event) =>
                  patch({ duration: Number(event.target.value) })
                }
              />
            </label>
            <label>
              Số lần làm tối đa
              <input
                type="number"
                min={1}
                max={20}
                value={form.maxAttempts}
                onChange={(event) =>
                  patch({ maxAttempts: Math.max(1, Number(event.target.value)) })
                }
              />
            </label>
            <label>
              Khung chấm điểm
              <select
                value={form.examType}
                onChange={(event) =>
                  patch({
                    examType: event.target.value as ExamDraft["examType"],
                  })
                }
              >
                {Object.entries(examTypeLabels).map(([key, value]) => (
                  <option value={key} key={key}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Bắt đầu
              <input
                type="datetime-local"
                required
                value={form.startTime}
                onChange={(event) => patch({ startTime: event.target.value })}
              />
            </label>
            <label>
              Kết thúc
              <input
                type="datetime-local"
                required
                value={form.endTime}
                onChange={(event) => patch({ endTime: event.target.value })}
              />
            </label>
            <label className="qm-span-2">
              Giao cho lớp
              <select
                value={form.targetClassId}
                onChange={(event) =>
                  patch({ targetClassId: event.target.value })
                }
              >
                <option value="all">Tất cả học viên</option>
                {classes.map((group) => (
                  <option value={group.id} key={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="qm-question-counts qm-span-2">
              <label>
                Trắc nghiệm
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={form.partICount}
                  onChange={(event) =>
                    patch({ partICount: Number(event.target.value) })
                  }
                />
              </label>
              <label>
                Đúng / Sai
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={form.partIICount}
                  onChange={(event) =>
                    patch({ partIICount: Number(event.target.value) })
                  }
                />
              </label>
              <label>
                Trả lời ngắn
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={form.partIIICount}
                  onChange={(event) =>
                    patch({ partIIICount: Number(event.target.value) })
                  }
                />
              </label>
            </div>
            <section className="qm-answer-builder qm-span-2">
              <header className="qm-answer-builder-header">
                <div>
                  <span className="qm-overline">Đáp án</span>
                  <h3>Đáp án từng câu</h3>
                </div>
                <label className="qm-upload-control qm-answer-scan">
                  <Upload size={16} />
                  <span>
                    <strong>{scanBusy ? "Đang quét đáp án…" : "Quét ảnh đáp án"}</strong>
                    <small>Ảnh, PDF, DOCX hoặc TXT</small>
                  </span>
                  <input
                    type="file"
                    accept="image/*,.pdf,.docx,.txt"
                    disabled={scanBusy}
                    onChange={(event) => void handleAnswerScan(event)}
                  />
                </label>
              </header>
              {scanMessage && <p className="qm-scan-success" role="status">{scanMessage}</p>}
              {form.partICount > 0 && (
                <div className="qm-answer-part">
                  <h4>Phần I · Trắc nghiệm một đáp án</h4>
                  <table className="qm-answer-table">
                    <thead><tr><th>Câu</th><th>Đáp án đúng</th></tr></thead>
                    <tbody>
                      {Array.from({ length: form.partICount }, (_, index) => (
                        <tr key={`p1-${index}`}>
                          <th scope="row">{index + 1}</th>
                          <td>
                            <select
                              aria-label={`Đáp án câu ${index + 1} phần I`}
                              value={partIKeys[index] || ""}
                              onChange={(event) => patch({ keysI: updateAnswerKey(form.keysI, index, event.target.value) })}
                            >
                              <option value="">Chọn</option>
                              {["A", "B", "C", "D"].map((option) => <option key={option} value={option}>{option}</option>)}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {form.partIICount > 0 && (
                <div className="qm-answer-part">
                  <h4>Phần II · Đúng hoặc Sai</h4>
                  <div className="qm-answer-table-wrap">
                    <table className="qm-answer-table qm-true-false-table">
                      <thead><tr><th>Câu</th><th>a</th><th>b</th><th>c</th><th>d</th></tr></thead>
                      <tbody>
                        {Array.from({ length: form.partIICount }, (_, index) => (
                          <tr key={`p2-${index}`}>
                            <th scope="row">{index + 1}</th>
                            {[0, 1, 2, 3].map((statementIndex) => (
                              <td key={statementIndex}>
                                <select
                                  aria-label={`Câu ${index + 1}, ý ${String.fromCharCode(97 + statementIndex)}`}
                                  value={partIIKeys[index]?.[statementIndex] === "Đ" || partIIKeys[index]?.[statementIndex] === "D" ? "Đ" : partIIKeys[index]?.[statementIndex] === "S" ? "S" : ""}
                                  onChange={(event) => {
                                    const values = (partIIKeys[index] || "????").split("");
                                    values[statementIndex] = event.target.value || "?";
                                    patch({ keysII: updateAnswerKey(form.keysII, index, values.join("")) });
                                  }}
                                >
                                  <option value="">—</option><option value="Đ">Đúng</option><option value="S">Sai</option>
                                </select>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {form.partIIICount > 0 && (
                <div className="qm-answer-part">
                  <h4>Phần III · Trả lời ngắn</h4>
                  <table className="qm-answer-table qm-short-answer-table">
                    <thead><tr><th>Câu</th><th>Đáp số</th></tr></thead>
                    <tbody>
                      {Array.from({ length: form.partIIICount }, (_, index) => (
                        <tr key={`p3-${index}`}>
                          <th scope="row">{index + 1}</th>
                          <td>
                            <input
                              type="text"
                              inputMode="decimal"
                              aria-label={`Đáp số câu ${index + 1} phần III`}
                              value={partIIIKeys[index] || ""}
                              placeholder="Nhập đáp số"
                              onChange={(event) => patch({ keysIII: updateAnswerKey(form.keysIII, index, event.target.value) })}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
            <label className="qm-upload-control qm-span-2">
              <Upload size={17} />
              <span>
                <strong>{form.fileName || "Tải PDF đề thi"}</strong>
                <small>
                  PDF dùng trong phòng thi
                  {form.id ? " · Có thể giữ tệp hiện tại" : " · Bắt buộc"}
                </small>
              </span>
              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={handleFile}
              />
            </label>
          </div>
          {error && (
            <p className="qm-error" role="alert">
              {error}
            </p>
          )}
          <footer className="qm-dialog-actions">
            <button
              className="qm-button qm-button-quiet"
              type="button"
              onClick={onClose}
            >
              Hủy
            </button>
            <button
              className="qm-button qm-button-primary"
              type="submit"
              disabled={busy}
            >
              <Save size={15} />
              {busy ? "Đang lưu…" : "Lưu đề thi"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

export default function QMathWorkspace() {
  const [account, setAccount] = useState<Account | null>(() => {
    try {
       return JSON.parse(localStorage.getItem(accountKey) || "null") || null;
    } catch {
      return null;
    }
  });
  const [showHome, setShowHome] = useState(() => !account);
  const [students, setStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [sessionTableMissing, setSessionTableMissing] = useState(!remoteSessionsEnabled);
  const [sessionsChecked, setSessionsChecked] = useState(false);
  const [area, setArea] = useState<Area>("exams");
  const [selectedAnalyticsExamId, setSelectedAnalyticsExamId] = useState("");
  const [selectedAnalyticsClassId, setSelectedAnalyticsClassId] = useState("all");
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginTarget, setLoginTarget] = useState<Area>("exams");
  const [activeExam, setActiveExam] = useState<Assignment | null>(null);
  const [review, setReview] = useState<{
    attempt: ExamAttempt;
    assignment: Assignment;
    student: Student;
  } | null>(null);
  const [examDraft, setExamDraft] = useState<ExamDraft | null>(null);
  const [busy, setBusy] = useState(true);
  const [notice, setNotice] = useState("");
  const [loadError, setLoadError] = useState("");
  const [newStudent, setNewStudent] = useState({
    id: "",
    name: "",
    classGroup: "",
    password: "",
  });
  const [newClass, setNewClass] = useState({ name: "", description: "" });
  const [materialClassId, setMaterialClassId] = useState("");
  const [materialTitle, setMaterialTitle] = useState("");
  const [materialFile, setMaterialFile] = useState<{
    data: string;
    name: string;
  } | null>(null);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [monitorNow, setMonitorNow] = useState(Date.now());
  const sessionProgress = useRef({ progress: 0, total: 1 });
  const sessionTableMissingRef = useRef(!remoteSessionsEnabled);

  const refresh = useCallback(async (showLoading = true) => {
    if (showLoading) setBusy(true);
    setLoadError("");
    try {
      const [assignmentResult, studentResult, attemptResult, classResult] = await Promise.all([
        supabase.from("assignments").select("*").order("created_date", { ascending: false }),
        supabase.from("students").select("id,name,password,class_group"),
        supabase.from("attempts").select("*").order("submit_time", { ascending: false }),
        supabase.from("class_groups").select("*").order("name", { ascending: true }),
      ]);
      const dataError = assignmentResult.error || studentResult.error || attemptResult.error || classResult.error;
      if (dataError) throw dataError;
      setAssignments((assignmentResult.data || []).map(mapAssignment));
      setStudents((studentResult.data || []).map((row: any) => ({
        id: String(row.id), name: row.name, password: row.password, classGroup: row.class_group || "",
      })));
      setAttempts((attemptResult.data || []).map(mapAttempt));
      setClasses((classResult.data || []).map((row: any) => ({
        id: String(row.id), name: row.name, description: row.description || "", lectures: row.lectures || [],
      })));

      const liveResult = sessionTableMissingRef.current
        ? null
        : await supabase.from("exam_sessions").select("*");
      if (!liveResult || liveResult.error) {
        sessionTableMissingRef.current = true;
        setSessionTableMissing(true);
        try {
          const cachedSessions = JSON.parse(localStorage.getItem(sessionsKey) || "[]");
          setSessions(Array.isArray(cachedSessions) ? cachedSessions : []);
        } catch {
          setSessions([]);
        }
      } else {
        sessionTableMissingRef.current = false;
        setSessionTableMissing(false);
        setSessions((liveResult.data || []).map(mapSession));
      }
      setSessionsChecked(true);
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Không thể tải dữ liệu từ Supabase.",
      );
    } finally {
      if (showLoading) setBusy(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);
  useEffect(() => {
    try {
      localStorage.setItem(sessionsKey, JSON.stringify(sessions));
    } catch (error) {
      console.error("Could not cache local exam sessions:", error);
    }
  }, [sessions]);
  useEffect(() => {
    const syncSessions = (event: StorageEvent) => {
      if (event.key === sessionsKey) {
        try {
          const cached = JSON.parse(event.newValue || "[]");
          if (Array.isArray(cached)) setSessions(cached);
        } catch { /* Ignore malformed session cache data. */ }
      }
    };
    window.addEventListener("storage", syncSessions);
    return () => window.removeEventListener("storage", syncSessions);
  }, []);
  useEffect(() => {
    if (account?.role !== "tutor") return;
    const timer = window.setInterval(() => setMonitorNow(Date.now()), 15000);
    return () => window.clearInterval(timer);
  }, [account]);
  useEffect(() => {
    if (!sessionsChecked) return;
    const channel = supabase
      .channel("qmath-workspace-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "attempts" }, () => {
        void refresh(false);
      });
    if (!sessionTableMissing) {
      channel.on("postgres_changes", { event: "*", schema: "public", table: "exam_sessions" }, () => {
        void refresh(false);
      });
    }
    channel.subscribe();
    const poll = window.setInterval(() => void refresh(false), 15000);
    return () => {
      window.clearInterval(poll);
      void supabase.removeChannel(channel);
    };
  }, [refresh, sessionTableMissing, sessionsChecked]);
  const doLogin = async (role: Role, identifier: string, password: string) => {
    try {
      if (role === "student") {
        const { data, error } = await supabase
          .from("students")
          .select("id,name,class_group")
          .eq("id", identifier.toUpperCase())
          .eq("password", password)
          .maybeSingle();
        if (error) throw error;
        if (!data) return "Mã học viên hoặc mật khẩu chưa chính xác.";
        const next: Account = {
          role,
          id: String(data.id),
          name: data.name,
          classGroup: data.class_group || "",
        };
        setAccount(next);
        localStorage.setItem(accountKey, JSON.stringify(next));
        setShowHome(false);
        setArea(loginTarget);
        setLoginOpen(false);
        return null;
      }
      let tutor: any = null;
      let tutorError: any = null;
      for (const table of ["tutors", "tutor"]) {
        const usernameMatch = await supabase
          .from(table)
          .select("id,username,name")
          .eq(table === "tutors" ? "username" : "name", identifier)
          .eq("password", password)
          .maybeSingle();
        if (usernameMatch.data) {
          tutor = usernameMatch.data;
          break;
        }
        tutorError = usernameMatch.error;
      }
      if (!tutor) return tutorError?.message || "Tên đăng nhập hoặc mật khẩu chưa chính xác.";
      const next: Account = {
        role,
        id: String(tutor.id || tutor.username || tutor.name),
        name: tutor.name || tutor.username || "Gia sư",
      };
      setAccount(next);
      localStorage.setItem(accountKey, JSON.stringify(next));
      setShowHome(false);
      setArea(loginTarget);
      setLoginOpen(false);
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : "Đăng nhập thất bại.";
    }
  };

  const requestArea = (next: Area) => {
    setMobileMenu(false);
    if (!account) {
      setLoginTarget(next);
      setLoginOpen(true);
      return;
    }
    setShowHome(false);
    setArea(next);
    setSelectedAnalyticsExamId("");
    setActiveExam(null);
    setReview(null);
  };

  const saveAssignment = async (draft: ExamDraft) => {
    const tokens = (value: string) =>
      value
        .split(/[\s,;|]+/)
        .map((item) => item.trim())
        .filter(Boolean);
    const prior = assignments.find((item) => item.id === draft.id);
    const partIKeys = tokens(draft.keysI.toUpperCase()).map((item) =>
      Math.max(0, "ABCD".indexOf(item[0])),
    );
    const partIIKeys = tokens(draft.keysII.toUpperCase()).map((item) =>
      Array.from({ length: 4 }, (_, index) =>
        /^(Đ|D|T|1)$/.test(item[index] || ""),
      ),
    );
    const partIIIKeys = tokens(draft.keysIII);
    const makeId = (part: number, index: number) => {
      const existing =
        part === 1
          ? prior?.partIQuestions[index]
          : part === 2
            ? prior?.partIIQuestions[index]
            : prior?.partIIIQuestions[index];
      return existing?.id || `p${part}-q${index + 1}-${Date.now()}-${index}`;
    };
    const partIQuestions = Array.from(
      { length: Math.min(100, Math.max(0, draft.partICount)) },
      (_, index) => ({
        id: makeId(1, index),
        questionNumber: index + 1,
        content:
          prior?.partIQuestions[index]?.content ||
          `Câu ${index + 1}. Xem nội dung trong đề thi đính kèm.`,
        options: prior?.partIQuestions[index]?.options || ["A", "B", "C", "D"],
        correctOption:
          partIKeys[index] ?? prior?.partIQuestions[index]?.correctOption ?? 0,
        explanation: prior?.partIQuestions[index]?.explanation || "",
      }),
    );
    const partIIQuestions = Array.from(
      { length: Math.min(100, Math.max(0, draft.partIICount)) },
      (_, index) => ({
        id: makeId(2, index),
        questionNumber: index + 1,
        content:
          prior?.partIIQuestions[index]?.content ||
          `Câu ${index + 1}. Xem nội dung trong đề thi đính kèm.`,
        statements: Array.from({ length: 4 }, (_, j) => ({
          text:
            prior?.partIIQuestions[index]?.statements[j]?.text ||
            `${String.fromCharCode(97 + j)}) Mệnh đề trong đề thi.`,
          correctAnswer:
            partIIKeys[index]?.[j] ??
            prior?.partIIQuestions[index]?.statements[j]?.correctAnswer ??
            false,
        })),
        explanation: prior?.partIIQuestions[index]?.explanation || "",
      }),
    );
    const partIIIQuestions = Array.from(
      { length: Math.min(100, Math.max(0, draft.partIIICount)) },
      (_, index) => ({
        id: makeId(3, index),
        questionNumber: index + 1,
        content:
          prior?.partIIIQuestions[index]?.content ||
          `Câu ${index + 1}. Xem nội dung trong đề thi đính kèm.`,
        correctAnswer:
          partIIIKeys[index] ??
          prior?.partIIIQuestions[index]?.correctAnswer ??
          "0",
        explanation: prior?.partIIIQuestions[index]?.explanation || "",
      }),
    );
    const id = draft.id || `exam_${Date.now()}`;
    const nextAssignment: Assignment = {
      id,
      title: draft.title.trim(),
      description: draft.description.trim(),
      duration: draft.duration,
      maxAttempts: draft.maxAttempts,
      examType: draft.examType,
      partIQuestions,
      partIIQuestions,
      partIIIQuestions,
      targetClassId: draft.targetClassId,
      isPublished: true,
      createdDate: prior?.createdDate || new Date().toISOString(),
      fileData: draft.fileData,
      fileName: draft.fileName,
      startTime: new Date(draft.startTime).toISOString(),
      endTime: new Date(draft.endTime).toISOString(),
      openTime: new Date(draft.startTime).toISOString(),
      closeTime: new Date(draft.endTime).toISOString(),
    };
    const payload = {
      id,
      title: nextAssignment.title,
      description: nextAssignment.description,
      duration: nextAssignment.duration,
      max_attempts: nextAssignment.maxAttempts,
      exam_type: nextAssignment.examType,
      part_i_questions: partIQuestions,
      part_ii_questions: partIIQuestions,
      part_iii_questions: partIIIQuestions,
      target_class_id: nextAssignment.targetClassId,
      is_published: true,
      created_date: nextAssignment.createdDate,
      file_data: nextAssignment.fileData,
      file_name: nextAssignment.fileName,
      start_time: nextAssignment.startTime,
      end_time: nextAssignment.endTime,
      open_time: nextAssignment.openTime,
      close_time: nextAssignment.closeTime,
    };
    let { error } = await supabase.from("assignments").upsert(payload);
    if (error && ["42703", "PGRST204"].includes(error.code || "")) {
      const { description: _description, max_attempts: _maxAttempts, start_time: _startTime, end_time: _endTime, ...legacyPayload } = payload;
      ({ error } = await supabase.from("assignments").upsert(legacyPayload));
      if (!error) {
        try {
          const saved = JSON.parse(localStorage.getItem("qmath_assignment_meta") || "{}");
          saved[id] = {
            description: nextAssignment.description,
            maxAttempts: nextAssignment.maxAttempts,
            startTime: nextAssignment.startTime,
            endTime: nextAssignment.endTime,
          };
          localStorage.setItem("qmath_assignment_meta", JSON.stringify(saved));
        } catch { /* Optional legacy-schema metadata cache. */ }
      }
    }
    if (error) return error.message;
    setAssignments((current) => [
      nextAssignment,
      ...current.filter((assignment) => assignment.id !== id),
    ]);
    setExamDraft(null);
    setNotice(
      draft.id ? "Đề thi đã được cập nhật trên Supabase." : "Đề thi đã được xuất bản lên Supabase.",
    );
    return null;
  };

  const saveGroup = async (group: ClassGroup) => {
    const { error } = await supabase.from("class_groups").upsert({
      id: group.id,
      name: group.name,
      description: group.description || "",
      lectures: group.lectures || [],
    });
    if (error) {
      setNotice(`Không lưu được lớp học: ${error.message}`);
      return;
    }
    setClasses((current) => [
      group,
      ...current.filter((item) => item.id !== group.id),
    ]);
    setNotice("Lớp học đã được lưu lên Supabase.");
  };

  const activeAssignments = useMemo(
    () =>
      assignments.filter(
        (assignment) =>
          assignment.isPublished &&
          (account?.role === "tutor" ||
            assignment.targetClassId === "all" ||
            !assignment.targetClassId ||
            classes.find((group) => group.name === account?.classGroup)?.id ===
              assignment.targetClassId),
      ),
    [account, assignments, classes],
  );
  const studentAttempts = useMemo(
    () =>
      attempts.filter(
        (attempt) =>
          account?.role === "tutor" || attempt.studentId === account?.id,
      ),
    [account, attempts],
  );
  const liveSessions = useMemo(
    () =>
      sessions.filter(
        (session) =>
          session.status === "in_progress" &&
          monitorNow - new Date(session.lastSeenAt).getTime() < 60000,
      ),
    [monitorNow, sessions],
  );
  const persistSession = async (session: ExamSession) => {
    setSessions((current) => [
      session,
      ...current.filter((item) => item.id !== session.id),
    ]);
    if (sessionTableMissingRef.current) return;
    const { error } = await supabase.from("exam_sessions").upsert({
      id: session.id,
      assignment_id: session.assignmentId,
      student_id: session.studentId,
      student_name: session.studentName,
      status: session.status,
      progress: session.progress,
      total_items: session.totalItems,
      started_at: session.startedAt,
      last_seen_at: session.lastSeenAt,
    });
    if (error) {
      sessionTableMissingRef.current = true;
      setSessionTableMissing(true);
    }
  };
  const submitAttempt = async (attempt: ExamAttempt) => {
    if (!account || !activeExam) return;
    const { count, error: countError } = await supabase
      .from("attempts")
      .select("id", { count: "exact", head: true })
      .eq("student_id", account.id)
      .eq("assignment_id", activeExam.id);
    if (countError) {
      setActiveExam(null);
      setNotice(`Không thể xác minh số lượt làm bài: ${countError.message}`);
      return;
    }
    if ((count ?? 0) >= (activeExam.maxAttempts || 1)) {
      setActiveExam(null);
      setNotice("Đã đạt số lần làm tối đa cho đề thi này.");
      return;
    }
    const totalQuestions =
      activeExam.partIQuestions.length +
      activeExam.partIIQuestions.length * 4 +
      activeExam.partIIIQuestions.length;
    const correctCount =
      Object.values(attempt.gradedDetails.partIResult).filter(Boolean).length +
      Object.values(attempt.gradedDetails.partIIDetail).reduce(
        (sum, detail) => sum + detail.correctCount,
        0,
      ) +
      Object.values(attempt.gradedDetails.partIIIResult).filter(Boolean).length;
    const finalId = `attempt_${account.id}_${attempt.assignmentId}_${Date.now()}`;
    const submitTime = new Date().toISOString();
    const savedAttempt: ExamAttempt = {
      ...attempt,
      id: finalId,
      studentId: account.id,
      totalQuestions,
      correctCount,
      submitTime,
    };
    const { error } = await supabase.from("attempts").upsert({
      id: finalId,
      assignment_id: attempt.assignmentId,
      student_id: account.id,
      start_time: attempt.startTime,
      submit_time: submitTime,
      score: attempt.score,
      total_questions: totalQuestions,
      correct_count: correctCount,
      answers: attempt.answers,
      graded_details: attempt.gradedDetails,
    });
    if (error) {
      setNotice(`Không lưu được bài nộp: ${error.message}`);
      return;
    }
    setAttempts((current) => [savedAttempt, ...current]);
    const existingSession = sessions.find((session) => session.id === `${account.id}_${attempt.assignmentId}`);
    await persistSession({
      id: `${account.id}_${attempt.assignmentId}`,
      assignmentId: attempt.assignmentId,
      studentId: account.id,
      studentName: account.name,
      status: "submitted",
      progress: sessionProgress.current.progress,
      totalItems: sessionProgress.current.total,
      startedAt: existingSession?.startedAt || submitTime,
      lastSeenAt: submitTime,
    });
    setActiveExam(null);
    const assignment =
      assignments.find((item) => item.id === attempt.assignmentId) ||
      activeExam;
    const student: Student = {
      id: account.id,
      name: account.name,
      classGroup: account.classGroup || "",
    };
    setReview({
      attempt: savedAttempt,
      assignment,
      student,
    });
    setNotice("Bài làm đã được lưu lên Supabase.");
    void refresh(false);
  };

  const beginExam = async (assignment: Assignment) => {
    if (!account || account.role !== "student") return;
    const { count, error } = await supabase
      .from("attempts")
      .select("id", { count: "exact", head: true })
      .eq("student_id", account.id)
      .eq("assignment_id", assignment.id);
    if (error) {
      setNotice(`Không thể kiểm tra số lượt làm bài: ${error.message}`);
      return;
    }
    if ((count ?? 0) >= (assignment.maxAttempts || 1)) {
      setNotice("Đã đạt số lần làm tối đa cho đề thi này.");
      return;
    }
    sessionProgress.current = {
      progress: 0,
      total:
        assignment.partIQuestions.length +
        assignment.partIIQuestions.length +
        assignment.partIIIQuestions.length,
    };
    setActiveExam(assignment);
    const now = new Date().toISOString();
    await persistSession({
        id: `${account.id}_${assignment.id}`,
        assignmentId: assignment.id,
        studentId: account.id,
        studentName: account.name,
        status: "in_progress",
        progress: 0,
        totalItems: sessionProgress.current.total,
        startedAt: now,
        lastSeenAt: now,
    });
  };

  useEffect(() => {
    if (
      !activeExam ||
      !account ||
      account.role !== "student"
    )
      return;
    const timer = window.setInterval(() => {
      const { progress, total } = sessionProgress.current;
      const lastSeenAt = new Date().toISOString();
      const existingSession = sessions.find((session) => session.id === `${account.id}_${activeExam.id}`);
      void persistSession({
          id: `${account.id}_${activeExam.id}`,
          assignmentId: activeExam.id,
          studentId: account.id,
          studentName: account.name,
          status: "in_progress",
          progress,
          totalItems: total,
          startedAt: existingSession?.startedAt || lastSeenAt,
          lastSeenAt,
      });
    }, 5000);
    return () => window.clearInterval(timer);
  }, [activeExam, account, sessions]);

  const exitExam = async () => {
    if (activeExam && account) {
      const previous = sessions.find((session) => session.id === `${account.id}_${activeExam.id}`);
      await persistSession({
        id: `${account.id}_${activeExam.id}`,
        assignmentId: activeExam.id,
        studentId: account.id,
        studentName: account.name,
        status: "abandoned",
        progress: sessionProgress.current.progress,
        totalItems: sessionProgress.current.total,
        startedAt: previous?.startedAt || new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
      });
    }
    setActiveExam(null);
  };
  const signOut = async () => {
    if (activeExam) await exitExam();
    localStorage.removeItem(accountKey);
    setAccount(null);
    setShowHome(true);
    setArea("exams");
    setReview(null);
  };
  const addStudent = async (event: FormEvent) => {
    event.preventDefault();
    if (students.some((student) => student.id.toUpperCase() === newStudent.id.trim().toUpperCase())) {
      setNotice("Mã học viên này đã tồn tại.");
      return;
    }
    const { data, error } = await supabase.from("students").insert({
      id: newStudent.id.trim().toUpperCase(),
      name: newStudent.name.trim(),
      class_group: newStudent.classGroup,
      password: newStudent.password,
    }).select("id,name,password,class_group").single();
    if (error) {
      setNotice(`Không cấp được tài khoản học viên: ${error.message}`);
      return;
    }
    setStudents((current) => [...current, {
      id: String(data.id), name: data.name, password: data.password, classGroup: data.class_group || "",
    }]);
    setNewStudent({ id: "", name: "", classGroup: "", password: "" });
    setNotice("Đã cấp tài khoản học viên trên Supabase.");
  };
  const resetStudentPassword = async (student: Student) => {
    const password = window.prompt(
      `Mật khẩu mới cho ${student.name} (tối thiểu 8 ký tự):`,
    );
    if (password === null) return;
    if (password.trim().length < 8) {
      setNotice("Mật khẩu phải có ít nhất 8 ký tự.");
      return;
    }
    const { error } = await supabase.from("students").update({ password: password.trim() }).eq("id", student.id);
    if (error) {
      setNotice(`Không cập nhật được mật khẩu: ${error.message}`);
      return;
    }
    setStudents((current) => current.map((item) => item.id === student.id ? { ...item, password: password.trim() } : item));
    setNotice(`Đã cập nhật mật khẩu cho ${student.name}.`);
  };
  const removeStudent = async (student: Student) => {
    if (!window.confirm(`Xóa tài khoản ${student.name} và toàn bộ bài nộp?`))
      return;
    const { error: attemptsError } = await supabase.from("attempts").delete().eq("student_id", student.id);
    if (attemptsError) {
      setNotice(`Không xóa được bài nộp: ${attemptsError.message}`);
      return;
    }
    const { error } = await supabase.from("students").delete().eq("id", student.id);
    if (error) {
      setNotice(`Không xóa được học viên: ${error.message}`);
      return;
    }
    setAttempts((current) => current.filter((attempt) => attempt.studentId !== student.id));
    setSessions((current) => current.filter((session) => session.studentId !== student.id));
    setStudents((current) => current.filter((item) => item.id !== student.id));
    setNotice(`Đã xóa tài khoản ${student.name} và lịch sử bài nộp trên Supabase.`);
  };
  const addClass = async (event: FormEvent) => {
    event.preventDefault();
    await saveGroup({
      id: `class_${Date.now()}`,
      name: newClass.name.trim(),
      description: newClass.description.trim(),
      lectures: [],
    });
    setNewClass({ name: "", description: "" });
  };
  const addMaterial = async (event: FormEvent) => {
    event.preventDefault();
    const group = classes.find((item) => item.id === materialClassId);
    if (!group || !materialFile || !materialTitle.trim()) return;
    const lecture: Lecture = {
      id: `lecture_${Date.now()}`,
      title: materialTitle.trim(),
      fileName: materialFile.name,
      fileData: materialFile.data,
      uploadedAt: new Date().toISOString(),
    };
    await saveGroup({ ...group, lectures: [...group.lectures, lecture] });
    setMaterialTitle("");
    setMaterialFile(null);
    setNotice("Tài liệu đã được lưu vào lớp.");
  };

  const title =
    area === "exams"
      ? "Thi thử"
      : area === "results"
        ? "Kết quả học tập"
        : "Kho tài liệu";
  const visibleAssignments = activeAssignments;

  return (
    <div className="qm-app">
      <header className="qm-topbar">
        <div className="qm-topbar-inner">
          <button
            className="qm-brand"
            type="button"
            onClick={() => {
              setActiveExam(null);
              setReview(null);
              setShowHome(true);
              setArea("exams");
            }}
          >
              <img className="qm-brand-image" src="/logo.png" alt="QMath" />
          </button>
          <button
            className="qm-menu-toggle qm-icon-button"
            type="button"
            aria-label="Mở điều hướng"
            onClick={() => setMobileMenu((open) => !open)}
          >
            <Menu size={19} />
          </button>
          <nav
            className={`qm-nav${mobileMenu ? " is-open" : ""}`}
            aria-label="Điều hướng chính"
          >
            {(["exams", "results", "materials"] as Area[]).map((item) => (
              <button
                key={item}
                type="button"
                className={account && area === item ? "is-active" : ""}
                onClick={() => requestArea(item)}
              >
                {item === "exams"
                  ? "Thi thử"
                  : item === "results"
                    ? "Kết quả"
                    : "Tài liệu"}
              </button>
            ))}
          </nav>
          <div className="qm-account-actions">
            {account ? (
              <>
                <span className="qm-account-name">
                  <CircleUserRound size={16} />
                  {account.name}
                  <small>
                    {account.role === "tutor" ? "Gia sư" : "Học viên"}
                  </small>
                </span>
                <button
                  className="qm-button qm-button-outline qm-signout"
                  type="button"
                  onClick={() => void signOut()}
                >
                  <LogOut size={15} />
                  <span>Đăng xuất</span>
                </button>
              </>
            ) : (
              <button
                className="qm-button qm-button-primary"
                type="button"
                onClick={() => {
                  setLoginTarget("exams");
                  setLoginOpen(true);
                }}
              >
                Đăng nhập
                <ArrowRight size={15} />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className={`qm-main${activeExam || review ? " qm-main-exam" : ""}`}>
        {showHome ? (
          <>
            <section className="qm-hero">
              <div className="qm-hero-copy">
                <span className="qm-hero-badge">Không gian học toán của bạn</span>
                <h1>
                  Lớp toán
                  <br />
                  <em>anh Quân</em>
                </h1>
                <p className="qm-hero-body">
                  Một không gian học tập kết nối đề thi, kết quả và học liệu
                  trong hành trình chinh phục Toán học.
                </p>
                <div className="qm-hero-actions">
                  <button
                    className="qm-button qm-button-primary qm-button-large"
                    type="button"
                    onClick={() => {
                      setLoginTarget("exams");
                      setLoginOpen(true);
                    }}
                  >
                    Vào không gian học
                    <ArrowRight size={17} />
                  </button>
                  <span>
                    <ShieldCheck size={15} /> Tài khoản được cấp riêng cho học
                    viên
                  </span>
                </div>
              </div>
              <img className="qm-home-hero-image" src="/math-hero.png" alt="" />
            </section>
            <section className="qm-home-features">
              <div className="qm-section-heading">
                <div>
                  <span className="qm-overline">
                    MỘT NỀN TẢNG, BA CHẶNG HỌC
                  </span>
                  <h2>Chạm đúng mục tiêu của bạn</h2>
                </div>
                <p>
                  Đăng nhập để truy cập không gian được cá nhân hóa theo vai trò
                  và lớp học.
                </p>
              </div>
              <div className="qm-feature-grid">
                {[
                  {
                    icon: Clock3,
                    title: "Thi thử có lịch",
                    text: "Đề thi PDF, thời gian thực và bộ đáp án linh hoạt.",
                  },
                  {
                    icon: Activity,
                    title: "Theo dõi tiến bộ",
                    text: "Kết quả từng phần, lịch sử luyện đề và phân tích điểm.",
                  },
                  {
                    icon: BookOpen,
                    title: "Học liệu theo lớp",
                    text: "Bài giảng và tài liệu ôn tập được gia sư chia sẻ.",
                  },
                ].map(({ icon: Icon, title: featureTitle, text }) => (
                  <button
                    className="qm-feature"
                    type="button"
                    key={featureTitle}
                    onClick={() => {
                      setLoginTarget(
                        featureTitle.includes("Thi")
                          ? "exams"
                          : featureTitle.includes("tiến")
                            ? "results"
                            : "materials",
                      );
                      setLoginOpen(true);
                    }}
                  >
                    <span>
                      <Icon size={19} />
                    </span>
                    <strong>{featureTitle}</strong>
                    <small>{text}</small>
                    <ArrowRight size={15} className="qm-feature-arrow" />
                  </button>
                ))}
              </div>
            </section>
          </>
        ) : activeExam ? (
          <ExamTaker
            assignment={activeExam}
            studentId={account.id}
            onProgress={(progress, total) => {
              sessionProgress.current = { progress, total };
            }}
            onSubmit={(attempt) => void submitAttempt(attempt)}
            onCancel={() => void exitExam()}
          />
        ) : review ? (
          <ExamReview
            attempt={review.attempt}
            assignment={review.assignment}
            student={review.student}
            onClose={() => setReview(null)}
          />
        ) : (
          <div className="qm-dashboard">
            <div className="qm-page-heading">
              <div>
                <span className="qm-overline">
                  {account.role === "tutor"
                    ? "KHÔNG GIAN GIA SƯ"
                    : `HỌC VIÊN · ${account.classGroup || "QMATH"}`}
                </span>
                <h1>{title}</h1>
                <p>
                  {account.role === "tutor"
                    ? "Quản lý đề thi, lớp học và nhịp học tập theo thời gian thực."
                    : `Chào ${account.name}, sẵn sàng cho phiên luyện tập tiếp theo?`}
                </p>
              </div>
              <div className="qm-page-heading-actions">
                {account.role === "tutor" && area === "exams" && (
                  <button
                    className="qm-button qm-button-primary"
                    type="button"
                    onClick={() => setExamDraft(makeDraft())}
                  >
                    <Plus size={16} />
                    Tạo đề thi
                  </button>
                )}
                <span className="qm-live-badge">
                  <i /> ĐỒNG BỘ SUPABASE
                </span>
              </div>
            </div>
            {loadError && (
              <div className="qm-alert" role="alert">
                {loadError}
                <button type="button" onClick={() => void refresh()}>
                  Thử lại
                </button>
              </div>
            )}
            {notice && (
              <div className="qm-notice" role="status">
                {notice}
                <button
                  className="qm-icon-button"
                  type="button"
                  onClick={() => setNotice("")}
                  aria-label="Đóng thông báo"
                >
                  <X size={15} />
                </button>
              </div>
            )}
            {area === "exams" && (
              <>
                {account.role === "tutor" && (
                  <section className="qm-metrics-grid">
                  <Metric
                    label={
                      account.role === "tutor"
                        ? "Đề thi đã xuất bản"
                        : "Đề thi đang mở"
                    }
                    value={
                      account.role === "tutor"
                        ? assignments.length
                        : visibleAssignments.length
                    }
                    detail="Trong không gian học"
                    icon={FileText}
                  />
                  <Metric
                    label={
                      account.role === "tutor" ? "Học viên" : "Lượt luyện tập"
                    }
                    value={
                      account.role === "tutor"
                        ? students.length
                        : studentAttempts.length
                    }
                    detail={
                      account.role === "tutor"
                        ? "Hồ sơ được quản lý"
                        : "Bài đã hoàn thành"
                    }
                    icon={GraduationCap}
                  />
                  <Metric
                    label="Đang làm bài"
                    value={liveSessions.length}
                    detail="Trực tiếp trong phòng thi"
                    icon={Radio}
                  />
                  <Metric
                    label="Tài liệu lớp"
                    value={classes.reduce(
                      (sum, group) => sum + group.lectures.length,
                      0,
                    )}
                    detail="Được lưu trên QMath"
                    icon={BookOpen}
                  />
                  </section>
                )}
                {account.role === "tutor" && (
                  <section className="qm-panel qm-live-panel">
                    <div className="qm-panel-heading">
                      <div>
                        <span className="qm-overline">GIÁM SÁT PHÒNG THI</span>
                        <h2>Phòng thi đang hoạt động</h2>
                      </div>
                      <span className="qm-live-badge">
                        <i /> {liveSessions.length} ĐANG THI
                      </span>
                    </div>
                    {liveSessions.length ? (
                      <div className="qm-live-list">
                        {liveSessions.map((session) => (
                          <div className="qm-live-row" key={session.id}>
                            <span className="qm-live-avatar">
                              <Activity size={17} />
                            </span>
                            <div className="qm-live-student">
                              <strong>{session.studentName}</strong>
                              <small>
                                {assignments.find(
                                  (item) => item.id === session.assignmentId,
                                )?.title || "Đề thi"}
                              </small>
                            </div>
                            <div className="qm-progress">
                              <span>
                                <i
                                  style={{
                                    width: `${session.totalItems ? Math.min(100, (session.progress / session.totalItems) * 100) : 0}%`,
                                  }}
                                />
                              </span>
                              <small>
                                {session.progress}/{session.totalItems} câu
                              </small>
                            </div>
                            <time>
                              {new Date(session.lastSeenAt).toLocaleTimeString(
                                "vi-VN",
                                { hour: "2-digit", minute: "2-digit" },
                              )}
                            </time>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="qm-empty-inline">
                        <Radio size={18} /> Chưa có học viên đang làm bài.
                      </div>
                    )}
                  </section>
                )}
                <section className="qm-panel">
                  <div className="qm-panel-heading">
                    <div>
                      <span className="qm-overline">
                        {account.role === "tutor"
                          ? "KHO ĐỀ THI"
                          : "ĐỀ THI HIỆN CÓ"}
                      </span>
                      <h2>
                        {account.role === "tutor"
                          ? "Danh sách đề thi"
                          : "Đề thi dành cho bạn"}
                      </h2>
                    </div>
                    {account.role === "tutor" && (
                      <span className="qm-table-count">
                        {assignments.length} ĐỀ
                      </span>
                    )}
                  </div>
                  {busy ? (
                    <div className="qm-empty-inline">Đang đồng bộ dữ liệu…</div>
                  ) : visibleAssignments.length === 0 ? (
                    <div className="qm-empty">
                      <FilePlus2 size={27} />
                      <strong>Chưa có đề thi phù hợp</strong>
                      <span>
                        Đề thi sẽ hiển thị tại đây sau khi được gia sư xuất bản.
                      </span>
                    </div>
                  ) : (
                    <div className="qm-exam-list">
                      {visibleAssignments.map((assignment) => {
                        const start = new Date(
                          assignment.startTime || "",
                        ).getTime();
                        const end = new Date(
                          assignment.endTime || "",
                        ).getTime();
                        const now = Date.now();
                        const validWindow =
                          Number.isFinite(start) &&
                          Number.isFinite(end) &&
                          start > 0 &&
                          end > start;
                        const locked =
                          account.role === "student" &&
                          (!validWindow || now < start || now > end);
                        const attemptsUsed = studentAttempts.filter(
                          (attempt) => attempt.assignmentId === assignment.id,
                        ).length;
                        const maxAttempts = assignment.maxAttempts || 1;
                        const completed =
                          account.role === "student" &&
                          attemptsUsed >= maxAttempts;
                        return (
                          <article className="qm-exam-row" key={assignment.id}>
                            <span className="qm-exam-symbol">
                              <FileText size={19} />
                            </span>
                            <div className="qm-exam-main">
                              <div className="qm-exam-title-line">
                                {account.role === "tutor" ? (
                                  <button
                                    className="qm-exam-title-button"
                                    type="button"
                                    onClick={() => {
                                      setSelectedAnalyticsExamId(assignment.id);
                                      setSelectedAnalyticsClassId("all");
                                      setArea("results");
                                      setShowHome(false);
                                    }}
                                  >
                                    {assignment.title}
                                  </button>
                                ) : <h3>{assignment.title}</h3>}
                                <span
                                  className={`qm-type-badge type-${assignment.examType?.toLowerCase()}`}
                                >
                                  {
                                    examTypeLabels[
                                      assignment.examType || "THPTQG"
                                    ]
                                  }
                                </span>
                              </div>
                              <p>
                                {assignment.description ||
                                  "Đề luyện tập Toán học"}
                              </p>
                              <div className="qm-exam-meta">
                                <span>
                                  <Clock3 size={13} />
                                  {assignment.duration} phút
                                </span>
                                <span>Tối đa {maxAttempts} lượt</span>
                                {account.role === "student" && (
                                  <span>
                                    Đã dùng {attemptsUsed}/{maxAttempts} lượt
                                  </span>
                                )}
                                <span>
                                  {assignment.partIQuestions.length +
                                    assignment.partIIQuestions.length +
                                    assignment.partIIIQuestions.length}{" "}
                                  câu
                                </span>
                                <span>
                                  {validWindow
                                    ? `${new Date(start).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })} – ${new Date(end).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`
                                    : "Chưa thiết lập lịch thi"}
                                </span>
                              </div>
                            </div>
                            {account.role === "tutor" ? (
                              <div className="qm-exam-actions">
                                <button
                                  className="qm-button qm-button-outline"
                                  type="button"
                                  onClick={() => {
                                    setSelectedAnalyticsExamId(assignment.id);
                                    setSelectedAnalyticsClassId("all");
                                    setArea("results");
                                    setShowHome(false);
                                  }}
                                >
                                  Theo dõi
                                </button>
                                <button
                                  className="qm-button qm-button-outline"
                                  type="button"
                                  onClick={() =>
                                    setExamDraft(makeDraft(assignment))
                                  }
                                >
                                  Chỉnh sửa
                                </button>
                                <button
                                  className="qm-icon-button qm-danger-icon"
                                  type="button"
                                  title="Xóa đề"
                                  onClick={async () => {
                                    if (
                                      !window.confirm(
                                        `Xóa đề thi “${assignment.title}”?`,
                                      )
                                    )
                                      return;
                                    const { error } = await supabase.from("assignments").delete().eq("id", assignment.id);
                                    if (error) {
                                      setNotice(`Không xóa được đề thi: ${error.message}`);
                                      return;
                                    }
                                    setAssignments((current) => current.filter((item) => item.id !== assignment.id));
                                    setAttempts((current) => current.filter((attempt) => attempt.assignmentId !== assignment.id));
                                    setSessions((current) => current.filter((session) => session.assignmentId !== assignment.id));
                                    setNotice("Đã xóa đề thi trên Supabase.");
                                    void refresh(false);
                                  }}
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            ) : (
                              <button
                                className="qm-button qm-button-primary qm-start-button"
                                type="button"
                                disabled={locked || completed}
                                onClick={() => void beginExam(assignment)}
                              >
                                {completed
                                  ? "Đã hết lượt"
                                  : locked
                                    ? !validWindow
                                      ? "Thiếu lịch"
                                      : now < start
                                        ? "Chưa mở"
                                        : "Đã kết thúc"
                                    : attemptsUsed > 0
                                      ? `Làm lượt ${attemptsUsed + 1}/${maxAttempts}`
                                      : "Vào thi"}
                                <ArrowRight size={15} />
                              </button>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>
                {account.role === "tutor" && (
                  <div className="qm-lower-grid qm-single-panel">
                    <section className="qm-panel">
                      <div className="qm-panel-heading">
                        <div>
                          <span className="qm-overline">DANH SÁCH HỌC VIÊN</span>
                          <h2>Học viên</h2>
                        </div>
                        <span className="qm-table-count">
                          {students.length}
                        </span>
                      </div>
                      <form className="qm-inline-form" onSubmit={addStudent}>
                        <input
                          required
                          placeholder="Mã học viên"
                          value={newStudent.id}
                          onChange={(event) =>
                            setNewStudent((value) => ({
                              ...value,
                              id: event.target.value,
                            }))
                          }
                        />
                        <input
                          required
                          placeholder="Họ tên"
                          value={newStudent.name}
                          onChange={(event) =>
                            setNewStudent((value) => ({
                              ...value,
                              name: event.target.value,
                            }))
                          }
                        />
                        <select
                          required
                          value={newStudent.classGroup}
                          onChange={(event) =>
                            setNewStudent((value) => ({
                              ...value,
                              classGroup: event.target.value,
                            }))
                          }
                        >
                          <option value="">Chọn lớp</option>
                          {classes.map((group) => (
                            <option key={group.id} value={group.name}>
                              {group.name}
                            </option>
                          ))}
                        </select>
                        <input
                          required
                          minLength={8}
                          placeholder="Mật khẩu"
                          value={newStudent.password}
                          onChange={(event) =>
                            setNewStudent((value) => ({
                              ...value,
                              password: event.target.value,
                            }))
                          }
                        />
                        <button
                          className="qm-icon-button qm-add-button"
                          title="Cấp tài khoản"
                        >
                          <Plus size={17} />
                        </button>
                      </form>
                      <div className="qm-compact-list">
                        {students.map((student) => (
                          <div key={student.id}>
                            <span className="qm-list-avatar">
                              {student.name.charAt(0)}
                            </span>
                            <strong>{student.name}</strong>
                            <small>
                              {student.classGroup || "Chưa xếp lớp"}
                            </small>
                            <span className="qm-score-pill">
                              {
                                attempts.filter(
                                  (attempt) => attempt.studentId === student.id,
                                ).length
                              }{" "}
                              bài
                            </span>
                            <button
                              className="qm-icon-button"
                              type="button"
                              title="Đặt lại mật khẩu"
                              onClick={() => void resetStudentPassword(student)}
                            >
                              <LockKeyhole size={13} />
                            </button>
                            <button
                              className="qm-icon-button qm-danger-icon"
                              type="button"
                              title="Xóa học viên"
                              onClick={() => void removeStudent(student)}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                )}
              </>
            )}

            {account.role === "tutor" && area === "results" && (
              <TutorAnalytics
                students={students}
                assignments={assignments}
                attempts={attempts}
                classes={classes}
                liveSessions={liveSessions}
                selectedExamId={selectedAnalyticsExamId}
                selectedClassId={selectedAnalyticsClassId}
                onSelectExam={setSelectedAnalyticsExamId}
                onSelectClass={setSelectedAnalyticsClassId}
                onReview={(attempt, assignment, student) =>
                  setReview({ attempt, assignment, student })
                }
              />
            )}
            {account.role === "student" && area === "results" && (
              <section className="qm-results-layout">
                <section className="qm-panel">
                  <div className="qm-panel-heading">
                    <div>
                      <span className="qm-overline">BÀI ĐÃ NỘP</span>
                      <h2>Bài làm gần đây</h2>
                    </div>
                  </div>
                  <div className="qm-result-list">
                    {studentAttempts.length === 0 ? (
                      <div className="qm-empty-inline">
                        Chưa có bài làm được lưu.
                      </div>
                    ) : (
                      studentAttempts.map((attempt) => {
                        const assignment = assignments.find(
                          (item) => item.id === attempt.assignmentId,
                        );
                        const student = students.find(
                          (item) => item.id === attempt.studentId,
                        ) || {
                          id: account.id,
                          name: account.name,
                          classGroup: account.classGroup || "",
                        };
                        const canReview =
                          account.role === "tutor" ||
                          !assignment?.endTime ||
                          Date.now() >= new Date(assignment.endTime).getTime();
                        return (
                          <article className="qm-result-row" key={attempt.id}>
                            <div>
                              <strong>
                                {assignment?.title || "Đề thi đã lưu"}
                              </strong>
                              <small>
                                {account.role === "tutor"
                                  ? `${student.name} · `
                                  : ""}
                                {new Date(attempt.submitTime).toLocaleString(
                                  "vi-VN",
                                )}
                              </small>
                            </div>
                            <span className="qm-result-score">
                              {attempt.score.toFixed(2)}
                              <small>/ 10</small>
                            </span>
                            <button
                              className="qm-button qm-button-outline"
                              disabled={!canReview || !assignment}
                              type="button"
                              onClick={() =>
                                assignment &&
                                setReview({ attempt, assignment, student })
                              }
                            >
                              {canReview ? "Xem bài" : "Mở sau giờ thi"}
                            </button>
                          </article>
                        );
                      })
                    )}
                  </div>
                </section>
                {account.role === "tutor" && (
                  <section className="qm-panel">
                    <div className="qm-panel-heading">
                      <div>
                        <span className="qm-overline">PHIÊN THI ĐANG DIỄN RA</span>
                        <h2>Giám sát trực tiếp</h2>
                      </div>
                      <span className="qm-live-badge">
                        <i /> {liveSessions.length} ĐANG THI
                      </span>
                    </div>
                    {liveSessions.length ? (
                      liveSessions.map((session) => (
                        <div className="qm-live-row" key={session.id}>
                          <span className="qm-live-avatar">
                            <Activity size={17} />
                          </span>
                          <div className="qm-live-student">
                            <strong>{session.studentName}</strong>
                            <small>
                              {
                                assignments.find(
                                  (assignment) =>
                                    assignment.id === session.assignmentId,
                                )?.title
                              }
                            </small>
                          </div>
                          <div className="qm-progress">
                            <span>
                              <i
                                style={{
                                  width: `${session.totalItems ? Math.min(100, (session.progress / session.totalItems) * 100) : 0}%`,
                                }}
                              />
                            </span>
                            <small>
                              {session.progress}/{session.totalItems} câu
                            </small>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="qm-empty-inline">
                        Chưa có phiên thi đang hoạt động.
                      </div>
                    )}
                  </section>
                )}
              </section>
            )}

            {area === "materials" && (
              <div className="qm-materials-layout">
                {account.role === "tutor" && (
                  <section className="qm-panel">
                    <div className="qm-panel-heading">
                      <div>
                        <span className="qm-overline">KHO TÀI LIỆU LỚP</span>
                        <h2>Thêm tài liệu vào lớp</h2>
                      </div>
                    </div>
                    <form
                      className="qm-material-form"
                      onSubmit={(event) => void addMaterial(event)}
                    >
                      <select
                        required
                        value={materialClassId}
                        onChange={(event) =>
                          setMaterialClassId(event.target.value)
                        }
                      >
                        <option value="">Chọn lớp nhận tài liệu</option>
                        {classes.map((group) => (
                          <option key={group.id} value={group.id}>
                            {group.name}
                          </option>
                        ))}
                      </select>
                      <input
                        required
                        value={materialTitle}
                        onChange={(event) =>
                          setMaterialTitle(event.target.value)
                        }
                        placeholder="Tên bài giảng hoặc chuyên đề"
                      />
                      <label className="qm-upload-control">
                        <Upload size={17} />
                        <span>
                          <strong>
                            {materialFile?.name || "Chọn tệp PDF hoặc hình ảnh"}
                          </strong>
                          <small>Lưu trong kho tài liệu của lớp</small>
                        </span>
                        <input
                          type="file"
                          accept=".pdf,image/*,.docx"
                          onChange={async (event) => {
                            const file = event.target.files?.[0];
                            if (file)
                              setMaterialFile({
                                data: await readFile(file),
                                name: file.name,
                              });
                          }}
                        />
                      </label>
                      <button
                        className="qm-button qm-button-primary"
                        type="submit"
                        disabled={!materialFile}
                      >
                        <Upload size={15} />
                        Đăng tài liệu
                      </button>
                    </form>
                    <div className="qm-class-create">
                      <h3>Tạo nhóm lớp</h3>
                      <form className="qm-inline-form" onSubmit={addClass}>
                        <input
                          required
                          placeholder="Tên lớp"
                          value={newClass.name}
                          onChange={(event) =>
                            setNewClass((value) => ({
                              ...value,
                              name: event.target.value,
                            }))
                          }
                        />
                        <input
                          placeholder="Mô tả"
                          value={newClass.description}
                          onChange={(event) =>
                            setNewClass((value) => ({
                              ...value,
                              description: event.target.value,
                            }))
                          }
                        />
                        <button
                          className="qm-icon-button qm-add-button"
                          title="Tạo lớp"
                        >
                          <Plus size={17} />
                        </button>
                      </form>
                    </div>
                  </section>
                )}
                {classes
                  .filter(
                    (group) =>
                      account.role === "tutor" ||
                      group.name.toLowerCase() ===
                        (account.classGroup || "").toLowerCase(),
                  )
                  .map((group) => (
                    <section className="qm-panel" key={group.id}>
                      <div className="qm-panel-heading">
                        <div>
                          <span className="qm-overline">{group.name}</span>
                          <h2>
                            {group.description || "Bài giảng và học liệu"}
                          </h2>
                        </div>
                        <span className="qm-table-count">
                          {group.lectures.length} TỆP
                        </span>
                      </div>
                      {group.lectures.length ? (
                        <div className="qm-material-list">
                          {group.lectures.map((lecture) => (
                            <article
                              className="qm-material-row"
                              key={lecture.id}
                            >
                              <span className="qm-material-icon">
                                <FileText size={18} />
                              </span>
                              <div>
                                <strong>{lecture.title}</strong>
                                <small>
                                  {lecture.fileName} ·{" "}
                                  {new Date(
                                    lecture.uploadedAt,
                                  ).toLocaleDateString("vi-VN")}
                                </small>
                              </div>
                              <button
                                className="qm-icon-button"
                                type="button"
                                title="Mở tài liệu"
                                onClick={() =>
                                  openBase64InNewTab(
                                    lecture.fileData,
                                    lecture.fileName,
                                  )
                                }
                              >
                                <ArrowDownToLine size={17} />
                              </button>
                              {account.role === "tutor" && (
                                <button
                                  className="qm-icon-button qm-danger-icon"
                                  type="button"
                                  title="Xóa tài liệu"
                                  onClick={() =>
                                    void saveGroup({
                                      ...group,
                                      lectures: group.lectures.filter(
                                        (item) => item.id !== lecture.id,
                                      ),
                                    })
                                  }
                                >
                                  <X size={16} />
                                </button>
                              )}
                            </article>
                          ))}
                        </div>
                      ) : (
                        <div className="qm-empty-inline">
                          <BookOpen size={18} />
                          Kho tài liệu này hiện đang trống.
                        </div>
                      )}
                    </section>
                  ))}
                {account.role === "student" &&
                  !classes.some(
                    (group) =>
                      group.name.toLowerCase() ===
                      (account.classGroup || "").toLowerCase(),
                  ) && (
                    <section className="qm-panel">
                      <div className="qm-empty">
                        <BookOpen size={27} />
                        <strong>Chưa có học liệu cho lớp của bạn</strong>
                        <span>Gia sư sẽ đăng tài liệu tại đây.</span>
                      </div>
                    </section>
                  )}
              </div>
            )}
          </div>
        )}
      </main>
      {loginOpen && (
        <LoginDialog onClose={() => setLoginOpen(false)} onLogin={doLogin} />
      )}
      {examDraft && (
        <ExamEditor
          draft={examDraft}
          classes={classes}
          onClose={() => setExamDraft(null)}
          onSave={saveAssignment}
        />
      )}
      <footer className="qm-footer">
        <span>QMath · Lớp toán anh Quân</span>
        <span>
          <i className="qm-footer-pulse" /> Supabase ·{" "}
          {new Date().getFullYear()}
        </span>
      </footer>
    </div>
  );
}

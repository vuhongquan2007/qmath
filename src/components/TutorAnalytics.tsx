import { useMemo } from "react";
import { Activity, BarChart3, ArrowLeft } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  Assignment,
  ClassGroup,
  ExamAttempt,
  ExamSession,
  Student,
} from "../types";

interface TutorAnalyticsProps {
  students: Student[];
  assignments: Assignment[];
  attempts: ExamAttempt[];
  classes: ClassGroup[];
  liveSessions: ExamSession[];
  selectedExamId: string;
  selectedClassId: string;
  onSelectExam: (id: string) => void;
  onSelectClass: (id: string) => void;
  onReview: (attempt: ExamAttempt, assignment: Assignment, student: Student) => void;
}

export default function TutorAnalytics({
  students,
  assignments,
  attempts,
  classes,
  liveSessions,
  selectedExamId,
  selectedClassId,
  onSelectExam,
  onSelectClass,
  onReview,
}: TutorAnalyticsProps) {
  const selectedAssignment = assignments.find(
    (assignment) => assignment.id === selectedExamId,
  );
  const visibleStudents = useMemo(() => {
    const selectedClass = classes.find((group) => group.id === selectedClassId);
    return selectedClassId === "all"
      ? students
      : students.filter((student) => student.classGroup === selectedClass?.name);
  }, [classes, selectedClassId, students]);
  const visibleStudentIds = useMemo(
    () => new Set(visibleStudents.map((student) => student.id)),
    [visibleStudents],
  );
  const visibleAttempts = useMemo(
    () =>
      attempts.filter(
        (attempt) =>
          visibleStudentIds.has(attempt.studentId) &&
          (!selectedExamId || attempt.assignmentId === selectedExamId),
      ),
    [attempts, selectedExamId, visibleStudentIds],
  );
  const average = visibleAttempts.length
    ? visibleAttempts.reduce((sum, attempt) => sum + attempt.score, 0) /
      visibleAttempts.length
    : 0;
  const distribution = useMemo(
    () =>
      Array.from({ length: 41 }, (_, index) => {
        const start = index / 4;
        return {
          name: start === 10
            ? "10,00"
            : `${start.toFixed(2).replace(".", ",")}–${(start + 0.25).toFixed(2).replace(".", ",")}`,
          score: start,
          count: visibleAttempts.filter(
            (attempt) => index === 40
              ? attempt.score === 10
              : attempt.score >= start && attempt.score < start + 0.25,
          ).length,
        };
      }),
    [visibleAttempts],
  );
  const scopedLiveSessions = liveSessions.filter(
    (session) =>
      visibleStudentIds.has(session.studentId) &&
      (!selectedExamId || session.assignmentId === selectedExamId),
  );

  return (
    <div className="qm-tutor-analytics">
      <section className="qm-panel qm-analytics-toolbar">
        <div className="qm-analytics-heading">
          <span className="qm-overline">
            {selectedAssignment ? "KẾT QUẢ ĐỀ THI" : "THỐNG KÊ LỚP HỌC"}
          </span>
          <h2>{selectedAssignment?.title || "Thống kê lớp học"}</h2>
          {selectedAssignment?.description && <p>{selectedAssignment.description}</p>}
        </div>
        <div className="qm-analytics-filters">
          <label>
            Đề thi
            <select
              value={selectedExamId || "all"}
              onChange={(event) =>
                onSelectExam(event.target.value === "all" ? "" : event.target.value)
              }
            >
              <option value="all">Tất cả đề thi</option>
              {assignments.map((assignment) => (
                <option key={assignment.id} value={assignment.id}>
                  {assignment.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            Lớp
            <select
              value={selectedClassId}
              onChange={(event) => onSelectClass(event.target.value)}
            >
              <option value="all">Tất cả lớp</option>
              {classes.map((group) => (
                <option value={group.id} key={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </label>
          {selectedAssignment && (
            <button
              className="qm-button qm-button-outline"
              type="button"
              onClick={() => onSelectExam("")}
            >
              <ArrowLeft size={14} /> Tổng quan
            </button>
          )}
        </div>
      </section>

      <section className="qm-analytics-summary">
        <article className="qm-metric qm-class-average">
          <span className="qm-metric-icon"><BarChart3 size={17} /></span>
          <span className="qm-metric-label">Điểm trung bình lớp</span>
          <strong>{average.toFixed(2)}<small> / 10</small></strong>
          <small>
            {selectedClassId === "all"
              ? "Toàn bộ lớp"
              : classes.find((group) => group.id === selectedClassId)?.name}
          </small>
        </article>

        <section className="qm-panel qm-interval-chart">
          <div className="qm-panel-heading">
            <div>
              <span className="qm-overline">PHỔ ĐIỂM · MỖI 0,25 ĐIỂM</span>
              <h2>Phổ điểm theo khoảng 0,25</h2>
            </div>
          </div>
          {visibleAttempts.length ? (
            <div className="qm-chart qm-quarter-chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distribution.filter((entry) => entry.count > 0)} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 5" vertical={false} stroke="#e8eef4" />
                  <XAxis
                    dataKey="name"
                    interval="preserveStartEnd"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b", fontSize: 9 }}
                  />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10 }} />
                  <Tooltip
                    labelFormatter={(label) => `Điểm ${label}`}
                    formatter={(value) => [value, "Bài nộp"]}
                    contentStyle={{ background: "#fff", border: "1px solid #dbe7ef", borderRadius: 9, color: "#0f172a" }}
                  />
                  <Bar dataKey="count" name="Bài nộp" fill="#38bdf8" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="qm-empty-inline">Chưa có bài nộp trong phạm vi đã chọn.</div>
          )}
        </section>
      </section>

      {selectedAssignment && <section className="qm-panel qm-class-leaderboard">
        <div className="qm-panel-heading">
          <div>
            <span className="qm-overline">TÌNH TRẠNG HỌC VIÊN</span>
            <h2>Kết quả: {selectedAssignment.title}</h2>
          </div>
          <span className="qm-table-count">{visibleStudents.length} HỌC VIÊN</span>
        </div>
        <div className="qm-student-history-list">
          {visibleStudents.map((student) => {
            const studentAttempts = visibleAttempts
              .filter((attempt) => attempt.studentId === student.id)
              .sort((left, right) => new Date(right.submitTime).getTime() - new Date(left.submitTime).getTime());
            const activeSession = scopedLiveSessions.find((session) => session.studentId === student.id);
            const latestAttempt = studentAttempts[0];
            const result = latestAttempt
              ? assignments.find((assignment) => assignment.id === latestAttempt.assignmentId)
              : undefined;
            return (
              <div className="qm-exam-status-row" key={student.id}>
                <span className="qm-list-avatar">{student.name.charAt(0)}</span>
                <span className="qm-history-student-name"><strong>{student.name}</strong><small>{student.classGroup || "Chưa xếp lớp"}</small></span>
                <span className={`qm-history-status${activeSession ? " is-live" : ""}`}>{activeSession ? `Đang thi · ${activeSession.progress}/${activeSession.totalItems} câu` : latestAttempt ? "Đã nộp" : "Chưa bắt đầu"}</span>
                <span className="qm-ranking-score">{latestAttempt ? latestAttempt.score.toFixed(2) : "—"}<small>{latestAttempt ? " / 10" : ""}</small></span>
                {latestAttempt && result ? <button className="qm-button qm-button-outline" type="button" onClick={() => onReview(latestAttempt, result, student)}>Xem bài</button> : <span />}
              </div>
            );
          })}
          {!visibleStudents.length && <div className="qm-empty-inline">Không có học viên trong phạm vi đã chọn.</div>}
        </div>
      </section>}
    </div>
  );
}
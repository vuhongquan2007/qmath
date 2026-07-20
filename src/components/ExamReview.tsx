import { useState } from "react";
import { ExamAttempt, Assignment, Student } from "../types";
import MathText from "./MathText";
import { AlertCircle, ArrowLeft, CheckCircle2, XCircle, Info, HelpCircle } from "lucide-react";

interface ExamReviewProps {
  attempt: ExamAttempt;
  assignment: Assignment;
  student: Student;
  onClose: () => void;
}

export default function ExamReview({ attempt, assignment, student, onClose }: ExamReviewProps) {
  const [filterPart, setFilterPart] = useState<"all" | "partI" | "partII" | "partIII">("all");

  const getSubscorePercent = (score: number, max: number) => {
    return Math.round((score / max) * 100);
  };

  const getPointsColor = (score: number) => {
    if (score >= 8) return "text-emerald-600 bg-emerald-50 border-emerald-200";
    if (score >= 5) return "text-amber-600 bg-amber-50 border-amber-200";
    return "text-rose-600 bg-rose-50 border-rose-200";
  };

  return (
    <div className="space-y-6">
      {/* Back Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-slate-800 transition-colors shadow-sm"
        >
          <ArrowLeft size={16} />
          Trở Lại Danh Sách
        </button>
        
        <span className="text-xs text-slate-400 font-medium">
          Mã bài thi: {attempt.id}
        </span>
      </div>

      {/* OVERALL RESULTS BOARD */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
          
          {/* Student & Exam Meta */}
          <div className="space-y-2 text-center md:text-left">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
              KẾT QUẢ BÀI THI THPTQG
            </span>
            <h1 className="text-xl md:text-2xl font-black text-slate-800 mt-2">
              {assignment.title}
            </h1>
            <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm text-slate-500 font-medium mt-1">
              <span>Học sinh: <strong className="text-slate-700">{student.name}</strong> ({student.id})</span>
              <span>•</span>
              <span>Lớp: <strong className="text-slate-700">{student.classGroup}</strong></span>
              <span>•</span>
              <span>Nộp lúc: {new Date(attempt.submitTime).toLocaleString("vi-VN")}</span>
            </div>
          </div>

          {/* Large Overall Score Gauge */}
          <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 shrink-0">
            <div className="text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Điểm Tổng</p>
              <p className={`text-4xl md:text-5xl font-black ${
                attempt.score >= 8.0 
                  ? "text-emerald-600" 
                  : attempt.score >= 5.0 
                    ? "text-amber-500" 
                    : "text-rose-500"
              }`}>
                {attempt.score.toFixed(2)}
              </p>
              <p className="text-[10px] font-bold text-slate-400 mt-0.5">Thang điểm 10.0</p>
            </div>
          </div>

        </div>

        {/* Section Scores Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 pt-6 border-t border-slate-100">
          
          {/* Part I Subscore */}
          <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-bold text-slate-500">PHẦN I: Trắc nghiệm</span>
              <span className="text-sm font-bold text-slate-700">{attempt.gradedDetails.scorePartI.toFixed(2)} / 3.0đ</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-1">
              <div 
                className="bg-indigo-600 h-full rounded-full" 
                style={{ width: `${getSubscorePercent(attempt.gradedDetails.scorePartI, 3.0)}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-400 text-right">{getSubscorePercent(attempt.gradedDetails.scorePartI, 3.0)}% hoàn thành</p>
          </div>

          {/* Part II Subscore */}
          <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-bold text-slate-500">PHẦN II: Đúng / Sai</span>
              <span className="text-sm font-bold text-slate-700">{attempt.gradedDetails.scorePartII.toFixed(2)} / 4.0đ</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-1">
              <div 
                className="bg-emerald-500 h-full rounded-full" 
                style={{ width: `${getSubscorePercent(attempt.gradedDetails.scorePartII, 4.0)}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-400 text-right">{getSubscorePercent(attempt.gradedDetails.scorePartII, 4.0)}% hoàn thành</p>
          </div>

          {/* Part III Subscore */}
          <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-bold text-slate-500">PHẦN III: Tự luận ngắn</span>
              <span className="text-sm font-bold text-slate-700">{attempt.gradedDetails.scorePartIII.toFixed(2)} / 3.0đ</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-1">
              <div 
                className="bg-amber-500 h-full rounded-full" 
                style={{ width: `${getSubscorePercent(attempt.gradedDetails.scorePartIII, 3.0)}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-400 text-right">{getSubscorePercent(attempt.gradedDetails.scorePartIII, 3.0)}% hoàn thành</p>
          </div>

        </div>
      </div>

      {/* FILTER TABS & SEARCH */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-fit">
        <button
          onClick={() => setFilterPart("all")}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            filterPart === "all" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Tất Cả Câu Hỏi
        </button>
        <button
          onClick={() => setFilterPart("partI")}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            filterPart === "partI" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Phần I
        </button>
        <button
          onClick={() => setFilterPart("partII")}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            filterPart === "partII" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Phần II
        </button>
        <button
          onClick={() => setFilterPart("partIII")}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            filterPart === "partIII" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Phần III
        </button>
      </div>

      {/* DETAILED QUESTION BREAKDOWN */}
      <div className="space-y-4">
        
        {/* PART I QUESTIONS */}
        {(filterPart === "all" || filterPart === "partI") && (
          <div className="space-y-4">
            {filterPart === "all" && (
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider pl-1">
                PHẦN I: TRẮC NGHIỆM KHÁCH QUAN (Tập trung 12 câu - tối đa 3 điểm)
              </h2>
            )}
            {assignment.partIQuestions.map((q) => {
              const studentChoice = attempt.answers.partI[q.id];
              const isCorrect = attempt.gradedDetails.partIResult[q.id];
              
              return (
                <div 
                  key={q.id}
                  className={`bg-white rounded-xl border p-5 shadow-xs space-y-4 transition-all ${
                    isCorrect 
                      ? "border-emerald-200 hover:shadow-emerald-50/50" 
                      : studentChoice === undefined
                        ? "border-amber-200 bg-amber-50/10"
                        : "border-rose-200 hover:shadow-rose-50/50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-bold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md">
                      Câu {q.questionNumber}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs font-bold">
                      {isCorrect ? (
                        <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100">
                          <CheckCircle2 size={14} />
                          Đúng (+0.25đ)
                        </span>
                      ) : studentChoice === undefined ? (
                        <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-100">
                          <AlertCircle size={14} />
                          Chưa trả lời (0đ)
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-rose-600 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-100">
                          <XCircle size={14} />
                          Sai (0đ)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-slate-800 text-sm font-medium leading-relaxed">
                    <MathText text={q.content} />
                  </div>

                  {/* Options List */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                    {q.options.map((option, idx) => {
                      const letter = String.fromCharCode(65 + idx);
                      const isCorrectOption = idx === q.correctOption;
                      const isStudentSelected = idx === studentChoice;

                      let optStyles = "border-slate-100 bg-slate-50 text-slate-600";
                      if (isCorrectOption) {
                        optStyles = "border-emerald-200 bg-emerald-50 text-emerald-800 font-semibold";
                      } else if (isStudentSelected && !isCorrectOption) {
                        optStyles = "border-rose-200 bg-rose-50/70 text-rose-800 font-medium";
                      }

                      return (
                        <div 
                          key={idx}
                          className={`flex items-center p-3 rounded-lg border text-xs leading-relaxed ${optStyles}`}
                        >
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-[10px] mr-2.5 ${
                            isCorrectOption 
                              ? "bg-emerald-600 text-white" 
                              : isStudentSelected 
                                ? "bg-rose-500 text-white" 
                                : "bg-slate-200/60 text-slate-500"
                          }`}>
                            {letter}
                          </span>
                          <span className="flex-1"><MathText text={option} /></span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation Section */}
                  {q.explanation && (
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-xs text-slate-600 space-y-1.5">
                      <div className="flex items-center gap-1 text-indigo-700 font-bold">
                        <Info size={14} />
                        LỜI GIẢI CHI TIẾT:
                      </div>
                      <div className="leading-relaxed">
                        <MathText text={q.explanation} />
                      </div>
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}

        {/* PART II QUESTIONS */}
        {(filterPart === "all" || filterPart === "partII") && (
          <div className="space-y-4 mt-6">
            {filterPart === "all" && (
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider pl-1">
                PHẦN II: TRẮC NGHIỆM ĐÚNG/SAI (Tập trung 4 câu - tối đa 4 điểm)
              </h2>
            )}
            {assignment.partIIQuestions.map((q) => {
              const detail = attempt.gradedDetails.partIIDetail[q.id] || { correctCount: 0, points: 0, results: [false, false, false, false] };
              
              return (
                <div 
                  key={q.id}
                  className={`bg-white rounded-xl border p-5 shadow-xs space-y-4 transition-all ${
                    detail.points >= 1.0 
                      ? "border-emerald-200" 
                      : detail.points > 0 
                        ? "border-amber-200" 
                        : "border-rose-200"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-bold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md">
                      Câu {q.questionNumber}
                    </span>
                    <div className="text-xs font-bold">
                      <span className={`px-2.5 py-1 rounded-md border flex items-center gap-1 ${
                        detail.points === 1.0 
                          ? "text-emerald-700 bg-emerald-50 border-emerald-100" 
                          : detail.points > 0 
                            ? "text-amber-700 bg-amber-50 border-amber-100" 
                            : "text-rose-700 bg-rose-50 border-rose-100"
                      }`}>
                        Đúng {detail.correctCount}/4 ý (+{detail.points.toFixed(2)}đ)
                      </span>
                    </div>
                  </div>

                  <div className="text-slate-800 text-sm font-medium leading-relaxed bg-slate-50/50 p-4 rounded-lg border border-slate-100">
                    <MathText text={q.content} />
                  </div>

                  {/* Statements Sub-grading Table */}
                  <div className="space-y-2 pt-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-0.5 mb-1.5">Phần đánh giá từng ý:</p>
                    {q.statements.map((statement, idx) => {
                      const studentVal = (attempt.answers.partII[q.id] || {})[idx];
                      const isSubCorrect = detail.results[idx];
                      
                      return (
                        <div 
                          key={idx}
                          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border text-xs transition-colors ${
                            isSubCorrect 
                              ? "bg-emerald-50/30 border-emerald-100 text-slate-700" 
                              : studentVal === undefined || studentVal === null
                                ? "bg-amber-50/30 border-amber-100 text-slate-500"
                                : "bg-rose-50/30 border-rose-100 text-slate-700"
                          }`}
                        >
                          <div className="font-medium flex-1">
                            <MathText text={statement.text} />
                          </div>

                          <div className="flex items-center gap-3 shrink-0 text-[10px] font-bold">
                            <div>
                              Đáp án đúng: <span className="text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{statement.correctAnswer ? "Đúng" : "Sai"}</span>
                            </div>
                            <div>
                              Bạn chọn: {studentVal === undefined || studentVal === null ? (
                                <span className="text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Bỏ trống</span>
                              ) : (
                                <span className={studentVal === statement.correctAnswer ? "text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded" : "text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded"}>
                                  {studentVal ? "Đúng" : "Sai"}
                                </span>
                              )}
                            </div>
                            <div className="w-5 flex justify-center">
                              {isSubCorrect ? (
                                <CheckCircle2 size={16} className="text-emerald-500" />
                              ) : (
                                <XCircle size={16} className="text-rose-400" />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation Section */}
                  {q.explanation && (
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-xs text-slate-600 space-y-1.5">
                      <div className="flex items-center gap-1 text-indigo-700 font-bold">
                        <Info size={14} />
                        LỜI GIẢI CHI TIẾT:
                      </div>
                      <div className="leading-relaxed">
                        <MathText text={q.explanation} />
                      </div>
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}

        {/* PART III QUESTIONS */}
        {(filterPart === "all" || filterPart === "partIII") && (
          <div className="space-y-4 mt-6">
            {filterPart === "all" && (
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider pl-1">
                PHẦN III: CÂU HỎI TRẢ LỜI NGẮN (Tập trung 6 câu - tối đa 3 điểm)
              </h2>
            )}
            {assignment.partIIIQuestions.map((q) => {
              const studentAns = attempt.answers.partIII[q.id];
              const isCorrect = attempt.gradedDetails.partIIIResult[q.id];
              
              return (
                <div 
                  key={q.id}
                  className={`bg-white rounded-xl border p-5 shadow-xs space-y-4 transition-all ${
                    isCorrect 
                      ? "border-emerald-200" 
                      : !studentAns || studentAns.trim() === ""
                        ? "border-amber-200" 
                        : "border-rose-200"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-bold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md">
                      Câu {q.questionNumber}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs font-bold">
                      {isCorrect ? (
                        <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100">
                          <CheckCircle2 size={14} />
                          Đúng (+0.5đ)
                        </span>
                      ) : !studentAns || studentAns.trim() === "" ? (
                        <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-100">
                          <AlertCircle size={14} />
                          Chưa trả lời (0đ)
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-rose-600 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-100">
                          <XCircle size={14} />
                          Sai (0đ)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-slate-800 text-sm font-medium leading-relaxed bg-slate-50/50 p-4 rounded-lg border border-slate-100">
                    <MathText text={q.content} />
                  </div>

                  {/* Answers review section */}
                  <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50/30 text-xs">
                    <div className="flex-1 space-y-1">
                      <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">ĐÁP ÁN CHÍNH XÁC:</p>
                      <p className="font-mono text-base font-extrabold text-indigo-600">{q.correctAnswer}</p>
                    </div>
                    <div className="flex-1 space-y-1 border-t sm:border-t-0 sm:border-l border-slate-100 pt-3 sm:pt-0 sm:pl-4">
                      <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">ĐÁP ÁN BẠN GHI CHÉP:</p>
                      <p className={`font-mono text-base font-extrabold ${isCorrect ? "text-emerald-600" : "text-rose-500"}`}>
                        {studentAns && studentAns.trim() !== "" ? studentAns : "Không có câu trả lời"}
                      </p>
                    </div>
                  </div>

                  {/* Explanation Section */}
                  {q.explanation && (
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-xs text-slate-600 space-y-1.5">
                      <div className="flex items-center gap-1 text-indigo-700 font-bold">
                        <Info size={14} />
                        LỜI GIẢI CHI TIẾT:
                      </div>
                      <div className="leading-relaxed">
                        <MathText text={q.explanation} />
                      </div>
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}

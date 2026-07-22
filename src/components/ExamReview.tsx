import { useState, useEffect } from "react";
import { ExamAttempt, Assignment, Student } from "../types";
import MathText from "./MathText";
import { AlertCircle, ArrowLeft, CheckCircle2, XCircle, Info, HelpCircle, FileText, Clock } from "lucide-react";
import { base64ToBlobUrl } from "../utils/fileHelpers";

interface ExamReviewProps {
  attempt: ExamAttempt;
  assignment: Assignment;
  student: Student;
  onClose: () => void;
}

export default function ExamReview({ attempt, assignment, student, onClose }: ExamReviewProps) {
  const [filterPart, setFilterPart] = useState<"all" | "partI" | "partII" | "partIII">("all");
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string>("");

  // --- LOGIC XỬ LÝ FILE ĐỀ THI ---
  const isPdfFile = (name?: string, data?: string) => {
    if (!data) return false;
    return data.startsWith("data:application/pdf") || (name ? /\.pdf$/i.test(name) : false);
  };

  useEffect(() => {
    if (assignment.fileData && isPdfFile(assignment.fileName, assignment.fileData)) {
      const blobUrl = base64ToBlobUrl(assignment.fileData);
      setPdfBlobUrl(blobUrl);
      return () => { if (blobUrl.startsWith("blob:")) URL.revokeObjectURL(blobUrl); };
    }
  }, [assignment.fileData]);

  const getSubscorePercent = (score: number, max: number) => {
    return Math.round((score / max) * 100);
  };

  // --- BẮT ĐẦU GIAO DIỆN CHIA ĐÔI ---
  return (
    <div className="flex flex-col xl:flex-row gap-5 h-[calc(100vh-120px)] min-h-[550px]">
      
      {/* CỘT BÊN TRÁI: HIỂN THỊ ĐỀ THI (FIT KHUNG) */}
      <div className="xl:flex-[2.2] bg-slate-950 rounded-2xl border border-slate-800 shadow-xl flex flex-col overflow-hidden h-1/2 xl:h-full relative">
        <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between z-10 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <FileText size={16} />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-100 truncate">ĐỀ BÀI: {assignment.title}</h3>
              <p className="text-[10px] text-slate-400">Xem lại nội dung câu hỏi</p>
            </div>
          </div>
        </div>

        <div className="flex-1 bg-[#525659] relative overflow-hidden">
          {assignment.fileData ? (
            isPdfFile(assignment.fileName, assignment.fileData) ? (
              <iframe
                src={`${pdfBlobUrl || assignment.fileData}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                className="w-full h-full border-0 block"
                style={{ position: "absolute", top: 0, left: 0 }}
                title="Review PDF"
              />
            ) : (
              <div className="w-full h-full overflow-auto flex items-start justify-center p-4">
                <img src={assignment.fileData} className="max-w-full h-auto shadow-2xl rounded-lg" alt="Exam" />
              </div>
            )
          ) : (
            <div className="m-auto text-white opacity-40 flex flex-col items-center gap-2">
              <AlertCircle size={40} />
              <p className="text-sm font-bold">Không tìm thấy tệp đề thi</p>
            </div>
          )}
        </div>
      </div>

      {/* CỘT BÊN PHẢI: GIỮ NGUYÊN TOÀN BỘ MÃ CŨ CỦA BẠN TRONG KHUNG CUỘN */}
      <div className="w-full xl:w-[480px] flex flex-col h-1/2 xl:h-full shrink-0">
        <div className="flex-1 overflow-y-auto space-y-6 pr-1 custom-scrollbar">
          
          {/* Nút trở lại */}
          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
            >
              <ArrowLeft size={16} />
              Trở Lại
            </button>
            <span className="text-[10px] font-mono text-slate-400">ID: {attempt.id.slice(-8)}</span>
          </div>

          {/* OVERALL RESULTS BOARD - MÃ CŨ CỦA BẠN */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-6">
            <div className="text-center md:text-left space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">KẾT QUẢ BÀI THI</span>
              <h1 className="text-lg font-black text-slate-800 leading-tight">{assignment.title}</h1>
            </div>

            <div className="flex items-center justify-center bg-slate-50 p-6 rounded-2xl border border-slate-100">
               <div className="text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Điểm số</p>
                  <p className={`text-5xl font-black ${attempt.score >= 8.0 ? "text-emerald-600" : attempt.score >= 5.0 ? "text-amber-500" : "text-rose-500"}`}>
                    {attempt.score.toFixed(2)}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400 mt-1">Đúng {attempt.correctCount}/{attempt.totalQuestions} câu</p>
               </div>
            </div>

            {/* Subscores Grid - MÃ CŨ CỦA BẠN */}
            <div className="space-y-3">
              <div className="p-3 bg-slate-50/50 rounded-xl border text-xs">
                <div className="flex justify-between font-bold mb-1"><span>PHẦN I</span><span>{attempt.gradedDetails.scorePartI.toFixed(2)}/3.0đ</span></div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden"><div className="bg-indigo-600 h-full" style={{ width: `${getSubscorePercent(attempt.gradedDetails.scorePartI, 3.0)}%` }} /></div>
              </div>
              <div className="p-3 bg-slate-50/50 rounded-xl border text-xs">
                <div className="flex justify-between font-bold mb-1"><span>PHẦN II</span><span>{attempt.gradedDetails.scorePartII.toFixed(2)}/4.0đ</span></div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden"><div className="bg-emerald-500 h-full" style={{ width: `${getSubscorePercent(attempt.gradedDetails.scorePartII, 4.0)}%` }} /></div>
              </div>
              <div className="p-3 bg-slate-50/50 rounded-xl border text-xs">
                <div className="flex justify-between font-bold mb-1"><span>PHẦN III</span><span>{attempt.gradedDetails.scorePartIII.toFixed(2)}/3.0đ</span></div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden"><div className="bg-amber-500 h-full" style={{ width: `${getSubscorePercent(attempt.gradedDetails.scorePartIII, 3.0)}%` }} /></div>
              </div>
            </div>
          </div>

          {/* FILTER TABS - MÃ CŨ CỦA BẠN */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-fit">
            {(["all", "partI", "partII", "partIII"] as const).map(p => (
              <button key={p} onClick={() => setFilterPart(p)} className={`px-3 py-1.5 text-[10px] font-black rounded-lg transition-all ${filterPart === p ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"}`}>
                {p === 'all' ? 'TẤT CẢ' : p.toUpperCase()}
              </button>
            ))}
          </div>

          {/* CHI TIẾT CÂU HỎI - MÃ CŨ CỦA BẠN */}
          <div className="space-y-4">
            {/* PART I */}
            {(filterPart === "all" || filterPart === "partI") && assignment.partIQuestions.map((q) => {
              const studentChoice = attempt.answers.partI[q.id];
              const isCorrect = attempt.gradedDetails.partIResult[q.id];
              return (
                <div key={q.id} className={`bg-white rounded-xl border p-4 space-y-3 ${isCorrect ? "border-emerald-200" : "border-rose-200"}`}>
                  <div className="flex justify-between items-center"><span className="text-[10px] font-black bg-slate-100 px-2 py-1 rounded">CÂU {q.questionNumber}</span>{isCorrect ? <CheckCircle2 size={16} className="text-emerald-500"/> : <XCircle size={16} className="text-rose-500"/>}</div>
                  <div className="text-xs font-bold"><MathText text={q.content} /></div>
                  <div className="grid grid-cols-2 gap-2">
                    {q.options.map((opt, idx) => (
                      <div key={idx} className={`p-2 rounded-lg border text-[10px] ${idx === q.correctOption ? "bg-emerald-50 border-emerald-200 text-emerald-700 font-bold" : idx === studentChoice ? "bg-rose-50 border-rose-200 text-rose-700" : "bg-slate-50 border-slate-100"}`}>
                        {String.fromCharCode(65 + idx)}. <MathText text={opt} />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* PART II */}
            {(filterPart === "all" || filterPart === "partII") && assignment.partIIQuestions.map((q) => {
              const detail = attempt.gradedDetails.partIIDetail[q.id] || { points: 0, results: [] };
              return (
                <div key={q.id} className={`bg-white rounded-xl border p-4 space-y-3 ${detail.points > 0 ? "border-emerald-200" : "border-rose-200"}`}>
                  <div className="flex justify-between items-center"><span className="text-[10px] font-black bg-slate-100 px-2 py-1 rounded">CÂU {q.questionNumber} (ĐÚNG/SAI)</span><span className="text-[10px] font-bold text-indigo-600">+{detail.points}đ</span></div>
                  <div className="text-xs font-bold"><MathText text={q.content} /></div>
                  <div className="space-y-1">
                    {q.statements.map((st, idx) => {
                      const isSubCorrect = detail.results[idx];
                      return (
                        <div key={idx} className={`flex justify-between p-2 rounded-lg border text-[10px] ${isSubCorrect ? "bg-emerald-50 border-emerald-100" : "bg-rose-50 border-rose-100"}`}>
                          <span>{String.fromCharCode(97 + idx)}. <MathText text={st.text}/></span>
                          <span className="font-bold">{st.correctAnswer ? "ĐÚNG" : "SAI"}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* PART III */}
            {(filterPart === "all" || filterPart === "partIII") && assignment.partIIIQuestions.map((q) => {
              const studentAns = attempt.answers.partIII[q.id];
              const isCorrect = attempt.gradedDetails.partIIIResult[q.id];
              return (
                <div key={q.id} className={`bg-white rounded-xl border p-4 space-y-3 ${isCorrect ? "border-emerald-200" : "border-rose-200"}`}>
                  <div className="flex justify-between items-center"><span className="text-[10px] font-black bg-slate-100 px-2 py-1 rounded">CÂU {q.questionNumber} (ĐIỀN SỐ)</span>{isCorrect ? <CheckCircle2 size={16} className="text-emerald-500"/> : <XCircle size={16} className="text-rose-500"/>}</div>
                  <div className="text-xs font-bold"><MathText text={q.content} /></div>
                  <div className="flex gap-4 p-3 bg-slate-50 rounded-lg border text-[10px]">
                    <div className="flex-1"><p className="text-slate-400 font-bold mb-1">ĐÁP ÁN ĐÚNG</p><p className="text-indigo-600 font-black text-sm">{q.correctAnswer}</p></div>
                    <div className="flex-1"><p className="text-slate-400 font-bold mb-1">BẠN CHỌN</p><p className={`${isCorrect ? "text-emerald-600" : "text-rose-600"} font-black text-sm`}>{studentAns || "Trống"}</p></div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="py-6 text-center">
             <button onClick={onClose} className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase shadow-lg">Xác Nhận Đã Xem</button>
          </div>
        </div>
      </div>
    </div>
  );
}
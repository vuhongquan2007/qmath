import { useState, useEffect } from "react";
import { ExamAttempt, Assignment, Student } from "../types";
import MathText from "./MathText";
import { 
  AlertCircle, ArrowLeft, CheckCircle2, XCircle, Info, 
  HelpCircle, FileText, Clock, Lock, X, Loader2 
} from "lucide-react";
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

  // --- 1. CHỐT CHẶN AN TOÀN TUYỆT ĐỐI ĐỂ CHỐNG TRẮNG TRANG ---
  if (!attempt || !assignment) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center p-20 bg-slate-50 text-slate-400">
        <Loader2 className="animate-spin mb-2" />
        <p className="font-bold">Đang tải dữ liệu bài làm...</p>
      </div>
    );
  }

  const now = new Date();
  const closeDate = assignment.closeTime ? new Date(assignment.closeTime) : null;
  const isLocked = closeDate ? now < closeDate : false;

  // --- 2. XỬ LÝ FILE ĐỀ THI ---
  const isPdfFile = (name?: string, data?: string) => {
    if (!data) return false;
    return data.startsWith("data:application/pdf") || (name ? /\.pdf$/i.test(name) : false);
  };

  useEffect(() => {
    if (assignment?.fileData && isPdfFile(assignment.fileName, assignment.fileData)) {
      const blobUrl = base64ToBlobUrl(assignment.fileData);
      setPdfBlobUrl(blobUrl);
      return () => { if (blobUrl && blobUrl.startsWith("blob:")) URL.revokeObjectURL(blobUrl); };
    }
  }, [assignment?.fileData]);

  const getSubscorePercent = (score: number | undefined, max: number) => {
    const s = score || 0;
    return Math.round((s / max) * 100);
  };

  return (
    <div className="flex flex-col xl:flex-row gap-5 h-[calc(100vh-120px)] min-h-[550px] animate-in fade-in duration-300">
      
      {/* CỘT BÊN TRÁI: HIỂN THỊ ĐỀ THI */}
      <div className="xl:flex-[2.5] bg-slate-950 rounded-2xl border border-slate-800 shadow-xl flex flex-col overflow-hidden h-1/2 xl:h-full relative">
        <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between z-10 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <FileText size={16} />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-100 truncate">ĐỀ BÀI: {assignment.title || "Tài liệu"}</h3>
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

      {/* CỘT BÊN PHẢI: KẾT QUẢ & LỜI GIẢI CHI TIẾT */}
      <div className="w-full xl:w-[480px] flex flex-col h-1/2 xl:h-full shrink-0">
        <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar pb-10">
          
          <div className="flex items-center justify-between">
            <button onClick={onClose} className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm">
              <ArrowLeft size={16} /> Trở Lại
            </button>
            <span className="text-xs text-slate-400 font-mono">ID: {attempt?.id?.slice(-8)}</span>
          </div>

          {/* BẢNG ĐIỂM TỔNG QUÁT */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
            <div className="text-center md:text-left space-y-2">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <span className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">KẾT QUẢ BÀI THI</span>
                {isLocked && (
                  <span className="text-[10px] font-black uppercase text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-100 flex items-center gap-1">
                    <Lock size={10} /> ĐANG KHÓA ĐÁP ÁN
                  </span>
                )}
              </div>
              <h1 className="text-lg font-black text-slate-800 leading-tight">{assignment.title}</h1>
              <p className="text-[11px] text-slate-500 font-bold uppercase">Học viên: {student?.name}</p>
            </div>

            {isLocked && (
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-start gap-3">
                <Info className="text-indigo-600 shrink-0 mt-0.5" size={16} />
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Đáp án và lời giải chi tiết sẽ hiển thị sau khi đợt thi kết thúc vào lúc: 
                  <span className="text-indigo-600 font-bold ml-1">{assignment.closeTime ? new Date(assignment.closeTime).toLocaleString("vi-VN") : "Hết hạn"}</span>.
                </p>
              </div>
            )}

            <div className="flex items-center justify-center bg-slate-50 p-6 rounded-2xl border border-slate-100">
               <div className="text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Điểm Số</p>
                  <p className={`text-5xl font-black ${attempt?.score >= 8.0 ? "text-emerald-600" : (attempt?.score >= 5 ? "text-amber-500" : "text-rose-500")}`}>
                    {(attempt?.score ?? 0).toFixed(2)}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Đúng {attempt?.correctCount || 0}/{attempt?.totalQuestions || 0} câu</p>
               </div>
            </div>

            {/* Subscores Grid */}
            <div className="grid grid-cols-1 gap-3">
              {[
                { label: "PHẦN I", score: attempt?.gradedDetails?.scorePartI, max: 3.0, color: "bg-indigo-600" },
                { label: "PHẦN II", score: attempt?.gradedDetails?.scorePartII, max: 4.0, color: "bg-emerald-500" },
                { label: "PHẦN III", score: attempt?.gradedDetails?.scorePartIII, max: 3.0, color: "bg-amber-500" }
              ].map((p, idx) => (
                <div key={idx} className="p-3 bg-white border border-slate-100 rounded-xl">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[10px] font-black text-slate-500 uppercase">{p.label}</span>
                    <span className="text-xs font-black text-slate-700">{(p.score ?? 0).toFixed(2)} / {p.max.toFixed(1)}đ</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div className={`${p.color} h-full transition-all duration-1000`} style={{ width: `${getSubscorePercent(p.score, p.max)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* FILTER TABS */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-fit">
            {(["all", "partI", "partII", "partIII"] as const).map(p => (
              <button key={p} onClick={() => setFilterPart(p)} className={`px-3 py-1.5 text-[10px] font-black rounded-lg transition-all ${filterPart === p ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"}`}>
                {p === 'all' ? 'TẤT CẢ' : p.toUpperCase()}
              </button>
            ))}
          </div>

          {/* DANH SÁCH CÂU HỎI CHI TIẾT */}
          <div className="space-y-4">
            
            {/* PART I */}
            {(filterPart === "all" || filterPart === "partI") && (assignment?.partIQuestions || []).map((q) => {
              const studentChoice = attempt?.answers?.partI?.[q.id];
              const isCorrect = attempt?.gradedDetails?.partIResult?.[q.id];
              const borderStyle = isLocked ? "border-slate-200" : (isCorrect ? "border-emerald-200" : "border-rose-200");

              return (
                <div key={q.id} className={`bg-white rounded-xl border p-4 space-y-3 ${borderStyle}`}>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black bg-slate-100 px-2 py-1 rounded">CÂU {q.questionNumber}</span>
                    {!isLocked ? (isCorrect ? <CheckCircle2 size={16} className="text-emerald-500"/> : <XCircle size={16} className="text-rose-500"/>) : <span className="text-[9px] font-bold text-slate-400 uppercase">Đã nộp</span>}
                  </div>
                  <div className="text-xs font-bold leading-relaxed"><MathText text={q.content} /></div>
                  <div className="grid grid-cols-2 gap-2">
                    {(q.options || []).map((opt, idx) => {
                      const isSelected = idx === studentChoice;
                      const isCorrectOption = idx === q.correctOption;
                      let optStyle = "bg-slate-50 text-slate-500";
                      if (!isLocked) {
                        if (isCorrectOption) optStyle = "bg-emerald-50 border-emerald-300 text-emerald-800 font-bold";
                        else if (isSelected) optStyle = "bg-rose-50 border-rose-300 text-rose-800 font-bold";
                      } else if (isSelected) optStyle = "bg-indigo-50 border-indigo-200 text-indigo-700 font-bold";
                      return <div key={idx} className={`p-2 rounded-lg border text-[10px] ${optStyle}`}>{String.fromCharCode(65 + idx)}. <MathText text={opt} /></div>;
                    })}
                  </div>
                  {!isLocked && q.explanation && (
                    <div className="bg-slate-50 p-4 rounded-xl border border-dashed border-slate-200 text-xs text-slate-600">
                      <div className="text-indigo-600 font-black mb-1">GIẢI THÍCH:</div>
                      <MathText text={q.explanation} />
                    </div>
                  )}
                </div>
              );
            })}

            {/* PART II */}
            {(filterPart === "all" || filterPart === "partII") && (assignment?.partIIQuestions || []).map((q) => {
              const detail = attempt?.gradedDetails?.partIIDetail?.[q.id] || { points: 0, results: [], correctCount: 0 };
              const borderStyle = isLocked ? "border-slate-200" : (detail.points > 0 ? "border-emerald-200" : "border-rose-200");

              return (
                <div key={q.id} className={`bg-white rounded-xl border p-4 space-y-3 ${borderStyle}`}>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black bg-slate-100 px-2 py-1 rounded">CÂU {q.questionNumber} (Đ/S)</span>
                    {!isLocked && <span className="text-[10px] font-bold text-indigo-600">+{ (detail.points || 0).toFixed(2) }đ</span>}
                  </div>
                  <div className="text-xs font-bold"><MathText text={q.content} /></div>
                  <div className="space-y-1">
                    {(q.statements || []).map((st, idx) => {
                      const studentVal = attempt?.answers?.partII?.[q.id]?.[idx];
                      const isSubCorrect = detail?.results?.[idx];
                      const subStyle = !isLocked ? (isSubCorrect ? "bg-emerald-50 border-emerald-100" : "bg-rose-50 border-rose-100") : "bg-slate-50 border-slate-100";
                      return (
                        <div key={idx} className={`flex justify-between p-2 rounded-lg border text-[10px] ${subStyle}`}>
                          <span>{String.fromCharCode(97 + idx)}. <MathText text={st.text}/></span>
                          <div className="flex gap-2 font-bold uppercase text-[10px]">
                            {isLocked ? (
                              <span className="text-indigo-600">{studentVal === undefined ? "" : (studentVal ? "ĐÚNG" : "SAI")}</span>
                            ) : (
                              <>
                                <span className="text-slate-400 line-through decoration-1">{studentVal === undefined ? "" : (studentVal ? "ĐÚNG" : "SAI")}</span>
                                <span className="text-emerald-700">{st.correctAnswer ? "ĐÚNG" : "SAI"}</span>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {!isLocked && q.explanation && (
                    <div className="bg-slate-50 p-4 rounded-xl border border-dashed border-slate-200 text-xs text-slate-600">
                      <div className="text-indigo-600 font-black mb-1">GIẢI THÍCH:</div>
                      <MathText text={q.explanation} />
                    </div>
                  )}
                </div>
              );
            })}

            {/* PART III */}
            {(filterPart === "all" || filterPart === "partIII") && (assignment?.partIIIQuestions || []).map((q) => {
              const studentAns = attempt?.answers?.partIII?.[q.id];
              const isCorrect = attempt?.gradedDetails?.partIIIResult?.[q.id];
              const borderStyle = isLocked ? "border-slate-200" : (isCorrect ? "border-emerald-200" : "border-rose-200");

              return (
                <div key={q.id} className={`bg-white rounded-xl border p-4 space-y-3 ${borderStyle}`}>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black bg-slate-100 px-2 py-1 rounded">CÂU {q.questionNumber} (SỐ)</span>
                    {!isLocked && (isCorrect ? <CheckCircle2 size={16} className="text-emerald-500"/> : <XCircle size={16} className="text-rose-500"/>)}
                  </div>
                  <div className="text-xs font-bold"><MathText text={q.content} /></div>
                  <div className="flex gap-4 p-3 bg-slate-50 rounded-lg border text-[10px]">
                    {!isLocked && (
                      <div className="flex-1 border-r border-slate-200">
                        <p className="text-slate-400 font-bold mb-1 uppercase">Đáp án đúng</p>
                        <p className="text-indigo-600 font-black text-sm">{q.correctAnswer}</p>
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-slate-400 font-bold mb-1 uppercase">Bạn ghi</p>
                      <p className={`${!isLocked ? (isCorrect ? "text-emerald-600" : "text-rose-600") : "text-indigo-600"} font-black text-sm`}>
                        {studentAns || "Trống"}
                      </p>
                    </div>
                  </div>
                  {!isLocked && q.explanation && (
                    <div className="bg-slate-50 p-4 rounded-xl border border-dashed border-slate-200 text-xs text-slate-600">
                      <div className="text-indigo-600 font-black mb-1">GIẢI THÍCH:</div>
                      <MathText text={q.explanation} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="py-10 text-center">
             <button onClick={onClose} className="px-10 py-3 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">HOÀN TẤT XEM ĐIỂM</button>
          </div>
        </div>
      </div>
    </div>
  );
}
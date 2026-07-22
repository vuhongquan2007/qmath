import { useState, useEffect } from "react";
import { Assignment, StudentAnswers, ExamAttempt } from "../types";
import { gradeExamAttempt } from "../data/sampleExams";
import { Clock, Send, FileText, AlertCircle } from "lucide-react";
import { base64ToBlobUrl } from "../utils/fileHelpers";
import { Document, Page, pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface ExamTakerProps {
  assignment: Assignment;
  studentId: string;
  onSubmit: (attempt: ExamAttempt) => void;
  onCancel: () => void;
}

export default function ExamTaker({ assignment, studentId, onSubmit }: ExamTakerProps) {
  const cacheKey = `exam_cache_${studentId}_${assignment.id}`;
  const timeCacheKey = `exam_time_${studentId}_${assignment.id}`;

  const [answers, setAnswers] = useState<StudentAnswers>(() => {
    const saved = localStorage.getItem(cacheKey);
    return saved ? JSON.parse(saved) : { partI: {}, partII: {}, partIII: {} };
  });

  // Đồng bộ thời gian thực, chống F5 hoặc thoát tab gian lận thời gian
  const [timeLeft, setTimeLeft] = useState(() => {
    const savedTime = localStorage.getItem(timeCacheKey);
    if (savedTime !== null) {
      const parsed = Number(savedTime);
      return !isNaN(parsed) && parsed > 0 ? parsed : assignment.duration * 60;
    }
    return assignment.duration * 60;
  });

  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(600);

  // Lưu đáp án vào cache mỗi khi thay đổi
  useEffect(() => {
    localStorage.setItem(cacheKey, JSON.stringify(answers));
  }, [answers, cacheKey]);

  // Lưu thời gian thực vào cache liên tục
  useEffect(() => {
    localStorage.setItem(timeCacheKey, timeLeft.toString());
  }, [timeLeft, timeCacheKey]);

  // Chặn hành vi học viên tắt tab / F5 / rời trang trình duyệt
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "Bài thi đang diễn ra! Nếu rời khỏi đây, bạn có thể bị tính là bỏ thi.";
      return e.returnValue;
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  // Timer đếm ngược
  useEffect(() => {
    if (timeLeft <= 0) {
      localStorage.removeItem(cacheKey);
      localStorage.removeItem(timeCacheKey);
      alert("Hết giờ làm bài! Hệ thống tự động thu bài.");
      onSubmit(gradeExamAttempt(assignment, answers, studentId));
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, assignment, answers, studentId, onSubmit, cacheKey, timeCacheKey]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleManualSubmit = () => {
    localStorage.removeItem(cacheKey);
    localStorage.removeItem(timeCacheKey);
    onSubmit(gradeExamAttempt(assignment, answers, studentId));
  };

  const handlePartIAnswer = (qId: string, idx: number) => {
    setAnswers((prev) => ({ ...prev, partI: { ...prev.partI, [qId]: idx } }));
  };

  const handlePartIIAnswer = (qId: string, sIdx: number, val: boolean) => {
    setAnswers((prev) => {
      const qAns = prev.partII[qId] || {};
      return { ...prev, partII: { ...prev.partII, [qId]: { ...qAns, [sIdx]: val } } };
    });
  };

  const handlePartIIIAnswer = (qId: string, text: string) => {
    setAnswers((prev) => ({ ...prev, partIII: { ...prev.partIII, [qId]: text } }));
  };

  const getAnsweringStats = () => {
    const totalPartI = assignment.partIQuestions.length;
    const answeredPartI = Object.keys(answers.partI).length;
    const totalPartII = assignment.partIIQuestions.length * 4;
    let answeredPartII = 0;
    
    assignment.partIIQuestions.forEach((q) => {
      const qAns = answers.partII[q.id] || {};
      Object.keys(qAns).forEach((stmtIdx) => {
        if (qAns[Number(stmtIdx)] !== null && qAns[Number(stmtIdx)] !== undefined) answeredPartII++;
      });
    });

    const totalPartIII = assignment.partIIIQuestions.length;
    const answeredPartIII = Object.values(answers.partIII).filter((v) => typeof v === "string" && v.trim() !== "").length;

    const totalItems = totalPartI + assignment.partIIQuestions.length + totalPartIII;
    let completedItems = answeredPartI;
    
    assignment.partIIQuestions.forEach((q) => {
      const qAns = answers.partII[q.id] || {};
      if (Object.values(qAns).filter(v => v !== null && v !== undefined).length === 4) completedItems++;
    });

    completedItems += answeredPartIII;
    return { completedItems, totalItems, answeredPartI, totalPartI, answeredPartII, totalPartII, answeredPartIII, totalPartIII };
  };

  const stats = getAnsweringStats();

  const isPdfFile = (name?: string, data?: string) => {
    if (!data) return false;
    return data.startsWith("data:application/pdf") || (name ? /\.pdf$/i.test(name) : false);
  };

  const [pdfBlobUrl, setPdfBlobUrl] = useState<string>("");
  useEffect(() => {
    if (assignment.fileData && isPdfFile(assignment.fileName, assignment.fileData)) {
      const blobUrl = base64ToBlobUrl(assignment.fileData);
      setPdfBlobUrl(blobUrl);
      return () => { if (blobUrl.startsWith("blob:")) URL.revokeObjectURL(blobUrl); };
    }
  }, [assignment.fileData]);

  return (
    <div className="flex flex-col xl:flex-row gap-5 h-[calc(100vh-120px)] min-h-[550px]">
      {/* LEFT PANEL: PDF VIEWER */}
      <div className="flex-1 bg-[#525659] relative flex flex-col items-center overflow-hidden">
        {assignment.fileData && isPdfFile(assignment.fileName, assignment.fileData) ? (
          <iframe
            // Thêm #view=FitH để file tự động dàn hàng ngang vừa khít khung
            src={`${pdfBlobUrl || assignment.fileData}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
            className="w-full h-full border-0"
            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
            title="Exam PDF"
          />
        ) : (
          <div className="p-8 text-center space-y-3 m-auto text-white">
            <AlertCircle className="text-amber-500 mx-auto" size={40} />
            <p className="text-sm font-bold">Không tìm thấy tệp đề thi PDF hợp lệ</p>
          </div>
        )}
      </div>

      {/* RIGHT PANEL: ANSWER SHEET & TIMER */}
      <div className="w-full xl:w-[380px] bg-white rounded-2xl border border-slate-200 shadow-xl flex flex-col overflow-hidden h-1/2 xl:h-full shrink-0">
        <div className="bg-slate-50 border-b border-slate-100 p-4 shrink-0 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black bg-rose-50 text-rose-600 px-2 py-0.5 rounded-md border border-rose-100">THỜI GIAN THẬT</span>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-black bg-indigo-50 text-indigo-700">
              <Clock size={14} />
              <span className="font-mono text-sm">{formatTime(timeLeft)}</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] font-bold">
              <span className="text-slate-500">Tiến độ điền đáp án</span>
              <span className="text-indigo-600 font-black">{stats.completedItems}/{stats.totalItems} câu</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/50">
              <div className="bg-indigo-600 h-full transition-all duration-300" style={{ width: `${(stats.completedItems / stats.totalItems) * 100}%` }} />
            </div>
          </div>
        </div>

        {/* SCROLLABLE ANSWER SHEET */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 bg-slate-50/50">
          {/* PART I */}
          {assignment.partIQuestions.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-black text-indigo-950 uppercase tracking-wider border-b border-slate-100 pb-1.5">PHẦN I: Trắc nghiệm nhiều lựa chọn</h4>
              <div className="space-y-2">
                {assignment.partIQuestions.map((q) => (
                  <div key={q.id} className="flex items-center justify-between bg-white border border-slate-200/60 p-2.5 rounded-xl shadow-2xs">
                    <span className="text-xs font-black text-slate-600">Câu {q.questionNumber}</span>
                    <div className="flex gap-1.5">
                      {["A", "B", "C", "D"].map((opt, oIdx) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => handlePartIAnswer(q.id, oIdx)}
                          className={`w-7 h-7 rounded-full text-[11px] font-black transition-all ${
                            answers.partI[q.id] === oIdx
                              ? "bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/20"
                              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PART II */}
          {assignment.partIIQuestions.length > 0 && (
            <div className="space-y-2 border-t border-slate-200/60 pt-4">
              <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wider border-b border-slate-100 pb-1.5">PHẦN II: Trắc nghiệm Đúng/Sai</h4>
              <div className="space-y-3">
                {assignment.partIIQuestions.map((q) => (
                  <div key={q.id} className="bg-white border border-slate-200/60 p-3 rounded-xl shadow-2xs space-y-2">
                    <span className="text-xs font-black text-slate-800">Câu {q.questionNumber}</span>
                    <div className="grid grid-cols-2 gap-2">
                      {["a", "b", "c", "d"].map((sub, sIdx) => {
                        const val = (answers.partII[q.id] || {})[sIdx];
                        return (
                          <div key={sub} className="flex items-center justify-between bg-slate-50/80 p-1.5 rounded-lg border border-slate-100">
                            <span className="text-[11px] font-bold text-slate-500 uppercase">{sub})</span>
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => handlePartIIAnswer(q.id, sIdx, true)}
                                className={`px-2 py-0.5 rounded text-[10px] font-black transition-all ${val === true ? "bg-emerald-600 text-white shadow-xs" : "bg-slate-200 text-slate-500 hover:bg-slate-300"}`}
                              >
                                Đ
                              </button>
                              <button
                                type="button"
                                onClick={() => handlePartIIAnswer(q.id, sIdx, false)}
                                className={`px-2 py-0.5 rounded text-[10px] font-black transition-all ${val === false ? "bg-rose-600 text-white shadow-xs" : "bg-slate-200 text-slate-500 hover:bg-slate-300"}`}
                              >
                                S
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PART III */}
          {assignment.partIIIQuestions.length > 0 && (
            <div className="space-y-2 border-t border-slate-200/60 pt-4">
              <h4 className="text-xs font-black text-amber-950 uppercase tracking-wider border-b border-slate-100 pb-1.5">PHẦN III: Câu hỏi trả lời ngắn</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {assignment.partIIIQuestions.map((q) => (
                  <div key={q.id} className="flex items-center justify-between bg-white border border-slate-200/60 p-2 rounded-xl shadow-2xs gap-3">
                    <span className="text-xs font-black text-slate-600 shrink-0">Câu {q.questionNumber}:</span>
                    <input
                      type="text"
                      value={answers.partIII[q.id] || ""}
                      onChange={(e) => handlePartIIIAnswer(q.id, e.target.value)}
                      placeholder="Nhập đáp số..."
                      className="px-2 py-1.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-lg text-xs font-bold text-slate-800 w-full focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM ACTION */}
        <div className="bg-slate-50 border-t border-slate-100 p-4 shrink-0">
          <button
            onClick={() => setShowSubmitConfirm(true)}
            className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-md transition-all active:scale-[0.98]"
          >
            <Send size={14} /> Nộp bài ngay
          </button>
        </div>
      </div>

      {/* SUBMIT MODAL */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-150">
            <h3 className="text-base font-black text-slate-800 uppercase tracking-wide">Xác Nhận Nộp Bài Thi</h3>
            <p className="text-xs text-slate-500">Bạn đã hoàn thành <span className="font-bold text-slate-800">{stats.completedItems}/{stats.totalItems}</span> câu hỏi.</p>
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setShowSubmitConfirm(false)} className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50">Làm tiếp</button>
              <button onClick={handleManualSubmit} className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black shadow-md">Xác nhận nộp</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
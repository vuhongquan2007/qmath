import React, { useState, useEffect } from "react";
import { Assignment, Student, ExamAttempt, QuestionPartI, QuestionPartII, QuestionPartIII, StatementPartII, ClassGroup, Lecture } from "../types";
import MathText from "./MathText";
import { 
  Plus, Trash2, Users, FileText, BarChart3, ChevronDown, Check, HelpCircle, 
  BookOpen, Eye, CheckSquare, PlusCircle, UserPlus, GraduationCap, RefreshCw,
  Trophy, TrendingUp, Lock, Sparkles, UploadCloud, Loader2, FolderOpen, Paperclip, Download
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, Legend, LineChart, Line, AreaChart, Area } from "recharts";
import ConfirmModal from "./ConfirmModal";
import { openBase64InNewTab } from "../utils/fileHelpers";

interface TutorDashboardProps {
  students: Student[];
  assignments: Assignment[];
  attempts: ExamAttempt[];
  classGroups: ClassGroup[];
  onUpdateClassGroups: React.Dispatch<React.SetStateAction<ClassGroup[]>>;
  onAddAssignment: (assignment: Assignment) => void;
  onDeleteAssignment: (id: string) => void;
  onAddStudent: (student: Student) => void;
  onDeleteStudent: (id: string) => void;
  onUpdateStudent: (student: Student) => void;
  onResetData: () => void;
  tutorUsername: string;
  tutorPassword: string;
  onUpdateTutorCredentials: (username: string, pass: string) => void;
}

export default function TutorDashboard({
  students,
  assignments,
  attempts,
  classGroups,
  onUpdateClassGroups,
  onAddAssignment,
  onDeleteAssignment,
  onAddStudent,
  onDeleteStudent,
  onUpdateStudent,
  onResetData,
  tutorUsername,
  tutorPassword,
  onUpdateTutorCredentials,
}: TutorDashboardProps) {
  const [activeTab, setActiveTab] = useState<"assignments" | "students" | "classes" | "statistics" | "security">("assignments");
   
  // Security credentials state
  const [securityUsername, setSecurityUsername] = useState(tutorUsername);
  const [securityPassword, setSecurityPassword] = useState(tutorPassword);
  const [securitySuccess, setSecuritySuccess] = useState("");
  const [securityError, setSecurityError] = useState("");
   
  // Reusable Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    isDanger?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });
   
  // Create Assignment State
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDuration, setNewDuration] = useState(90);
  const [newOpenTime, setNewOpenTime] = useState("");
  const [newCloseTime, setNewCloseTime] = useState("");
  const [newExamType, setNewExamType] = useState<"THPTQG" | "TSA" | "HSA" | "QDA" | "BCA">("THPTQG");
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState("");
   
  // Selection state for answer key entry mode
  const [answerEntryMethod, setAnswerEntryMethod] = useState<"auto" | "manual">("auto");

  // AI answer key parsing states
  const [isParsingAnswerKey, setIsParsingAnswerKey] = useState(false);
  const [parseKeyError, setParseKeyError] = useState("");
  const [parseKeySuccess, setParseKeySuccess] = useState("");

  // Existing exam preview state
  const [previewingAssignment, setPreviewingAssignment] = useState<Assignment | null>(null);

  // States for interactive answers configurer
  const [numPartI, setNumPartI] = useState(12);
  const [numPartII, setNumPartII] = useState(4);
  const [numPartIII, setNumPartIII] = useState(6);

  const [keysPartI, setKeysPartI] = useState<number[]>(() => Array(12).fill(0));
  const [keysPartII, setKeysPartII] = useState<boolean[][]>(() => Array(4).fill(null).map(() => Array(4).fill(true)));
  const [keysPartIII, setKeysPartIII] = useState<string[]>(() => Array(6).fill(""));

  const [uploadedFile, setUploadedFile] = useState<{ data: string; name: string } | null>(null);

  // Class management states
  const [showCreateClassForm, setShowCreateClassForm] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [newClassDescription, setNewClassDescription] = useState("");
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [lectureTitle, setLectureTitle] = useState("");
  const [lectureFile, setLectureFile] = useState<{ data: string; name: string } | null>(null);
  const [lectureUploadError, setLectureUploadError] = useState("");
  const [newTargetClassId, setNewTargetClassId] = useState<string>("all");

  // Synchronize default parts and counts based on selected Exam Type
  const lastExamTypeRef = React.useRef(newExamType);
  useEffect(() => {
    if (lastExamTypeRef.current !== newExamType) {
      lastExamTypeRef.current = newExamType;
      if (newExamType === "THPTQG") {
        setNumPartI(12);
        setNumPartII(4);
        setNumPartIII(6);
        setKeysPartI(Array(12).fill(0));
        setKeysPartII(Array(4).fill(null).map(() => Array(4).fill(true)));
        setKeysPartIII(Array(6).fill(""));
      } else if (newExamType === "TSA") {
        setNumPartI(20);
        setNumPartII(10);
        setNumPartIII(10);
        setKeysPartI(Array(20).fill(0));
        setKeysPartII(Array(10).fill(null).map(() => Array(4).fill(true)));
        setKeysPartIII(Array(10).fill(""));
      } else if (newExamType === "HSA" || newExamType === "QDA" || newExamType === "BCA") {
        setNumPartI(35);
        setNumPartII(0);
        setNumPartIII(15);
        setKeysPartI(Array(35).fill(0));
        setKeysPartII([]);
        setKeysPartIII(Array(15).fill(""));
      }
    }
  }, [newExamType]);

  const handleAnswerKeyUpload = async (file: File) => {
    setIsParsingAnswerKey(true);
    setParseKeyError("");
    setParseKeySuccess("");

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const fileData = e.target?.result as string;
         
        const response = await fetch("/api/parse-answer-key", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fileData,
            fileName: file.name,
            numPartI,
            numPartII,
            numPartIII,
          }),
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || "Lỗi xử lý tự động phân tích đáp án.");
        }

        const data = await response.json();
         
        if (data.keysPartI && Array.isArray(data.keysPartI)) {
          setKeysPartI(data.keysPartI);
        }
        if (data.keysPartII && Array.isArray(data.keysPartII)) {
          setKeysPartII(data.keysPartII);
        }
        if (data.keysPartIII && Array.isArray(data.keysPartIII)) {
          setKeysPartIII(data.keysPartIII);
        }

        setParseKeySuccess(`Đã tự động điền thành công đáp án từ tệp "${file.name}"!`);
      } catch (err: any) {
        setParseKeyError(err.message || "Gặp lỗi trong quá trình tự động phân tích đáp án.");
      } finally {
        setIsParsingAnswerKey(false);
      }
    };

    reader.onerror = () => {
      setParseKeyError("Không thể đọc tệp tin đáp án từ thiết bị.");
      setIsParsingAnswerKey(false);
    };

    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleFileUpload = (file: File) => {
    setUploadError("");
    setUploadSuccessMessage("");

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const dataUrl = e.target?.result as string;
        setUploadedFile({
          data: dataUrl,
          name: file.name
        });
        setUploadSuccessMessage(`Đã tải lên đề thi "${file.name}" thành công! Vui lòng cấu hình đáp án ở bên phải.`);
      } catch (err: any) {
        setUploadError("Gặp lỗi trong quá trình đọc tệp.");
      }
    };
    reader.onerror = () => {
      setUploadError("Không thể đọc tệp từ thiết bị.");
    };
    reader.readAsDataURL(file);
  };

  const handleNumPartIChange = (val: number) => {
    const n = Math.max(0, Math.min(100, val));
    setNumPartI(n);
    setKeysPartI(prev => {
      const next = [...prev];
      while (next.length < n) next.push(0);
      return next.slice(0, n);
    });
  };

  const handleNumPartIIChange = (val: number) => {
    const n = Math.max(0, Math.min(100, val));
    setNumPartII(n);
    setKeysPartII(prev => {
      const next = [...prev];
      while (next.length < n) next.push([true, true, true, true]);
      return next.slice(0, n);
    });
  };

  const handleNumPartIIIChange = (val: number) => {
    const n = Math.max(0, Math.min(100, val));
    setNumPartIII(n);
    setKeysPartIII(prev => {
      const next = [...prev];
      while (next.length < n) next.push("");
      return next.slice(0, n);
    });
  };

  // Management Student States
  const [newStudentId, setNewStudentId] = useState("");
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentClass, setNewStudentClass] = useState("12A1");
  const [newStudentPassword, setNewStudentPassword] = useState("12345678");
  const [studentError, setStudentError] = useState("");

  React.useEffect(() => {
    if (!newStudentName.trim()) {
      setNewStudentId("");
      return;
    }

    const words = newStudentName.trim().split(/\s+/);
    let initials = words
      .map(w => w.charAt(0))
      .join("")
      .toUpperCase();

    initials = initials
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/Đ/g, "D")
      .replace(/[^A-Z]/g, "");

    if (!initials) {
      initials = "HV";
    }

    const existingIds = new Set(students.map((s) => s.id.toUpperCase()));
    let generatedId = "";

    for (let attempt = 0; attempt < 1000; attempt++) {
      const random5Digits = Math.floor(10000 + Math.random() * 90000);
      const candidate = `${initials}${random5Digits}`;
      if (!existingIds.has(candidate)) {
        generatedId = candidate;
        break;
      }
    }

    if (!generatedId) {
      const random5Digits = Math.floor(10000 + Math.random() * 90000);
      generatedId = `${initials}${random5Digits}`;
    }

    setNewStudentId(generatedId);
  }, [newStudentName, students]);

  const handleAddStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStudentError("");

    const id = newStudentId.trim().toUpperCase();
    const name = newStudentName.trim();
    const cls = newStudentClass.trim();
    const password = newStudentPassword.trim();

    if (!name) {
      setStudentError("Vui lòng nhập Họ tên học viên.");
      return;
    }

    if (!id) {
      setStudentError("Chưa thể sinh ID học viên từ tên. Vui lòng kiểm tra lại họ tên.");
      return;
    }

    if (password.length < 8) {
      setStudentError("Mật khẩu học viên phải dài tối thiểu 8 ký tự.");
      return;
    }

    if (students.some((s) => s.id.toUpperCase() === id)) {
      setStudentError(`ID học viên "${id}" đã tồn tại.`);
      return;
    }

    onAddStudent({ id, name, classGroup: cls, password });
    setNewStudentName("");
    setNewStudentPassword("12345678");
  };

  const handleCreateClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) {
      alert("Vui lòng nhập tên lớp học.");
      return;
    }
    const exists = classGroups.some(c => c.name.toLowerCase() === newClassName.trim().toLowerCase());
    if (exists) {
      alert("Tên lớp học này đã tồn tại!");
      return;
    }

    const newClass: ClassGroup = {
      id: `class_${Date.now()}`,
      name: newClassName.trim(),
      description: newClassDescription.trim(),
      lectures: []
    };

    onUpdateClassGroups(prev => [...prev, newClass]);
    setNewClassName("");
    setNewClassDescription("");
    setShowCreateClassForm(false);
  };

  const handleDeleteClass = (classId: string) => {
    const cls = classGroups.find(c => c.id === classId);
    if (!cls) return;

    setConfirmModal({
      isOpen: true,
      title: "Xóa lớp học?",
      message: `Bạn có chắc chắn muốn xóa lớp học "${cls.name}" không?\n\nLưu ý: Các bài giảng đã lưu trữ trong kho lớp này sẽ bị xóa. Học sinh thuộc lớp này sẽ không còn xem lại được tài liệu bài giảng nữa.`,
      confirmText: "Xóa lớp học",
      isDanger: true,
      onConfirm: () => {
        onUpdateClassGroups(prev => prev.filter(c => c.id !== classId));
        if (selectedClassId === classId) {
          setSelectedClassId(null);
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleLectureFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        setLectureFile({
          data: event.target?.result as string,
          name: file.name
        });
        if (!lectureTitle) {
          setLectureTitle(file.name.substring(0, file.name.lastIndexOf('.')) || file.name);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddLecture = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lectureTitle.trim()) {
      setLectureUploadError("Vui lòng nhập tiêu đề bài giảng.");
      return;
    }
    if (!lectureFile) {
      setLectureUploadError("Vui lòng đính kèm tệp bài giảng (PDF, Ảnh hoặc Word).");
      return;
    }

    const newLecture: Lecture = {
      id: `lec_${Date.now()}`,
      title: lectureTitle.trim(),
      fileName: lectureFile.name,
      fileData: lectureFile.data,
      uploadedAt: new Date().toISOString().split("T")[0]
    };

    onUpdateClassGroups(prev => prev.map(c => {
      if (c.id === selectedClassId) {
        return {
          ...c,
          lectures: [...c.lectures, newLecture]
        };
      }
      return c;
    }));

    setLectureTitle("");
    setLectureFile(null);
    setLectureUploadError("");
  };

  const handleDeleteLecture = (lectureId: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Xóa tài liệu bài giảng?",
      message: "Học sinh sẽ không thể truy cập tài liệu này sau khi bị xóa. Bạn có thực sự muốn tiếp tục?",
      confirmText: "Xóa tài liệu",
      isDanger: true,
      onConfirm: () => {
        onUpdateClassGroups(prev => prev.map(c => {
          if (c.id === selectedClassId) {
            return {
              ...c,
              lectures: c.lectures.filter(l => l.id !== lectureId)
            };
          }
          return c;
        }));
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const executeAddPresetAssignment = () => {
    const partIQuestions: QuestionPartI[] = Array.from({ length: numPartI }).map((_, idx) => ({
      id: `p1-q${idx + 1}-${Date.now()}`,
      questionNumber: idx + 1,
      content: `Xem Câu hỏi ${idx + 1} trong tệp đề thi đính kèm.`,
      options: ["A", "B", "C", "D"],
      correctOption: keysPartI[idx] ?? 0,
      explanation: ""
    }));

    const partIIQuestions: QuestionPartII[] = Array.from({ length: numPartII }).map((_, idx) => ({
      id: `p2-q${idx + 1}-${Date.now()}`,
      questionNumber: idx + 1,
      content: `Xem Câu hỏi ${idx + 1} trong tệp đề thi đính kèm.`,
      statements: [
        { text: "a", correctAnswer: keysPartII[idx]?.[0] ?? true },
        { text: "b", correctAnswer: keysPartII[idx]?.[1] ?? true },
        { text: "c", correctAnswer: keysPartII[idx]?.[2] ?? true },
        { text: "d", correctAnswer: keysPartII[idx]?.[3] ?? true },
      ],
      explanation: ""
    }));

    const partIIIQuestions: QuestionPartIII[] = Array.from({ length: numPartIII }).map((_, idx) => ({
      id: `p3-q${idx + 1}-${Date.now()}`,
      questionNumber: idx + 1,
      content: `Xem Câu hỏi ${idx + 1} trong tệp đề thi đính kèm.`,
      correctAnswer: (keysPartIII[idx] ?? "").trim() || "0",
      explanation: ""
    }));

    const assignment: Assignment = {
      id: `exam_${Date.now()}`,
      title: newTitle.trim(),
      duration: newDuration,
      createdDate: new Date().toISOString().split("T")[0],
      isPublished: true,
      examType: newExamType,
      partIQuestions,
      partIIQuestions,
      partIIIQuestions,
      fileData: uploadedFile?.data || "",
      fileName: uploadedFile?.name || "",
      targetClassId: newTargetClassId,
      openTime: newOpenTime || undefined,
      closeTime: newCloseTime || undefined,
    };

    onAddAssignment(assignment);
     
    setShowCreateForm(false);
    setNewTitle("");
    setNewDuration(90);
    setNewOpenTime("");
    setNewCloseTime("");
    setNewExamType("THPTQG");
    setNewTargetClassId("all");
    setUploadError("");
    setUploadSuccessMessage("");
    setUploadedFile(null);
    setNumPartI(12);
    setNumPartII(4);
    setNumPartIII(6);
    setKeysPartI(Array(12).fill(0));
    setKeysPartII(Array(4).fill(null).map(() => Array(4).fill(true)));
    setKeysPartIII(Array(6).fill(""));
  };

  const handleAddPresetAssignment = () => {
    if (!newTitle.trim()) {
      alert("Vui lòng nhập Tiêu đề đề thi.");
      return;
    }

    if (!uploadedFile) {
      alert("Vui lòng tải lên hoặc kéo thả tệp đề thi (PDF, Word hoặc Ảnh) ở ô bên trái!");
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: "Xác nhận tạo và xuất bản đề thi",
      message: `Bạn có chắc chắn muốn lưu và xuất bản đề thi mới "${newTitle.trim()}" này không?\n\nCẢNH BÁO: Học sinh sẽ thấy đề thi này ngay lập tức trên trang cá nhân của họ và có thể bắt đầu làm bài luyện tập.`,
      confirmText: "Xuất bản ngay",
      onConfirm: () => {
        executeAddPresetAssignment();
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleQuickSeedDemo = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 1100;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 800, 1100);

      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 12;
      ctx.strokeRect(10, 10, 780, 1080);
       
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 1;
      ctx.strokeRect(20, 20, 760, 1060);

      ctx.fillStyle = "#1e293b";
      ctx.font = "bold 16px sans-serif";
      ctx.fillText("BỘ GIÁO DỤC VÀ ĐÀO TẠO", 50, 60);
      ctx.font = "14px sans-serif";
      ctx.fillText("ĐỀ THI KHẢO SÁT CHẤT LƯỢNG LỚP 12 THPT", 50, 85);
       
      ctx.font = "bold 16px sans-serif";
      ctx.fillText("KỲ THI TỐT NGHIỆP THPT NĂM 2026", 450, 60);
      ctx.font = "bold 14px sans-serif";
      ctx.fillStyle = "#e11d48";
      ctx.fillText("Môn thi: TOÁN HỌC - KHẢO SÁT ĐẦU NĂM", 450, 85);

      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(50, 110);
      ctx.lineTo(750, 110);
      ctx.stroke();

      ctx.fillStyle = "#475569";
      ctx.font = "italic 13px sans-serif";
      ctx.fillText("Thời gian làm bài: 90 phút (không kể thời gian phát đề) - Đề thi gồm 3 phần", 50, 135);

      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 15px sans-serif";
      ctx.fillText("PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn (12 Câu hỏi)", 50, 180);
      ctx.font = "14px sans-serif";
      ctx.fillText("Thí sinh trả lời từ câu 1 đến câu 12. Mỗi câu hỏi thí sinh chỉ chọn một phương án.", 50, 200);

      ctx.fillStyle = "#1e293b";
      ctx.font = "bold 13px sans-serif";
      ctx.fillText("Câu 1. Cho hàm số y = f(x) liên tục trên R và có bảng biến thiên như sau.", 50, 240);
      ctx.font = "13px sans-serif";
      ctx.fillText("Hàm số đã cho đồng biến trên khoảng nào dưới đây?", 70, 260);
      ctx.font = "bold 13px sans-serif";
      ctx.fillText("A. (0; 2)", 80, 285);
      ctx.fillText("B. (-infinity; 0)", 250, 285);
      ctx.fillText("C. (-1; 3)", 420, 285);
      ctx.fillText("D. (1; +infinity)", 590, 285);

      ctx.font = "bold 13px sans-serif";
      ctx.fillText("Câu 2. Trong không gian Oxyz, cho mặt cầu (S): (x-1)^2 + (y+2)^2 + z^2 = 9.", 50, 330);
      ctx.font = "13px sans-serif";
      ctx.fillText("Tọa độ tâm I và bán kính R của mặt cầu (S) lần lượt là:", 70, 350);
      ctx.font = "bold 13px sans-serif";
      ctx.fillText("A. I(1; -2; 0), R = 3", 80, 375);
      ctx.fillText("B. I(-1; 2; 0), R = 3", 250, 375);
      ctx.fillText("C. I(1; 2; 0), R = 9", 420, 375);
      ctx.fillText("D. I(1; -2; 0), R = 9", 590, 375);

      ctx.font = "bold 13px sans-serif";
      ctx.fillText("Câu 3. Nguyên hàm của hàm số f(x) = 3x^2 + sin x là:", 50, 420);
      ctx.font = "bold 13px sans-serif";
      ctx.fillText("A. F(x) = x^3 - cos x + C", 80, 445);
      ctx.fillText("B. F(x) = x^3 + cos x + C", 250, 445);
      ctx.fillText("C. F(x) = 6x + cos x + C", 420, 445);
      ctx.fillText("D. F(x) = 3x^3 - cos x + C", 590, 445);

      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 15px sans-serif";
      ctx.fillText("PHẦN II. Câu trắc nghiệm Đúng/Sai (4 Câu hỏi)", 50, 510);
      ctx.font = "14px sans-serif";
      ctx.fillText("Trong mỗi ý a), b), c), d) ở mỗi câu, thí sinh chọn Đúng hoặc Sai.", 50, 530);

      ctx.fillStyle = "#1e293b";
      ctx.font = "bold 13px sans-serif";
      ctx.fillText("Câu 1. Cho hàm số y = f(x) = (x^2 - x + 1)/(x - 1) có đồ thị (C).", 50, 570);
      ctx.font = "13px sans-serif";
      ctx.fillText("a) Hàm số có tập xác định D = R \\ {1}.", 70, 595);
      ctx.fillText("b) Đồ thị (C) có tiệm cận đứng là đường thẳng x = 1.", 70, 615);
      ctx.fillText("c) Hàm số đạt cực đại tại x = 0 và cực tiểu tại x = 2.", 70, 635);
      ctx.fillText("d) Đường tiệm cận xiên của (C) là đường thẳng y = x.", 70, 655);

      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 15px sans-serif";
      ctx.fillText("PHẦN III. Câu trắc nghiệm trả lời ngắn (6 Câu hỏi)", 50, 710);
      ctx.font = "14px sans-serif";
      ctx.fillText("Thí sinh nhập đáp số bằng số thực hoặc số nguyên vào ô điền đáp án.", 50, 730);

      ctx.fillStyle = "#1e293b";
      ctx.font = "bold 13px sans-serif";
      ctx.fillText("Câu 1. Biết rằng tích phân từ 0 đến 3 của f(x) dx bằng 4. Tính tích phân", 50, 770);
      ctx.fillText("từ 0 đến 3 của [2f(x) - 1] dx.", 70, 790);

      ctx.font = "bold 13px sans-serif";
      ctx.fillText("Câu 2. Có bao nhiêu số nguyên m thuộc đoạn [-5; 5] để hàm số y = x^3 - 3mx^2 + 12x", 50, 835);
      ctx.fillText("đồng biến trên khoảng (-infinity; +infinity)?", 70, 855);

      ctx.fillStyle = "#f1f5f9";
      ctx.fillRect(50, 930, 700, 80);
      ctx.fillStyle = "#64748b";
      ctx.font = "bold 14px sans-serif";
      ctx.fillText("HỆ THỐNG QUẢN LÝ QUẦN MAI TUTOR - ĐỀ THI MINH HỌA CHUẨN", 180, 960);
      ctx.font = "12px sans-serif";
      ctx.fillText("Học sinh vui lòng nhìn đề bài bên trái này và điền đáp án vào phiếu bên phải.", 175, 985);
    }

    const dataUrl = canvas.toDataURL("image/png");

    setNewTitle("Đề Khảo Sát Toán 12 Học Kỳ 1 (Đề Mẫu)");
    setNewDuration(90);
    setNewExamType("THPTQG");
    setUploadedFile({
      data: dataUrl,
      name: "de_khao_sat_toan12_mau.png"
    });
     
    setNumPartI(12);
    setNumPartII(4);
    setNumPartIII(6);

    const demoKeysI = [0, 0, 0, 1, 2, 3, 0, 1, 2, 3, 0, 1];
    const demoKeysII = [
      [true, true, true, true],
      [true, false, true, false],
      [false, true, false, true],
      [true, true, false, false]
    ];
    const demoKeysIII = ["5", "3", "12", "0.5", "-4", "10"];

    setKeysPartI(demoKeysI);
    setKeysPartII(demoKeysII);
    setKeysPartIII(demoKeysIII);

    setUploadSuccessMessage("Đã nạp tự động Đề mẫu kèm Bảng đáp án chuẩn thành công! Vui lòng kiểm tra và bấm 'Lưu & Xuất Bản Đề Thi' ở góc dưới.");
  };

  const getQuestionFailureStats = () => {
    const failStats: { [qId: string]: { total: number; wrong: number; num: number; part: string } } = {};
     
    attempts.forEach(att => {
      const assign = assignments.find(a => a.id === att.assignmentId);
      if (!assign) return;

      assign.partIQuestions.forEach(q => {
        if (!failStats[q.id]) failStats[q.id] = { total: 0, wrong: 0, num: q.questionNumber, part: "Phần I" };
        failStats[q.id].total++;
        if (!att.gradedDetails.partIResult[q.id]) {
          failStats[q.id].wrong++;
        }
      });

      assign.partIIQuestions.forEach(q => {
        if (!failStats[q.id]) failStats[q.id] = { total: 0, wrong: 0, num: q.questionNumber, part: "Phần II" };
        failStats[q.id].total++;
        const detail = att.gradedDetails.partIIDetail[q.id];
        if (detail && detail.correctCount < 4) {
          failStats[q.id].wrong++;
        }
      });

      assign.partIIIQuestions.forEach(q => {
        if (!failStats[q.id]) failStats[q.id] = { total: 0, wrong: 0, num: q.questionNumber, part: "Phần III" };
        failStats[q.id].total++;
        if (!att.gradedDetails.partIIIResult[q.id]) {
          failStats[q.id].wrong++;
        }
      });
    });

    return Object.entries(failStats)
      .map(([id, info]) => ({ id, ...info, failRate: info.total > 0 ? (info.wrong / info.total) * 100 : 0 }))
      .sort((a, b) => b.failRate - a.failRate)
      .slice(0, 5);
  };

  const hardestQuestions = getQuestionFailureStats();

  return (
    <div className="space-y-6">
       
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 flex flex-wrap items-center justify-between gap-4">
         
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
            <GraduationCap size={20} />
          </div>
          <div>
            <h1 className="text-base font-black text-slate-800">Bảng Điều Khiển Tutor</h1>
            <p className="text-xs text-slate-400 font-medium">Thiết kế đề thi • Kiểm tra bảng điểm • Quản lý Students</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl shrink-0">
          <button
            onClick={() => setActiveTab("assignments")}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === "assignments" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <BookOpen size={14} />
            Đề Thi ({assignments.length})
          </button>
           
          <button
            onClick={() => setActiveTab("students")}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === "students" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Users size={14} />
            Students ({students.length})
          </button>

          <button
            id="tab-classes"
            onClick={() => setActiveTab("classes")}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === "classes" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <FolderOpen size={14} />
            Quản Lý Lớp ({classGroups.length})
          </button>
           
          <button
            onClick={() => setActiveTab("statistics")}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === "statistics" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <BarChart3 size={14} />
            Thống Kê Lớp
          </button>

          <button
            id="tab-security"
            onClick={() => setActiveTab("security")}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === "security" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Lock size={14} />
            Bảo Mật
          </button>
        </div>

      </div>

      {activeTab === "assignments" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-800">Danh Sách Đề Thi Toán</h2>
            <button
              id="btn-add-exam-form"
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-100"
            >
              <Plus size={16} />
              Tạo Đề Thi Mới
            </button>
          </div>

          {showCreateForm && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-50/50 border border-slate-200 rounded-3xl p-6 shadow-sm animate-in fade-in slide-in-from-top-5 duration-200">
               
              <div className="lg:col-span-6 flex flex-col space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText size={14} className="text-indigo-600" />
                    File tài liệu đề thi (Bên trái giao diện thi)
                  </span>
                  {!uploadedFile && (
                    <button
                      type="button"
                      onClick={handleQuickSeedDemo}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 rounded-lg transition-colors"
                    >
                      <RefreshCw size={12} className="animate-spin duration-1000" />
                      Nạp Đề Mẫu (Toán 12)
                    </button>
                  )}
                </div>

                {uploadedFile ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 flex flex-col flex-1 shadow-sm min-h-[450px]">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs">
                          {uploadedFile.name.split(".").pop()?.toUpperCase()}
                        </div>
                        <div className="max-w-[200px] md:max-w-xs">
                          <p className="text-xs font-bold text-slate-800 truncate" title={uploadedFile.name}>
                            {uploadedFile.name}
                          </p>
                          <p className="text-[10px] text-emerald-500 font-bold">Đã nạp file thành công</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setUploadedFile(null);
                          setUploadSuccessMessage("");
                        }}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Xóa tệp đã chọn"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="flex-1 min-h-[350px] relative rounded-xl border border-slate-100 overflow-hidden bg-slate-50 flex items-center justify-center">
                      {uploadedFile.name.endsWith(".pdf") ? (
                        <div className="w-full h-full flex flex-col relative">
                          <iframe
                            src={uploadedFile.data}
                            className="w-full h-full flex-1 border-0"
                            title="PDF Preview"
                          />
                          <div className="absolute bottom-2 inset-x-2 bg-slate-900/90 text-white rounded-xl p-3 flex flex-col sm:flex-row gap-2 justify-between items-center text-xs shadow-lg backdrop-blur-xs">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse shrink-0"></span>
                              <span className="font-semibold truncate text-slate-200">{uploadedFile.name}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => openBase64InNewTab(uploadedFile.data, uploadedFile.name)}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-black rounded-lg text-[11px] flex items-center gap-1 transition-all"
                            >
                              Mở trong tab mới ↗
                            </button>
                          </div>
                        </div>
                      ) : uploadedFile.data.startsWith("data:image/") || /\.(png|jpe?g|webp|gif|svg)$/i.test(uploadedFile.name) ? (
                        <div className="w-full h-full overflow-auto p-2 flex items-start justify-center">
                          <img
                            src={uploadedFile.data}
                            className="max-w-full h-auto object-contain rounded-lg shadow-sm"
                            alt="Preview đề thi"
                          />
                        </div>
                      ) : (
                        <div className="p-6 text-center space-y-2">
                          <FileText size={40} className="mx-auto text-slate-300" />
                          <p className="text-xs font-bold text-slate-600">Đã nạp tệp {uploadedFile.name}</p>
                          <p className="text-[10px] text-slate-400">File này sẽ tự động hiển thị trong khung thi của học sinh.</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 flex-1 flex flex-col justify-between">
                    <div
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      className={`border-3 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-4 flex-1 ${
                        dragActive
                          ? "border-indigo-500 bg-indigo-50/40 scale-[0.99]"
                          : "border-slate-300 bg-white hover:border-indigo-400 hover:bg-slate-50/20"
                      }`}
                      onClick={() => document.getElementById("file-exam-input")?.click()}
                    >
                      <input
                        id="file-exam-input"
                        type="file"
                        accept=".pdf,image/*,.png,.jpg,.jpeg,.docx"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500 shadow-sm shadow-indigo-100">
                        <UploadCloud size={28} />
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-sm font-bold text-slate-800">
                          Kéo thả đề thi (PDF, Ảnh hoặc Word) vào đây
                        </p>
                        <p className="text-xs text-slate-400 font-medium">
                          hoặc <span className="text-indigo-600 underline font-bold">nhấp để duyệt tệp tin</span>
                        </p>
                      </div>
                      <div className="flex flex-wrap justify-center gap-2 text-[10px] text-slate-400 font-semibold bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
                        <span>PDF</span>•<span>IMAGE (PNG, JPG)</span>•<span>WORD</span>
                      </div>
                    </div>

                    {uploadError && (
                      <div className="text-xs font-medium text-rose-600 bg-rose-50 border border-rose-100 p-2.5 rounded-lg">
                        {uploadError}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="lg:col-span-6 flex flex-col space-y-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <span className="text-xs font-black text-slate-700 uppercase tracking-wider block border-b border-slate-100 pb-2">
                  Cấu hình đề thi & Phiếu đáp án chuẩn (Bên phải giao diện thi)
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tiêu đề đề thi:</label>
                    <input
                      id="input-new-exam-title"
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="VD: Đề thi thử Toán học kỳ 1 lớp 12"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Thời gian làm bài (Phút):</label>
                    <input
                      id="input-new-exam-duration"
                      type="number"
                      value={newDuration}
                      onChange={(e) => setNewDuration(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Thời gian mở đề (Không bắt buộc):</label>
                    <input
                      type="datetime-local"
                      value={newOpenTime}
                      onChange={(e) => setNewOpenTime(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Thời gian đóng đề (Không bắt buộc):</label>
                    <input
                      type="datetime-local"
                      value={newCloseTime}
                      onChange={(e) => setNewCloseTime(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Phương thức tính điểm:</label>
                    <select
                      id="select-new-exam-type"
                      value={newExamType}
                      onChange={(e) => setNewExamType(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="THPTQG">Bộ Giáo dục & Đào tạo (THPTQG)</option>
                      <option value="TSA">ĐH Bách Khoa Hà Nội (TSA)</option>
                      <option value="HSA">ĐHQG Hà Nội (HSA)</option>
                      <option value="QDA">Phân tích Số liệu & Định lượng (QDA)</option>
                      <option value="BCA">Bài thi đánh giá của Bộ Công an (BCA)</option>
                    </select>
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Giao cho Lớp học:</label>
                    <select
                      id="select-new-exam-target-class"
                      value={newTargetClassId}
                      onChange={(e) => setNewTargetClassId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="all">Tất cả các lớp (Công khai)</option>
                      {classGroups.map((cg) => (
                        <option key={cg.id} value={cg.id}>Lớp {cg.name} — {cg.description || "Không có mô tả"}</option>
                      ))}
                    </select>

                    <p className="text-[10px] text-slate-500 leading-normal bg-indigo-50/40 p-2 rounded-xl mt-1.5">
                      {newExamType === "THPTQG" && "Quy chế THPTQG: Phần I (Trắc nghiệm nhiều lựa chọn - 0.25đ/câu), Phần II (Đúng/Sai - tính điểm lũy tiến tối đa 1.0đ/câu), Phần III (Điền đáp số - 0.5đ/câu)."}
                      {newExamType === "TSA" && "Quy chế TSA Bách Khoa: Trắc nghiệm (Phần I), Đúng/Sai (Phần II - đúng 2 ý = 0.2đ, đúng 3 ý = 0.6đ, đúng 4 ý = 1.0đ), Điền đáp số (Phần III). Chuẩn hóa về thang điểm 10.0đ."}
                      {newExamType === "HSA" && "Quy chế HSA ĐHQGHN: Thang điểm đồng trọng số. Mỗi câu trắc nghiệm và điền đáp số nhận 1đ, Đúng/Sai nhận 0.25đ/ý. Quy đổi về thang điểm 10.0đ."}
                      {newExamType === "QDA" && "Quy chế Định lượng QDA: Trọng số điểm chia theo phần: Phần I (30%), Phần II (30%), Phần III (40%). Hệ thống tự động quy đổi về thang điểm 10.0đ."}
                      {newExamType === "BCA" && "Quy chế Bộ Công an: Chú trọng Phần I chiếm 60% trọng số điểm (6.0đ) và Phần III chiếm 40% trọng số điểm (4.0đ). Phần II chiếm 0% trọng số điểm."}
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 grid grid-cols-3 gap-3">
                  <div className="text-center space-y-1">
                    <span className="text-[9px] font-bold text-slate-400 block uppercase">Phần I (MC)</span>
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleNumPartIChange(numPartI - 1)}
                        className="w-5 h-5 rounded bg-white border border-slate-200 text-xs font-bold hover:bg-slate-100"
                      >
                        -
                      </button>
                      <span className="text-xs font-black text-slate-800">{numPartI}</span>
                      <button
                        type="button"
                        onClick={() => handleNumPartIChange(numPartI + 1)}
                        className="w-5 h-5 rounded bg-white border border-slate-200 text-xs font-bold hover:bg-slate-100"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="text-center space-y-1">
                    <span className="text-[9px] font-bold text-slate-400 block uppercase">Phần II (T/F)</span>
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleNumPartIIChange(numPartII - 1)}
                        className="w-5 h-5 rounded bg-white border border-slate-200 text-xs font-bold hover:bg-slate-100"
                      >
                        -
                      </button>
                      <span className="text-xs font-black text-slate-800">{numPartII}</span>
                      <button
                        type="button"
                        onClick={() => handleNumPartIIChange(numPartII + 1)}
                        className="w-5 h-5 rounded bg-white border border-slate-200 text-xs font-bold hover:bg-slate-100"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="text-center space-y-1">
                    <span className="text-[9px] font-bold text-slate-400 block uppercase">Phần III (Short)</span>
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleNumPartIIIChange(numPartIII - 1)}
                        className="w-5 h-5 rounded bg-white border border-slate-200 text-xs font-bold hover:bg-slate-100"
                      >
                        -
                      </button>
                      <span className="text-xs font-black text-slate-800">{numPartIII}</span>
                      <button
                        type="button"
                        onClick={() => handleNumPartIIIChange(numPartIII + 1)}
                        className="w-5 h-5 rounded bg-white border border-slate-200 text-xs font-bold hover:bg-slate-100"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Phương thức nhập đáp án chuẩn:</span>
                  <div className="flex p-0.5 bg-slate-100 rounded-xl border border-slate-200/40">
                    <button
                      type="button"
                      onClick={() => setAnswerEntryMethod("auto")}
                      className={`flex-1 py-2 text-xs font-black rounded-lg transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                        answerEntryMethod === "auto"
                          ? "bg-white text-indigo-700 shadow-xs"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <Sparkles size={13} />
                      Tự động điền bằng AI
                    </button>
                    <button
                      type="button"
                      onClick={() => setAnswerEntryMethod("manual")}
                      className={`flex-1 py-2 text-xs font-black rounded-lg transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                        answerEntryMethod === "manual"
                          ? "bg-white text-indigo-700 shadow-xs"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <CheckSquare size={13} />
                      Tự nhập tay thủ công
                    </button>
                  </div>
                </div>

                {answerEntryMethod === "auto" && (
                  <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl space-y-3 shadow-2xs animate-in fade-in duration-200">
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-xs shadow-indigo-150">
                        <Sparkles size={16} />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-xs font-black text-slate-800">Nhập đáp án tự động bằng AI ⚡</h4>
                        <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                          Bạn có sẵn ảnh chụp bảng đáp án hoặc tệp chứa lời giải? Tải lên đây để AI tự động nhận diện và điền nhanh bảng đáp án chuẩn bên dưới!
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <input
                        id="answer-key-file-input"
                        type="file"
                        accept="image/*,.pdf,.docx,.txt"
                        disabled={isParsingAnswerKey}
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleAnswerKeyUpload(e.target.files[0]);
                          }
                        }}
                        className="hidden"
                      />
                       
                      <button
                        type="button"
                        disabled={isParsingAnswerKey}
                        onClick={() => document.getElementById("answer-key-file-input")?.click()}
                        className={`w-full py-2.5 px-4 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none ${
                          isParsingAnswerKey 
                            ? "bg-slate-200 text-slate-400 border border-slate-300" 
                            : "bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300 shadow-3xs"
                        }`}
                      >
                        {isParsingAnswerKey ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            <span>AI đang đọc & trích xuất đáp án...</span>
                          </>
                        ) : (
                          <>
                            <UploadCloud size={14} />
                            <span>Tải ảnh/file đáp án lên</span>
                          </>
                        )}
                      </button>

                      {parseKeySuccess && (
                        <div className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-150 p-2 rounded-xl animate-in fade-in duration-200">
                          {parseKeySuccess}
                        </div>
                      )}

                      {parseKeyError && (
                        <div className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-150 p-2 rounded-xl animate-in fade-in duration-200">
                          {parseKeyError}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {answerEntryMethod === "manual" && (
                  <div className="p-4 bg-amber-50/40 border border-amber-100 rounded-2xl space-y-1.5 shadow-2xs animate-in fade-in duration-200">
                    <span className="text-xs font-black text-amber-800 flex items-center gap-1">
                      <CheckSquare size={14} />
                      Chế độ nhập tay thủ công tích cực
                    </span>
                    <p className="text-[10px] text-amber-700 font-medium leading-relaxed">
                      Bạn có thể nhập trực tiếp các đáp án đúng cho từng câu hỏi bằng bảng chọn cuộn hiển thị bên dưới. Đáp án sẽ được tự động đồng bộ thời gian thực!
                    </p>
                  </div>
                )}

                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1 border border-slate-100 rounded-xl p-3 bg-slate-50/50">
                   
                  {numPartI > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-indigo-600 block uppercase tracking-wider">
                        Phần I: Trắc nghiệm 4 lựa chọn ({numPartI} câu)
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {Array.from({ length: numPartI }).map((_, idx) => (
                          <div key={`p1-k-${idx}`} className="flex items-center justify-between p-2 bg-white border border-slate-100 rounded-lg shadow-2xs">
                            <span className="text-xs font-black text-slate-600">Câu {idx + 1}:</span>
                            <div className="flex gap-1">
                              {["A", "B", "C", "D"].map((opt, oIdx) => (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => {
                                    const next = [...keysPartI];
                                    next[idx] = oIdx;
                                    setKeysPartI(next);
                                  }}
                                  className={`w-6 h-6 rounded-full text-[10px] font-black transition-colors ${
                                    keysPartI[idx] === oIdx
                                      ? "bg-indigo-600 text-white shadow-sm"
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

                  {numPartII > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <span className="text-[10px] font-bold text-emerald-600 block uppercase tracking-wider">
                        Phần II: Đúng / Sai ({numPartII} câu - Mỗi câu 4 mệnh đề)
                      </span>
                      <div className="space-y-2">
                        {Array.from({ length: numPartII }).map((_, idx) => (
                          <div key={`p2-k-${idx}`} className="p-2.5 bg-white border border-slate-100 rounded-lg shadow-2xs space-y-1.5">
                            <span className="text-xs font-black text-slate-700">Câu {idx + 1}:</span>
                            <div className="grid grid-cols-2 gap-2">
                              {["a", "b", "c", "d"].map((sub, sIdx) => {
                                const currentVal = keysPartII[idx]?.[sIdx] ?? true;
                                return (
                                  <div key={sub} className="flex items-center justify-between bg-slate-50 px-2 py-1 rounded">
                                    <span className="text-[11px] font-bold text-slate-500">{sub})</span>
                                    <div className="flex gap-1">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const next = [...keysPartII];
                                          if (!next[idx]) next[idx] = [true, true, true, true];
                                          const row = [...next[idx]];
                                          row[sIdx] = true;
                                          next[idx] = row;
                                          setKeysPartII(next);
                                        }}
                                        className={`px-1.5 py-0.5 rounded text-[9px] font-black transition-colors ${
                                          currentVal === true
                                            ? "bg-emerald-500 text-white"
                                            : "bg-slate-200 text-slate-400 hover:bg-slate-300"
                                        }`}
                                      >
                                        Đúng
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const next = [...keysPartII];
                                          if (!next[idx]) next[idx] = [true, true, true, true];
                                          const row = [...next[idx]];
                                          row[sIdx] = false;
                                          next[idx] = row;
                                          setKeysPartII(next);
                                        }}
                                        className={`px-1.5 py-0.5 rounded text-[9px] font-black transition-colors ${
                                          currentVal === false
                                            ? "bg-rose-500 text-white"
                                            : "bg-slate-200 text-slate-400 hover:bg-slate-300"
                                        }`}
                                      >
                                        Sai
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

                  {numPartIII > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <span className="text-[10px] font-bold text-amber-600 block uppercase tracking-wider">
                        Phần III: Điền đáp số ngắn ({numPartIII} câu)
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {Array.from({ length: numPartIII }).map((_, idx) => (
                          <div key={`p3-k-${idx}`} className="flex items-center justify-between p-2 bg-white border border-slate-100 rounded-lg shadow-2xs gap-3">
                            <span className="text-xs font-black text-slate-600 whitespace-nowrap">Câu {idx + 1}:</span>
                            <input
                              type="text"
                              value={keysPartIII[idx] ?? ""}
                              onChange={(e) => {
                                const next = [...keysPartIII];
                                next[idx] = e.target.value;
                                setKeysPartIII(next);
                              }}
                              placeholder="Nhập số thực/nguyên..."
                              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-bold text-slate-700 w-full focus:outline-none focus:bg-white focus:border-indigo-500"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>

                <div className="flex gap-3 justify-end pt-3 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setShowCreateForm(false);
                      setUploadedFile(null);
                    }}
                    className="px-3 py-1.5 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 text-xs font-bold"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    id="btn-save-new-exam"
                    onClick={handleAddPresetAssignment}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md shadow-indigo-150"
                  >
                    Lưu & Xuất Bản Đề Thi
                  </button>
                </div>
              </div>

            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-100">
                    <th className="py-4 px-6">Tên Đề Thi</th>
                    <th className="py-4 px-6">Ngày Tạo</th>
                    <th className="py-4 px-6">Thời Lượng</th>
                    <th className="py-4 px-6 text-center">Cơ Cấu Câu Hỏi</th>
                    <th className="py-4 px-6 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {assignments.map((assign) => (
                    <tr key={assign.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-slate-800">{assign.title}</span>
                          {(() => {
                            const configs: Record<string, { label: string; className: string }> = {
                              THPTQG: { label: "THPTQG Math", className: "bg-indigo-50 border border-indigo-100 text-indigo-700" },
                              TSA: { label: "TSA Math", className: "bg-orange-50 border border-orange-100 text-orange-700" },
                              HSA: { label: "HSA Math", className: "bg-teal-50 border border-teal-100 text-teal-700" },
                              QDA: { label: "QDA Math", className: "bg-rose-50 border border-rose-100 text-rose-700" },
                              BCA: { label: "BCA Math", className: "bg-blue-50 border border-blue-100 text-blue-700" },
                            };
                            const type = assign.examType || "THPTQG";
                            const conf = configs[type] || configs.THPTQG;
                            return (
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black tracking-wide ${conf.className}`}>
                                {conf.label}
                              </span>
                            );
                          })()}
                        </div>
                        <div className="text-xs text-slate-400 font-mono mt-0.5 flex flex-wrap gap-x-3.5">
                          <span>ID: {assign.id}</span>
                          {(assign.openTime || assign.closeTime) && (
                            <span className="text-slate-500 font-sans">
                              🕒{" "}
                              {assign.openTime 
                                ? new Date(assign.openTime).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }) 
                                : "Bất cứ lúc nào"} 
                              {" → "} 
                              {assign.closeTime 
                                ? new Date(assign.closeTime).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }) 
                                : "Không giới hạn"}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-slate-500 font-medium">{assign.createdDate}</td>
                      <td className="py-4 px-6 text-slate-600 font-semibold">{assign.duration} phút</td>
                      <td className="py-4 px-6 text-center text-slate-500">
                        <div className="flex items-center justify-center gap-2">
                          <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-md text-[10px] font-black">
                            PI: {assign.partIQuestions.length}
                          </span>
                          <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-md text-[10px] font-black">
                            PII: {assign.partIIQuestions.length}
                          </span>
                          <span className="px-2 py-0.5 bg-amber-50 border border-amber-100 text-amber-700 rounded-md text-[10px] font-black">
                            PIII: {assign.partIIIQuestions.length}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right space-x-1.5">
                        {assign.fileData && (
                          <button
                            onClick={() => setPreviewingAssignment(assign)}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors inline-flex items-center justify-center cursor-pointer"
                            title="Xem chi tiết đề thi"
                          >
                            <Eye size={16} />
                          </button>
                        )}
                        <button
                          id={`btn-delete-exam-${assign.id}`}
                          onClick={() => {
                            setConfirmModal({
                              isOpen: true,
                              title: "Xóa Đề Thi?",
                              message: `Bạn chắc chắn muốn xóa đề thi "${assign.title}"?\n\nCẢNH BÁO: Học sinh sẽ không thể làm đề thi này nữa sau khi xóa.`,
                              confirmText: "Xóa đề thi",
                              isDanger: true,
                              onConfirm: () => {
                                onDeleteAssignment(assign.id);
                                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                              }
                            });
                          }}
                          className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors inline-flex items-center justify-center cursor-pointer"
                          title="Xóa đề thi"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "students" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4 h-fit">
              <h2 className="text-base font-black text-slate-800 flex items-center gap-1.5">
                <UserPlus size={18} className="text-indigo-600" />
                Đăng Ký ID Học Viên Mới
              </h2>

              <form onSubmit={handleAddStudentSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label htmlFor="student-id-input" className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                      ID Học Viên:
                    </label>
                    <span className="text-[10px] text-indigo-600 font-extrabold bg-indigo-50 px-2 py-0.5 rounded-md">
                      Tự động sinh ID từ chữ cái đầu
                    </span>
                  </div>
                  <input
                    id="student-id-input"
                    type="text"
                    value={newStudentId || "(Nhập họ tên để tự động sinh ID)"}
                    readOnly
                    className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-mono font-bold text-indigo-600 focus:outline-none cursor-not-allowed select-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="student-name-input" className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Họ Tên Học Viên:
                  </label>
                  <input
                    id="student-name-input"
                    type="text"
                    value={newStudentName}
                    onChange={(e) => setNewStudentName(e.target.value)}
                    placeholder="VD: Nguyễn Văn Bảo"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="student-password-input" className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Mật Khẩu Đăng Nhập (Tối thiểu 8 ký tự):
                  </label>
                  <input
                    id="student-password-input"
                    type="text"
                    value={newStudentPassword}
                    onChange={(e) => setNewStudentPassword(e.target.value)}
                    placeholder="Đặt mật khẩu..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="student-class-input" className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Lớp Học:
                  </label>
                  <select
                    id="student-class-input"
                    value={newStudentClass}
                    onChange={(e) => setNewStudentClass(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-semibold"
                  >
                    {classGroups.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                    {!classGroups.some(c => c.name === "12A1") && <option value="12A1">12A1</option>}
                    {!classGroups.some(c => c.name === "12A2") && <option value="12A2">12A2</option>}
                    {!classGroups.some(c => c.name === "12A3") && <option value="12A3">12A3</option>}
                    {!classGroups.some(c => c.name === "12A4") && <option value="12A4">12A4</option>}
                  </select>
                </div>

                {studentError && (
                  <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 p-2.5 rounded-lg">
                    {studentError}
                  </p>
                )}

                <button
                  id="btn-register-student"
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow"
                >
                  Cấp tài khoản & ID
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100">
                <h2 className="text-base font-black text-slate-800">Danh Sách Học Viên Đăng Nhập</h2>
              </div>
               
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-100">
                      <th className="py-3 px-5">ID Học Viên</th>
                      <th className="py-3 px-5">Họ Tên</th>
                      <th className="py-3 px-5">Lớp</th>
                      <th className="py-3 px-5">Mật Khẩu</th>
                      <th className="py-3 px-5 text-center">Đã Luyện</th>
                      <th className="py-3 px-5 text-center">Điểm Trung Bình</th>
                      <th className="py-3 px-5 text-right">Xóa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {students.map((student) => {
                      const sAttempts = attempts.filter((att) => att.studentId === student.id);
                      const scores = sAttempts.map((a) => a.score);
                      const avg = sAttempts.length > 0 ? scores.reduce((sum, s) => sum + s, 0) / sAttempts.length : 0;
                       
                      return (
                        <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-5 font-mono font-bold text-indigo-600">{student.id}</td>
                          <td className="py-3 px-5 text-slate-800 font-bold">{student.name}</td>
                          <td className="py-3 px-5 text-slate-500 font-semibold">{student.classGroup}</td>
                          <td className="py-3 px-5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs text-slate-600 bg-slate-100 border border-slate-200/60 px-2 py-0.5 rounded font-bold">
                                {student.password || "12345678"}
                              </span>
                              <button
                                onClick={() => {
                                  const currentPass = student.password || "12345678";
                                  const newPass = prompt(`Cấp lại mật khẩu mới cho học viên ${student.name} (Tối thiểu 8 ký tự):`, currentPass);
                                  if (newPass !== null) {
                                    const cleaned = newPass.trim();
                                    if (cleaned.length < 8) {
                                      alert("Mật khẩu mới phải dài tối thiểu 8 ký tự!");
                                      return;
                                    }
                                    onUpdateStudent({ ...student, password: cleaned });
                                  }
                                }}
                                className="p-1 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 rounded transition-colors"
                                title="Cấp lại mật khẩu"
                              >
                                <Lock size={12} />
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-5 text-center text-slate-700 font-bold">{sAttempts.length} đề</td>
                          <td className="py-3 px-5 text-center">
                            {sAttempts.length > 0 ? (
                              <span className={`px-2 py-1 rounded-md text-xs font-black ${
                                avg >= 8.0 
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                                  : avg >= 5.0 
                                    ? "bg-amber-50 text-amber-700 border border-amber-100" 
                                    : "bg-rose-50 text-rose-700 border border-rose-100"
                              }`}>
                                {avg.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400 font-semibold">Chưa làm</span>
                            )}
                          </td>
                          <td className="py-3 px-5 text-right">
                            <button
                              id={`btn-delete-student-${student.id}`}
                              onClick={() => {
                                setConfirmModal({
                                  isOpen: true,
                                  title: "Xóa Học Sinh?",
                                  message: `Bạn chắc chắn muốn xóa học sinh "${student.name}" khỏi hệ thống?\n\nCẢNH BÁO: Xóa học sinh này cũng sẽ làm mất toàn bộ lịch sử điểm số và các bài thi đã nộp của học sinh đó.`,
                                  confirmText: "Xóa học sinh",
                                  isDanger: true,
                                  onConfirm: () => {
                                    onDeleteStudent(student.id);
                                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                  }
                                });
                              }}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-md transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      )}

      {activeTab === "statistics" && (() => {
        const scoreRanges = [
          { name: "0-2đ", count: 0, desc: "Yếu", color: "#f87171" },
          { name: "2-4đ", count: 0, desc: "Yếu-Kém", color: "#fb923c" },
          { name: "4-6đ", count: 0, desc: "Trung bình", color: "#fbbf24" },
          { name: "6-8đ", count: 0, desc: "Khá", color: "#60a5fa" },
          { name: "8-10đ", count: 0, desc: "Giỏi", color: "#34d399" },
        ];

        attempts.forEach((att) => {
          if (att.score < 2) scoreRanges[0].count++;
          else if (att.score < 4) scoreRanges[1].count++;
          else if (att.score < 6) scoreRanges[2].count++;
          else if (att.score < 8) scoreRanges[3].count++;
          else scoreRanges[4].count++;
        });

        const classRankings = students.map((std) => {
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

        const dailyMap: { [dateStr: string]: { count: number; totalScore: number; scores: number[]; list: ExamAttempt[] } } = {};
        attempts.forEach((att) => {
          const dateObj = new Date(att.submitTime);
          const dateStr = dateObj.toLocaleDateString("vi-VN", { year: "numeric", month: "2-digit", day: "2-digit" });
          if (!dailyMap[dateStr]) {
            dailyMap[dateStr] = { count: 0, totalScore: 0, scores: [], list: [] };
          }
          dailyMap[dateStr].count++;
          dailyMap[dateStr].totalScore += att.score;
          dailyMap[dateStr].scores.push(att.score);
          dailyMap[dateStr].list.push(att);
        });

        const dailyStatsData = Object.keys(dailyMap)
          .map((dateStr) => {
            const parts = dateStr.split("/");
            const dateVal = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0])).getTime();
            const obj = dailyMap[dateStr];
            const avgScore = obj.totalScore / obj.count;
            const maxScore = Math.max(...obj.scores);
            return {
              dateStr,
              dateVal,
              count: obj.count,
              avgScore: Number(avgScore.toFixed(2)),
              maxScore: Number(maxScore.toFixed(2)),
              list: obj.list,
            };
          })
          .sort((a, b) => a.dateVal - b.dateVal);

        return (
          <div className="space-y-6">
             
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
               
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Lượt Nộp Bài</span>
                <span className="text-3xl font-black text-indigo-950 block mt-1">{attempts.length}</span>
                <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">Toàn bộ các đề</span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Điểm Trung Bình Lớp</span>
                <span className="text-3xl font-black text-emerald-600 block mt-1">
                  {attempts.length > 0 
                    ? (attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length).toFixed(2)
                    : "0.00"
                  }
                </span>
                <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">Thang điểm 10</span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Điểm Cao Nhất</span>
                <span className="text-3xl font-black text-amber-500 block mt-1">
                  {attempts.length > 0 
                    ? Math.max(...attempts.map(a => a.score)).toFixed(2)
                    : "0.00"
                  }
                </span>
                <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">Tối đa 10</span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Students Đăng Ký</span>
                <span className="text-3xl font-black text-slate-800 block mt-1">{students.length}</span>
                <span className="text-[10px] text-slate-500 font-semibold block mt-0.5 font-mono">ID cho phép</span>
              </div>

            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
               
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <BarChart3 size={16} className="text-indigo-600" />
                    Biểu Đồ Phân Phối Điểm Lớp
                  </h3>
                  <span className="text-xs text-slate-400 font-bold">Thống kê tự động</span>
                </div>
                 
                {attempts.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-12">Chưa có đủ dữ liệu bài nộp để vẽ biểu đồ phân bố.</p>
                ) : (
                  <div className="h-64 w-full text-xs font-mono">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={scoreRanges} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" tickLine={false} stroke="#94a3b8" />
                        <YAxis tickLine={false} stroke="#94a3b8" allowDecimals={false} />
                        <Tooltip 
                          contentStyle={{ background: "#1e293b", borderRadius: "10px", border: "none", color: "#fff" }}
                          cursor={{ fill: "transparent" }}
                        />
                        <Bar dataKey="count" radius={[6, 6, 0, 0]} name="Số lượng">
                          {scoreRanges.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Trophy size={16} className="text-amber-500" />
                    Bảng Xếp Hạng Toàn Lớp
                  </h3>
                  <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-black font-mono">Ranking</span>
                </div>

                <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                  {classRankings.map((rankStudent, idx) => {
                    const rankNum = idx + 1;
                    const isTop1 = rankNum === 1;
                    const isTop2 = rankNum === 2;
                    const isTop3 = rankNum === 3;
                     
                    return (
                      <div 
                        key={rankStudent.id}
                        className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/40 hover:border-slate-200 hover:bg-slate-50/80 transition-all"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-extrabold ${
                            isTop1 ? "bg-amber-100 text-amber-700 ring-2 ring-amber-400/30" :
                            isTop2 ? "bg-slate-200 text-slate-700" :
                            isTop3 ? "bg-amber-50/60 text-amber-800" :
                            "bg-slate-100 text-slate-500"
                          }`}>
                            {rankNum}
                          </span>
                          <div>
                            <p className="text-xs font-extrabold text-slate-800">
                              {rankStudent.name}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono">
                              ID: {rankStudent.id} • Lớp: {rankStudent.classGroup} • {rankStudent.totalAttempts} bài luyện
                            </p>
                          </div>
                        </div>
                         
                        <div className="text-right">
                          <p className="text-xs font-black text-slate-700 font-mono">
                            {rankStudent.averageScore.toFixed(1)} <span className="text-[9px] text-slate-400 font-medium">Avg</span>
                          </p>
                          <p className="text-[9px] text-slate-400 font-medium">
                            Max: {rankStudent.maxScore.toFixed(1)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp size={16} className="text-indigo-600" />
                    Thống Kê Bài Làm Theo Ngày
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Phân tích nhịp độ học tập và phổ điểm tiến trình theo từng mốc thời gian.</p>
                </div>
                {dailyStatsData.length > 0 && (
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                    Theo dõi trong {dailyStatsData.length} ngày hoạt động
                  </span>
                )}
              </div>

              {dailyStatsData.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  Chưa có dữ liệu bài làm để tiến hành thống kê theo ngày.
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Số lượt nộp bài qua các ngày</span>
                      <div className="h-48 w-full text-xs font-mono">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={dailyStatsData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="dateStr" tickLine={false} stroke="#94a3b8" />
                            <YAxis tickLine={false} stroke="#94a3b8" allowDecimals={false} />
                            <Tooltip contentStyle={{ background: "#1e293b", borderRadius: "10px", border: "none", color: "#fff" }} />
                            <Area type="monotone" dataKey="count" stroke="#4f46e5" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCount)" name="Lượt nộp" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Điểm trung bình và cao nhất lớp theo ngày</span>
                      <div className="h-48 w-full text-xs font-mono">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={dailyStatsData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="dateStr" tickLine={false} stroke="#94a3b8" />
                            <YAxis tickLine={false} stroke="#94a3b8" domain={[0, 10]} />
                            <Tooltip contentStyle={{ background: "#1e293b", borderRadius: "10px", border: "none", color: "#fff" }} />
                            <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                            <Line type="monotone" dataKey="avgScore" stroke="#10b981" strokeWidth={2.5} activeDot={{ r: 6 }} name="Trung bình" />
                            <Line type="monotone" dataKey="maxScore" stroke="#f59e0b" strokeWidth={2.5} name="Cao nhất" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  <div className="border border-slate-200/80 rounded-xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                          <tr>
                            <th className="px-4 py-3">Ngày luyện đề</th>
                            <th className="px-4 py-3 text-center">Số bài nộp</th>
                            <th className="px-4 py-3 text-center">Điểm trung bình</th>
                            <th className="px-4 py-3 text-center">Điểm cao nhất</th>
                            <th className="px-4 py-3">Học sinh hoàn thành</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100 text-slate-600 font-medium">
                          {dailyStatsData.map((day) => (
                            <tr key={day.dateStr} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-4 py-3 font-semibold text-slate-800">{day.dateStr}</td>
                              <td className="px-4 py-3 text-center">
                                <span className="px-2 py-1 rounded-full text-[10px] font-black bg-indigo-50 border border-indigo-100 text-indigo-700">
                                  {day.count} bài làm
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center font-bold text-emerald-600">{day.avgScore.toFixed(2)}đ</td>
                              <td className="px-4 py-3 text-center font-bold text-amber-500">{day.maxScore.toFixed(2)}đ</td>
                              <td className="px-4 py-3">
                                <div className="flex flex-wrap gap-1 max-w-md">
                                  {day.list.map((att) => {
                                    const std = students.find((s) => s.id === att.studentId);
                                    return (
                                      <span key={att.id} className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-[10px] font-semibold px-2 py-0.5 rounded-md cursor-default hover:bg-slate-200 transition-colors" title={`Mã bài: ${att.id} - Đạt ${att.score}đ`}>
                                        {std ? std.name : "Học sinh"} ({att.score.toFixed(1)}đ)
                                      </span>
                                    );
                                  })}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 lg:col-span-1 space-y-4">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <HelpCircle size={16} className="text-rose-500" />
                  Câu hỏi học sinh sai nhiều nhất
                </h3>

                {hardestQuestions.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">Chưa có lượt nộp bài thi nào để phân tích thống kê.</p>
                ) : (
                  <div className="space-y-3.5">
                    {hardestQuestions.map((q) => (
                      <div key={q.id} className="p-3 bg-rose-50/20 border border-rose-100 rounded-xl space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-rose-700">{q.part} - Câu {q.num}</span>
                          <span className="font-extrabold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">Tỷ lệ sai: {q.failRate.toFixed(0)}%</span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mt-1">
                          Sơ lược câu hỏi đã giao cho lớp làm bài.
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText size={16} className="text-indigo-600" />
                  Kết Quả Luyện Đề Gần Đây
                </h3>

                {attempts.length === 0 ? (
                  <div className="bg-slate-50 text-center text-slate-400 text-xs p-8 rounded-xl border">
                    Chưa có kết quả nộp bài thi nào được ghi nhận.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                    {[...attempts].reverse().map((att) => {
                      const student = students.find(s => s.id === att.studentId);
                      const assign = assignments.find(a => a.id === att.assignmentId);
                      return (
                        <div key={att.id} className="flex justify-between items-center p-3.5 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md font-mono">{att.studentId}</span>
                              <span className="text-sm font-bold text-slate-800">{student ? student.name : "Học sinh ẩn danh"}</span>
                            </div>
                            <p className="text-[11px] text-slate-400 font-medium mt-1">
                              Đề: {assign ? assign.title : "Đề thi đã bị xóa"} • {new Date(att.submitTime).toLocaleString("vi-VN")}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className={`text-sm font-black px-2.5 py-1 rounded-lg ${
                              att.score >= 8.0 
                                ? "text-emerald-700 bg-emerald-50 border border-emerald-100" 
                                : att.score >= 5.0 
                                  ? "text-amber-700 bg-amber-50 border border-amber-100" 
                                  : "text-rose-700 bg-rose-50 border border-rose-100"
                            }`}>
                              {att.score.toFixed(2)}đ
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => {
                  setConfirmModal({
                    isOpen: true,
                    title: "Khôi Phục Dữ Liệu Hệ Thống?",
                    message: "Hành động này sẽ khôi phục toàn bộ đề thi mẫu và danh sách học sinh mặc định ban đầu.\n\nLƯU Ý QUAN TRỌNG: Toàn bộ đề thi bạn tự thiết lập cùng toàn bộ kết quả, điểm số, và tiến độ hiện tại của học sinh sẽ bị XÓA HOÀN TOÀN. Bạn có thực sự muốn tiếp tục?",
                    confirmText: "Khôi phục dữ liệu",
                    isDanger: true,
                    onConfirm: () => {
                      onResetData();
                      setConfirmModal(prev => ({ ...prev, isOpen: false }));
                    }
                  });
                }}
                className="px-4 py-2 border border-slate-200 text-xs font-semibold text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Reset dữ liệu hệ thống
              </button>
            </div>

          </div>
        );
      })()}

      {activeTab === "classes" && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <FolderOpen className="text-indigo-600" size={20} />
                Quản Lý Lớp Học & Kho Tài Liệu
              </h2>
              <p className="text-xs text-slate-500">
                Tạo các nhóm lớp học khác nhau, lưu trữ chuyên đề bài giảng riêng (PDF, Word, Ảnh) và kiểm soát học viên theo lớp.
              </p>
            </div>
             
            <button
              onClick={() => setShowCreateClassForm(!showCreateClassForm)}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-150 self-start"
            >
              <Plus size={14} />
              Tạo Lớp Học Mới
            </button>
          </div>

          {showCreateClassForm && (
            <form onSubmit={handleCreateClass} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 max-w-xl animate-in fade-in slide-in-from-top-3 duration-200">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Thông tin lớp học mới</h3>
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase block">Tên Lớp học:</label>
                  <input
                    type="text"
                    required
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    placeholder="VD: 12A1, Chuyên đề TSA, Lớp HSA..."
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase block">Mô tả / Chương trình học:</label>
                  <textarea
                    value={newClassDescription}
                    onChange={(e) => setNewClassDescription(e.target.value)}
                    placeholder="VD: Tập trung ôn luyện tư duy toán học định lượng, cấu trúc TSA Bách Khoa..."
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 h-20"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowCreateClassForm(false)}
                  className="px-3 py-1.5 border border-slate-200 text-slate-500 hover:bg-slate-100 rounded-lg text-[11px] font-bold"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-black"
                >
                  Lưu & Tạo lớp
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {classGroups.map((cg) => {
              const studentCount = students.filter(s => s.classGroup === cg.name).length;
              const isSelected = selectedClassId === cg.id;
               
              return (
                <div key={cg.id} className={`bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between ${isSelected ? 'ring-2 ring-indigo-500 border-transparent' : 'border-slate-200'}`}>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-lg text-xs font-black text-indigo-700">
                        Lớp {cg.name}
                      </div>
                      <button
                        onClick={() => handleDeleteClass(cg.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Xóa lớp học"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                     
                    <div className="space-y-1">
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Mô tả / Lộ trình:</p>
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {cg.description || "Chưa có lộ trình học tập cụ thể được mô tả."}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-50">
                      <div className="p-2.5 bg-slate-50/50 rounded-xl text-center">
                        <span className="text-lg font-black text-slate-800 block">{studentCount}</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Học sinh</span>
                      </div>
                      <div className="p-2.5 bg-slate-50/50 rounded-xl text-center">
                        <span className="text-lg font-black text-slate-800 block">{cg.lectures?.length || 0}</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Tài liệu PDF</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100">
                    <button
                      onClick={() => setSelectedClassId(isSelected ? null : cg.id)}
                      className={`w-full py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${isSelected ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'}`}
                    >
                      <FolderOpen size={13} />
                      {isSelected ? "Đóng chi tiết lớp" : "Chi tiết & Kho tài liệu ↗"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {selectedClassId && (() => {
            const currentClass = classGroups.find(c => c.id === selectedClassId);
            if (!currentClass) return null;
             
            const classStudents = students.filter(s => s.classGroup === currentClass.name);
            const classExams = assignments.filter(a => a.targetClassId === currentClass.id);
             
            return (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4 border-t border-slate-200 animate-in fade-in duration-300">
                <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                        <FileText size={16} className="text-indigo-600" />
                        Kho Tài Liệu PDF & Bài Giảng Lớp {currentClass.name}
                      </h3>
                      <p className="text-[11px] text-slate-400">Các học viên trong lớp {currentClass.name} có thể xem và tải về ôn tập.</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl space-y-3.5">
                    <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-wider block">Thêm Tài Liệu Mới Vào Kho</h4>
                     
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">Tiêu đề tài liệu / chuyên đề:</label>
                        <input
                          type="text"
                          value={lectureTitle}
                          onChange={(e) => setLectureTitle(e.target.value)}
                          placeholder="VD: Chuyên đề Đại số 12 Tập 1"
                          className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                        />
                      </div>
                       
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">Chọn tệp tài liệu (PDF, Ảnh):</label>
                        <input
                          type="file"
                          accept=".pdf,image/*,.png,.jpg,.jpeg"
                          onChange={handleLectureFileChange}
                          className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[10px] file:font-bold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100 cursor-pointer"
                        />
                      </div>
                    </div>

                    {lectureUploadError && (
                      <p className="text-[10px] text-rose-600 font-bold">{lectureUploadError}</p>
                    )}

                    {lectureFile && (
                      <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                        ✓ Tệp đã nạp: {lectureFile.name}
                      </p>
                    )}

                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={handleAddLecture}
                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black shadow-sm"
                      >
                        Tải Lên Lưu Trữ
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Danh Sách Tài Liệu Trong Kho ({currentClass.lectures?.length || 0})</h4>
                     
                    {!currentClass.lectures || currentClass.lectures.length === 0 ? (
                      <div className="p-8 text-center bg-slate-50 border rounded-2xl text-slate-400 text-xs">
                        Kho tài liệu trống. Hãy tải lên bài giảng PDF đầu tiên!
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-2.5 max-h-[300px] overflow-y-auto pr-1">
                        {currentClass.lectures.map((lec) => (
                          <div key={lec.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl hover:border-slate-200 transition-colors">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                                <FileText size={16} />
                              </div>
                              <div>
                                <h5 className="text-xs font-bold text-slate-800 leading-snug">{lec.title}</h5>
                                <span className="text-[10px] text-slate-400 block truncate max-w-[180px] md:max-w-xs">{lec.fileName} • Ngày tải: {lec.uploadedAt}</span>
                              </div>
                            </div>
                             
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => openBase64InNewTab(lec.fileData, lec.fileName)}
                                className="px-2.5 py-1 bg-white hover:bg-indigo-50 border border-slate-200 text-indigo-600 rounded-lg text-[10px] font-bold flex items-center gap-0.5 transition-colors"
                              >
                                Xem thử ↗
                              </button>
                              <button
                                onClick={() => handleDeleteLecture(lec.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="lg:col-span-5 space-y-5">
                  <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Users size={14} className="text-indigo-600" />
                      Học Sinh Trong Lớp ({classStudents.length})
                    </h3>
                     
                    {classStudents.length === 0 ? (
                      <div className="p-6 text-center bg-slate-50 border rounded-xl text-slate-400 text-xs">
                        Lớp chưa có học viên nào. Hãy gán học sinh vào lớp {currentClass.name} ở tab "Students"!
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                        {classStudents.map((stud) => (
                          <div key={stud.id} className="flex justify-between items-center p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700">
                            <div className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              <span>{stud.name}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">{stud.id}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <BookOpen size={14} className="text-indigo-600" />
                      Bài Tập / Đề Thi Giao Riêng Cho Lớp ({classExams.length})
                    </h3>
                     
                    {classExams.length === 0 ? (
                      <div className="p-6 text-center bg-slate-50 border rounded-xl text-slate-400 text-xs">
                        Chưa giao bài tập riêng nào cho lớp {currentClass.name}.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                        {classExams.map((exam) => (
                          <div key={exam.id} className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                            <p className="text-xs font-bold text-slate-700 truncate">{exam.title}</p>
                            <div className="flex justify-between text-[9px] text-slate-400 font-semibold">
                              <span>Mã đề: {exam.id}</span>
                              <span className="text-indigo-600">{exam.examType}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {activeTab === "security" && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6 max-w-xl">
          <div className="space-y-1">
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <Lock className="text-indigo-600" size={20} />
              Cấu Hình Đăng Nhập Tutor
            </h2>
            <p className="text-xs text-slate-500">
              Quản lý tài khoản và mật khẩu của Gia sư (Admin) để đăng nhập và quản trị hệ thống.
            </p>
          </div>

          <form onSubmit={(e) => {
            e.preventDefault();
            setSecuritySuccess("");
            setSecurityError("");
            const u = securityUsername.trim();
            const p = securityPassword.trim();
            if (!u || !p) {
              setSecurityError("Vui lòng nhập đầy đủ cả ID đăng nhập và mật khẩu.");
              return;
            }
            if (p.length < 8) {
              setSecurityError("Mật khẩu gia sư phải dài tối thiểu 8 ký tự.");
              return;
            }
            
            // 👉 Gọi hàm truyền xuống từ App.tsx để ghi thẳng lên bảng tutor trên Supabase
            onUpdateTutorCredentials(u, p);

            setSecuritySuccess("Đã cập nhật thông tin đăng nhập gia sư thành công!");
          }} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="tutor-username-input" className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                ID Đăng Nhập:
              </label>
              <input 
                id="tutor-username-input"
                type="text" 
                value={securityUsername}
                onChange={(e) => setSecurityUsername(e.target.value)}
                placeholder="VD: tutor"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="tutor-password-input" className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Mật Khẩu Mới (Tối thiểu 8 ký tự):
              </label>
              <input 
                id="tutor-password-input"
                type="text" 
                value={securityPassword}
                onChange={(e) => setSecurityPassword(e.target.value)}
                placeholder="VD: tutorpassword..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {securityError && (
              <div className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-100 p-3 rounded-xl">
                {securityError}
              </div>
            )}

            {securitySuccess && (
              <div className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 p-3 rounded-xl">
                {securitySuccess}
              </div>
            )}

            <button 
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-100 cursor-pointer"
            >
              Cập nhật tài khoản
            </button>
          </form>
        </div>
      )}

      {previewingAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
             
            <div className="p-4 bg-slate-50 border-b border-slate-200/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
                  <FileText size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800">{previewingAssignment.title}</h3>
                  <p className="text-[10px] text-slate-400 font-medium">Tệp đính kèm: {previewingAssignment.fileName || "Không có tên tệp"}</p>
                </div>
              </div>
              <button
                onClick={() => setPreviewingAssignment(null)}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>

            <div className="flex-1 bg-slate-100/50 relative overflow-hidden flex items-center justify-center">
              {previewingAssignment.fileData ? (
                previewingAssignment.fileName?.endsWith(".pdf") || previewingAssignment.fileData.startsWith("data:application/pdf") ? (
                  <div className="w-full h-full flex flex-col relative">
                    <iframe
                      src={previewingAssignment.fileData}
                      className="w-full h-full flex-1 border-0"
                      title="PDF Preview"
                    />
                    <div className="absolute bottom-2 inset-x-2 bg-slate-900/90 text-white rounded-xl p-3 flex flex-col sm:flex-row gap-2 justify-between items-center text-xs shadow-lg backdrop-blur-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse shrink-0"></span>
                        <span className="font-semibold truncate text-slate-200">{previewingAssignment.fileName}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => openBase64InNewTab(previewingAssignment.fileData, previewingAssignment.fileName || "Tailieu.pdf")}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-black rounded-lg text-[11px] flex items-center gap-1 transition-all"
                      >
                        Mở trong tab mới ↗
                      </button>
                    </div>
                  </div>
                ) : previewingAssignment.fileData.startsWith("data:image/") || /\.(png|jpe?g|webp|gif|svg)$/i.test(previewingAssignment.fileName || "") ? (
                  <div className="w-full h-full overflow-auto p-4 flex items-start justify-center">
                    <img
                      src={previewingAssignment.fileData}
                      className="max-w-full h-auto object-contain rounded-xl shadow-md border border-slate-200"
                      alt={previewingAssignment.title}
                    />
                  </div>
                ) : (
                  <div className="p-10 text-center space-y-3">
                    <FileText size={48} className="mx-auto text-slate-300" />
                    <p className="text-xs font-bold text-slate-600">Tài liệu "{previewingAssignment.fileName}"</p>
                    <p className="text-[10px] text-slate-400 max-w-xs mx-auto">Tệp tin Word hoặc định dạng khác đã được nạp thành công và sẵn sàng để hiển thị cho học sinh trong phòng thi.</p>
                  </div>
                )
              ) : (
                <div className="p-10 text-center space-y-2">
                  <HelpCircle size={48} className="mx-auto text-slate-300" />
                  <p className="text-xs font-bold text-slate-600">Không tìm thấy tài liệu đề thi</p>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        isDanger={confirmModal.isDanger}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />

    </div>
  );
}
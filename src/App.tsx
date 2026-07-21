// ... (Giữ nguyên các import)

export default function App() {
  // ... (Giữ nguyên các state: assignments, students, attempts, isLoading)

  // --- HÀM FETCH DỮ LIỆU ---
  const fetchAllData = useCallback(async () => {
    try {
      const [asm, std, att, cls] = await Promise.all([
        supabase.from("assignments").select("*").order('created_date', { ascending: false }),
        supabase.from("students").select("*"),
        supabase.from("attempts").select("*"),
        supabase.from("class_groups").select("*")
      ]);

      // Mapping từ snake_case (DB) về camelCase (UI)
      if (asm.data) setAssignments(asm.data.map(i => ({
        id: String(i.id),
        title: i.title,
        subject: i.subject,
        duration: i.duration,
        questions: i.questions || [],
        examType: i.exam_type, // Chuyển từ exam_type -> examType
        partIQuestions: i.part_i_questions || [],
        partIIQuestions: i.part_ii_questions || [],
        partIIIQuestions: i.part_iii_questions || [],
        fileData: i.file_data,
        fileName: i.file_name,
        createdDate: i.created_date,
        isPublished: i.is_published,
        targetClassId: i.target_class_id
      })));

      if (std.data) setStudents(std.data.map(i => ({
        id: String(i.id),
        name: i.name,
        email: i.email,
        phone: i.phone,
        classGroup: i.class_group, // class_group -> classGroup
        password: i.password
      })));

      if (att.data) setAttempts(att.data.map(i => ({
        id: String(i.id),
        assignmentId: String(i.assignment_id),
        studentId: String(i.student_id),
        score: i.score,
        totalQuestions: i.total_questions,
        correctCount: i.correct_count,
        answers: i.answers,
        submittedAt: i.submitted_at,
        submitTime: i.submit_time,
        gradedDetails: i.graded_details
      })));

    } catch (err) {
      console.error("Lỗi đồng bộ:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchAllData(); }, [fetchAllData]);

  // --- HÀM LƯU BÀI TẬP (FIX CỘT) ---
  const handleAddAssignment = async (newAsm: Assignment) => {
    const { error } = await supabase.from("assignments").insert([{
      id: newAsm.id,
      title: newAsm.title,
      subject: newAsm.subject,
      duration: newAsm.duration,
      questions: newAsm.questions,
      exam_type: newAsm.examType, // Gửi đúng tên cột exam_type
      part_i_questions: newAsm.partIQuestions,
      part_ii_questions: newAsm.partIIQuestions,
      part_iii_questions: newAsm.partIIIQuestions,
      file_data: newAsm.fileData,
      file_name: newAsm.fileName,
      is_published: newAsm.isPublished,
      target_class_id: newAsm.targetClassId,
      created_date: new Date().toISOString()
    }]);

    if (error) {
      console.error("Lỗi DB:", error);
      alert("KHÔNG LƯU ĐƯỢC BÀI TẬP: " + error.message);
    } else {
      alert("Lưu bài tập lên Cloud thành công!");
      fetchAllData();
    }
  };

  // --- HÀM LƯU HỌC SINH (FIX CỘT) ---
  const handleAddStudent = async (s: Student) => {
    const { error } = await supabase.from("students").insert([{
      id: s.id,
      name: s.name,
      email: s.email,
      phone: s.phone,
      class_group: s.classGroup, // Gửi vào cột class_group
      password: s.password
    }]);

    if (error) {
      alert("LỖI LƯU HỌC SINH: " + error.message);
    } else {
      alert("Đã thêm học sinh mới vào hệ thống!");
      fetchAllData();
    }
  };

  // --- HÀM NỘP BÀI (FIX CỘT) ---
  const handleExamSubmit = async (att: ExamAttempt) => {
    const { error } = await supabase.from("attempts").insert([{
      id: att.id,
      assignment_id: att.assignmentId,
      student_id: att.studentId,
      score: att.score,
      total_questions: att.totalQuestions,
      correct_count: att.correctCount,
      answers: att.answers,
      submit_time: att.submitTime,
      graded_details: att.gradedDetails,
      submitted_at: new Date().toISOString()
    }]);

    if (error) {
      alert("LỖI LƯU KẾT QUẢ: " + error.message);
    } else {
      alert("Nộp bài thành công! Kết quả đã được đồng bộ Cloud.");
      fetchAllData();
      const assign = assignments.find(a => a.id === att.assignmentId);
      if (assign) setActiveReview({ attempt: att, assignment: assign });
      setActiveExam(null);
    }
  };

  // ... (Phần giao diện phía dưới giữ nguyên như bản trước)
}
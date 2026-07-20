import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "15mb" }));

  // API route to extract raw text from PDF, Word (.docx) or Text (.txt) files
  app.post("/api/extract-text", async (req, res) => {
    try {
      const { fileData, fileName } = req.body;
      if (!fileData) {
        return res.status(400).json({ error: "Không tìm thấy dữ liệu tệp tin." });
      }

      const buffer = Buffer.from(fileData, "base64");
      const extension = fileName ? fileName.split(".").pop().toLowerCase() : "";

      let extractedText = "";

      if (extension === "pdf") {
        try {
          const pdf = await import("pdf-parse");
          // pdf-parse default export is sometimes nested depending on bundler
          const parsePdf = ((pdf as any).default || pdf) as any;
          const data = await parsePdf(buffer);
          extractedText = data.text || "";
        } catch (pdfErr: any) {
          console.error("Lỗi parse PDF:", pdfErr);
          return res.status(500).json({ error: "Không thể trích xuất văn bản từ tệp PDF này. Đảm bảo đây không phải là PDF dạng quét ảnh hoặc bị khóa." });
        }
      } else if (extension === "docx") {
        try {
          const mammoth = await import("mammoth");
          const result = await mammoth.extractRawText({ buffer });
          extractedText = result.value || "";
        } catch (docxErr: any) {
          console.error("Lỗi parse DOCX:", docxErr);
          return res.status(500).json({ error: "Không thể trích xuất văn bản từ tệp Word (.docx) này." });
        }
      } else if (extension === "txt") {
        extractedText = buffer.toString("utf-8");
      } else {
        return res.status(400).json({ error: "Định dạng tệp không được hỗ trợ. Vui lòng tải lên file .pdf, .docx, hoặc .txt" });
      }

      if (!extractedText.trim()) {
        return res.status(422).json({ error: "Tệp tải lên rỗng hoặc không có văn bản có thể trích xuất." });
      }

      res.json({ text: extractedText });
    } catch (error: any) {
      console.error("Lỗi hệ thống khi trích xuất tệp:", error);
      res.status(500).json({ error: error.message || "Lỗi xử lý trích xuất văn bản trên máy chủ." });
    }
  });

  // API route to convert raw test content using Gemini API
  app.post("/api/convert-test", async (req, res) => {
    try {
      const { rawText } = req.body;
      if (!rawText || !rawText.trim()) {
        return res.status(400).json({ error: "Nội dung đề thi không được trống." });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          error: "GEMINI_API_KEY chưa được cấu hình trên máy chủ. Vui lòng thêm khóa trong mục Settings > Secrets."
        });
      }

      // Lazy initialize the GoogleGenAI client as instructed
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          }
        }
      });

      const systemInstruction = `
You are an expert Math teacher and exam parser. Your job is to convert raw math exam text (which includes questions, multiple choices, true/false statements, numeric answers, and optionally answer keys / explanations) into a structured JSON format.

Strict rules for parsing:
1. Identify Part I questions (Trắc nghiệm nhiều lựa chọn): These usually have 4 options labeled A, B, C, D. Ensure 'options' has exactly 4 items and 'correctOption' is the index (0 for A, 1 for B, 2 for C, 3 for D).
2. Identify Part II questions (Trắc nghiệm Đúng/Sai): These have a main question body and exactly 4 statements labeled a, b, c, d (or similar). Each statement needs text and a boolean 'correctAnswer'.
3. Identify Part III questions (Trắc nghiệm Trả lời ngắn): These require a single numeric/number answer. Ensure 'correctAnswer' is parsed as a string representing a number (e.g. "-2.5", "5", "0").
4. IMPORTANT math/LaTeX formatting: You MUST preserve all mathematical expressions. All math symbols, equations, and expressions MUST be enclosed in standard single dollar signs ($) for inline formulas (e.g. $y = x^2 + 1$) or double dollar signs ($$) for block formulas. Ensure you do not leave unescaped backslashes; use standard LaTeX formatting.
5. Extract titles and durations if visible, otherwise provide a suitable default title (e.g. "Đề Thi Toán Mới Khảo Sát") and 90 minutes duration.
6. Extract the correct answers from the provided answer key or work them out carefully if not clearly provided. Always attempt to provide a helpful 'explanation' for each question if possible or extract it.
`;

      const prompt = `
Please convert the following raw math exam text and answer key into the structured JSON format:

--- START OF RAW TEXT ---
${rawText}
--- END OF RAW TEXT ---
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: {
                type: Type.STRING,
                description: "The title of the exam"
              },
              duration: {
                type: Type.INTEGER,
                description: "Duration of the exam in minutes (e.g., 90)"
              },
              examType: {
                type: Type.STRING,
                description: "The exam type scoring rules. Must be one of: THPTQG, TSA, HSA, QDA, BCA"
              },
              partIQuestions: {
                type: Type.ARRAY,
                description: "Part I: Multiple choice questions (usually 12 questions)",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    questionNumber: { type: Type.INTEGER },
                    content: { type: Type.STRING, description: "Question prompt text containing LaTeX enclosed in $'s" },
                    options: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: "Exactly 4 options containing LaTeX"
                    },
                    correctOption: { type: Type.INTEGER, description: "Index of correct option (0=A, 1=B, 2=C, 3=D)" },
                    explanation: { type: Type.STRING, description: "Detailed step-by-step math explanation with LaTeX" }
                  },
                  required: ["questionNumber", "content", "options", "correctOption"]
                }
              },
              partIIQuestions: {
                type: Type.ARRAY,
                description: "Part II: True/False questions (usually 4 questions)",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    questionNumber: { type: Type.INTEGER },
                    content: { type: Type.STRING, description: "Question prompt text containing LaTeX" },
                    statements: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          text: { type: Type.STRING, description: "Statement text with LaTeX starting with a), b), c), or d)" },
                          correctAnswer: { type: Type.BOOLEAN, description: "true if statement is correct, false if statement is incorrect" }
                        },
                        required: ["text", "correctAnswer"]
                      },
                      description: "Exactly 4 statements (a, b, c, d)"
                    },
                    explanation: { type: Type.STRING, description: "Detailed math explanation for all statements" }
                  },
                  required: ["questionNumber", "content", "statements"]
                }
              },
              partIIIQuestions: {
                type: Type.ARRAY,
                description: "Part III: Short answer numeric questions (usually 6 questions)",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    questionNumber: { type: Type.INTEGER },
                    content: { type: Type.STRING, description: "Question text with LaTeX" },
                    correctAnswer: { type: Type.STRING, description: "The numeric answer represented as a string (e.g. '-3', '1.5', '0')" },
                    explanation: { type: Type.STRING, description: "Detailed explanation on how to get the numeric answer" }
                  },
                  required: ["questionNumber", "content", "correctAnswer"]
                }
              }
            },
            required: ["title", "duration", "examType", "partIQuestions", "partIIQuestions", "partIIIQuestions"]
          }
        }
      });

      const parsedJSON = JSON.parse(response.text || "{}");
      res.json(parsedJSON);
    } catch (error: any) {
      console.error("Lỗi chuyển đổi bằng Gemini API:", error);
      res.status(500).json({ error: error.message || "Lỗi xử lý chuyển đổi đề thi bằng AI." });
    }
  });

  // API route to parse answer keys from an uploaded image or document using Gemini
  app.post("/api/parse-answer-key", async (req, res) => {
    try {
      const { fileData, fileName, numPartI, numPartII, numPartIII } = req.body;
      if (!fileData) {
        return res.status(400).json({ error: "Không tìm thấy dữ liệu tệp tin đáp án." });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          error: "GEMINI_API_KEY chưa được cấu hình trên máy chủ. Vui lòng thêm khóa trong mục Settings > Secrets."
        });
      }

      // Lazy initialize the GoogleGenAI client
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          }
        }
      });

      const nPartI = Number(numPartI) || 12;
      const nPartII = Number(numPartII) || 4;
      const nPartIII = Number(numPartIII) || 6;

      const extension = fileName ? fileName.split(".").pop().toLowerCase() : "";
      const isImage = ["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(extension) || fileData.startsWith("data:image/");

      let base64Data = fileData;
      let mimeType = "image/png";

      if (fileData.startsWith("data:")) {
        const parts = fileData.split(",");
        base64Data = parts[1];
        const mimeMatch = parts[0].match(/data:(.*?);/);
        if (mimeMatch) {
          mimeType = mimeMatch[1];
        }
      }

      const systemInstruction = `
You are an expert Vietnamese exam answer sheet parser. Your task is to read/parse an uploaded answer key sheet (which can be an image/photo of a hand-written or printed answer list, or a text document) and extract the correct answers.
You MUST output answers for exactly:
- Part I (Trắc nghiệm nhiều lựa chọn): exactly ${nPartI} questions.
- Part II (Trắc nghiệm Đúng/Sai): exactly ${nPartII} questions.
- Part III (Trắc nghiệm Trả lời ngắn): exactly ${nPartIII} questions.

Rules:
1. For Part I, extract the selected option (A, B, C, or D) for questions 1 to ${nPartI}. Represent it as an index: 0 for A, 1 for B, 2 for C, 3 for D. If missing or unclear, default to 0.
2. For Part II, each question from 1 to ${nPartII} has exactly 4 statements: a, b, c, d. Each statement is marked as Đúng/Đ (true) or Sai/S (false). Extract these as an array of 4 booleans. If missing, default to true.
3. For Part III, each question from 1 to ${nPartIII} has a numeric answer (e.g. "5", "-3", "0.25", "1/2"). Extract it as a string representing the answer. If missing, default to "0".

You MUST strictly return your response in the requested JSON structure. No explanations, no extra keys.
`;

      let response;
      if (isImage) {
        // Send image + prompt to Gemini
        const imagePart = {
          inlineData: {
            mimeType,
            data: base64Data,
          },
        };
        const textPart = {
          text: `Please parse this image of the answer key and extract:
- ${nPartI} answers for Part I
- ${nPartII} answers for Part II (4 statements each)
- ${nPartIII} answers for Part III`,
        };

        response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: { parts: [imagePart, textPart] },
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                keysPartI: {
                  type: Type.ARRAY,
                  description: `Exactly ${nPartI} integers representing correct options (0=A, 1=B, 2=C, 3=D).`,
                  items: { type: Type.INTEGER }
                },
                keysPartII: {
                  type: Type.ARRAY,
                  description: `Exactly ${nPartII} arrays of 4 booleans representing statements a, b, c, d.`,
                  items: {
                    type: Type.ARRAY,
                    items: { type: Type.BOOLEAN }
                  }
                },
                keysPartIII: {
                  type: Type.ARRAY,
                  description: `Exactly ${nPartIII} strings representing numeric answers.`,
                  items: { type: Type.STRING }
                }
              },
              required: ["keysPartI", "keysPartII", "keysPartIII"]
            }
          }
        });
      } else {
        // First try to extract text from file if possible, otherwise read as text
        let extractedText = "";
        const buffer = Buffer.from(base64Data, "base64");

        if (extension === "pdf") {
          try {
            const pdf = await import("pdf-parse");
            const parsePdf = ((pdf as any).default || pdf) as any;
            const data = await parsePdf(buffer);
            extractedText = data.text || "";
          } catch (e) {
            extractedText = buffer.toString("utf-8");
          }
        } else if (extension === "docx") {
          try {
            const mammoth = await import("mammoth");
            const result = await mammoth.extractRawText({ buffer });
            extractedText = result.value || "";
          } catch (e) {
            extractedText = buffer.toString("utf-8");
          }
        } else {
          extractedText = buffer.toString("utf-8");
        }

        response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: `Below is the answer key text. Extract:
- ${nPartI} answers for Part I
- ${nPartII} answers for Part II (4 statements each)
- ${nPartIII} answers for Part III

--- ANSWER SHEET TEXT ---
${extractedText}
`,
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                keysPartI: {
                  type: Type.ARRAY,
                  description: `Exactly ${nPartI} integers (0=A, 1=B, 2=C, 3=D).`,
                  items: { type: Type.INTEGER }
                },
                keysPartII: {
                  type: Type.ARRAY,
                  description: `Exactly ${nPartII} arrays of 4 booleans.`,
                  items: {
                    type: Type.ARRAY,
                    items: { type: Type.BOOLEAN }
                  }
                },
                keysPartIII: {
                  type: Type.ARRAY,
                  description: `Exactly ${nPartIII} strings.`,
                  items: { type: Type.STRING }
                }
              },
              required: ["keysPartI", "keysPartII", "keysPartIII"]
            }
          }
        });
      }

      const parsedJSON = JSON.parse(response.text || "{}");
      res.json(parsedJSON);
    } catch (err: any) {
      console.error("Lỗi tự động phân tích đáp án:", err);
      res.status(500).json({ error: err.message || "Lỗi xử lý tự động phân tích đáp án bằng AI." });
    }
  });

  // Serve Vite in development, static files in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

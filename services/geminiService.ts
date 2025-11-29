import { GoogleGenAI, Type } from "@google/genai";
import { Question, Subject } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const RESPONSE_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      question: { type: Type.STRING },
      options: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
      correctIndex: { type: Type.INTEGER },
      explanation: { type: Type.STRING },
    },
    required: ["question", "options", "correctIndex"],
  },
};

// 1. First, fix common broken latex patterns from JSON responses
// e.g. "20 ext{ N}" -> "20 \text{ N}"
const repairMalformedLatex = (text: string): string => {
  if (!text) return "";
  let t = text
    .replace(/(\s|^)ext\{/g, '$1\\text{')
    .replace(/(\s|^)frac\{/g, '$1\\frac{')
    .replace(/(\s|^)sqrt\{/g, '$1\\sqrt{')
    .replace(/(\s|^)times(\s|$)/g, '$1\\times$2')
    .replace(/(\s|^)mu(\s|$)/g, '$1\\mu$2')
    .replace(/(\s|^)pi(\s|$)/g, '$1\\pi$2')
    .replace(/(\s|^)theta(\s|$)/g, '$1\\theta$2');
    
  // Ensure content inside $...$ doesn't have broken backslashes if strictly keeping it
  t = t.replace(/\$([^\$]+)\$/g, (match, content) => {
      return `$${content}$`;
  });
  return t;
};

// 2. Then, apply the user's "Human Readable" conversion logic
// This effectively strips LaTeX formatting for simple text reading
const latexToSimple = (text: string): string => {
  if (!text) return "";
  let t = text;

  // Remove math-mode $
  t = t.replace(/\$/g, "");

  // Convert \text{...} to plain text
  t = t.replace(/\\text\{([^}]*)\}/g, "$1");

  // Convert \mathrm{...} also
  t = t.replace(/\\mathrm\{([^}]*)\}/g, "$1");

  // Convert superscripts ^{...} -> ^...
  t = t.replace(/\^\{([^}]*)\}/g, "^$1");

  // Convert subscripts _{...} -> _...
  t = t.replace(/_\{([^}]*)\}/g, "_$1");

  // Convert single superscript ^x
  t = t.replace(/\^([A-Za-z0-9])/g, "^$1");

  // Convert single subscript _x
  t = t.replace(/_([A-Za-z0-9])/g, "_$1");

  // Remove LaTeX spacing commands \, \; \: and spaces
  t = t.replace(/\\,/g, " ");
  t = t.replace(/\\;/g, " ");
  t = t.replace(/\\:/g, " ");
  
  // Clean common symbols to unicode if they remain
  t = t.replace(/\\times/g, "×");
  t = t.replace(/\\mu/g, "μ");
  t = t.replace(/\\circ/g, "°");
  t = t.replace(/\\pi/g, "π");
  t = t.replace(/\\theta/g, "θ");
  t = t.replace(/\\Delta/g, "Δ");
  t = t.replace(/\\Omega/g, "Ω");
  
  // Extra trimming of multiple spaces
  return t.replace(/\s+/g, " ").trim();
};

const cleanAndParseJSON = (text: string) => {
  try {
    if (!text) return [];
    
    // 1. Try to find the array brackets directly first to ignore outer markdown
    const firstBracket = text.indexOf('[');
    const lastBracket = text.lastIndexOf(']');
    
    if (firstBracket !== -1 && lastBracket !== -1) {
      const jsonCandidate = text.substring(firstBracket, lastBracket + 1);
      return JSON.parse(jsonCandidate);
    }

    // 2. Fallback: aggressive cleanup
    let cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("Failed to parse JSON response:", text, e);
    return [];
  }
};

const normalizeQuestion = (q: any, index: number, prefix: string): Question | null => {
  // Handle case-insensitivity and missing fields
  const questionText = q.question || q.Question || q.text || q.query;
  const optionsList = q.options || q.Options || q.choices || q.answers;
  
  // Validate essential fields
  if (!questionText || !Array.isArray(optionsList) || optionsList.length < 2) {
    console.warn("Skipping invalid question:", q);
    return null;
  }

  // Pipeline: Repair broken tags -> Convert to Human Readable
  const processText = (txt: string) => latexToSimple(repairMalformedLatex(String(txt)));

  // Ensure options are strings and repair latex
  const cleanOptions = optionsList.map((opt: any) => processText(opt));

  // Handle correct index (ensure it's a number)
  let correctIdx = 0;
  if (typeof q.correctIndex === 'number') correctIdx = q.correctIndex;
  else if (typeof q.correctIndex === 'string') correctIdx = parseInt(q.correctIndex) || 0;
  else if (typeof q.answerIndex === 'number') correctIdx = q.answerIndex;

  // Clamp index
  if (correctIdx < 0) correctIdx = 0;
  if (correctIdx >= cleanOptions.length) correctIdx = cleanOptions.length - 1;

  return {
    id: `${prefix}-${Date.now()}-${index}`,
    text: processText(questionText),
    options: cleanOptions,
    correctIndex: correctIdx,
    explanation: processText(q.explanation || q.Explanation || "No explanation provided.")
  };
};

export const generateBattleQuestions = async (count: number): Promise<Question[]> => {
  try {
    const prompt = `
      Generate ${count} multiple-choice questions from NCERT 11th and 12th Biology. 
      Focus on critical concepts.
      Strictly return a raw JSON array.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      },
    });

    const rawData = cleanAndParseJSON(response.text || "[]");
    return rawData
      .map((q: any, i: number) => normalizeQuestion(q, i, 'battle'))
      .filter((q): q is Question => q !== null);

  } catch (error) {
    console.error("Error generating battle questions:", error);
    return [];
  }
};

export const generatePracticeQuestions = async (
  subject: Subject,
  chapterNames: string[],
  count: number,
  customPrompt?: string
): Promise<Question[]> => {
  try {
    const isMathSubject = subject === Subject.PHYSICS || subject === Subject.CHEMISTRY;
    
    let prompt = `
      Generate ${count} multiple-choice questions for the subject: ${subject}.
      Specific Chapters: ${chapterNames.length > 0 ? chapterNames.join(", ") : "All Chapters"}.
      Target Audience: NEET 2026 Aspirants.
      Format: JSON Array of objects with keys: "question", "options" (array of 4 strings), "correctIndex" (0-3), "explanation".
    `;

    if (customPrompt) {
      prompt += `\nUser Preference: ${customPrompt}`;
    }

    if (isMathSubject) {
      prompt += `
        \nIMPORTANT FOR MATH/FORMULAS:
        1. Write questions in PLAIN TEXT as much as possible. 
        2. DO NOT use LaTeX 'ext' or 'text' tags for units. Write "kg", "m/s", "N" directly.
        3. Example: "Calculate the force if mass is 2 kg." NOT "$m=2\\text{kg}$".
        4. Use simplified notation.
      `;
    }

    // Using gemini-2.5-flash for speed and reliability with JSON schema
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", 
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        systemInstruction: "You are an expert NEET tutor. Output strict valid JSON. Prefer plain text over LaTeX for units and simple numbers.",
      },
    });

    const rawData = cleanAndParseJSON(response.text || "[]");
    
    const validQuestions = rawData
      .map((q: any, i: number) => normalizeQuestion(q, i, 'practice'))
      .filter((q): q is Question => q !== null);

    return validQuestions;
  } catch (error) {
    console.error("Error generating practice questions:", error);
    return [];
  }
};

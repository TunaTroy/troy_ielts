import { callGeminiWithFallback } from '../utils/gemini.js';

// Parse the AI's JSON response, converting any parse failure (e.g. the response
// got cut off mid-string because it hit maxOutputTokens) into a clean, known
// error type instead of letting a raw JS SyntaxError bubble up to the client.
function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch (err) {
    console.error('AI returned invalid/truncated JSON:', err.message);
    console.error('Raw text (first 500 chars):', text?.slice(0, 500));
    console.error('Raw text (last 200 chars):', text?.slice(-200));
    throw new Error('INVALID_AI_RESPONSE');
  }
}

// Note: OpenRouter uses OpenAI-compatible format with response_format: { type: 'json_object' }
// instead of detailed schemas. The system prompts will explicitly request JSON format.
// Gemini still supports structured output schemas for better reliability.

// Gemini structured-output schemas (used only for Gemini fallback)
const QA_PAIR_SCHEMA = {
  type: "OBJECT",
  properties: { q: { type: "STRING" }, a: { type: "STRING" } },
  required: ["q", "a"]
};

const SPEAKING_SCHEMA = {
  type: "OBJECT",
  properties: {
    part1: { type: "ARRAY", items: QA_PAIR_SCHEMA },
    part2: {
      type: "OBJECT",
      properties: {
        title: { type: "STRING" },
        bullets: { type: "ARRAY", items: { type: "STRING" } },
        answer: { type: "STRING" },
        followup: QA_PAIR_SCHEMA
      },
      required: ["title", "bullets", "answer", "followup"]
    },
    part3: { type: "ARRAY", items: QA_PAIR_SCHEMA }
  },
  required: ["part1", "part2", "part3"]
};

const WRITING_SCHEMA = {
  type: "OBJECT",
  properties: {
    essay: { type: "STRING" },
    wordCount: { type: "NUMBER" },
    tips: { type: "ARRAY", items: { type: "STRING" } }
  },
  required: ["essay", "wordCount", "tips"]
};

const ANSWERS_SCHEMA = {
  type: "OBJECT",
  properties: {
    answers: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          question: { type: "STRING" },
          answer: { type: "STRING" },
          reason: { type: "STRING" }
        },
        required: ["question", "answer", "reason"]
      }
    }
  },
  required: ["answers"]
};

// Writing assessment schema (for grading user essays)
const WRITING_ASSESSMENT_SCHEMA = {
  type: "OBJECT",
  properties: {
    overallBand: { type: "NUMBER" },
    criteria: {
      type: "OBJECT",
      properties: {
        taskResponse: { type: "NUMBER" }, // Task Achievement (Task 1) or Task Response (Task 2)
        coherence: { type: "NUMBER" }, // Coherence and Cohesion
        lexicalResource: { type: "NUMBER" }, // Lexical Resource
        grammar: { type: "NUMBER" } // Grammatical Range and Accuracy
      },
      required: ["taskResponse", "coherence", "lexicalResource", "grammar"]
    },
    feedback: {
      type: "OBJECT",
      properties: {
        taskResponse: { type: "STRING" },
        coherence: { type: "STRING" },
        lexicalResource: { type: "STRING" },
        grammar: { type: "STRING" }
      },
      required: ["taskResponse", "coherence", "lexicalResource", "grammar"]
    },
    corrections: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          original: { type: "STRING" },
          correction: { type: "STRING" },
          explanation: { type: "STRING" }
        },
        required: ["original", "correction", "explanation"]
      }
    },
    strengths: {
      type: "ARRAY",
      items: { type: "STRING" }
    },
    improvements: {
      type: "ARRAY",
      items: { type: "STRING" }
    }
  },
  required: ["overallBand", "criteria", "feedback", "corrections", "strengths", "improvements"]
};

// System prompts for each skill
const SYSTEM_PROMPTS = {
  speaking: `You are an IELTS Speaking examiner. Generate realistic IELTS Speaking questions and sample answers.
For Part 1: Generate 3-4 simple personal questions with brief sample answers.
For Part 2: Generate a cue card topic with bullet points and a 2-minute sample answer, plus 1 follow-up question.
For Part 3: Generate 3-4 more abstract discussion questions with detailed sample answers.
All answers should be Band 7-8 level with good vocabulary and natural expressions.
IMPORTANT: Respond with ONLY valid JSON in this exact format: {"part1":[{"q":"question","a":"answer"}],"part2":{"title":"Describe...","bullets":["bullet1","bullet2"],"answer":"sample answer","followup":{"q":"followup question","a":"followup answer"}},"part3":[{"q":"question","a":"answer"}]}`,

  writing: `You are an IELTS Writing examiner and expert essay writer. Given an IELTS Writing task type and the pasted task question, write a natural Band 7-8 model answer in English matching real IELTS conventions (Task 1: ~150 words, overview + key features, no opinion; Task 1 Letter: appropriate tone + all bullet points covered; Task 2: ~250-280 words, clear thesis, body paragraphs, conclusion). Also give 3-4 short bullet tips in Vietnamese explaining why the answer works well (structure, vocabulary, cohesion).
IMPORTANT: Respond with ONLY valid JSON in this exact format: {"essay":"your essay here","wordCount":number,"tips":["tip1","tip2","tip3"]}`,

  writingAssessment: `You are an IELTS Writing examiner. Given an IELTS Writing task type, the task question, and the user's essay, assess it according to official IELTS band descriptors.

Grade the essay on 4 criteria:
1. Task Achievement (Task 1) / Task Response (Task 2): Did they address all parts? Clear position? Relevant ideas?
2. Coherence and Cohesion: Organization, paragraphing, linking devices, flow
3. Lexical Resource: Vocabulary range, accuracy, collocations, style
4. Grammatical Range and Accuracy: Sentence variety, error frequency, complexity

For each criterion:
- Give a band score (0-9, can use 0.5 increments like 6.5, 7.0)
- Provide specific feedback in Vietnamese (what they did well, what needs improvement)

Also provide:
- 3-5 specific corrections with original text, corrected version, and explanation in Vietnamese
- 3-5 strengths in Vietnamese
- 3-5 areas for improvement in Vietnamese
- Overall band score (average of 4 criteria, rounded to nearest 0.5)

Be fair but realistic - this is meant to help them improve, not discourage them.
IMPORTANT: Respond with ONLY valid JSON in this exact format: {"overallBand":7.0,"criteria":{"taskResponse":7.0,"coherence":6.5,"lexicalResource":7.0,"grammar":6.5},"feedback":{"taskResponse":"feedback in Vietnamese","coherence":"feedback in Vietnamese","lexicalResource":"feedback in Vietnamese","grammar":"feedback in Vietnamese"},"corrections":[{"original":"original text","correction":"corrected text","explanation":"explanation in Vietnamese"}],"strengths":["strength1 in Vietnamese","strength2 in Vietnamese"],"improvements":["improvement1 in Vietnamese","improvement2 in Vietnamese"]}`,

  reading: `You are an IELTS Reading expert. Given an optional passage and a set of IELTS reading questions (True/False/Not Given, multiple choice, matching headings, fill-in-blank, short answer, etc.), determine the most likely correct answer for each. If a passage is given, base answers strictly on it and briefly cite the evidence in the reason (in Vietnamese, under 20 words). If no passage is given, answer using general reasoning and note in the reason that no passage was provided so it's a best estimate.
IMPORTANT: Respond with ONLY valid JSON in this exact format: {"answers":[{"question":"question text","answer":"correct answer","reason":"explanation in Vietnamese"}]}`,

  listening: `You are an IELTS Listening expert. Given a transcript of an audio recording and a set of IELTS listening questions, determine the correct answer for each based on the transcript. Give the reason in Vietnamese, under 20 words, referencing the relevant part of the transcript.
IMPORTANT: Respond with ONLY valid JSON in this exact format: {"answers":[{"question":"question text","answer":"correct answer","reason":"explanation in Vietnamese"}]}`
};

// @desc    Generate Speaking questions and answers
// @route   POST /api/speaking/generate
// @access  Private
export const generateSpeaking = async (req, res) => {
  try {
    const { topic } = req.body;

    if (!topic) {
      return res.status(400).json({ error: 'Topic is required' });
    }

    const userText = `Generate IELTS Speaking questions and answers for the topic: "${topic}"`;
    // Only pass schema for Gemini, OpenRouter uses response_format: { type: 'json_object' }
    // Raised from 2000 -> 3200: Part1+Part2+Part3 content was hitting the token
    // cap and getting cut off mid-string, causing "Unterminated string" JSON errors.
    const { text } = await callGeminiWithFallback(SYSTEM_PROMPTS.speaking, userText, 3200, SPEAKING_SCHEMA);

    res.json({ result: safeJsonParse(text) });
  } catch (error) {
    console.error('Speaking generation error:', error);
    if (error.message === 'RATE_LIMITED') {
      return res.status(429).json({ error: 'RATE_LIMITED' });
    }
    if (error.message === 'OVERLOADED') {
      return res.status(503).json({ error: 'OVERLOADED' });
    }
    if (error.message === 'TIMEOUT') {
      return res.status(504).json({ error: 'TIMEOUT' });
    }
    if (error.message === 'INVALID_AI_RESPONSE') {
      return res.status(502).json({ error: 'AI trả về dữ liệu không hợp lệ (có thể do bị cắt cụt). Vui lòng thử lại.' });
    }
    res.status(500).json({ error: error.message });
  }
};

// @desc    Generate Writing sample essay
// @route   POST /api/writing/generate
// @access  Private
export const generateWriting = async (req, res) => {
  try {
    const { task, question } = req.body;

    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    const userText = `Task: ${task || 'Task 2 (Essay)'}\nQuestion: "${question}"`;
    const { text } = await callGeminiWithFallback(SYSTEM_PROMPTS.writing, userText, 3000, WRITING_SCHEMA);

    res.json({ result: safeJsonParse(text) });
  } catch (error) {
    console.error('Writing generation error:', error);
    if (error.message === 'RATE_LIMITED') {
      return res.status(429).json({ error: 'RATE_LIMITED' });
    }
    if (error.message === 'OVERLOADED') {
      return res.status(503).json({ error: 'OVERLOADED' });
    }
    if (error.message === 'TIMEOUT') {
      return res.status(504).json({ error: 'TIMEOUT' });
    }
    if (error.message === 'INVALID_AI_RESPONSE') {
      return res.status(502).json({ error: 'AI trả về dữ liệu không hợp lệ (có thể do bị cắt cụt). Vui lòng thử lại.' });
    }
    res.status(500).json({ error: error.message });
  }
};

// @desc    Assess user's Writing essay
// @route   POST /api/writing/assess
// @access  Private
export const assessWriting = async (req, res) => {
  try {
    const { task, question, essay } = req.body;

    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }
    if (!essay) {
      return res.status(400).json({ error: 'Essay is required' });
    }

    const userText = `Task: ${task || 'Task 2 (Essay)'}\nQuestion: "${question}"\n\nUser's Essay:\n"${essay}"`;
    const { text } = await callGeminiWithFallback(SYSTEM_PROMPTS.writingAssessment, userText, 3500, WRITING_ASSESSMENT_SCHEMA);

    res.json({ result: safeJsonParse(text) });
  } catch (error) {
    console.error('Writing assessment error:', error);
    if (error.message === 'RATE_LIMITED') {
      return res.status(429).json({ error: 'RATE_LIMITED' });
    }
    if (error.message === 'OVERLOADED') {
      return res.status(503).json({ error: 'OVERLOADED' });
    }
    if (error.message === 'TIMEOUT') {
      return res.status(504).json({ error: 'TIMEOUT' });
    }
    if (error.message === 'INVALID_AI_RESPONSE') {
      return res.status(502).json({ error: 'AI trả về dữ liệu không hợp lệ (có thể do bị cắt cụt). Vui lòng thử lại.' });
    }
    res.status(500).json({ error: error.message });
  }
};

// @desc    Generate Reading answers
// @route   POST /api/reading/generate
// @access  Private
export const generateReading = async (req, res) => {
  try {
    const { passage, questions } = req.body;

    if (!questions) {
      return res.status(400).json({ error: 'Questions are required' });
    }

    let userText = `Questions:\n${questions}`;
    if (passage) {
      userText += `\n\nPassage:\n${passage}`;
    }

    const { text } = await callGeminiWithFallback(SYSTEM_PROMPTS.reading, userText, 2500, ANSWERS_SCHEMA);

    res.json({ result: safeJsonParse(text) });
  } catch (error) {
    console.error('Reading generation error:', error);
    if (error.message === 'RATE_LIMITED') {
      return res.status(429).json({ error: 'RATE_LIMITED' });
    }
    if (error.message === 'OVERLOADED') {
      return res.status(503).json({ error: 'OVERLOADED' });
    }
    if (error.message === 'TIMEOUT') {
      return res.status(504).json({ error: 'TIMEOUT' });
    }
    if (error.message === 'INVALID_AI_RESPONSE') {
      return res.status(502).json({ error: 'AI trả về dữ liệu không hợp lệ (có thể do bị cắt cụt). Vui lòng thử lại.' });
    }
    res.status(500).json({ error: error.message });
  }
};

// @desc    Generate Listening answers
// @route   POST /api/listening/generate
// @access  Private
export const generateListening = async (req, res) => {
  try {
    const { transcript, questions } = req.body;

    if (!questions) {
      return res.status(400).json({ error: 'Questions are required' });
    }

    let userText = `Questions:\n${questions}`;
    if (transcript) {
      userText += `\n\nTranscript:\n${transcript}`;
    }

    const { text } = await callGeminiWithFallback(SYSTEM_PROMPTS.listening, userText, 2500, ANSWERS_SCHEMA);

    res.json({ result: safeJsonParse(text) });
  } catch (error) {
    console.error('Listening generation error:', error);
    if (error.message === 'RATE_LIMITED') {
      return res.status(429).json({ error: 'RATE_LIMITED' });
    }
    if (error.message === 'OVERLOADED') {
      return res.status(503).json({ error: 'OVERLOADED' });
    }
    if (error.message === 'TIMEOUT') {
      return res.status(504).json({ error: 'TIMEOUT' });
    }
    if (error.message === 'INVALID_AI_RESPONSE') {
      return res.status(502).json({ error: 'AI trả về dữ liệu không hợp lệ (có thể do bị cắt cụt). Vui lòng thử lại.' });
    }
    res.status(500).json({ error: error.message });
  }
};
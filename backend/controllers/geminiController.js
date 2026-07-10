import { callGeminiWithFallback } from '../utils/gemini.js';

// Gemini structured-output schemas
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

// System prompts for each skill
const SYSTEM_PROMPTS = {
  speaking: `You are an IELTS Speaking examiner. Generate realistic IELTS Speaking questions and sample answers.
For Part 1: Generate 3-4 simple personal questions with brief sample answers.
For Part 2: Generate a cue card topic with bullet points and a 2-minute sample answer, plus 1 follow-up question.
For Part 3: Generate 3-4 more abstract discussion questions with detailed sample answers.
All answers should be Band 7-8 level with good vocabulary and natural expressions.`,

  writing: `You are an IELTS Writing examiner and expert essay writer. Given an IELTS Writing task type and the pasted task question, write a natural Band 7-8 model answer in English matching real IELTS conventions (Task 1: ~150 words, overview + key features, no opinion; Task 1 Letter: appropriate tone + all bullet points covered; Task 2: ~250-280 words, clear thesis, body paragraphs, conclusion). Also give 3-4 short bullet tips in Vietnamese explaining why the answer works well (structure, vocabulary, cohesion).`,

  reading: `You are an IELTS Reading expert. Given an optional passage and a set of IELTS reading questions (True/False/Not Given, multiple choice, matching headings, fill-in-blank, short answer, etc.), determine the most likely correct answer for each. If a passage is given, base answers strictly on it and briefly cite the evidence in the reason (in Vietnamese, under 20 words). If no passage is given, answer using general reasoning and note in the reason that no passage was provided so it's a best estimate.`,

  listening: `You are an IELTS Listening expert. Given a transcript of an audio recording and a set of IELTS listening questions, determine the correct answer for each based on the transcript. Give the reason in Vietnamese, under 20 words, referencing the relevant part of the transcript.`
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
    const { text } = await callGeminiWithFallback(SYSTEM_PROMPTS.speaking, userText, 2000, SPEAKING_SCHEMA);
    
    res.json({ result: JSON.parse(text) });
  } catch (error) {
    console.error('Speaking generation error:', error);
    if (error.message === 'RATE_LIMITED') {
      return res.status(429).json({ error: 'RATE_LIMITED' });
    }
    if (error.message === 'OVERLOADED') {
      return res.status(503).json({ error: 'OVERLOADED' });
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
    const { text } = await callGeminiWithFallback(SYSTEM_PROMPTS.writing, userText, 2500, WRITING_SCHEMA);
    
    res.json({ result: JSON.parse(text) });
  } catch (error) {
    console.error('Writing generation error:', error);
    if (error.message === 'RATE_LIMITED') {
      return res.status(429).json({ error: 'RATE_LIMITED' });
    }
    if (error.message === 'OVERLOADED') {
      return res.status(503).json({ error: 'OVERLOADED' });
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
    
    const { text } = await callGeminiWithFallback(SYSTEM_PROMPTS.reading, userText, 2000, ANSWERS_SCHEMA);
    
    res.json({ result: JSON.parse(text) });
  } catch (error) {
    console.error('Reading generation error:', error);
    if (error.message === 'RATE_LIMITED') {
      return res.status(429).json({ error: 'RATE_LIMITED' });
    }
    if (error.message === 'OVERLOADED') {
      return res.status(503).json({ error: 'OVERLOADED' });
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
    
    const { text } = await callGeminiWithFallback(SYSTEM_PROMPTS.listening, userText, 2000, ANSWERS_SCHEMA);
    
    res.json({ result: JSON.parse(text) });
  } catch (error) {
    console.error('Listening generation error:', error);
    if (error.message === 'RATE_LIMITED') {
      return res.status(429).json({ error: 'RATE_LIMITED' });
    }
    if (error.message === 'OVERLOADED') {
      return res.status(503).json({ error: 'OVERLOADED' });
    }
    res.status(500).json({ error: error.message });
  }
};

import { GoogleGenAI, Type } from "@google/genai";
import type { PreliminaryAnalysisResult, FullAnalysisResult, AnalysisOptions, DiagnosticItem, ComplianceIssue, ComplianceBreakdown } from '../types';
import { SUB_SCORE_DETAILS } from '../constants';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

/**
 * Generates a thumbnail from a video file.
 * @param file The video file.
 * @returns A promise that resolves to a base64 data URL of the thumbnail.
 */
export const generateThumbnail = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    video.preload = 'metadata';
    video.muted = true;
    video.src = URL.createObjectURL(file);

    video.onloadedmetadata = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      // Seek to a representative frame, e.g., 1 second in or mid-way for short videos
      video.currentTime = Math.min(1, video.duration / 2); 
    };

    video.onseeked = () => {
      if (context) {
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.7);
        URL.revokeObjectURL(video.src);
        resolve(thumbnailUrl);
      } else {
        reject("Could not get canvas context for thumbnail.");
      }
    };
      
    video.onerror = (err) => {
        URL.revokeObjectURL(video.src);
        reject(`Error generating thumbnail: ${err}`);
    };
  });
};


/**
 * Extracts a specified number of frames from a video file as base64 strings.
 * @param file The video file.
 * @param numFrames The number of frames to extract.
 * @returns A promise that resolves to an array of objects containing frame timestamps and base64 data.
 */
const extractFrames = (file: File, numFrames: number = 12): Promise<{ timestamp: number; base64Data: string; }[]> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const frames: { timestamp: number; base64Data: string; }[] = [];

    video.preload = 'metadata';
    video.muted = true;
    video.src = URL.createObjectURL(file);

    video.onloadedmetadata = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const duration = video.duration;
      // Avoid capturing the very start or end
      const interval = duration / (numFrames + 1);

      let processedFrames = 0;

      const seekAndCapture = (time: number) => {
        if (time > duration) {
            // In case of calculation issues, don't seek beyond duration
             if (!frames.length) reject("Could not process video frames.");
             URL.revokeObjectURL(video.src);
             resolve(frames.sort((a,b) => a.timestamp - b.timestamp));
             return;
        }
        video.currentTime = time;
      };

      video.onseeked = () => {
        if (context && processedFrames < numFrames) {
          context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
          // Get base64 string without the data URL prefix
          const base64Data = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
          frames.push({ timestamp: video.currentTime, base64Data });
          processedFrames++;

          if (processedFrames < numFrames) {
            seekAndCapture(interval * (processedFrames + 1));
          } else {
            URL.revokeObjectURL(video.src);
            resolve(frames.sort((a,b) => a.timestamp - b.timestamp));
          }
        }
      };
      
      video.onerror = (e) => reject(`Error processing video: ${e}`);

      // Start capturing after a short delay to ensure readiness
      setTimeout(() => seekAndCapture(interval), 100);
    };

    video.onerror = (e) => reject(`Error loading video metadata: ${e}`);
  });
};

// #region Audio Extraction Utilities
const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

const writeString = (view: DataView, offset: number, str: string) => {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
};

const floatTo16BitPCM = (output: DataView, offset: number, input: Float32Array) => {
  for (let i = 0; i < input.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
};

const encodeWAV = (samples: Float32Array, sampleRate: number): ArrayBuffer => {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const channels = 1; // mono
  const bitDepth = 16;
  
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * (bitDepth / 8), true);
  view.setUint16(32, channels * (bitDepth / 8), true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);
  floatTo16BitPCM(view, 44, samples);
  
  return buffer;
};

const extractAudioBase64 = async (file: File): Promise<string | null> => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const arrayBuffer = await readFileAsArrayBuffer(file);
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    // Use the first channel for simplicity
    const pcmData = audioBuffer.getChannelData(0);
    const wavBuffer = encodeWAV(pcmData, audioBuffer.sampleRate);
    const base64Wav = arrayBufferToBase64(wavBuffer);
    
    return base64Wav;
  } catch (error) {
    console.warn("Audio extraction failed. The video may not have an audio track.", error);
    return null; 
  }
};
// #endregion

/**
 * Finds the number in a list that is closest to the target number.
 * @param target The target number.
 * @param availableNumbers A list of numbers to search through.
 * @returns The number from the list closest to the target.
 */
const findClosestTimestamp = (target: number, availableTimestamps: number[]): number => {
    if (availableTimestamps.length === 0) return 0;
    return availableTimestamps.reduce((prev, curr) => 
        (Math.abs(curr - target) < Math.abs(prev - target) ? curr : prev)
    );
};


interface LowConfidenceWord {
  suspectedWord: string;
  reason: string;
  alternatives: string[];
}

/**
 * Implements a robust two-pass transcription process.
 * Pass 1: Generates a transcript and flags low-confidence words.
 * Pass 2: Performs a focused re-evaluation of only the flagged words to correct errors.
 */
const generateTranscriptFromVideo = async (
  frames: { base64Data: string }[],
  audioBase64: string | null
): Promise<string> => {
    const imageParts = frames.map(frame => ({
        inlineData: { mimeType: 'image/jpeg', data: frame.base64Data },
    }));

    const allContentParts: ({ text: string } | { inlineData: { mimeType: string; data: string; } })[] = [];
    if (audioBase64) {
        allContentParts.push({ inlineData: { mimeType: 'audio/wav', data: audioBase64 } });
    }
    allContentParts.push(...imageParts);

    // --- PASS 1: Transcription with Self-Doubt using a Hierarchical Framework ---
    const firstPassPrompt = `
      You are a highly specialized AI transcriptionist. Your task is to produce a precise, verbatim transcript of the provided video in Traditional Chinese.
      You will output a single JSON object with "transcript" and "lowConfidence" keys.

      **Follow this strict decision-making hierarchy:**
      1.  **Clear Visual Text (OCR) is KING**: If text is clearly legible on screen, it is the absolute source of truth and MUST be used, overriding any ambiguous audio. If visual text has effects, is animated, skewed, or otherwise hard to read, you must rely more on audio and semantic context.
      2.  **Clear Audio is QUEEN**: If audio is clear and unambiguous, you must transcribe it verbatim. DO NOT "correct" what you hear into something you think is more common or logical.
          *   **Proper Noun Mandate**: You MUST preserve potential brand names, store names, or unique phrases (e.g., "床聚點"). DO NOT change them to generic terms (e.g., "床墊店").
          *   **Verbatim Mandate**: Transcribe filler words, repetitions, and full phrases exactly as spoken (e.g., "體驗看看吧"). Do not simplify or omit words (e.g., do not change it to "看看吧").
      3.  **Semantic Context is the TIE-BREAKER**: Use this ONLY when audio is genuinely phonetically ambiguous (e.g., the sound could be both "零 líng" and "六 liù") AND there is no clear visual text to confirm the correct word. In this specific case, choose the alternative that makes the most logical sense in the context of the video's topic (e.g., product specifications).

      **Common Pitfalls & Self-Doubt Triggers (CRITICAL):**
      Your primary measure of success is not just transcribing, but also identifying potential errors.
      *   **Phonetic Hallucinations**: Be extremely skeptical of word combinations that are phonetically plausible but make no semantic sense in the video's context (e.g., transcribing "快樂小蜜蜂" as "快樂享妮峰"). If a phrase sounds strange, is not a common word, or is nonsensical, it is a strong signal that you misheard. You MUST mark it as low-confidence.
      *   **Word Omission/Insertion**: In fast speech, short modifying words (like "抗菌" in "天然抗菌乳膠層") can be easily missed or incorrectly added. If a phrase feels slightly incomplete or has an extra word that doesn't quite fit, critically re-evaluate the audio. If doubt remains, flag the word or the area around it.
      *   **Over-Correction**: Your primary directive is VERBATIM. Resist the urge to "fix" grammar or simplify phrases. The goal is to capture what was actually said, flaws and all.
      
      **CRITICAL FORMATTING RULES (Non-negotiable):**
      *   **NUMBERS**: ALL numbers must be output as Arabic numerals (0-9). Use a period (.) for decimals.
          *   CORRECT: "7999", "2.0"
          *   FORBIDDEN: "七九九九", "二點零", "七千九百九十九"
      *   **LANGUAGE**: The entire output MUST be in Traditional Chinese.

      **Your Output Process:**
      1.  **transcript**: Generate the full transcript. For any word/phrase where you have even a slight doubt due to the pitfalls above, you MUST wrap it in a unique marker like this: %%WORD%%. It is better to flag a potentially correct word than to confidently output a wrong one.
      2.  **lowConfidence**: For each %%marked word%%, create an object in this array explaining the ambiguity and providing the most likely alternatives.

      The final output MUST be a single, valid JSON object and nothing else.
    `;
    
    allContentParts.unshift({ text: firstPassPrompt });
    const firstPassContents = { parts: allContentParts };

    const firstPassSchema = {
      type: Type.OBJECT,
      properties: {
        transcript: { type: Type.STRING },
        lowConfidence: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              suspectedWord: { type: Type.STRING },
              reason: { type: Type.STRING },
              alternatives: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
          },
        },
      },
    };

    let firstPassResult;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: firstPassContents,
            config: { responseMimeType: 'application/json', responseSchema: firstPassSchema },
            systemInstruction: 'You are a specialized AI speech-to-text engine that produces verbatim transcripts and flags ambiguous words for verification. Your output is always a valid JSON in Traditional Chinese.'
        });
        firstPassResult = JSON.parse(response.text);
    } catch (error) {
        console.error("Transcription Pass 1 failed:", error);
        // Fallback: try to get a plain text transcript if the structured approach fails
        const fallbackResponse = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: 'Transcribe this video verbatim in Traditional Chinese, using Arabic numerals for all numbers.' });
        return fallbackResponse.text.trim();
    }
    
    let finalTranscript = firstPassResult.transcript;
    const lowConfidenceWords: LowConfidenceWord[] = firstPassResult.lowConfidence || [];

    if (lowConfidenceWords.length === 0) {
        return finalTranscript.replace(/%%/g, ''); // Clean up any stray markers
    }

    // --- PASS 2: Focused Verification ---
    for (const wordInfo of lowConfidenceWords) {
        const verificationPrompt = `
          This is a focused verification task for a video transcript.
          In a previous analysis, the word "${wordInfo.suspectedWord}" was transcribed, but with low confidence.
          Reason for uncertainty: "${wordInfo.reason}".
          Plausible alternatives were: ${wordInfo.alternatives.join(', ')}.

          Your task: Re-examine the video and audio context closely. Determine the single most accurate transcription for this specific word.
          Analyze based on the strict hierarchy:
          1. Visuals (OCR): Is the word clearly visible on screen? This is the highest authority.
          2. Phonetics: Listen to the sound again carefully.
          3. Semantic Context: Which word makes the most sense in the sentence and the overall ad?

          Respond with ONLY a JSON object containing the single, corrected word: { "correctedWord": "..." }.
        `;
        
        // We re-use the same content parts, but with the new focused prompt
        const verificationContentParts = [{ text: verificationPrompt }, ...allContentParts.slice(1)];
        const verificationContents = { parts: verificationContentParts };

        const verificationSchema = {
          type: Type.OBJECT,
          properties: { correctedWord: { type: Type.STRING } },
        };
        
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: verificationContents,
                config: { responseMimeType: 'application/json', responseSchema: verificationSchema },
                systemInstruction: 'You are an expert linguistic auditor. Your sole job is to resolve ambiguity in transcripts. Provide only the corrected word in JSON.'
            });

            const verificationResult = JSON.parse(response.text);
            const correctedWord = verificationResult.correctedWord;

            // Replace the first occurrence of the marked word with the corrected one
            finalTranscript = finalTranscript.replace(`%%${wordInfo.suspectedWord}%%`, correctedWord);

        } catch (error) {
            console.warn(`Verification for "${wordInfo.suspectedWord}" failed. Keeping original.`, error);
            // If verification fails, just remove the markers for that word
            finalTranscript = finalTranscript.replace(`%%${wordInfo.suspectedWord}%%`, wordInfo.suspectedWord);
        }
    }

    // Clean up any remaining markers in case of errors
    return finalTranscript.replace(/%%/g, '');
};


export const generatePreliminaryReport = async (file: File): Promise<PreliminaryAnalysisResult> => {
  console.log('Starting preliminary analysis for file:', file.name);

  const [frames, audioBase64] = await Promise.all([
    extractFrames(file, 4), // Fewer frames for speed and context
    extractAudioBase64(file)
  ]);
  
  // STAGE 1: Get the high-quality transcript first using the new two-pass method.
  const transcript = await generateTranscriptFromVideo(frames, audioBase64);
  console.log('Generated Transcript:', transcript);

  // STAGE 2: Use the high-quality transcript for content analysis.
  const imageParts = frames.map(frame => ({
    inlineData: { mimeType: 'image/jpeg', data: frame.base64Data },
  }));
  
  const analysisPrompt = `
    Analyze the provided video creative (keyframes) and its **verified transcript**. 
    Your analysis must be in Traditional Chinese.

    **Verified Transcript:**
    ---
    ${transcript}
    ---

    **Your Tasks:**
    1.  **Core Theme:** Based on the transcript and visuals, what is the video's core theme or main message?
    2.  **Scene Tags:** Extract relevant scene tags (objects, styles, concepts) from the visuals.
    3.  **Risk Words:** Systematically list any potential compliance risk words from the transcript or on-screen text. Be extremely strict. Consider risks from three main perspectives: **legal** (e.g., unsubstantiated medical claims), **social perception** (e.g., sensitive topics), and **advertising policy** (e.g., exaggerated claims). Flag words related to:
        *   **Exaggerated Claims & Superlatives:** e.g., "保證", "100%有效", "最佳", "第一".
        *   **Unproven Efficacy or Medical Claims:** e.g., "天然", "抗菌", "瘦身", "治療".
        *   **Misleading Guarantees:** e.g., "品質保障", "無效退款".
        *   **Misleading Origin/Authority:** e.g., "MIT", "醫師推薦" (if not verifiable).
        *   **Misleading Scarcity:** e.g., "僅限今天", "最後機會".
        *   **Sensitive Topics:** Words related to finance, health, discrimination, etc.
    4.  Respond ONLY with a valid JSON object matching the provided schema. Do not include any other text or markdown.
  `;
  
  const allParts = [{ text: analysisPrompt }, ...imageParts];
  const contents = { parts: allParts };

  const responseSchema: Type.OBJECT = {
    type: Type.OBJECT,
    properties: {
      coreTheme: { type: Type.STRING },
      sceneTags: { type: Type.ARRAY, items: { type: Type.STRING } },
      riskWords: { type: Type.ARRAY, items: { type: Type.STRING } },
    },
  };

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents,
    config: { responseMimeType: 'application/json', responseSchema },
    systemInstruction: 'You are an efficient AI assistant specializing in video content analysis. Your output is always in Traditional Chinese.'
  });
  
  const analysisResult = JSON.parse(response.text);
  
  // Combine the results from both stages
  return {
    ...analysisResult,
    transcript: transcript, // Add the transcript generated in stage 1
  } as PreliminaryAnalysisResult;
};

// --- Internal analysis functions for streaming ---

const _generateScoresAndCompliance = async (
    imageParts: { inlineData: { mimeType: string; data: string; } }[],
    preliminaryReport: PreliminaryAnalysisResult,
    options: AnalysisOptions,
    timestamps: number[]
): Promise<Pick<FullAnalysisResult, 'subScores' | 'complianceBreakdown'>> => {
    
    const prompt = `
      Task: Generate performance scores and a compliance risk analysis for a vertical video ad.
      Analysis must be in Traditional Chinese.

      **Context:**
      - Timestamps: ${timestamps.map(t => t.toFixed(1)).join(', ')}
      - Core Theme: ${preliminaryReport.coreTheme}
      - Transcript: ${preliminaryReport.transcript}
      - Target Placement: ${options.placement}

      **Instructions:**
      1.  **Sub-Scores:** Provide a brutally honest score (0-100) for each performance sub-category in the schema.
          - **CRITICAL:** When scoring 'Readability' and 'Composition & Visibility', heavily penalize any on-screen text that falls outside the central 4:5 safe area (i.e., in the top or bottom ~15% of the 9:16 frame), as this text will be cropped in some feeds.
      2.  **Compliance Analysis:** Perform a detailed risk analysis for Legal, Social, and Ad Policy categories. Provide a score (100 = no risk), summary, and a list of specific issues for each. Provide an overall score and summary.
          - **Hook Effectiveness (CRITICAL ANALYSIS):** Your task is to pinpoint the *single, most powerful "pattern interrupt" moment* that occurs within the first 3 seconds of the video. This is often the *first major visual change, surprising event, or direct question* that breaks a viewer's scrolling trance. Your score MUST be based on the effectiveness of this *specific, identified peak moment*, whether it happens at 0.5s, 1.5s, or 2.8s. Do not simply analyze the last frame in the window by default; find the true hook.
      3.  Respond ONLY with a valid JSON object matching the schema.
    `;

    const allParts = [{ text: prompt }, ...imageParts];

    const complianceIssueSchema = {
        type: Type.OBJECT,
        properties: {
            description: { type: Type.STRING },
            timestamp: { type: Type.NUMBER, description: "The most relevant timestamp in seconds. Optional." },
            severity: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
        },
        required: ['description', 'severity']
    };
    const complianceCategorySchema = {
        type: Type.OBJECT,
        properties: {
            score: { type: Type.INTEGER, description: "Score from 0-100, where 100 is no risk." },
            summary: { type: Type.STRING },
            issues: { type: Type.ARRAY, items: complianceIssueSchema },
        },
        required: ['score', 'summary', 'issues']
    };
    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            subScores: {
                type: Type.OBJECT,
                properties: Object.keys(SUB_SCORE_DETAILS).reduce((acc, key) => {
                    acc[key] = { type: Type.INTEGER };
                    return acc;
                }, {} as Record<string, any>),
            },
            complianceBreakdown: {
                type: Type.OBJECT,
                properties: {
                    overallScore: { type: Type.INTEGER },
                    overallSummary: { type: Type.STRING },
                    legal: complianceCategorySchema,
                    social: complianceCategorySchema,
                    adPolicy: complianceCategorySchema,
                },
                required: ['overallScore', 'overallSummary', 'legal', 'social', 'adPolicy']
            },
        },
    };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: allParts },
        config: { responseMimeType: 'application/json', responseSchema },
        systemInstruction: 'You are a world-class performance marketing creative strategist. Output is Traditional Chinese JSON.'
    });
    
    const resultJson = JSON.parse(response.text);

    const processComplianceIssues = (issues: any[]): ComplianceIssue[] => {
        if (!issues) return [];
        return issues.map(issue => ({
            ...issue,
            timestamp: issue.timestamp ? findClosestTimestamp(issue.timestamp, timestamps) : undefined,
        }));
    };

    const complianceBreakdownWithTimestamps: ComplianceBreakdown | undefined = resultJson.complianceBreakdown ? {
        ...resultJson.complianceBreakdown,
        legal: { ...resultJson.complianceBreakdown.legal, issues: processComplianceIssues(resultJson.complianceBreakdown.legal.issues) },
        social: { ...resultJson.complianceBreakdown.social, issues: processComplianceIssues(resultJson.complianceBreakdown.social.issues) },
        adPolicy: { ...resultJson.complianceBreakdown.adPolicy, issues: processComplianceIssues(resultJson.complianceBreakdown.adPolicy.issues) },
    } : undefined;

    return {
        subScores: resultJson.subScores,
        complianceBreakdown: complianceBreakdownWithTimestamps
    };
};

const _generateDiagnostics = async (
    imageParts: { inlineData: { mimeType: string; data: string; } }[],
    preliminaryReport: PreliminaryAnalysisResult,
    options: AnalysisOptions,
    frames: { timestamp: number; base64Data: string }[]
): Promise<Pick<FullAnalysisResult, 'diagnostics'>> => {
    const timestamps = frames.map(f => f.timestamp);
    const prompt = `
      Task: Generate a detailed, time-stamped diagnostic report for a vertical video ad.
      Analysis must be in Traditional Chinese.

      **Context:**
      - Timestamps: ${timestamps.map(t => t.toFixed(1)).join(', ')}
      - Core Theme: ${preliminaryReport.coreTheme}
      - Transcript: ${preliminaryReport.transcript}
      - Target Placement: ${options.placement}

      **Instructions:**
      1.  Identify specific moments for optimization (diagnostics).
      2.  For each diagnostic, you MUST pinpoint the issue to the most relevant timestamp provided.
      3.  **4:5 Feed Safe Area (CRITICAL):** This 9:16 video may be cropped to 4:5 in feeds, cutting off the top and bottom ~15%. Scrutinize every frame for on-screen text or subtitles located in these vertical crop zones. If any text falls outside the central 4:5 safe area, you MUST create a diagnostic issue. The \`penaltyReason\` must explain that the text will be cropped, harming message delivery. The \`fixType\` should be 'Text/Graphics'.
      4.  **Diagnostics with Commercial Value (MASTER-LEVEL ANALYSIS):**
          - For the \`penaltyReason\`, you MUST:
            1. **Identify the Flaw:** Pinpoint the core visual/auditory flaw (e.g., "At 4.1s, thin white font over bright background...").
            2. **Analyze Psychological Impact:** Explain *why* it's a problem for the viewer (e.g., "...causes high cognitive load...").
            3. **Link to a Business KPI:** Directly connect this to a commercial outcome (e.g., "...harms CTR and CVR.").
          - For the \`suggestion\`, provide a strategic, high-level recommendation guiding *what to achieve*, not the exact text to use. For example, instead of suggesting "Change the text to '立即購買'", you should suggest "Strengthen the call-to-action to create more urgency". **DO NOT provide specific copy examples.**
      5.  Determine its 'impact' (high, medium, low) and 'fixType'.
      6.  Respond ONLY with a valid JSON object matching the schema.
    `;
    const allParts = [{ text: prompt }, ...imageParts];
    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            diagnostics: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        timestamp: { type: Type.NUMBER },
                        title: { type: Type.STRING },
                        penaltyReason: { type: Type.STRING },
                        suggestion: { type: Type.STRING },
                        impact: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
                        fixType: { type: Type.STRING, enum: ['Re-edit', 'Text/Graphics', 'Color/Lighting', 'Audio', 'Pacing'] },
                    },
                },
            },
        },
    };
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: allParts },
        config: { responseMimeType: 'application/json', responseSchema },
        systemInstruction: 'You are a world-class performance marketing creative strategist. Output is Traditional Chinese JSON.'
    });

    const resultJson = JSON.parse(response.text);
    const frameMap = new Map(frames.map(f => [f.timestamp, f.base64Data]));

    const diagnosticsWithScreenshots: DiagnosticItem[] = (resultJson.diagnostics || []).map((diag: Omit<DiagnosticItem, 'screenshotUrl'>) => {
        const closestTimestamp = findClosestTimestamp(diag.timestamp, timestamps);
        const screenshotData = frameMap.get(closestTimestamp);
        return {
            ...diag,
            timestamp: closestTimestamp,
            screenshotUrl: screenshotData ? `data:image/jpeg;base64,${screenshotData}` : `https://picsum.photos/seed/${diag.timestamp}/400/225`,
        };
    });
    
    diagnosticsWithScreenshots.sort((a, b) => a.timestamp - b.timestamp);

    return { diagnostics: diagnosticsWithScreenshots };
};

const _generateStrengthsAndImprovements = async (
    imageParts: { inlineData: { mimeType: string; data: string; } }[],
    preliminaryReport: PreliminaryAnalysisResult,
    options: AnalysisOptions
): Promise<Pick<FullAnalysisResult, 'strengths' | 'improvementPackage'>> => {
    const prompt = `
      Task: Identify key strengths and provide a strategic improvement package for a vertical video ad.
      Analysis must be in Traditional Chinese.

      **Context:**
      - Core Theme: ${preliminaryReport.coreTheme}
      - Transcript: ${preliminaryReport.transcript}
      - Target Placement: ${options.placement}

      **Instructions:**
      1.  **Strengths:** Identify 3-4 key strengths of the creative. For each, provide a title and a brief description explaining why it works.
      2.  **Improvement Package:** Provide a general "improvement package" with high-level strategic advice. For the \`actionableItem\`, describe a *strategic direction or principle to follow*, NOT specific example copy. For instance, for a CTA, instead of "立即點擊下方連結", suggest a principle like "使用更具急迫感的動詞，並明確指出下一步行動".
      3.  Respond ONLY with a valid JSON object matching the schema.
    `;
    const allParts = [{ text: prompt }, ...imageParts];
    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            strengths: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        description: { type: Type.STRING },
                    }
                }
            },
            improvementPackage: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        type: { type: Type.STRING, enum: ['Hook', 'Editing', 'Subtitles', 'CTA'] },
                        title: { type: Type.STRING },
                        description: { type: Type.STRING },
                        actionableItem: { type: Type.STRING },
                    },
                },
            },
        },
    };
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: allParts },
        config: { responseMimeType: 'application/json', responseSchema },
        systemInstruction: 'You are a world-class performance marketing creative strategist. Output is Traditional Chinese JSON.'
    });
    
    return JSON.parse(response.text);
};


export const generateFullReport = async (
  file: File,
  preliminaryReport: PreliminaryAnalysisResult,
  options: AnalysisOptions,
  onUpdate: (partialResult: Partial<FullAnalysisResult>, progressMessage: string) => void
): Promise<FullAnalysisResult> => {
    console.log('Starting streaming full report analysis for file:', file.name);
    
    const frames = await extractFrames(file, 12);
    if (frames.length === 0) {
        throw new Error("Could not extract frames from the video for analysis.");
    }
    
    const imageParts = frames.map(frame => ({
        inlineData: { mimeType: 'image/jpeg', data: frame.base64Data },
    }));
    const timestamps = frames.map(f => f.timestamp);

    const scoresPromise = _generateScoresAndCompliance(imageParts, preliminaryReport, options, timestamps)
        .then(result => {
            console.log("Scores & Compliance generated.");
            onUpdate(result, '正在生成時間軸診斷...');
            return result;
        });

    const diagnosticsPromise = _generateDiagnostics(imageParts, preliminaryReport, options, frames)
        .then(result => {
            console.log("Diagnostics generated.");
            onUpdate(result, '正在生成策略建議...');
            return result;
        });

    const strategyPromise = _generateStrengthsAndImprovements(imageParts, preliminaryReport, options)
        .then(result => {
            console.log("Strengths & Improvements generated.");
            onUpdate(result, '正在彙整最終報告...');
            return result;
        });
    
    const [scoresResult, diagnosticsResult, strategyResult] = await Promise.all([
        scoresPromise,
        diagnosticsPromise,
        strategyPromise
    ]);

    console.log("All analysis parts completed.");
    
    return {
        ...scoresResult,
        ...diagnosticsResult,
        ...strategyResult,
    };
};

export const generateCopySuggestions = async (
  originalText: string,
  suggestionType: string,
  videoTheme: string
): Promise<string[]> => {
  console.log('Generating copy suggestions for:', originalText);

  const prompt = `
    You are a world-class performance marketing copywriter specializing in short-form vertical video ads in Traditional Chinese.
    Your task is to generate concrete copy examples based on a strategic principle.
    
    **Context:**
    - **Video's Core Theme:** ${videoTheme}
    - **Copy's Purpose:** ${suggestionType} (e.g., Hook, CTA)
    - **Guiding Principle:** "${originalText}"

    **Instructions:**
    1.  Generate 3 concrete copy suggestions that implement the **Guiding Principle**.
    2.  Each version should be a unique angle (e.g., one focusing on urgency, one on a pain point, one on a key benefit) while still adhering to the principle.
    3.  The copy must be in Traditional Chinese.
    4.  Keep the suggestions concise and suitable for on-screen text or a voiceover in a fast-paced video.
    5.  Respond ONLY with a valid JSON object matching the provided schema. Do not include any other text or markdown.
  `;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      suggestions: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    }
  };

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: { responseMimeType: 'application/json', responseSchema },
    systemInstruction: 'You are an expert copywriter. All your output is in Traditional Chinese and strictly follows the requested JSON format.'
  });

  const result = JSON.parse(response.text);
  return result.suggestions || [];
};
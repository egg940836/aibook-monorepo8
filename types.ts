export enum Placement {
  Reels = 'Reels',
  Stories = 'Stories',
  Feed = 'Feed',
}

export interface AnalysisOptions {
  placement: Placement;
  language: string;
}

export interface SubScore {
  name: string;
  score: number;
  description: string;
}

export interface DiagnosticItem {
  timestamp: number;
  screenshotUrl: string;
  title: string;
  penaltyReason: string;
  suggestion: string;
  impact: 'high' | 'medium' | 'low';
  fixType: 'Re-edit' | 'Text/Graphics' | 'Color/Lighting' | 'Audio' | 'Pacing';
}

export interface ImprovementSuggestion {
    type: 'Hook' | 'Editing' | 'Subtitles' | 'CTA';
    title: string;
    description: string;
    actionableItem: string;
}

export interface StrengthItem {
    title: string;
    description: string;
}

// STAGE 1 RESULT
export interface PreliminaryAnalysisResult {
  coreTheme: string;
  sceneTags: string[];
  riskWords: string[];
  transcript: string;
}

// New types for Compliance Breakdown
export interface ComplianceIssue {
  description: string;
  timestamp?: number;
  severity: 'high' | 'medium' | 'low';
}

export interface ComplianceCategoryReport {
  score: number; // 0-100, 100 is best (no risk)
  issues: ComplianceIssue[];
  summary: string;
}

export interface ComplianceBreakdown {
  overallScore: number;
  overallSummary: string;
  legal: ComplianceCategoryReport;
  social: ComplianceCategoryReport;
  adPolicy: ComplianceCategoryReport;
}


// STAGE 2 RESULT
export interface FullAnalysisResult {
  subScores?: Record<string, number>;
  diagnostics?: DiagnosticItem[];
  improvementPackage?: ImprovementSuggestion[];
  strengths?: StrengthItem[];
  complianceBreakdown?: ComplianceBreakdown;
}


export interface AnalysisHistoryItem {
  id: number;
  videoFile: File;
  videoName: string;
  thumbnailUrl: string;
  status: 'analyzing-preliminary' | 'preliminary-complete' | 'analyzing-full' | 'full-complete';
  progressMessage?: string;
  preliminaryResult?: PreliminaryAnalysisResult;
  fullResult?: FullAnalysisResult;
  totalScore?: number;
  grade?: string;
  date: string;
  uploaderId: string;
  uploaderName: string;
  isPublic: boolean;
  modelUsed?: string;
}
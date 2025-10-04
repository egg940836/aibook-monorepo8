export enum Placement {
  Reels = 'Reels',
  Stories = 'Stories',
  Feed = 'Feed',
}

export interface AnalysisOptions {
  placement: Placement;
  language: string;
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

export interface PreliminaryAnalysisResult {
  coreTheme: string;
  sceneTags: string[];
  riskWords: string[];
  transcript: string;
}

export interface ComplianceIssue {
  description: string;
  timestamp?: number;
  severity: 'high' | 'medium' | 'low';
}

export interface ComplianceCategoryReport {
  score: number;
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

export interface FullAnalysisResult {
  subScores?: Record<string, number>;
  diagnostics?: DiagnosticItem[];
  improvementPackage?: ImprovementSuggestion[];
  strengths?: StrengthItem[];
  complianceBreakdown?: ComplianceBreakdown;
}

export interface AnalysisHistoryItem {
  id: number;
  videoFile?: File;
  videoUrl?: string;
  videoName: string;
  thumbnailUrl: string;
  status: 'analyzing-preliminary' | 'preliminary-complete' | 'analyzing-full' | 'full-complete' | 'processing' | 'error';
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

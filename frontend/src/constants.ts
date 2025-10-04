import { Placement } from './types';

export const PLACEMENTS = [
  { id: Placement.Reels, name: 'Reels' },
  { id: Placement.Stories, name: 'Stories' },
  { id: Placement.Feed, name: '動態消息' },
];

export const SUB_SCORE_KEYS = {
    HOOK_EFFECTIVENESS: 'Hook Effectiveness',
    RHYTHM_AND_RETENTION: 'Rhythm & Retention',
    READABILITY: 'Readability',
    VISUAL_QUALITY: 'Visual Quality',
    COMPOSITION: 'Composition & Visibility',
    BRAND_PRESENCE: 'Brand Presence',
    AUDIO_QUALITY: 'Audio Quality',
    MESSAGE_DENSITY: 'Message Density',
    CTA_CLARITY: 'CTA Clarity',
    PLATFORM_FIT: 'Platform Fit',
};

export const SUB_SCORE_DETAILS: Record<string, { name: string; description: string }> = {
    [SUB_SCORE_KEYS.HOOK_EFFECTIVENESS]: { name: '開場鉤子', description: '前 3 秒內吸引用戶注意力的能力。' },
    [SUB_SCORE_KEYS.RHYTHM_AND_RETENTION]: { name: '節奏與留存', description: '透過剪輯節奏與視聽元素維持觀眾的持續關注。' },
    [SUB_SCORE_KEYS.READABILITY]: { name: '字幕可讀性', description: '畫面文字與字幕的清晰度及位置。' },
    [SUB_SCORE_KEYS.VISUAL_QUALITY]: { name: '視覺品質', description: '影像的清晰度、曝光與色彩穩定性。' },
    [SUB_SCORE_KEYS.COMPOSITION]: { name: '構圖與可見度', description: '關鍵元素（人臉、產品）在安全區域內的可見度。' },
    [SUB_SCORE_KEYS.BRAND_PRESENCE]: { name: '品牌露出', description: '品牌識別（Logo）出現的時機與持續時間。' },
    [SUB_SCORE_KEYS.AUDIO_QUALITY]: { name: '音訊品質', description: '語音清晰度、音量平衡與背景噪音。' },
    [SUB_SCORE_KEYS.MESSAGE_DENSITY]: { name: '資訊密度', description: '所傳達的資訊量，避免觀眾認知超載。' },
    [SUB_SCORE_KEYS.CTA_CLARITY]: { name: '行動呼籲清晰度', description: '行動呼籲（CTA）的清晰度與引導時機。' },
    [SUB_SCORE_KEYS.PLATFORM_FIT]: { name: '平台適配度', description: '符合平台規範的尺寸、長度與封面。' },
};

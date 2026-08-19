// Relevance gate and topic tagging.
//
// Ming's editorial control is the source list, not per-item review. That works
// for a feed that is entirely about AI in education. It does NOT work for a
// vendor's general blog or a broad arXiv category, where most items are
// off-topic. This module is what makes those sources usable: a `keyword`
// source must show education signal in its own words before an item is
// published, and every accepted item gets at least one topic tag.
//
// The rules are deliberately dumb keyword matching, not a model call. Wrong
// decisions here are cheap to see and cheap to fix by editing a list — a model
// deciding relevance would be neither.

import type { RawFeedItem } from './contracts';

export type Topic =
  | 'policy' | 'k12' | 'higher-ed' | 'teaching'
  | 'tools' | 'research' | 'integrity' | 'workforce';

// An item counts as education-relevant when it names education AND names AI.
// Requiring both is what keeps a vendor blog's unrelated model launches out
// while still catching "Gemini for Education" on the same feed.
const EDUCATION_TERMS = [
  'education', 'educator', 'educational', 'school', 'schools', 'classroom',
  'teacher', 'teachers', 'teaching', 'student', 'students', 'pupil',
  'university', 'universities', 'college', 'campus', 'faculty', 'curriculum',
  'curricula', 'pedagogy', 'pedagogical', 'learning', 'learner', 'lesson',
  'tutor', 'tutoring', 'k-12', 'k12', 'higher ed', 'higher education',
  'academic', 'academia', 'exam', 'examination', 'assessment', 'literacy',
  'edtech', 'coursework', 'homework', 'syllabus', 'undergraduate', 'graduate',
  '教育', '學校', '教師', '老師', '學生', '課程', '教學', '大學', '校園',
  '素養', '學習', '考試', '作業', '師培', '課綱',
];

const AI_TERMS = [
  'ai', 'a.i.', 'artificial intelligence', 'genai', 'generative ai',
  'machine learning', 'large language model', 'llm', 'chatbot', 'chatgpt',
  'gpt', 'claude', 'gemini', 'copilot', 'algorithm', 'automation',
  '人工智慧', '生成式', '大型語言模型', '機器學習', '演算法',
];

const TOPIC_TERMS: Record<Topic, string[]> = {
  policy: [
    'policy', 'policies', 'regulation', 'regulatory', 'guidance', 'law',
    'legislation', 'ministry', 'department of education', 'government',
    'framework', 'directive', 'act', 'ban', 'mandate', 'ruling', 'compliance',
    '政策', '法規', '指引', '教育部', '規範', '立法', '禁止',
  ],
  k12: [
    'k-12', 'k12', 'school', 'schools', 'primary school', 'secondary school',
    'high school', 'middle school', 'elementary', 'pupil', 'classroom',
    '中小學', '國小', '國中', '高中', '國民教育',
  ],
  'higher-ed': [
    'university', 'universities', 'college', 'campus', 'faculty', 'provost',
    'undergraduate', 'graduate', 'higher education', 'higher ed', 'dean',
    '大學', '高等教育', '大專', '研究所', '學院',
  ],
  teaching: [
    'teacher', 'teachers', 'teaching', 'pedagogy', 'lesson', 'classroom practice',
    'professional development', 'training', 'tutor', 'tutoring', 'instruction',
    '教師', '教學', '備課', '師培', '研習', '課堂',
  ],
  tools: [
    'launch', 'launches', 'launched', 'release', 'released', 'available',
    'product', 'platform', 'feature', 'rollout', 'partnership', 'programme',
    'program', 'pricing', 'free for', 'app', 'tool',
    '推出', '上線', '合作', '方案', '功能', '工具',
  ],
  research: [
    'study', 'studies', 'research', 'researchers', 'paper', 'findings',
    'evidence', 'trial', 'experiment', 'survey', 'report finds', 'arxiv',
    'peer-reviewed', 'journal',
    '研究', '論文', '調查', '實驗', '報告指出',
  ],
  integrity: [
    'cheating', 'plagiarism', 'academic integrity', 'misconduct', 'detection',
    'detector', 'proctoring', 'exam security', 'authorship', 'honesty',
    '作弊', '抄襲', '學術倫理', '學術誠信', '偵測',
  ],
  workforce: [
    'skills', 'upskilling', 'reskilling', 'workforce', 'career', 'jobs',
    'employability', 'certification', 'credential', 'apprenticeship',
    'training programme', 'talent',
    '技能', '職涯', '就業', '人才', '認證', '培訓',
  ],
};

/** Word-boundary match for Latin terms; substring for CJK, which has no spaces. */
function containsTerm(haystack: string, term: string): boolean {
  if (/^[\x20-\x7e]+$/.test(term)) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i').test(haystack);
  }
  return haystack.includes(term);
}

function searchText(item: RawFeedItem): string {
  return `${item.title} ${item.summary}`.toLocaleLowerCase();
}

export function isEducationRelevant(item: RawFeedItem): boolean {
  const text = searchText(item);
  const hasEducation = EDUCATION_TERMS.some((term) => containsTerm(text, term));
  if (!hasEducation) return false;
  return AI_TERMS.some((term) => containsTerm(text, term));
}

/**
 * Topics found in the item's own words. Returns an empty array when nothing
 * matches — the caller falls back to the source's defaultTopics rather than
 * this function inventing one, so an untagged story is impossible.
 */
export function inferTopics(item: RawFeedItem): Topic[] {
  const text = searchText(item);
  const found = (Object.keys(TOPIC_TERMS) as Topic[]).filter((topic) =>
    TOPIC_TERMS[topic].some((term) => containsTerm(text, term)),
  );
  // Three tags is the point where a row's tag list stops being scannable.
  return found.slice(0, 3);
}

export function resolveTopics(item: RawFeedItem, defaultTopics: readonly Topic[]): Topic[] {
  const inferred = inferTopics(item);
  return inferred.length > 0 ? inferred : [...defaultTopics];
}

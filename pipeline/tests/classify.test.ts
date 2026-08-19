import { describe, expect, it } from 'vitest';
import {
  MIN_AI_MENTIONS_IN_BODY,
  MIN_EDUCATION_MENTIONS_IN_BODY,
  inferTopics,
  isEducationRelevant,
  resolveTopics,
} from '../src/classify';
import type { RawFeedItem } from '../src/contracts';

function item(title: string, summary = '', fullText = ''): RawFeedItem {
  return { title, summary, fullText, link: 'https://example.org/x', publishedAt: null, guid: null };
}

// The gate requires BOTH an education term and an AI term. That is what keeps a
// vendor's general blog and a broad edtech outlet usable as sources.
describe('isEducationRelevant', () => {
  it('accepts an item naming both education and AI', () => {
    expect(isEducationRelevant(item('Teachers Forge Ahead on Integrating AI'))).toBe(true);
  });

  it('rejects AI news with no education angle', () => {
    expect(isEducationRelevant(item('OpenAI appoints a Chief Revenue Officer'))).toBe(false);
  });

  it('rejects education news with no AI angle', () => {
    expect(isEducationRelevant(item("Middle School Students' Struggles in Math"))).toBe(false);
  });

  it('reads the summary as well as the title', () => {
    expect(
      isEducationRelevant(item('A quiet change', 'The university is rolling out ChatGPT for students.')),
    ).toBe(true);
  });

  it('handles Chinese, which has no word boundaries', () => {
    expect(isEducationRelevant(item('教育部公布生成式AI教學指引'))).toBe(true);
    expect(isEducationRelevant(item('心臟瓣膜治療新指引'))).toBe(false);
  });

  // "AI-powered" and "AI." must match; "chair" and "said" must not.
  it('matches AI at punctuation boundaries without matching it inside words', () => {
    expect(isEducationRelevant(item('AI-powered tutoring for students'))).toBe(true);
    expect(isEducationRelevant(item('The chair said the school needs repairs'))).toBe(false);
  });
});

// The excerpt is only the first ~400 characters. Checking relevance against it
// alone silently dropped four of ten OECD posts whose opening paragraphs were
// about teachers and whose subject was AI.
describe('isEducationRelevant — reading the article body', () => {
  const body = (aiMentions: number) =>
    'The ministry published new guidance for schools and teachers this term. '.repeat(6) +
    'Artificial intelligence is reshaping how teachers plan lessons. '.repeat(aiMentions);

  it('accepts an article whose subject is AI even when the excerpt never says so', () => {
    const story = item('What young people want from education', 'Students met in Bratislava.', body(5));
    expect(isEducationRelevant(story)).toBe(true);
  });

  // An OECD post on teacher education said "artificial intelligence" exactly
  // once, 14% of the way in. That is an aside, not the subject.
  it('rejects an article that only name-drops AI once', () => {
    const story = item('Why teacher education matters', 'Insights from a survey.', body(1));
    expect(isEducationRelevant(story)).toBe(false);
  });

  it('needs the mentions to reach the measured threshold', () => {
    const below = item('Curriculum reform', 'A report.', body(MIN_AI_MENTIONS_IN_BODY - 1));
    const at = item('Curriculum reform', 'A report.', body(MIN_AI_MENTIONS_IN_BODY));
    expect(isEducationRelevant(below)).toBe(false);
    expect(isEducationRelevant(at)).toBe(true);
  });

  // Establishing the subject is the body's job; naming AI up front is enough
  // on its own and must not be second-guessed by a word count.
  it('still accepts on the headline alone, whatever the body says', () => {
    expect(isEducationRelevant(item('Schools adopt AI tutors', '', 'Nothing relevant here.'))).toBe(true);
  });

  it('finds the education signal in the body too', () => {
    const story = item('A quiet change', 'No subject given.', body(5));
    expect(isEducationRelevant(story)).toBe(true);
  });

  it('rejects a body about AI with no education angle at all', () => {
    const story = item('Quarterly results', 'Numbers.', 'Artificial intelligence drove revenue. '.repeat(8));
    expect(isEducationRelevant(story)).toBe(false);
  });

  // These are the real false positives from the first live run of the
  // body-aware check, back when the education signal needed only one mention.
  describe('an AI company’s own newsroom', () => {
    const aiHeavy = (educationAside: string) =>
      'Claude is our most capable model yet, and AI performance improved across the board. '.repeat(10) +
      educationAside;

    it('rejects a model launch that says "assessment" about its own evaluations', () => {
      const story = item(
        'Introducing Claude Sonnet 5',
        'Our most capable model.',
        aiHeavy('Our internal assessment covered many tasks. A second assessment confirmed it.'),
      );
      expect(isEducationRelevant(story)).toBe(false);
    });

    it('rejects an executive appointment whose bio mentions a university', () => {
      const story = item(
        'Tino Cuellar joins Anthropic as Chief Global Affairs Officer',
        'A new appointment.',
        aiHeavy('He taught at a law school, held a university post, and worked in academia.'),
      );
      expect(isEducationRelevant(story)).toBe(false);
    });

    // The one from that batch that genuinely belonged.
    it('accepts the same newsroom when the story really is about teaching', () => {
      const story = item(
        'Introducing Claude for Teachers',
        'Built for the classroom.',
        aiHeavy(''),
      );
      expect(isEducationRelevant(story)).toBe(true);
    });
  });

  it('needs education mentions to reach the measured threshold too', () => {
    const aside = 'Teachers and students in the classroom at school. ';
    const ai = 'Artificial intelligence and machine learning and AI. ';
    const below = item('A model launch', 'No subject.', ai.repeat(4) + aside.repeat(1));
    const at = item('A model launch', 'No subject.', ai.repeat(4) + aside.repeat(3));
    expect(isEducationRelevant(below)).toBe(false);
    expect(isEducationRelevant(at)).toBe(true);
  });

  // Symmetry: neither signal may be established by a single passing word.
  it('requires both signals to carry weight when the headline says neither', () => {
    const story = item(
      'A quiet week',
      'Nothing stated.',
      'The school and its teachers met. '.repeat(6) + 'One mention of AI here.',
    );
    expect(isEducationRelevant(story)).toBe(false);
  });

  // Sources whose feeds carry no body behave exactly as before.
  it('is unchanged for an item with no body', () => {
    expect(isEducationRelevant(item('Teachers and AI in schools'))).toBe(true);
    expect(isEducationRelevant(item('Teachers plan lessons'))).toBe(false);
  });
});

describe('inferTopics', () => {
  it('tags a policy story', () => {
    expect(inferTopics(item('Education department issues AI guidance for schools'))).toContain(
      'policy',
    );
  });

  it('tags academic integrity', () => {
    expect(inferTopics(item('Universities rethink exams amid AI plagiarism concerns'))).toContain(
      'integrity',
    );
  });

  it('returns nothing when no topic term appears', () => {
    expect(inferTopics(item('Zzzz'))).toEqual([]);
  });

  // A whole article touches many subjects in passing; the tags are meant to
  // say what it is about, so they come from the headline and excerpt only.
  it('does not tag from the article body', () => {
    const story = item('Zzzz', '', 'This mentions cheating, plagiarism and exam security at length.');
    expect(inferTopics(story)).toEqual([]);
  });

  // A long tag list stops being scannable.
  it('caps the tag list at three', () => {
    const busy = item(
      'Ministry policy on AI in schools, universities, teacher training, product launches, research and cheating',
    );
    expect(inferTopics(busy).length).toBeLessThanOrEqual(3);
  });
});

describe('resolveTopics', () => {
  it('prefers topics found in the item itself', () => {
    expect(resolveTopics(item('New AI regulation for schools'), ['research'])).toContain('policy');
  });

  // The story schema requires at least one topic, so an untagged story must be
  // impossible by construction.
  it('falls back to the source default when nothing matches', () => {
    expect(resolveTopics(item('Zzzz'), ['research'])).toEqual(['research']);
  });
});

// "machine learning" is not a mention of learning. Counting it as one is how a
// pure AI article starts to look educational.
describe('AI compounds that embed an education word', () => {
  it.each([
    'machine learning',
    'deep learning',
    'reinforcement learning',
    'supervised learning',
    'in-context learning',
    'few-shot learning',
  ])('does not let "%s" stand in for education', (compound) => {
    const story = {
      title: 'A model launch',
      summary: 'No subject stated.',
      fullText: `We improved ${compound} across the board. `.repeat(12),
      link: 'https://example.org/x',
      publishedAt: null,
      guid: null,
    };
    expect(isEducationRelevant(story)).toBe(false);
  });

  it('still counts learning when it is about learners', () => {
    const story = {
      title: 'A quiet week',
      summary: 'No subject stated.',
      fullText:
        'Student learning improved this term. Teachers reported better learning in the classroom at school. '.repeat(4) +
        'The team used AI and artificial intelligence and AI again.',
      link: 'https://example.org/x',
      publishedAt: null,
      guid: null,
    };
    expect(isEducationRelevant(story)).toBe(true);
  });
});

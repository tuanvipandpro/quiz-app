import { getQuickSummary } from '../data/quickSummaries.js';
import { isStructuredQuestion } from '../utils/questionModel.js';

export async function fingerprintQuestions(questions) {
  const compare = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
  const ordered = (value) =>
    Array.isArray(value)
      ? value.map(ordered)
      : value && typeof value === 'object'
        ? Object.fromEntries(
            Object.keys(value)
              .sort(compare)
              .map((key) => [key, ordered(value[key])])
          )
        : value;
  const records = questions
    .map((question) =>
      isStructuredQuestion(question)
        ? ordered({
            id: String(question.id),
            type: question.type,
            question: question.question,
            options: question.options,
            answer: question.answer,
            imageUrl: question.imageUrl || '',
            layout: question.layout || '',
            instruction: question.instruction || '',
            template: question.template || '',
            statements: question.statements || [],
            slots: question.slots || [],
          })
        : {
            id: String(question.id),
            question: question.question,
            options: Object.fromEntries(
              Object.entries(question.options).sort(([a], [b]) => compare(a, b))
            ),
            answer: question.answer.map(String).sort(compare),
            imageUrl: question.imageUrl || '',
          }
    )
    .sort((a, b) => compare(a.id, b.id));
  const digest = await globalThis.crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(JSON.stringify(records))
  );
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function validateSummaryMetadata(meta, quizId) {
  const validText = (value) => typeof value === 'string' && value.trim().length > 0;
  if (
    !meta ||
    meta.quizId !== quizId ||
    meta.status !== 'published' ||
    !validText(meta.title) ||
    !validText(meta.description) ||
    !validText(meta.language) ||
    !validText(meta.updatedAt) ||
    !Number.isInteger(meta.version) ||
    meta.version < 1 ||
    !Number.isInteger(meta.readingMinutes) ||
    meta.readingMinutes < 1 ||
    !Number.isInteger(meta.sourceQuestionCount) ||
    meta.sourceQuestionCount < 1 ||
    !/^[a-f0-9]{64}$/.test(meta.sourceQuizHash || '') ||
    !/^[a-zA-Z0-9_-]+\.md$/.test(meta.contentFile || '') ||
    !Array.isArray(meta.topics) ||
    !meta.topics.length ||
    !Array.isArray(meta.sources)
  ) {
    throw new Error('Quick Summary metadata is unavailable or invalid.');
  }
  const ids = new Set();
  for (const topic of meta.topics) {
    if (
      !topic ||
      !/^[a-z0-9-]+$/.test(topic.id || '') ||
      ids.has(topic.id) ||
      !validText(topic.title) ||
      !Array.isArray(topic.questionIds) ||
      !topic.questionIds.length ||
      !topic.questionIds.every(validText) ||
      new Set(topic.questionIds).size !== topic.questionIds.length
    ) {
      throw new Error('Quick Summary topic metadata is invalid.');
    }
    ids.add(topic.id);
  }
  if (
    !meta.sources.every(
      (source) => source && validText(source.title) && /^https:\/\/[^\s]+$/.test(source.url || '')
    )
  ) {
    throw new Error('Quick Summary sources are invalid.');
  }
  return meta;
}

export function parseSummaryMarkdown(markdown, topics) {
  if (typeof markdown !== 'string' || !markdown.trim())
    throw new Error('Quick Summary content is empty.');
  const intro = [];
  const sections = [];
  let fence = null;
  for (const line of markdown.split(/\r?\n/)) {
    const marker = line.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (marker) {
      if (!fence) fence = marker[1];
      else if (
        marker[1][0] === fence[0] &&
        marker[1].length >= fence.length &&
        line.trim() === marker[1]
      )
        fence = null;
    }
    const heading = !fence && line.match(/^## (.+?)\s*$/);
    if (heading) sections.push({ title: heading[1], lines: [] });
    else (sections.length ? sections[sections.length - 1].lines : intro).push(line);
  }
  if (
    sections.length !== topics.length ||
    sections.some(
      (section, index) => section.title !== topics[index].title || !section.lines.join('\n').trim()
    )
  ) {
    throw new Error('Quick Summary content does not match its topics.');
  }
  return {
    intro: intro.join('\n').trim(),
    sections: sections.map((section, index) => ({
      ...topics[index],
      content: section.lines.join('\n').trim(),
    })),
  };
}

export async function loadQuickSummary({
  quizId,
  questions,
  baseUrl = '/',
  signal,
  fetchImpl = fetch,
}) {
  const entry = getQuickSummary(quizId);
  if (!entry) throw new Error('No Quick Summary is published for this quiz yet.');
  const root = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
  const metadataResponse = await fetchImpl(root + entry.metadataPath, { signal });
  if (!metadataResponse.ok) throw new Error('Could not load Quick Summary. Please try again.');
  const meta = validateSummaryMetadata(await metadataResponse.json(), quizId);
  const directory = entry.metadataPath.slice(0, entry.metadataPath.lastIndexOf('/') + 1);
  const contentResponse = await fetchImpl(root + directory + meta.contentFile, { signal });
  if (!contentResponse.ok)
    throw new Error('Could not load Quick Summary content. Please try again.');
  const document = parseSummaryMarkdown(await contentResponse.text(), meta.topics);
  const sourceChanged = (await fingerprintQuestions(questions)) !== meta.sourceQuizHash;
  return { meta, ...document, sourceChanged };
}

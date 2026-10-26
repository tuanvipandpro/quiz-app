export const questionType = question => question.type || 'multiple_choice';
export const isStructuredQuestion = question => ['dropdown', 'yes_no'].includes(questionType(question));
export const questionParts = question => questionType(question) === 'yes_no' ? question.statements : question.slots;
export const partOptions = (question, id) => questionType(question) === 'yes_no' ? question.options : question.options[id];
export const partLabel = (part, index) => part.text || part.label || `Blank ${index + 1}`;

export function emptyAnswer(question) {
  return isStructuredQuestion(question) ? {} : question.answer.length > 1 ? [] : null;
}

export function hasAnyAnswer(question, answer) {
  if (isStructuredQuestion(question)) return !!answer && typeof answer === 'object' && !Array.isArray(answer)
    && questionParts(question).some(part => Object.hasOwn(partOptions(question, part.id), answer[part.id]));
  return Array.isArray(answer) ? answer.length > 0 : typeof answer === 'string' && Object.hasOwn(question.options, answer);
}

export function isAnswerComplete(question, answer) {
  if (isStructuredQuestion(question)) return !!answer && typeof answer === 'object' && !Array.isArray(answer)
    && Object.keys(answer).length === questionParts(question).length
    && questionParts(question).every(part => Object.hasOwn(answer, part.id) && typeof answer[part.id] === 'string'
      && Object.hasOwn(partOptions(question, part.id), answer[part.id]));
  if (question.answer.length > 1) return Array.isArray(answer) && answer.length === question.answer.length
    && new Set(answer).size === answer.length && answer.every(key => Object.hasOwn(question.options, key));
  return typeof answer === 'string' && Object.hasOwn(question.options, answer);
}

export function isAnswerCorrect(question, answer) {
  if (!isAnswerComplete(question, answer)) return false;
  if (isStructuredQuestion(question)) return questionParts(question).every(part => answer[part.id] === question.answer[part.id]);
  return question.answer.length > 1 ? answer.every(key => question.answer.includes(key)) : answer === question.answer[0];
}

export function formatAnswerLines(question, answer, { showKeys = false } = {}) {
  if (isStructuredQuestion(question)) return questionParts(question).map((part, index) => {
    const key = answer?.[part.id];
    const value = partOptions(question, part.id)[key];
    return `${partLabel(part, index)}: ${value ? (showKeys ? key + '. ' : '') + value : 'Not answered'}`;
  });
  const keys = Array.isArray(answer) ? [...answer].sort() : answer ? [answer] : [];
  return keys.filter(key => Object.hasOwn(question.options, key)).map(key => (showKeys ? key + '. ' : '') + question.options[key]);
}

export function formatQuestionText(question) {
  const parts = [question.question];
  if (question.imageUrl?.trim()) parts.push('Image: ' + question.imageUrl.trim());
  if (question.instruction) parts.push(question.instruction);
  if (question.template) parts.push(question.template);
  if (isStructuredQuestion(question)) {
    questionParts(question).forEach((part, index) => parts.push(`${partLabel(part, index)}\n` + Object.entries(partOptions(question, part.id))
      .sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}. ${value}`).join('\n')));
  } else parts.push(Object.entries(question.options).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}. ${value}`).join('\n'));
  return parts.join('\n\n');
}

export function shuffleQuestionOptions(question, random = Math.random) {
  const shuffle = options => Object.fromEntries(Object.entries(options).map(entry => ({ entry, order: random() }))
    .sort((a, b) => a.order - b.order).map(item => item.entry));
  if (questionType(question) === 'yes_no') return question;
  return { ...question, options: isStructuredQuestion(question)
    ? Object.fromEntries(question.slots.map(slot => [slot.id, shuffle(question.options[slot.id])]))
    : shuffle(question.options) };
}

export function validateQuizQuestions(questions, { allowLegacyIncomplete = false } = {}) {
  const record = value => !!value && typeof value === 'object' && !Array.isArray(value);
  const text = value => typeof value === 'string' && !!value.trim();
  const choices = value => record(value) && Object.keys(value).length >= 2 && Object.values(value).every(text);
  if (!Array.isArray(questions) || !questions.length) throw new Error('Quiz must contain a non-empty array of questions.');
  const ids = new Set();
  for (const [index, question] of questions.entries()) {
    const fail = message => { throw new Error(`Question ${index + 1}: ${message}`); };
    if (!record(question) || !['string', 'number'].includes(typeof question.id) || !String(question.id).trim()
      || !text(question.question) || (question.imageUrl != null && typeof question.imageUrl !== 'string')) fail('missing or invalid id, question, or imageUrl.');
    if ((question.template != null && typeof question.template !== 'string')
      || (question.instruction != null && typeof question.instruction !== 'string')) fail('invalid template or instruction.');
    if (ids.has(String(question.id))) fail('duplicate question ID.');
    ids.add(String(question.id));
    const type = questionType(question);
    if ((Object.hasOwn(question, 'type') && !['multiple_choice', 'dropdown', 'yes_no'].includes(question.type))
      || !['multiple_choice', 'dropdown', 'yes_no'].includes(type)) fail('unsupported question type.');
    if (!isStructuredQuestion(question)) {
      if (allowLegacyIncomplete && !question.type) {
        if (!record(question.options) || !Object.values(question.options).every(value => typeof value === 'string')
          || !Array.isArray(question.answer) || !question.answer.every(key => typeof key === 'string')) fail('invalid legacy choices or answers.');
        continue;
      }
      if (!choices(question.options) || !Array.isArray(question.answer) || !question.answer.length
        || new Set(question.answer).size !== question.answer.length
        || !question.answer.every(key => typeof key === 'string' && Object.hasOwn(question.options, key))) fail('invalid choices or answer keys.');
      continue;
    }
    const parts = questionParts(question);
    if (!Array.isArray(parts) || !parts.length || !record(question.answer) || !record(question.options)) fail('missing statements/slots or answer mapping.');
    const partIds = new Set();
    for (const [partIndex, part] of parts.entries()) {
      if (!record(part) || !text(part.id) || partIds.has(part.id)) fail('invalid or duplicate part ID.');
      partIds.add(part.id);
      if (type === 'yes_no' ? !text(part.text) : part.label != null && !text(part.label)) fail('invalid part label.');
      const options = partOptions(question, part.id);
      if (!choices(options) || typeof question.answer[part.id] !== 'string' || !Object.hasOwn(options, question.answer[part.id])) fail(`invalid answer/options for ${partLabel(part, partIndex)}.`);
    }
    if (Object.keys(question.answer).length !== parts.length) fail('answer mapping must match every part exactly.');
    if (type === 'yes_no' && (Object.keys(question.options).length !== 2
      || !['yes', 'no'].every(value => Object.values(question.options).some(label => label.trim().toLowerCase() === value)))) fail('yes_no requires Yes and No options.');
    if (type === 'dropdown') {
      if (Object.keys(question.options).length !== parts.length) fail('dropdown options must match every slot.');
      if (question.layout != null && !['inline', 'rows'].includes(question.layout)) fail('unsupported dropdown layout.');
      if (question.instruction != null && typeof question.instruction !== 'string') fail('invalid dropdown instruction.');
      if (question.layout === 'inline') {
        if (!text(question.template)) fail('inline dropdown requires a template.');
        const placeholders = [...question.template.matchAll(/\{\{([^{}]+)\}\}/g)].map(match => match[1]);
        if (placeholders.length !== parts.length || new Set(placeholders).size !== parts.length
          || placeholders.some(id => !partIds.has(id))) fail('template must include each slot exactly once.');
      } else if (parts.some(part => !text(part.label))) fail('row dropdowns require labels.');
    }
  }
  return questions;
}

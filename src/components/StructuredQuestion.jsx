import React from 'react';
import { Card, Radio, Select, Typography } from 'antd';
import { isAnswerComplete, partLabel, partOptions, questionParts, questionType } from '../utils/questionModel';
import './StructuredQuestion.css';

const { Title, Text, Paragraph } = Typography;

export default function StructuredQuestion({ data, selectedAnswer, onSelectAnswer, showFeedback, isCorrect, readOnly }) {
  const parts = questionParts(data);
  const answer = selectedAnswer && !Array.isArray(selectedAnswer) ? selectedAnswer : {};
  const reveal = showFeedback && (readOnly || isAnswerComplete(data, answer));
  const update = (id, value) => { if (!readOnly) onSelectAnswer({ ...answer, [id]: value }); };
  const completed = parts.filter(part => Object.hasOwn(partOptions(data, part.id), answer[part.id])).length;
  const feedback = (part, index, includeLabel = false) => reveal && <Paragraph className="structured-part-feedback">
    <Text type={answer[part.id] === data.answer[part.id] ? 'success' : 'danger'}>
      {includeLabel ? partLabel(part, index) : 'Your answer'}: {partOptions(data, part.id)[answer[part.id]] || 'Not answered'}
    </Text>
    {answer[part.id] !== data.answer[part.id] && <Text type="success"> · Correct: {partOptions(data, part.id)[data.answer[part.id]]}</Text>}
  </Paragraph>;
  const dropdown = (part, index) => <Select id={`answer-${data.id}-${part.id}`}
    aria-label={'Answer for ' + partLabel(part, index)} placeholder="Select an answer"
    value={answer[part.id]} onChange={value => update(part.id, value)} disabled={readOnly}
    virtual={false} classNames={{ popup: { root: 'structured-select-popup' } }}
    options={Object.entries(partOptions(data, part.id)).map(([value, label]) => ({ value, label }))} />;

  return <Card className="quiz-question-card structured-question">
    <Title level={4}>{questionType(data) === 'dropdown' ? data.question.replace(/\n\s*Select\s*$/i, '') : data.question}</Title>
    {data.imageUrl?.trim() && <img className="structured-question-image" src={data.imageUrl} alt="Question illustration" />}
    {data.instruction && <Paragraph>{data.instruction}</Paragraph>}
    <Paragraph type="secondary">Completed {completed} of {parts.length}</Paragraph>
    {questionType(data) === 'dropdown' && data.layout === 'inline' ? <>
      <div className="structured-template">{data.template.split(/(\{\{[^{}]+\}\})/g).map((piece, index) => {
        const id = piece.match(/^\{\{([^{}]+)\}\}$/)?.[1];
        const partIndex = parts.findIndex(part => part.id === id);
        return partIndex >= 0 ? <span key={index} className="structured-inline-slot">{dropdown(parts[partIndex], partIndex)}</span> : <React.Fragment key={index}>{piece}</React.Fragment>;
      })}</div>
      {parts.map((part, index) => <React.Fragment key={part.id}>{feedback(part, index, true)}</React.Fragment>)}
    </> : <div className="structured-parts">{parts.map((part, index) => <fieldset key={part.id}
      className={'structured-part' + (reveal ? answer[part.id] === data.answer[part.id] ? ' structured-correct' : ' structured-incorrect' : '')}>
      <legend>{partLabel(part, index)}</legend>
      {questionType(data) === 'yes_no' ? <Radio.Group aria-label={'Answer for ' + partLabel(part, index)}
        value={answer[part.id]} disabled={readOnly} onChange={event => update(part.id, event.target.value)}>
        {Object.entries(data.options).map(([key, value]) => <Radio.Button key={key} value={key}>{value}</Radio.Button>)}
      </Radio.Group> : dropdown(part, index)}
      {feedback(part, index)}
    </fieldset>)}</div>}
    {reveal && <div className="question-feedback" role="status">
      <Text type={isCorrect ? 'success' : 'danger'} strong>{isCorrect ? 'Correct answer!' : 'Incorrect. Review the correct answer for each part above.'}</Text>
    </div>}
  </Card>;
}

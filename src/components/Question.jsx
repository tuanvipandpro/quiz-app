import React from 'react';
import { Card, Radio, Checkbox, Typography } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import StructuredQuestion from './StructuredQuestion';
import { isStructuredQuestion } from '../utils/questionModel';
import { useLanguage } from '../contexts/LanguageContext';

const { Title, Text } = Typography;

export default function Question({
  data,
  question,
  imageUrl,
  options,
  selectedAnswer,
  onSelectAnswer,
  showFeedback,
  isCorrect,
  correctOptions,
  readOnly = false,
  showOptionKey = true,
  sortOptions = true,
}) {
  const { t } = useLanguage();
  if (data && isStructuredQuestion(data))
    return (
      <StructuredQuestion
        data={data}
        selectedAnswer={selectedAnswer}
        onSelectAnswer={onSelectAnswer}
        showFeedback={showFeedback}
        isCorrect={isCorrect}
        readOnly={readOnly}
      />
    );
  const entries = Object.entries(options);
  if (sortOptions) entries.sort(([a], [b]) => a.localeCompare(b));
  const multiple = correctOptions.length > 1;
  const selected = Array.isArray(selectedAnswer) ? selectedAnswer : [];
  const complete = readOnly || !multiple || selected.length === correctOptions.length;
  const reveal = showFeedback && complete;
  const toggle = (key) => {
    if (readOnly) return;
    if (selected.includes(key)) onSelectAnswer(selected.filter((value) => value !== key));
    else if (selected.length < correctOptions.length) onSelectAnswer([...selected, key]);
  };
  const className = (key) =>
    'question-option' +
    (reveal && correctOptions.includes(key)
      ? ' option-correct'
      : reveal && (multiple ? selected.includes(key) : selectedAnswer === key)
        ? ' option-incorrect'
        : '');
  const content = (key) => (
    <span className="question-option-text">
      {showOptionKey && <span className="option-key">{key}.</span>}
      {options[key]}
      {reveal && correctOptions.includes(key) && (
        <CheckCircleOutlined className="answer-status-icon" aria-label={t('Correct answer')} />
      )}
    </span>
  );
  return (
    <Card className="quiz-question-card">
      <Title level={2} className="question-title">
        {question}
      </Title>
      {imageUrl?.trim() && (
        <img className="question-image" src={imageUrl} alt={t('Question illustration')} />
      )}
      <fieldset className="question-fieldset">
        <legend>
          {t(multiple ? 'Choose {count} answers' : 'Choose one answer', {
            count: correctOptions.length,
          })}
        </legend>
        {multiple ? (
          <div className="question-options">
            {entries.map(([key]) => (
              <Checkbox
                key={key}
                className={className(key)}
                checked={selected.includes(key)}
                disabled={
                  readOnly || (selected.length >= correctOptions.length && !selected.includes(key))
                }
                onChange={() => toggle(key)}
              >
                {content(key)}
              </Checkbox>
            ))}
          </div>
        ) : (
          <Radio.Group
            value={selectedAnswer}
            disabled={readOnly}
            onChange={(event) => onSelectAnswer(event.target.value)}
            className="question-options"
            aria-label={t('Choose one answer')}
          >
            {entries.map(([key]) => (
              <Radio key={key} className={className(key)} value={key}>
                {content(key)}
              </Radio>
            ))}
          </Radio.Group>
        )}
      </fieldset>
      {reveal && (
        <div
          className={'question-feedback ' + (isCorrect ? 'feedback-correct' : 'feedback-incorrect')}
          role="status"
        >
          <Text strong>
            {isCorrect ? (
              <>
                <CheckCircleOutlined /> {t('Correct answer!')}
              </>
            ) : (
              <>
                <CloseCircleOutlined /> {t('Review the correct answer below.')}
              </>
            )}
          </Text>
          {!isCorrect && (
            <ul>
              {[...correctOptions].sort().map((key) => (
                <li key={key}>
                  {showOptionKey ? `${key}. ` : ''}
                  {options[key]}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}

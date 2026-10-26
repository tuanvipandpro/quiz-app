// components/Question.jsx
import React from 'react';
import { Card, Radio, Checkbox, Space, Typography } from 'antd';
import StructuredQuestion from './StructuredQuestion';
import { isStructuredQuestion } from '../utils/questionModel';

const { Title, Text, Paragraph } = Typography;

function Question({ 
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
  // Remove onExplain from here - we'll handle it at the parent component
}) {
  if (data && isStructuredQuestion(data)) return <StructuredQuestion data={data} selectedAnswer={selectedAnswer}
    onSelectAnswer={onSelectAnswer} showFeedback={showFeedback} isCorrect={isCorrect} readOnly={readOnly} />;
  // Convert options object to array of {key, value}; keep incoming order when sortOptions is false.
  const optionEntries = Object.entries(options)
    .map(([key, value]) => ({ key, value }));
  const renderedOptions = sortOptions
    ? [...optionEntries].sort((a, b) => a.key.localeCompare(b.key))
    : optionEntries;
  
  // Determine if this question has multiple correct answers
  const isMultipleChoice = Array.isArray(correctOptions) && correctOptions.length > 1;
  const selectedOptions = Array.isArray(selectedAnswer) ? selectedAnswer : [];
  const selectionLimitReached = selectedOptions.length >= correctOptions.length;

  // For multiple choice questions, selectedAnswer should be an array
  const handleCheckboxChange = (optionKey) => {
    if (readOnly) return;
    const newSelection = [...selectedOptions];
    
    if (newSelection.includes(optionKey)) {
      // Remove the option if already selected
      const index = newSelection.indexOf(optionKey);
      newSelection.splice(index, 1);
    } else {
      // Keep selected options removable, but never exceed the required count.
      if (newSelection.length >= correctOptions.length) return;
      newSelection.push(optionKey);
    }
    
    onSelectAnswer(newSelection);
  };

  // Check if enough options are selected for multiple choice questions
  const hasEnoughSelections = () => {
    if (readOnly) return true;
    if (!isMultipleChoice) return true;
    return selectedAnswer && Array.isArray(selectedAnswer) && selectedAnswer.length === correctOptions.length;
  };

  // Determine the style for radio/checkbox options
  const getOptionStyle = (optionKey) => {
    if (!showFeedback) return {};
    
    // For single-choice questions
    if (!isMultipleChoice) {
      if (correctOptions.includes(optionKey)) {
        return { 
          backgroundColor: 'rgba(82, 196, 26, 0.2)', 
          borderRadius: '4px',
          padding: '8px',
          fontWeight: 'bold'
        };
      }
      if (selectedAnswer === optionKey && !correctOptions.includes(optionKey)) {
        return { 
          backgroundColor: 'rgba(255, 77, 79, 0.1)', 
          borderRadius: '4px',
          padding: '8px'
        };
      }
    } 
    // For multiple-choice questions
    else {
      // Only show correct answer highlighting when enough options are selected
      if (hasEnoughSelections() && correctOptions.includes(optionKey)) {
        return { 
          backgroundColor: 'rgba(82, 196, 26, 0.2)', 
          borderRadius: '4px',
          padding: '8px',
          fontWeight: 'bold'
        };
      }
      // Only show wrong answer highlighting when enough options are selected
      if (hasEnoughSelections() && selectedAnswer && selectedAnswer.includes(optionKey) && !correctOptions.includes(optionKey)) {
        return { 
          backgroundColor: 'rgba(255, 77, 79, 0.1)', 
          borderRadius: '4px',
          padding: '8px'
        };
      }
    }
    
    return {};
  };

  return (
    <Card className="quiz-question-card">
      {/* Question title without the Explain button */}
      <Title level={4} style={{ marginBottom: '20px' }}>{question}</Title>
      
      {/* Display image if imageUrl is provided */}
      {imageUrl && imageUrl.trim() !== '' && (
        <div style={{ marginBottom: '20px', textAlign: 'center' }}>
          <img 
            src={imageUrl} 
            alt="Question illustration" 
            style={{ 
              maxWidth: '100%', 
              height: 'auto',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }} 
          />
        </div>
      )}
      {!isMultipleChoice ? (
        // Single choice (Radio buttons)
        <Radio.Group 
          onChange={(e) => onSelectAnswer(e.target.value)} 
          value={selectedAnswer}
          disabled={readOnly}
          style={{ width: '100%' }}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            {renderedOptions.map((option) => (
              <div key={option.key} style={getOptionStyle(option.key)}>
                <Radio 
                  value={option.key} 
                  style={{ marginBottom: '10px' }}
                >
                  {showOptionKey ? `${option.key}. ${option.value}` : option.value}
                </Radio>
              </div>
            ))}
          </Space>
        </Radio.Group>
      ) : (
        // Multiple choice (Checkboxes)
        <Space direction="vertical" style={{ width: '100%' }}>
          {renderedOptions.map((option) => (
            <div key={option.key} style={getOptionStyle(option.key)}>
              <Checkbox 
                checked={selectedOptions.includes(option.key)}
                onChange={() => handleCheckboxChange(option.key)}
                disabled={readOnly || (selectionLimitReached && !selectedOptions.includes(option.key))}
                style={{ marginBottom: '10px' }}
              >
                {showOptionKey ? `${option.key}. ${option.value}` : option.value}
              </Checkbox>
            </div>
          ))}
        </Space>
      )}
      
      {showFeedback && hasEnoughSelections() && (
        <div className="question-feedback" style={{ marginTop: '15px', padding: '10px', borderRadius: '5px' }}>
          {isCorrect ? (
            <Text type="success" strong>Correct answer!</Text>
          ) : (
            <div>
              <Text type="danger" strong>
                Incorrect. The correct answer{correctOptions.length > 1 ? 's are' : ' is'}:
              </Text>
              <div style={{ marginTop: '10px', paddingLeft: '15px' }}>
                {[...correctOptions]
                  .sort((a, b) => a.localeCompare(b)) // Sort correct answers by ABCD order
                  .map((opt) => (
                    <div key={opt} style={{ marginBottom: '5px' , display: 'inline-block'}}>
                      <Text strong type="success">
                        {showOptionKey ? `${opt}. ${options[opt]}` : options[opt]}
                      </Text>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Show message for multiple choice questions when not enough options are selected */}
      {showFeedback && isMultipleChoice && !hasEnoughSelections() && (
        <div className="question-info-notice" style={{ marginTop: '15px', padding: '10px', borderRadius: '5px' }}>
          <Text type="info">
            Please select {correctOptions.length} answer{correctOptions.length > 1 ? 's' : ''} to see the result.
          </Text>
        </div>
      )}
    </Card>
  );
}

export default Question;

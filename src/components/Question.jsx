// components/Question.jsx
import React, { useState } from 'react';
import { Card, Radio, Checkbox, Space, Typography, Button, Modal, Spin } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';

const { Title, Text, Paragraph } = Typography;

function Question({ 
  question,
  imageUrl, 
  options, 
  selectedAnswer, 
  onSelectAnswer, 
  showFeedback, 
  isCorrect, 
  correctOptions,
  // Remove onExplain from here - we'll handle it at the parent component
}) {
  // Convert options object to array of {key, value} for rendering and sort by ABCD order
  const optionEntries = Object.entries(options)
    .map(([key, value]) => ({ key, value }))
    .sort((a, b) => a.key.localeCompare(b.key)); // Sort by A, B, C, D order
  
  // Determine if this question has multiple correct answers
  const isMultipleChoice = Array.isArray(correctOptions) && correctOptions.length > 1;

  // For multiple choice questions, selectedAnswer should be an array
  const handleCheckboxChange = (optionKey) => {
    const newSelection = selectedAnswer ? [...selectedAnswer] : [];
    
    if (newSelection.includes(optionKey)) {
      // Remove the option if already selected
      const index = newSelection.indexOf(optionKey);
      newSelection.splice(index, 1);
    } else {
      // Add the option if not selected
      newSelection.push(optionKey);
    }
    
    onSelectAnswer(newSelection);
  };

  // Check if enough options are selected for multiple choice questions
  const hasEnoughSelections = () => {
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
    <Card>
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
          style={{ width: '100%' }}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            {optionEntries.map((option) => (
              <div key={option.key} style={getOptionStyle(option.key)}>
                <Radio 
                  value={option.key} 
                  style={{ marginBottom: '10px' }}
                >
                  {option.key}. {option.value}
                </Radio>
              </div>
            ))}
          </Space>
        </Radio.Group>
      ) : (
        // Multiple choice (Checkboxes)
        <Space direction="vertical" style={{ width: '100%' }}>
          {optionEntries.map((option) => (
            <div key={option.key} style={getOptionStyle(option.key)}>
              <Checkbox 
                checked={selectedAnswer ? selectedAnswer.includes(option.key) : false}
                onChange={() => handleCheckboxChange(option.key)}
                style={{ marginBottom: '10px' }}
              >
                {option.key}. {option.value}
              </Checkbox>
            </div>
          ))}
        </Space>
      )}
      
      {showFeedback && hasEnoughSelections() && (
        <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
          {isCorrect ? (
            <Text type="success" strong>Correct answer!</Text>
          ) : (
            <div>
              <Text type="danger" strong>
                Incorrect. The correct answer{correctOptions.length > 1 ? 's are' : ' is'}:
              </Text>
              <div style={{ marginTop: '10px', paddingLeft: '15px' }}>
                {correctOptions
                  .sort((a, b) => a.localeCompare(b)) // Sort correct answers by ABCD order
                  .map((opt) => (
                    <div key={opt} style={{ marginBottom: '5px' , display: 'inline-block'}}>
                      <Text strong style={{ color: '#52c41a' }}>
                        {opt}. {options[opt]}
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
        <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f0f8ff', borderRadius: '5px', border: '1px solid #1890ff' }}>
          <Text type="info">
            Please select {correctOptions.length} answer{correctOptions.length > 1 ? 's' : ''} to see the result.
          </Text>
        </div>
      )}
    </Card>
  );
}

export default Question;
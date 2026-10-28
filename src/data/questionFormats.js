export const questionFormats = [
  {
    id: 'single',
    label: 'Single choice',
    description: 'Use an array with one correct option key.',
    questions: [
      {
        id: 'q1',
        question: 'Which city is the capital of France?',
        options: { A: 'London', B: 'Paris', C: 'Berlin' },
        answer: ['B'],
      },
    ],
  },
  {
    id: 'multiple',
    label: 'Multiple choice',
    description: 'Put every correct option key in the answer array.',
    questions: [
      {
        id: 'q1',
        type: 'multiple_choice',
        question: 'Which numbers are even? Choose two.',
        options: { A: '2', B: '3', C: '4' },
        answer: ['A', 'C'],
      },
    ],
  },
  {
    id: 'yes-no',
    label: 'Yes / No',
    description: 'Give each statement a unique ID and map it to Yes or No.',
    questions: [
      {
        id: 'q1',
        type: 'yes_no',
        question: 'Evaluate each statement.',
        statements: [
          { id: 's1', text: 'Two is an even number.' },
          { id: 's2', text: 'Three is an even number.' },
        ],
        options: { A: 'Yes', B: 'No' },
        answer: { s1: 'A', s2: 'B' },
      },
    ],
  },
  {
    id: 'dropdown-rows',
    label: 'Dropdown rows',
    description: 'Each slot needs a label, its own options and a correct answer key.',
    questions: [
      {
        id: 'q1',
        type: 'dropdown',
        layout: 'rows',
        question: 'Classify each item.',
        slots: [
          { id: 'first', label: 'Keyboard' },
          { id: 'second', label: 'Monitor' },
        ],
        options: { first: { A: 'Input', B: 'Output' }, second: { A: 'Input', B: 'Output' } },
        answer: { first: 'A', second: 'B' },
      },
    ],
  },
  {
    id: 'dropdown-inline',
    label: 'Inline dropdown',
    description: 'Include each {{slotId}} exactly once in the template.',
    questions: [
      {
        id: 'q1',
        type: 'dropdown',
        layout: 'inline',
        question: 'Complete the sentence.',
        template: 'Use {{first}} for input and {{second}} for output.',
        slots: [
          { id: 'first', label: 'Input device' },
          { id: 'second', label: 'Output device' },
        ],
        options: {
          first: { A: 'Keyboard', B: 'Monitor' },
          second: { A: 'Keyboard', B: 'Monitor' },
        },
        answer: { first: 'A', second: 'B' },
      },
    ],
  },
];

# Quiz App

## Summary

Quiz App is a React-based certification quiz platform for Cloud, AI, and software testing exams. It provides focused practice sessions, timed mock exams, AI-powered explanations, Firebase-backed authentication and progress tracking, and support for custom quiz files.

Live demo: [https://tuanvipandpro.github.io/quiz-app](https://tuanvipandpro.github.io/quiz-app)

The repository currently includes 15 demo quiz sets:

| Category | Quiz sets |
| --- | --- |
| AWS | Certified Cloud Practitioner (302), Solutions Architect Associate (529), Developer Associate (557), Data Engineer Associate (227) |
| Microsoft | Azure Fundamentals AZ-900 (472), GitHub Copilot GH-300 (115) |
| Google Cloud | Associate Cloud Engineer (302), Professional Cloud Architect (279), Professional Cloud Developer (359), Professional Cloud Data Engineer (139), Generative AI Leader (56) |
| ISTQB | CTFL v4.0 (240), AI Testing (118), Advanced Test Analyst v4.0 (42) |
| Anthropic | Claude Certified Architect Foundations (CCA-F, 175) |

## Features

### Quiz library

- Browse demo quizzes grouped by category.
- Search for a quiz by name.
- Display difficulty and question-count metadata where available.
- Load a custom quiz from a JSON file.
- Validate uploaded quiz data before starting.

### Practice mode

- Answer questions sequentially with immediate feedback.
- Support both single-answer and multiple-answer questions.
- Navigate to previous or next questions.
- Jump directly to a question number.
- Track progress with a progress bar.
- Save a practice checkpoint and resume later for demo quizzes when signed in.
- Request an AI explanation for the current question.

### Exam mode

- Generate an exam from randomly selected questions.
- Choose 50, 60, 70, or 80 questions when the quiz contains enough questions.
- Choose a 60-minute or 120-minute time limit.
- Shuffle answer options for each exam question.
- Flag questions for review.
- Review answers before submitting.
- View detailed results, correct/incorrect counts, percentage score, and pass/fail status.
- Use a passing requirement of more than 80%.
- Request AI explanations for reviewed answers.

### Authentication and AI

- Sign in with Google using Firebase Authentication.
- Store user profiles and practice progress in Firestore.
- Store a user-provided Gemini API key locally, with optional Firestore synchronization for signed-in users.
- Render Gemini explanations with Markdown support and sanitized HTML.
- Keep the core quiz experience usable when the AI service is unavailable.

## Tech Stack

- **React 19** - UI and application state.
- **Vite 6** - Development server and production build tooling.
- **Ant Design 5** - UI components and responsive layouts.
- **Firebase 12** - Google Authentication and Firestore persistence.
- **Google Generative AI SDK** - Gemini-powered explanations.
- **React Markdown** - Markdown rendering for explanations.
- **rehype-raw** and **rehype-sanitize** - Controlled Markdown/HTML rendering.
- **GitHub Pages** - Production hosting.
- **GitHub Actions** - Automated build and deployment.

## Source Structure

```text
quiz-app/
├── public/
│   ├── sample-quiz.json       # Example custom quiz file
│   └── quiz/                  # Built-in quiz question banks
│       ├── AWS/
│       ├── Azure/
│       ├── Google/
│       ├── ISTQB/
│       └── Anthropic/
│
├── src/
│   ├── components/
│   │   ├── ExamMode.jsx       # Timed exam flow and results
│   │   ├── PracticeMode.jsx   # Practice flow and progress checkpoints
│   │   ├── QuizMode.jsx       # Practice/exam mode selection
│   │   ├── Question.jsx       # Question and answer rendering
│   │   ├── SettingsModal.jsx  # Gemini API key settings
│   │   └── UserProfile.jsx    # User profile UI
│   ├── config/
│   │   └── firebase.js        # Firebase initialization
│   ├── contexts/
│   │   └── AuthContext.jsx    # Authentication context
│   ├── hooks/
│   │   └── useAuth.js         # Authentication hook
│   ├── services/
│   │   ├── authService.js     # Authentication operations
│   │   └── userService.js     # Firestore user and progress operations
│   ├── utils/
│   │   └── geminiApi.js       # Gemini API integration
│   ├── App.jsx                # Main application component
│   ├── App.css                # Application styles
│   ├── markdown.css           # Explanation Markdown styles
│   ├── main.jsx               # Application entry point
│   └── style.css              # Global styles
│
├── .github/workflows/
│   └── deploy.yml             # GitHub Pages deployment workflow
├── index.html
├── package.json
└── vite.config.js
```

## Development & Deployment

### Prerequisites

- Node.js 18 or later.
- Yarn 1.x is recommended because the repository includes `yarn.lock`. npm is also supported.
- A Firebase project is required for Google Sign-In and Firestore-backed features.
- A Gemini API key is optional and only required for AI explanations.

### Run locally

```bash
git clone https://github.com/tuanvipandpro/quiz-app.git
cd quiz-app
yarn install
yarn dev
```

Open the local URL printed by Vite, normally `http://localhost:5173/quiz-app/`.

The Firebase project configuration is defined in `src/config/firebase.js`. Replace it with your own Firebase configuration when creating a separate deployment. Enable Google Sign-In and configure Firestore security rules before using authentication features.

### Build and preview

```bash
yarn build
yarn preview
```

The production output is generated in `dist/`.

The Vite base path defaults to `/quiz-app/` for GitHub Pages. Set `VITE_BASE` when deploying under a different path, for example:

```bash
VITE_BASE=/ yarn build
```

### Deploy to GitHub Pages

The repository currently uses `master` as its default branch. A push to `master` triggers `.github/workflows/deploy.yml`, which:

1. Installs dependencies with `yarn install --frozen-lockfile`.
2. Builds the application with `yarn build`.
3. Publishes `dist/` to GitHub Pages using `yarn deploy`.

For a manual deployment:

```bash
yarn build
yarn deploy
```

Keep API keys and other credentials out of source control. Use GitHub Actions secrets for deployment-only values and enter personal Gemini keys through the application settings when appropriate.

### Quiz JSON format

Quiz files must contain an array of question objects. Required fields are `id`, `question`, `options`, and `answer`.

```json
[
  {
    "id": "1",
    "question": "Which option is correct?",
    "options": {
      "A": "First option",
      "B": "Correct option",
      "C": "Third option",
      "D": "Fourth option"
    },
    "answer": ["B"],
    "explanation": "Optional explanation shown by the AI or review UI.",
    "imageUrl": ""
  }
]
```

For multiple-answer questions, include every correct option key in the `answer` array, for example `"answer": ["A", "C"]`.

## Contribute

Contributions are welcome. To propose a change:

1. Fork the repository.
2. Create a focused branch from `master`:

   ```bash
   git checkout -b feature/your-change
   ```

3. Make the change and update documentation when needed.
4. Run `yarn build` and validate any new or changed quiz JSON.
5. Commit using a clear message.
6. Push the branch and open a pull request against `master`.

When adding quiz content:

- Follow the JSON format described above.
- Keep question IDs unique within the source file.
- Verify that every answer key exists in `options`.
- Remove duplicate questions before submitting.
- Preserve explanations and source context where available.
- Do not commit API keys, Firebase credentials, or other secrets.

## License

This project is licensed under the [MIT License](https://opensource.org/licenses/MIT).

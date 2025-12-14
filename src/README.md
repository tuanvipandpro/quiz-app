# Source Code Structure

This document explains the organization of the `src/` directory.

## Directory Overview

```
src/
├── config/              Configuration files
├── services/            Business logic & API services
├── contexts/            React Context providers
├── hooks/               Custom React hooks
├── components/          React UI components
├── utils/               Utility functions
├── App.jsx              Main application component
├── App.css              Application styles
├── main.jsx             Application entry point
├── markdown.css         Markdown styling
└── style.css            Global styles
```

## Detailed Structure

### 📁 `config/` - Configuration
**Purpose**: Application configuration and initialization

Files:
- **`firebase.js`** - Firebase app initialization and auth setup

**When to add files here:**
- API configurations
- Feature flags
- App-wide constants
- Third-party service initialization

---

### 📁 `services/` - Business Logic
**Purpose**: Encapsulate business logic and external API calls

Files:
- **`authService.js`** - Authentication operations (login, logout, etc.)
- **`geminiApi.js`** - Gemini AI API integration

**Pattern**: Singleton services that export methods

**When to add files here:**
- New API integrations
- Complex business logic
- Data transformations
- External service wrappers

---

### 📁 `contexts/` - React Contexts
**Purpose**: Global state management with React Context API

Files:
- **`AuthContext.jsx`** - Authentication state and provider

**Pattern**: Each context exports:
- Context object
- Provider component
- Custom hook (useContextName)

**When to add files here:**
- Global application state
- Cross-component data sharing
- Theme management
- Feature flags state

---

### 📁 `hooks/` - Custom Hooks
**Purpose**: Reusable React hook logic

Files:
- **`useAuth.js`** - Authentication hook (re-exports from AuthContext)

**Pattern**: Functions starting with `use` that leverage React hooks

**When to add files here:**
- Reusable stateful logic
- Form handling
- Data fetching
- Event listeners
- Complex UI logic

---

### 📁 `components/` - React Components
**Purpose**: UI components and pages

Files:
- **`ExamMode.jsx`** - Exam mode with timer and review
- **`PracticeMode.jsx`** - Practice mode with immediate feedback
- **`QuizMode.jsx`** - Quiz mode selection
- **`Question.jsx`** - Question display component
- **`UserProfile.jsx`** - User profile display

**Pattern**: Functional components with hooks

**When to add files here:**
- New UI features
- Reusable UI elements
- Page components
- Form components

---

### 📁 `utils/` - Utilities
**Purpose**: Helper functions and utilities

Files:
- **`geminiApi.js`** - Gemini API utilities (could be moved to services/)

**Pattern**: Pure functions, no side effects

**When to add files here:**
- Data formatting
- Validation functions
- String manipulation
- Date/time helpers
- Array/object utilities

---

### 📄 Root Files

#### `App.jsx`
**Main application component**
- Routing logic
- Layout structure
- Auth integration
- Quiz mode management

#### `main.jsx`
**Application entry point**
- React root initialization
- Provider wrappers (AuthProvider, etc.)
- Global imports

#### Style Files
- `App.css` - App component styles
- `style.css` - Global styles
- `markdown.css` - Markdown content styling

---

## Import Patterns

### Absolute Imports
```javascript
// Config
import { auth } from './config/firebase';

// Services
import authService from './services/authService';

// Contexts
import { useAuth } from './contexts/AuthContext';

// Hooks
import { useAuth } from './hooks/useAuth';

// Components
import ExamMode from './components/ExamMode';

// Utils
import { formatDate } from './utils/helpers';
```

### Best Practices
1. Use absolute paths from `src/`
2. Group imports by type (external, internal, components, styles)
3. Use named exports for utilities
4. Use default exports for components and services

---

## Component Structure Template

```jsx
// 1. Imports
import React, { useState, useEffect } from 'react';
import { Button, Card } from 'antd';
import { useAuth } from '../hooks/useAuth';
import './MyComponent.css';

// 2. Component
/**
 * MyComponent - Description
 * 
 * @param {Object} props - Component props
 * @param {string} props.title - Title to display
 */
function MyComponent({ title, onAction }) {
  // 3. Hooks
  const { user } = useAuth();
  const [state, setState] = useState(null);
  
  // 4. Effects
  useEffect(() => {
    // Effect logic
  }, []);
  
  // 5. Handlers
  const handleClick = () => {
    // Handler logic
  };
  
  // 6. Render
  return (
    <Card title={title}>
      <Button onClick={handleClick}>Action</Button>
    </Card>
  );
}

// 7. Export
export default MyComponent;
```

---

## Service Structure Template

```javascript
// 1. Imports
import { someApi } from './config/api';

// 2. Service Class
/**
 * MyService - Description
 */
class MyService {
  constructor() {
    // Initialize
  }
  
  /**
   * Method description
   * @param {string} param - Parameter description
   * @returns {Promise<Object>} Result
   */
  async myMethod(param) {
    try {
      const result = await someApi.call(param);
      return { success: true, data: result };
    } catch (error) {
      console.error('Error:', error);
      return { success: false, error: error.message };
    }
  }
}

// 3. Export Singleton
export default new MyService();
```

---

## Context Structure Template

```jsx
// 1. Imports
import React, { createContext, useState, useContext, useEffect } from 'react';

// 2. Create Context
const MyContext = createContext(undefined);

// 3. Provider Component
export function MyProvider({ children }) {
  const [state, setState] = useState(null);
  
  // Provider logic
  
  const value = {
    state,
    setState,
    // ... other values
  };
  
  return (
    <MyContext.Provider value={value}>
      {children}
    </MyContext.Provider>
  );
}

// 4. Custom Hook
export function useMyContext() {
  const context = useContext(MyContext);
  
  if (context === undefined) {
    throw new Error('useMyContext must be used within MyProvider');
  }
  
  return context;
}
```

---

## Adding New Features

### Step 1: Plan Structure
Determine which layer(s) your feature needs:
- Config? (API setup, constants)
- Service? (Business logic, API calls)
- Context? (Global state)
- Hook? (Reusable logic)
- Component? (UI)

### Step 2: Create Files
Follow the directory structure and naming conventions

### Step 3: Implement
Use the templates above as starting points

### Step 4: Test
Verify integration with existing code

### Step 5: Document
Add JSDoc comments and update relevant docs

---

## File Naming Conventions

### Components
- PascalCase: `UserProfile.jsx`, `ExamMode.jsx`
- Match component name: `function UserProfile()` in `UserProfile.jsx`

### Services
- camelCase: `authService.js`, `apiService.js`
- Descriptive: name reflects purpose

### Contexts
- PascalCase: `AuthContext.jsx`, `ThemeContext.jsx`
- Suffix with 'Context'

### Hooks
- camelCase: `useAuth.js`, `useLocalStorage.js`
- Prefix with 'use'

### Utils
- camelCase: `formatters.js`, `validators.js`
- Group related functions

### Config
- camelCase: `firebase.js`, `constants.js`
- Descriptive of what's configured

---

## Code Style Guidelines

### React Components
- Use functional components with hooks
- Extract complex logic to custom hooks
- Keep components focused (single responsibility)
- Use prop destructuring
- Add PropTypes or TypeScript types

### State Management
- Use Context for global state
- Use local state for component-specific data
- Lift state up when needed
- Consider performance (useMemo, useCallback)

### Async Operations
- Use async/await over promises
- Handle errors gracefully
- Show loading states
- Provide user feedback

### Error Handling
- Try/catch for async operations
- User-friendly error messages
- Log errors for debugging
- Fail gracefully

---

## Dependencies

### External Libraries Used
- **React** - UI framework
- **React DOM** - DOM rendering
- **Ant Design** - UI component library
- **Firebase** - Authentication & backend
- **React Markdown** - Markdown rendering
- **Vite** - Build tool

### When to Add Dependencies
1. Check if functionality can be built in-house
2. Evaluate bundle size impact
3. Check maintenance status
4. Read documentation
5. Consider alternatives
6. Add to `package.json`

---

## Testing Strategy

### Unit Tests
- Test services independently
- Mock external dependencies
- Test edge cases

### Integration Tests
- Test context providers
- Test hooks with components
- Test data flow

### E2E Tests
- Test user flows
- Test authentication
- Test quiz functionality

---

## Performance Considerations

### Code Splitting
- Lazy load routes/components
- Use React.lazy() and Suspense
- Split vendor bundles

### Optimization
- Memoize expensive calculations
- Use React.memo for pure components
- Optimize re-renders
- Debounce/throttle handlers

### Bundle Size
- Monitor bundle size
- Remove unused code
- Use tree-shaking
- Analyze with bundle analyzer

---

## Security Best Practices

### Sensitive Data
- Never commit secrets
- Use environment variables
- Validate user input
- Sanitize HTML

### Firebase
- Use security rules
- Enable App Check
- Monitor for abuse
- Rate limit requests

### Code
- Avoid XSS vulnerabilities
- Sanitize markdown
- Validate props
- Handle errors safely

---

## Resources

- [React Documentation](https://react.dev/)
- [Ant Design Components](https://ant.design/components/overview/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Vite Guide](https://vitejs.dev/guide/)

---

This structure keeps code organized, maintainable, and scalable. When adding new features, follow these patterns to maintain consistency.

# Settings Feature Documentation

## Overview
The Settings feature allows users to manage their application preferences, primarily the Gemini API key for AI-powered quiz explanations.

## Features

### 1. Settings Menu
- Accessible from user dropdown menu in the header
- Available only for authenticated users
- Icon: ⚙️ (SettingOutlined)

### 2. Gemini API Key Management

#### Purpose
The Gemini API key enables AI-powered explanations for quiz questions using Google's Gemini AI.

#### Features
- **Save API Key**: Store your Gemini API key securely in browser localStorage
- **Load API Key**: Automatically load saved key when opening settings
- **Clear API Key**: Remove stored API key from localStorage
- **Validation**: Warns if trying to save empty key

#### Security
- API key is stored **locally** in browser (localStorage)
- Never sent to any server
- Persists across browser sessions
- Cleared when user clears browser data

## User Flow

### Accessing Settings
1. User logs in with Google
2. Click on avatar/name in header
3. Select "Settings" from dropdown menu
4. Settings modal opens

### Managing API Key
1. Open Settings modal
2. Enter Gemini API key in textarea
3. Click "Save" button
4. Success message appears
5. Modal closes

### Clearing API Key
1. Open Settings modal
2. If API key exists, "Clear API Key" button appears
3. Click "Clear API Key"
4. Confirmation message appears
5. Textarea clears

## Technical Implementation

### File Structure
```
src/
├── components/
│   └── SettingsModal.jsx      # Settings modal component (standalone)
├── utils/
│   └── geminiApi.js           # API key storage utilities
└── App.jsx                    # Main app with settings integration
```

### Integration Points

#### App.jsx
```jsx
import { getApiKey, saveApiKey, hasApiKey, clearApiKey } from './utils/geminiApi';

// States
const [settingsModalVisible, setSettingsModalVisible] = useState(false);
const [apiKeyInput, setApiKeyInput] = useState('');

// Handlers
const handleSettingsClick = () => { ... };
const handleSaveApiKey = () => { ... };
const handleClearApiKey = () => { ... };

// User menu
const userMenuItems = [
  { key: 'settings', icon: <SettingOutlined />, label: 'Settings' }
];
```

#### geminiApi.js
```javascript
// Storage functions
export function getApiKey() { ... }
export function saveApiKey(apiKey) { ... }
export function clearApiKey() { ... }
export function hasApiKey() { ... }
```

### State Management

#### Local State (App.jsx)
- `settingsModalVisible`: Controls modal visibility
- `apiKeyInput`: Stores API key input value

#### Persistent Storage (localStorage)
- Key: `'gemini_api_key'`
- Value: User's Gemini API key (string)

### Lifecycle

#### On Component Mount
```javascript
useEffect(() => {
  const existingKey = getApiKey();
  if (existingKey) {
    setApiKeyInput(existingKey);
  }
}, []);
```

#### On Login
```javascript
const handleGoogleLogin = async () => {
  // ... login logic
  
  // Load API key from localStorage
  const existingKey = getApiKey();
  if (existingKey) {
    setApiKeyInput(existingKey);
  }
};
```

#### On Settings Open
```javascript
const handleSettingsClick = () => {
  const existingKey = getApiKey();
  setApiKeyInput(existingKey || '');
  setSettingsModalVisible(true);
};
```

## UI Components

### Settings Modal
- **Title**: "Settings" with gear icon
- **Width**: 600px
- **Buttons**: 
  - OK: "Save" (saves API key)
  - Cancel: "Cancel" (closes without saving)

### API Key Card
- **Title**: "Gemini API Key" with key icon
- **Content**:
  - Description text
  - Textarea input (3 rows, monospace font)
  - Link to Google AI Studio
  - Clear button (if key exists)
  - Security note (blue info box)

### Future Settings Placeholder
- Gray box with "More settings coming soon..." text
- Ready for additional settings

## User Messages

### Success Messages
- "API key saved successfully!" (on save)
- "Signed out successfully" (on logout - existing)

### Info Messages
- "API key cleared" (on clear)

### Warning Messages
- "Please enter an API key" (on save with empty input)

## Future Enhancements

### Planned Features
1. **Theme Settings**
   - Light/Dark mode toggle
   - Custom color schemes

2. **Quiz Preferences**
   - Default quiz mode
   - Timer preferences
   - Question display options

3. **Notification Settings**
   - Sound effects toggle
   - Success animations
   - Alert preferences

4. **Profile Settings**
   - Display name edit
   - Avatar upload
   - Email preferences

5. **Data Management**
   - Export quiz history
   - Clear local data
   - Import/export settings

6. **API Key from Backend**
   - Store API key in Firestore (encrypted)
   - Sync across devices
   - Team/organization keys

### Code Expansion Points

#### Add New Setting Section
```jsx
<Card 
  title={<Space><IconName /><span>Setting Name</span></Space>}
  size="small"
  style={{ marginBottom: '20px' }}
>
  {/* Setting content */}
</Card>
```

#### Add New State
```javascript
const [newSettingValue, setNewSettingValue] = useState(defaultValue);
```

#### Add Save Handler
```javascript
const handleSaveNewSetting = () => {
  localStorage.setItem('setting_key', newSettingValue);
  message.success('Setting saved!');
};
```

## Best Practices

### Security
- ✅ Store API keys in localStorage only
- ✅ Never log API keys to console
- ✅ Show masked API key display
- ⚠️ Consider encryption for production

### UX
- ✅ Auto-load saved settings
- ✅ Clear success/error messages
- ✅ Prevent accidental data loss
- ✅ Intuitive navigation

### Code Quality
- ✅ Separated concerns (component + utilities)
- ✅ Reusable functions
- ✅ Clear naming conventions
- ✅ Proper error handling

## Testing Checklist

### Manual Testing
- [ ] Open settings modal
- [ ] Enter API key
- [ ] Save API key
- [ ] Close and reopen settings
- [ ] Verify API key persists
- [ ] Clear API key
- [ ] Verify API key cleared
- [ ] Close without saving
- [ ] Verify no changes
- [ ] Logout and login
- [ ] Verify API key persists

### Edge Cases
- [ ] Empty API key save
- [ ] Very long API key
- [ ] Special characters in key
- [ ] Multiple save attempts
- [ ] Clear already cleared key
- [ ] Browser refresh during edit

## Troubleshooting

### API Key Not Saving
1. Check browser localStorage is enabled
2. Check browser console for errors
3. Verify localStorage quota not exceeded
4. Try different browser

### API Key Not Loading
1. Check localStorage for key
2. Verify key exists: `localStorage.getItem('gemini_api_key')`
3. Check console for errors
4. Try clearing and re-saving

### Modal Not Opening
1. Check user is logged in
2. Verify menu item click handler
3. Check console for errors
4. Verify modal state

## API Reference

### geminiApi.js Functions

#### `getApiKey()`
Returns stored API key or null
```javascript
const key = getApiKey();
```

#### `saveApiKey(apiKey)`
Saves API key to localStorage
```javascript
saveApiKey('your-api-key');
```

#### `clearApiKey()`
Removes API key from localStorage
```javascript
clearApiKey();
```

#### `hasApiKey()`
Checks if API key exists
```javascript
if (hasApiKey()) {
  // API key exists
}
```

## Related Documentation
- Firebase Authentication: `FIREBASE_SETUP.md`
- Architecture Overview: `ARCHITECTURE.md`
- Project Structure: `src/README.md`

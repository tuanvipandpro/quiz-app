# Quiz App - Ứng dụng trắc nghiệm chứng chỉ Cloud

Ứng dụng trắc nghiệm được xây dựng bằng React và Ant Design, tập trung vào các chứng chỉ Cloud (AWS, Azure, Google Cloud), hỗ trợ nhiều chế độ học tập, tích hợp AI Gemini để giải thích câu trả lời, và xác thực người dùng với Firebase.

🔗 **Live Demo**: [https://tuanvipandpro.github.io/quiz-app](https://tuanvipandpro.github.io/quiz-app)

## 🌟 Tính năng chính

### 📚 Bộ câu hỏi có sẵn (7 bộ quiz)

#### ☁️ AWS - Amazon Web Services (4 bộ)
- **AWS Certified Cloud Practitioner (CLF-C02)** - ACE
- **AWS Certified Solutions Architect Associate (SAA-C03)** - SAA
- **AWS Certified Developer Associate (DVA-C02)** - DVA
- **AWS Certified Data Engineer Associate (DEA-C01)** - DEA

#### ⚡ Azure - Microsoft Azure (1 bộ)
- **Microsoft Azure Fundamentals (AZ-900)**

#### 🔷 Google Cloud Platform (2 bộ)
- **Google Cloud Associate Cloud Engineer (ACE)**
- **Google Cloud Professional Cloud Architect (PCA)**

### 🎓 Chế độ học tập đa dạng

#### 📖 Practice Mode (Chế độ luyện tập)
- Học từng câu hỏi một, nhận phản hồi ngay lập tức
- Điều hướng tự do giữa các câu hỏi (Previous/Next)
- Nhảy đến câu hỏi bất kỳ với số thứ tự
- Hiển thị đáp án đúng và giải thích sau khi trả lời
- Hỗ trợ cả câu hỏi đơn và đa đáp án
- Progress bar theo dõi tiến độ học tập
- Giải thích AI chi tiết cho từng câu hỏi

#### ⏱️ Exam Mode (Chế độ thi thử)
- Thi thử với 50 câu hỏi ngẫu nhiên từ bộ câu hỏi
- Giới hạn thời gian: **60 phút (1 giờ)** hoặc **120 phút (2 giờ)**
- Timer đếm ngược với cảnh báo thời gian
- Đánh dấu câu hỏi cần xem lại (Flag/Unflag)
- Review tất cả câu trả lời trước khi nộp bài
- Navigation map hiển thị trạng thái từng câu:
  - ✅ Đã trả lời
  - 🚩 Đã đánh dấu (flagged)
  - ⭕ Chưa trả lời
- Kết quả chi tiết: điểm số, số câu đúng/sai
- Xem lại từng câu hỏi với đáp án đúng/sai
- Giải thích AI cho các câu trả lời sai

### 🤖 Tích hợp Google Gemini AI
- **Giải thích thông minh**: Phân tích chi tiết tại sao đáp án đúng
- **Hỗ trợ Markdown**: Hiển thị code, tables, lists với format đẹp mắt
- **Syntax Highlighting**: Highlight code blocks trong giải thích
- **HTML Sanitization**: Bảo mật, tránh XSS attacks
- **API Key Management**: Lưu trữ và quản lý API key bảo mật
- **Error Handling**: Xử lý lỗi graceful khi API không khả dụng

### 🔐 Xác thực Firebase & User Profile
- **Google Sign-In**: Đăng nhập nhanh chóng với tài khoản Google
- **User Profile**: Hiển thị avatar và thông tin người dùng
- **Firestore Integration**: Lưu trữ user profile và settings
- **API Key Sync**: Gemini API key tự động đồng bộ trên mọi thiết bị
- **Session Management**: Quản lý phiên đăng nhập tự động
- **Auto Sync**: Login → Load API key, Logout → Clear tokens

### 📁 Quản lý câu hỏi linh hoạt
- **Upload JSON**: Tải lên file JSON câu hỏi tùy chỉnh
- **Demo Quiz**: 7 bộ quiz chứng chỉ Cloud có sẵn
- **Validation**: Kiểm tra định dạng dữ liệu tự động
- **Support**: Hỗ trợ câu hỏi đơn đáp án và đa đáp án

### 🎯 Giao diện người dùng hiện đại
- **Ant Design 5**: UI components đẹp mắt, chuyên nghiệp
- **Responsive**: Tương thích mọi thiết bị (desktop, tablet, mobile)
- **Dark Mode Support**: Icons và colors tối ưu
- **Progress Tracking**: Thanh tiến độ trực quan
- **Modal Dialogs**: Giải thích AI, settings, login

## 🚀 Cách sử dụng

### 1️⃣ Truy cập ứng dụng
Truy cập: [https://tuanvipandpro.github.io/quiz-app](https://tuanvipandpro.github.io/quiz-app)

### 2️⃣ Chọn Quiz
- Nhấn **"Browse Available Quizzes"** để xem danh sách 7 bộ quiz
- Chọn quiz theo chứng chỉ mong muốn (AWS/Azure/Google Cloud)
- Hoặc nhấn **"Upload Custom Quiz"** để tải lên file JSON riêng

### 3️⃣ Chọn chế độ học tập
- **Practice Mode**: Học từng câu, nhận feedback ngay
- **Exam Mode**: Thi thử 50 câu với giới hạn thời gian (60 hoặc 120 phút)

### 4️⃣ Sử dụng AI Gemini (Tùy chọn)
- Nhấn nút **Settings** (⚙️) trên header
- Nhập **Gemini API Key** của bạn
- Nhấn **"Get AI Explanation"** để nhận giải thích chi tiết

### 5️⃣ Đăng nhập Google (Tùy chọn)
- Nhấn **"Sign In"** trên header
- Chọn tài khoản Google
- **Benefits khi đăng nhập:**
  - ✅ API key tự động sync từ Firestore về localStorage
  - ✅ Sử dụng API key trên mọi thiết bị
  - ✅ User profile được lưu trữ an toàn
  - ✅ Logout tự động clear tokens và API key

## 💻 Cài đặt & Phát triển

### Yêu cầu hệ thống
- **Node.js**: 18.x trở lên
- **Package Manager**: Yarn (recommended) hoặc npm

### Cài đặt dependencies
```bash
# Clone repository
git clone https://github.com/tuanvipandpro/quiz-app.git
cd quiz-app

# Cài đặt packages
yarn install
```

### Cấu hình môi trường

#### Gemini API (Tùy chọn - cho AI Explanation)
Tạo file `.env` trong thư mục gốc:
```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

> **Lấy API Key**: [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey)

#### Firebase Authentication (Tùy chọn - cho Google Sign-In)

**Bước 1: Tạo Firebase Project**
1. Truy cập [Firebase Console](https://console.firebase.google.com/)
2. Tạo project mới hoặc chọn project có sẵn
3. Vào **Authentication** → **Sign-in method** → Enable **Google**

**Bước 2: Tạo Web App**
1. Vào **Project Settings** → **General**
2. Scroll xuống **Your apps** → Click **Web** icon
3. Register app và copy Firebase config

**Bước 3: Cấu hình Firestore**
1. Vào **Firestore Database** → **Create database**
2. Chọn **Start in production mode**
3. Vào **Rules** tab và update rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

**Bước 4: Tạo file .env**
```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-app.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=your-app-id
```

### Chạy ứng dụng
```bash
# Development mode với hot reload
yarn dev

# Build production
yarn build

# Preview production build
yarn preview

# Deploy to GitHub Pages
yarn deploy
```

### Định dạng file JSON câu hỏi
```json
[
  {
    "id": "1",
    "question": "What is Amazon S3?",
    "options": {
      "A": "A compute service",
      "B": "A storage service",
      "C": "A database service",
      "D": "A networking service"
    },
    "answer": ["B"]
  },
  {
    "id": "2",
    "question": "Which services are part of AWS compute? (Select TWO)",
    "options": {
      "A": "Amazon EC2",
      "B": "Amazon S3",
      "C": "AWS Lambda",
      "D": "Amazon RDS"
    },
    "answer": ["A", "C"]
  }
]
```

**Lưu ý**: 
- `answer` phải là array, dù chỉ có 1 đáp án đúng
- Support cả câu hỏi đơn đáp án và đa đáp án

## 🛠️ Công nghệ & Stack

### Frontend Framework
- **React 19.1.0**: Latest React với concurrent features
- **Vite 6.2.0**: Build tool siêu nhanh với HMR
- **React DOM 19.1.0**: React rendering engine

### UI & Design
- **Ant Design 5.27.0**: Enterprise-grade UI components
- **@ant-design/icons 6.0.0**: Icon library đầy đủ
- **@ant-design/v5-patch-for-react-19**: Compatibility patch

### AI & Content
- **Google Generative AI 0.24.0**: Gemini API integration
- **React Markdown 10.1.0**: Markdown renderer
- **rehype-raw 7.0.0**: HTML processing
- **rehype-sanitize 6.0.0**: XSS protection

### Authentication
- **Firebase 12.6.0**: Backend as a Service
  - Firebase Authentication (Google Sign-In)
  - Session management

### Deployment
- **GitHub Pages**: Hosting miễn phí
- **gh-pages 6.3.0**: Deploy automation

## 📁 Cấu trúc dự án

```
quiz-app/
├── public/                      # Static assets
│   ├── sample-quiz.json        # Demo quiz file
│   └── quiz/                   # Quiz JSON files
│       ├── AWS/                # AWS certifications
│       │   ├── AWS-ACE.json   # Cloud Practitioner
│       │   ├── AWS_SAA.json   # Solutions Architect
│       │   ├── AWS_DVA.json   # Developer Associate
│       │   └── AWS_DEA.json   # Data Engineer
│       ├── Azure/
│       │   └── AZ-900.json    # Azure Fundamentals
│       └── Google/
│           ├── GCP-ACE.json   # Associate Cloud Engineer
│           └── GCP-PCA.json   # Professional Cloud Architect
│
├── src/
│   ├── components/             # React components
│   │   ├── ExamMode.jsx       # Exam mode với timer
│   │   ├── PracticeMode.jsx   # Practice mode
│   │   ├── QuizMode.jsx       # Mode selection
│   │   ├── Question.jsx       # Question display
│   │   ├── SettingsModal.jsx  # Settings dialog
│   │   └── UserProfile.jsx    # User profile component
│   │
│   ├── config/
│   │   └── firebase.js        # Firebase configuration
│   │
│   ├── contexts/
│   │   └── AuthContext.jsx    # Auth state management
│   │
│   ├── hooks/
│   │   └── useAuth.js         # Custom auth hook
│   │
│   ├── services/
│   │   └── authService.js     # Authentication logic
│   │
│   ├── utils/
│   │   └── geminiApi.js       # Gemini API wrapper
│   │
│   ├── App.jsx                 # Main application
│   ├── App.css                 # App styles
│   ├── main.jsx               # Entry point
│   ├── style.css              # Global styles
│   └── markdown.css           # Markdown styles
│
├── .env                        # Environment variables
├── vite.config.js             # Vite configuration
├── package.json               # Dependencies
├── index.html                 # HTML template
└── README.md                  # Documentation
```

## ⚙️ Tính năng chi tiết

### 📖 Practice Mode Features
| Feature | Description |
|---------|-------------|
| 🔄 Navigation | Previous/Next buttons, Jump to question number |
| ✅ Instant Feedback | Hiển thị đúng/sai ngay lập tức |
| 📊 Progress Bar | Tracking tiến độ theo % với 2 số thập phân |
| 🤖 AI Explanation | Giải thích chi tiết từ Gemini AI |
| 🔢 Question Counter | Hiển thị câu hiện tại / tổng số câu |
| 🏠 Home Button | Quay lại màn hình chính bất kỳ lúc nào |
| ⚡ Multi-Answer | Support câu hỏi đa đáp án với checkboxes |

### ⏱️ Exam Mode Features
| Feature | Description |
|---------|-------------|
| 🎲 Random 50 Questions | Chọn ngẫu nhiên 50/tổng số câu hỏi |
| ⏰ Timer Options | 60 phút (1h) hoặc 120 phút (2h) |
| ⏱️ Live Countdown | Đếm ngược thời gian thực với giờ:phút:giây |
| 🚩 Flag Questions | Đánh dấu câu cần xem lại |
| 🗺️ Navigation Map | Grid hiển thị trạng thái tất cả câu hỏi |
| 👀 Review Before Submit | Xem lại tất cả câu trả lời |
| 📊 Detailed Results | Điểm số, số câu đúng/sai, % pass |
| 🔍 Review Answers | Xem lại từng câu với đáp án đúng/sai |
| 🤖 AI Explanation | Giải thích cho câu trả lời sai |
| ⚠️ Submit Confirmation | Modal xác nhận trước khi nộp |

### 🤖 AI Integration Features
- **Smart Explanations**: Gemini 1.5 Flash model
- **Markdown Support**: Code blocks, lists, tables, emphasis
- **Syntax Highlighting**: Code với proper formatting
- **Security**: HTML sanitization chống XSS
- **API Key Storage**: LocalStorage với encryption
- **Error Handling**: Graceful fallbacks
- **Loading States**: Spinners và feedback

## 🌐 Deployment & Hosting

### GitHub Pages (Production)
- **URL**: [https://tuanvipandpro.github.io/quiz-app](https://tuanvipandpro.github.io/quiz-app)
- **Branch**: `gh-pages` (auto-deploy)
- **Build**: Vite static build

### Deploy thủ công
```bash
# Build và deploy to GitHub Pages
yarn deploy

# Hoặc tách riêng
yarn build          # Build production
gh-pages -d dist    # Deploy dist folder
```

### Deploy lên platform khác
```bash
# Build production
yarn build

# Upload thư mục dist/ lên:
# - Netlify
# - Vercel
# - AWS S3 + CloudFront
# - Azure Static Web Apps
```

## 📊 Thống kê Repository

- **React 19**: Latest React with concurrent rendering
- **7 Quiz Sets**: AWS (4) + Azure (1) + GCP (2)
- **2 Modes**: Practice + Exam
- **AI-Powered**: Gemini 1.5 Flash integration
- **Firebase Auth**: Google Sign-In ready
- **Mobile-Ready**: Responsive design

## 🤝 Đóng góp

Contributions are welcome! 🎉

### Cách đóng góp
1. **Fork** repository này
2. **Clone** fork về máy: `git clone https://github.com/your-username/quiz-app.git`
3. **Tạo branch** mới: `git checkout -b feature/amazing-feature`
4. **Commit** changes: `git commit -m 'Add some amazing feature'`
5. **Push** to branch: `git push origin feature/amazing-feature`
6. **Tạo Pull Request** với mô tả chi tiết

### Ý tưởng đóng góp
- ➕ Thêm bộ quiz mới (AWS, Azure, GCP certifications)
- 🎨 Cải thiện UI/UX
- 🐛 Fix bugs
- 📝 Cải thiện documentation
- ✨ Thêm features mới (e.g., study progress tracking)
- 🌐 Thêm ngôn ngữ (i18n)

## 📄 License

**MIT License** - Free to use, modify, and distribute.

Copyright (c) 2024 Tuanvipandpro

Xem file [LICENSE](LICENSE) để biết thêm chi tiết.

## 👨‍💻 Tác giả

**Tuanvipandpro**
- GitHub: [@tuanvipandpro](https://github.com/tuanvipandpro)
- Repository: [quiz-app](https://github.com/tuanvipandpro/quiz-app)

## 📞 Hỗ trợ & Liên hệ

### Gặp vấn đề?
- 🐛 [Tạo Issue](https://github.com/tuanvipandpro/quiz-app/issues/new) trên GitHub
- 📖 Đọc [Documentation](#-c%C3%A1ch-s%E1%BB%AD-d%E1%BB%A5ng)
- 💬 Kiểm tra [Closed Issues](https://github.com/tuanvipandpro/quiz-app/issues?q=is%3Aissue+is%3Aclosed)

### FAQ

**Q: Làm sao lấy Gemini API key?**  
A: Truy cập [Google AI Studio](https://aistudio.google.com/apikey) và tạo API key miễn phí.

**Q: Firebase có bắt buộc không?**  
A: Không. Firebase chỉ cần cho Google Sign-In. App vẫn hoạt động bình thường không có Firebase.

**Q: Có thể thêm quiz của riêng mình?**  
A: Có! Nhấn "Upload Custom Quiz" và tải lên file JSON theo [định dạng này](#định-dạng-file-json-câu-hỏi).

**Q: App có hoạt động offline không?**  
A: Một phần. Quiz đã load có thể dùng offline, nhưng AI explanation cần internet.

**Q: Có giới hạn số câu hỏi không?**  
A: Không. Các quiz hiện tại có từ 1000-8000 câu hỏi.

---

<div align="center">

**Quiz App** - Luyện thi chứng chỉ Cloud thông minh với AI! ☁️🎓✨

Made with ❤️ by [Tuanvipandpro](https://github.com/tuanvipandpro)

⭐ **Star this repo** nếu bạn thấy hữu ích!

</div>

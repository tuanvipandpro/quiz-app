# Quiz App - Ứng dụng trắc nghiệm thông minh

Ứng dụng trắc nghiệm được xây dựng bằng React và Ant Design, hỗ trợ nhiều chế độ học tập, tích hợp AI để giải thích câu trả lời, và xác thực người dùng với Firebase.

## 🌟 Tính năng chính

### 🔐 Xác thực người dùng (Mới!)
- **Google Sign-In**: Đăng nhập nhanh chóng với tài khoản Google
- **User Profile**: Hiển thị thông tin người dùng
- **Session Management**: Quản lý phiên đăng nhập tự động
- **Firebase Integration**: Bảo mật và đáng tin cậy

### 📚 Chế độ học tập đa dạng

### 📚 Chế độ học tập đa dạng
- **Practice Mode**: Học từng câu hỏi một, nhận phản hồi ngay lập tức
- **Exam Mode**: Thi thử với 50 câu hỏi ngẫu nhiên, có giới hạn thời gian
- **Timer linh hoạt**: Tùy chọn 1 giờ hoặc 2 giờ cho chế độ thi

### 🤖 Tích hợp AI Gemini
- Giải thích chi tiết câu trả lời đúng
- Hỗ trợ Markdown và code formatting
- Phân tích lý do tại sao đáp án khác sai

### 📁 Quản lý câu hỏi
- Upload file JSON tùy chỉnh
- Hỗ trợ câu hỏi một đáp án và nhiều đáp án
- Demo quiz có sẵn để thử nghiệm
- Validation dữ liệu tự động

### 🎯 Giao diện người dùng
- Thiết kế hiện đại với Ant Design
- Responsive design cho mọi thiết bị
- Navigation dễ dàng giữa các câu hỏi
- Progress tracking trực quan

## 🚀 Cách sử dụng

### 1. Cài đặt Firebase Authentication (Tùy chọn)
Nếu bạn muốn sử dụng tính năng đăng nhập:
```bash
# Xem hướng dẫn nhanh
cat QUICKSTART.md

# Hoặc hướng dẫn chi tiết
cat FIREBASE_SETUP.md
```

### 2. Khởi động ứng dụng
```bash
# Cài đặt dependencies
yarn install

# Chạy development server
yarn dev

# Build production
yarn build
```

### 2. Sử dụng ứng dụng
- **Demo Quiz**: Nhấn "Load Demo Quiz" để sử dụng bộ câu hỏi mẫu
- **Upload File**: Tải lên file JSON chứa câu hỏi của bạn
- **Chọn chế độ**: Practice hoặc Exam tùy theo nhu cầu học tập

### 3. Cấu trúc file JSON
```json
[
  {
    "id": "1",
    "question": "Câu hỏi của bạn",
    "options": {
      "A": "Lựa chọn A",
      "B": "Lựa chọn B",
      "C": "Lựa chọn C",
      "D": "Lựa chọn D"
    },
    "answer": ["A"] // Một đáp án
  },
  {
    "id": "2",
    "question": "Câu hỏi nhiều đáp án",
    "options": {
      "A": "Lựa chọn A",
      "B": "Lựa chọn B",
      "C": "Lựa chọn C",
      "D": "Lựa chọn D"
    },
    "answer": ["A", "C"] // Nhiều đáp án
  }
]
```

## 🛠️ Công nghệ sử dụng

- **Frontend**: React 19, Vite
- **UI Framework**: Ant Design 5
- **Authentication**: Firebase Auth (Google Sign-In)
- **AI Integration**: Google Gemini API
- **Markdown**: React Markdown với sanitization
- **Deployment**: GitHub Pages

## 📁 Cấu trúc dự án

```
src/
├── config/              # Cấu hình (Firebase, etc.)
├── services/           # Business logic (Auth, API)
├── contexts/           # React Context (Auth state)
├── hooks/              # Custom hooks (useAuth)
├── components/         # React components
└── utils/              # Utilities
```

## 🔧 Cài đặt

### Yêu cầu hệ thống
- Node.js 18+ 
- Yarn package manager

### Cài đặt dependencies
```bash
yarn install
```

### Cấu hình API key
Tạo file `.env` trong thư mục gốc:
```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

### Chạy ứng dụng
```bash
# Development mode
yarn dev

# Build production
yarn build

# Preview build
yarn preview

# Deploy to GitHub Pages
yarn deploy
```

## 📱 Tính năng chi tiết

### Practice Mode
- Điều hướng tự do giữa các câu hỏi
- Phản hồi ngay lập tức sau mỗi câu trả lời
- Hỗ trợ câu hỏi một và nhiều đáp án
- Giải thích AI cho mỗi câu hỏi

### Exam Mode
- 50 câu hỏi ngẫu nhiên từ bộ câu hỏi
- Timer countdown với cảnh báo thời gian
- Xem lại tất cả câu trả lời trước khi nộp
- Kết quả chi tiết với số câu đúng/sai

### AI Explanation
- Tích hợp Google Gemini API
- Giải thích chi tiết lý do đáp án đúng
- Hỗ trợ Markdown và code formatting
- Sanitization HTML để bảo mật

## 🌐 Deployment

Ứng dụng được deploy tự động trên GitHub Pages:
- **URL**: https://tuanvipandpro.github.io/quiz-app
- **Branch**: gh-pages
- **Build**: Tự động từ main branch

## 📄 License

MIT License - Xem file [LICENSE](LICENSE) để biết thêm chi tiết.

## 👨‍💻 Tác giả

**Tuanvipandpro** - [GitHub Profile](https://github.com/tuanvipandpro)

## 🤝 Đóng góp

Mọi đóng góp đều được chào đón! Vui lòng:
1. Fork repository
2. Tạo feature branch
3. Commit changes
4. Push to branch
5. Tạo Pull Request

## 📞 Hỗ trợ

Nếu gặp vấn đề hoặc có câu hỏi, vui lòng:
- Tạo issue trên GitHub
- Kiểm tra documentation
- Liên hệ tác giả

---

**Quiz App** - Học tập thông minh với AI! 🎓✨

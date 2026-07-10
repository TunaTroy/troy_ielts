# 🌸 Troy IELTS - IELTS Practice App

Troy IELTS là ứng dụng luyện thi IELTS 4 kỹ năng (Speaking, Writing, Reading, Listening) sử dụng AI để tạo câu hỏi và bài mẫu chất lượng cao.

## ✨ Tính năng

- **🎤 Speaking**: Tạo câu hỏi Part 1, 2, 3 kèm câu trả lời mẫu Band 7-8
- **✍️ Writing**: Tạo bài mẫu cho Task 1 (Academic/General) và Task 2 (Essay)
- **📖 Reading**: Giải đáp câu hỏi Reading với giải thích chi tiết
- **🎧 Listening**: Phân tích transcript và giải đáp câu hỏi Listening
- **📚 History**: Lưu lịch sử luyện tập, đánh dấu yêu thích, và quản lý tiến độ
- **🔐 Authentication**: Đăng ký/đăng nhập với JWT, dữ liệu riêng tư cho từng user
- **🛡️ Security**: Rate limiting, input sanitization, secure headers

## 🛠 Tech Stack

### Backend
- **Node.js** + **Express** - Web framework
- **MongoDB** + **Mongoose** - Database
- **JWT** - Authentication
- **Gemini API** - AI generation (Google)
- **Security**: Helmet, express-rate-limit, express-mongo-sanitize, xss-clean

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool
- **Axios** - HTTP client
- **React Context** - State management

## 📋 Yêu cầu

Trước khi bắt đầu, đảm bảo bạn đã cài đặt:

- **Node.js** (v18 hoặc cao hơn) - [Download tại đây](https://nodejs.org/)
- **MongoDB** (v6.0 hoặc cao hơn) - [Download tại đây](https://www.mongodb.com/try/download/community)
- **npm** (đi kèm với Node.js)

## 🚀 Cài đặt

### 1. Clone dự án

```bash
git clone <repository-url>
cd troy-ielts
```

### 2. Cài đặt MongoDB

#### Windows:
1. Download MongoDB Community Server từ [mongodb.com](https://www.mongodb.com/try/download/community)
2. Chạy installer và chọn "Complete" installation
3. Chọn "Install MongoDB as a Service" (recommended)
4. Chọn "Install MongoDB Compass" (optional but recommended)
5. Hoàn tất installation

#### Sau khi cài MongoDB:
- MongoDB sẽ tự động chạy như một service
- Default connection string: `mongodb://localhost:27017`
- Bạn có thể kiểm tra MongoDB Compass để xem database

### 3. Setup Backend

```bash
cd backend
npm install
```

Tạo file `.env` trong thư mục `backend/`:

```bash
# Copy từ file example
cp .env.example .env
```

Sau đó chỉnh sửa file `.env` với thông tin thực tế:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/troy-ielts

# Gemini API
GEMINI_API_KEY=your_actual_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash-lite

# JWT Secret (generate một chuỗi ngẫu nhiên an toàn)
JWT_SECRET=your_secure_random_string_here

# Frontend URL (cho CORS)
FRONTEND_URL=http://localhost:5173
```

**Lấy Gemini API Key:**
1. Truy cập [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Đăng nhập với Google account
3. Create new API key
4. Copy key vào file `.env`

### 4. Setup Frontend

```bash
cd frontend
npm install
```

## 🏃 Chạy ứng dụng

### Bước 1: Khởi động MongoDB

MongoDB thường tự động chạy sau khi cài. Nếu không:

**Windows:**
```bash
# Mở Command Prompt as Administrator
net start MongoDB
```

Hoặc dùng MongoDB Services trong Windows Services.

Kiểm tra MongoDB đang chạy:
```bash
# Mở MongoDB Compass và kết nối với: mongodb://localhost:27017
```

### Bước 2: Khởi động Backend

Mở terminal mới:

```bash
cd backend
npm run dev
```

Backend sẽ chạy tại `http://localhost:3000`

Bạn sẽ thấy:
```
MongoDB Connected: localhost
Using Gemini model: gemini-2.5-flash-lite (fallback order: gemini-2.5-flash-lite -> gemini-2.5-flash -> gemini-2.0-flash)
Troy IELTS backend running on port 3000
```

### Bước 3: Khởi động Frontend

Mở terminal mới:

```bash
cd frontend
npm run dev
```

Frontend sẽ chạy tại `http://localhost:5173`

Bạn sẽ thấy:
```
VITE v5.x.x ready in xxx ms

➜  Local:   http://localhost:5173/
```

### Bước 4: Sử dụng ứng dụng

1. Mở browser và truy cập `http://localhost:5173`
2. Đăng ký tài khoản mới
3. Đăng nhập với tài khoản vừa tạo
4. Bắt đầu luyện thi với 4 kỹ năng!

## 📁 Cấu trúc dự án

```
troy-ielts/
├── backend/
│   ├── config/
│   │   └── database.js          # MongoDB connection
│   ├── controllers/
│   │   ├── authController.js   # Auth logic
│   │   ├── geminiController.js # AI generation logic
│   │   └── historyController.js # History CRUD
│   ├── middlewares/
│   │   ├── auth.js             # JWT verification
│   │   ├── errorHandler.js     # Error handling
│   │   └── security.js         # Rate limiting, sanitization
│   ├── models/
│   │   ├── User.js             # User schema
│   │   └── History.js         # History schema
│   ├── routes/
│   │   ├── auth.js             # Auth routes
│   │   ├── skills.js           # Skill generation routes
│   │   └── history.js          # History routes
│   ├── utils/
│   │   └── gemini.js           # Gemini API utility
│   ├── .env                    # Environment variables (không commit)
│   ├── .env.example            # Environment template
│   ├── .gitignore
│   ├── package.json
│   └── server.js               # Entry point
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── SpeakingTab.jsx
│   │   │   ├── WritingTab.jsx
│   │   │   ├── ReadingTab.jsx
│   │   │   ├── ListeningTab.jsx
│   │   │   ├── HistoryTab.jsx
│   │   │   └── AuthForm.jsx
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx # Auth state management
│   │   ├── services/
│   │   │   └── api.js          # API calls
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── app.css             # App styles
│   │   └── index.css           # Global styles
│   ├── .gitignore
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## 🔒 Security Features

- **Rate Limiting**: Giới hạn requests để prevent abuse
- **Input Sanitization**: Chống NoSQL injection và XSS
- **JWT Authentication**: Secure token-based auth
- **CORS**: Chỉ cho phép domain frontend được chỉ định
- **Helmet**: Security headers HTTP
- **Environment Variables**: Secrets không được hardcode

## 🐛 Troubleshooting

### MongoDB không kết nối được

**Problem:** `MongoServerError: connect ECONNREFUSED`

**Solution:**
```bash
# Kiểm tra MongoDB service đang chạy
# Windows:
net start MongoDB

# Hoặc khởi động MongoDB thủ công
mongod --dbpath "C:\data\db"
```

### Backend không start được

**Problem:** `GEMINI_API_KEY is not set`

**Solution:**
- Đảm bảo file `.env` tồn tại trong thư mục `backend/`
- Kiểm tra `GEMINI_API_KEY` đã được điền đúng
- Restart backend sau khi chỉnh sửa `.env`

### Frontend không gọi API được

**Problem:** CORS error hoặc network error

**Solution:**
- Đảm bảo backend đang chạy tại port 3000
- Kiểm tra `FRONTEND_URL` trong `.env` đúng là `http://localhost:5173`
- Kiểm tra Vite proxy configuration trong `vite.config.js`

### Gemini API rate limit

**Problem:** `RATE_LIMITED` error

**Solution:**
- Gemini free tier có giới hạn requests (15 RPM / 1000 requests per day)
- Đợi 1-2 phút hoặc upgrade lên paid tier
- App đã có automatic fallback sang các model khác

## 📝 Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `PORT` | Backend port | No | 3000 |
| `NODE_ENV` | Environment | No | development |
| `MONGODB_URI` | MongoDB connection string | Yes | - |
| `GEMINI_API_KEY` | Gemini API key | Yes | - |
| `GEMINI_MODEL` | Gemini model to use | No | gemini-2.5-flash-lite |
| `JWT_SECRET` | JWT signing secret | Yes | - |
| `FRONTEND_URL` | Frontend URL for CORS | Yes | http://localhost:5173 |

## 🚀 Deployment (Tương lai)

Để deploy lên production:

### Backend (Render/Railway/Heroku)
1. Push code lên GitHub
2. Connect repo với platform (Render/Railway)
3. Set environment variables trong platform settings
4. Deploy MongoDB Atlas (cloud database)
5. Update `MONGODB_URI` với Atlas connection string
6. Update `FRONTEND_URL` với production frontend URL

### Frontend (Vercel/Netlify)
1. Push code lên GitHub
2. Connect repo với platform (Vercel/Netlify)
3. Configure build command: `npm run build`
4. Configure output directory: `dist`
5. Set environment variable `VITE_API_URL` nếu cần
6. Deploy

## 📄 License

Dự án này được phát triển cho mục đích học tập.

## 🤝 Contributing

Contributions are welcome! Vui lòng mở issue hoặc pull request.

## 📞 Support

Nếu gặp vấn đề, vui lòng:
1. Kiểm tra Troubleshooting section
2. Đảm bảo đã làm theo đúng hướng dẫn cài đặt
3. Mở issue với mô tả chi tiết lỗi

---

**Happy Learning! 🌸**

# Smart Math Kids

Mini game toán học giúp trẻ em luyện phản ứng nhanh thông qua các bài toán đơn giản.

## Tính năng

- 4 mức độ khó (Dễ, Trung bình, Khó, Siêu khó)
- 4 phép tính: Cộng, Trừ, Nhân, Chia
- Đồng hồ đếm ngược tạo áp lực phản ứng nhanh
- Hiệu ứng animation và haptic feedback
- Lưu kỷ lục điểm cao

## Cài đặt và chạy

### Yêu cầu
- Node.js (>= 18)
- npm hoặc yarn
- Expo Go app trên điện thoại (để test)

### Bước 1: Cài đặt dependencies
```bash
cd "smart math kids"
npm install
```

### Bước 2: Chạy app
```bash
npx expo start
```

### Bước 3: Test trên điện thoại
1. Tải app **Expo Go** từ App Store (iOS) hoặc Google Play (Android)
2. Scan QR code hiển thị trên terminal
3. App sẽ tự động mở trên điện thoại

## Deploy (MIỄN PHÍ)

### Option 1: Chia sẻ qua Expo Go (Nhanh nhất)
```bash
npx expo publish
```
- Sau đó share link cho người dùng
- Họ cần cài Expo Go để chạy

### Option 2: Build APK (Android)
```bash
# Cài EAS CLI
npm install -g eas-cli

# Login Expo
eas login

# Build APK
eas build -p android --profile preview
```
- File APK sẽ được tạo và có thể tải về
- Chia sẻ file APK trực tiếp

### Option 3: Build cho iOS
```bash
eas build -p ios --profile preview
```
- Cần Apple Developer account ($99/năm) để publish lên App Store
- Hoặc dùng TestFlight để test

### Option 4: Web (GitHub Pages - MIỄN PHÍ)
```bash
# Export web
npx expo export:web

# Deploy lên GitHub Pages hoặc Netlify
```

## Chi phí

| Phương thức | Chi phí |
|-------------|---------|
| Expo Go (development) | $0 |
| EAS Build (Free tier) | $0 (30 builds/tháng) |
| GitHub Pages (web) | $0 |
| APK trực tiếp | $0 |
| Google Play Store | $25 (một lần) |
| Apple App Store | $99/năm |

## Cấu trúc project

```
smart-math-kids/
├── App.js                 # Entry point
├── app.json              # Expo config
├── package.json
├── assets/               # Images
├── src/
│   ├── screens/
│   │   ├── HomeScreen.js      # Màn hình chính
│   │   ├── GameScreen.js      # Màn chơi game
│   │   └── ResultScreen.js    # Kết quả
│   ├── utils/
│   │   ├── mathGenerator.js   # Tạo câu hỏi toán
│   │   └── storage.js         # Lưu high score
│   └── constants/
│       └── colors.js          # Bảng màu
```

## Screenshots

Game có giao diện màu sắc tươi sáng, phù hợp với trẻ em:
- Màn hình chính: Chọn độ khó
- Màn game: Hiển thị phép tính + 4 đáp án + timer
- Màn kết quả: Điểm, rank, chi tiết từng câu

## License

MIT

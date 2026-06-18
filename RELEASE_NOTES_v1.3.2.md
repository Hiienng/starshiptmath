# Starship Math — v1.3.2 (versionCode 22)

Tổng hợp toàn bộ thay đổi theo các yêu cầu trong đợt cập nhật này (v1.2.9 → v1.3.2).

## 🛒 Cửa hàng (Store)
- Tăng giá vật phẩm power-up: **Iron Shield 2 → 20**, **Emergency Kit 3 → 30**, **Time Boost 1 → 25** coin (để coin có giá trị, kích thích farm coin).
- Thêm skin tàu mới: **Plasma Cruiser** (60 coin) — skin cao cấp.
- Sửa nhãn ví cho đúng: **"1 ad view = 10 coins"** (khớp với việc cộng 10 coin mỗi lần xem ad).

## 📺 Quảng cáo (Ads)
- **Sửa lỗi interstitial không bao giờ hiện**: thêm `ensureInterstitialLoaded` (load lại khi vào mỗi màn Game/Jupiter/Mars), chống stack request trùng, và `showInterstitial` tự kick load khi chưa sẵn sàng. Trước đây interstitial chỉ load 1 lần duy nhất lúc khởi động → nếu lỗi là mất hẳn.
- **Luật hiện ad mới**:
  - Thua 1 ván → mời quảng cáo.
  - Thắng **2 ván liên tiếp** không chết → mời quảng cáo (trước là 4 ván).
- **Tính năng mới — trả coin để bỏ ad**: khi tới lúc hiện ad, nếu còn **≥ 9 coin** → popup **"Pay 9 — Skip ad / ▶ Watch ad"**; nếu **< 9 coin** → quảng cáo tự bật.
- (v1.2.9) Khôi phục interstitial ở mỗi game-over và sửa nút **"Earn Coin"** ở Store bị kẹt "Ad loading…".

## 🎮 Gameplay
- **Mars (nối số):** sửa lỗi kéo-vẽ đường không hoạt động trên bản production — đổi cách ánh xạ chạm sang `measureInWindow` + đo lại gốc bàn cờ ở đầu mỗi cử chỉ.
- **Jupiter (hứng tile):** sửa lỗi **chạm làn phải lại nhảy sang làn trái** — dùng toạ độ `pageX` tuyệt đối thay cho `locationX`.
- **Jupiter:** giới hạn **thời lượng mỗi ván tối đa 200s** (level 4–12 trước đây 240–360s).

## 🎨 Giao diện (UI)
- **Footer** ở Home/Settings hiện **đúng version** (đọc động từ `app.json`) — hết tình trạng ghi cứng "v1.0.0".
- **Thay nút hamburger góc trái bằng Bottom Navigation Bar**: thanh pill bo tròn nổi ở đáy với 3 tab Home / Store / Settings (icon + label), tab đang chọn được làm nổi.

## 📦 Phiên bản
- `version`: **1.3.2** · `runtimeVersion`: 1.3.2 · `versionCode`: **22**
- Cập nhật ở `app.json` và `android/app/build.gradle`.

---

### Play Console release notes (gợi ý)

**English**
```
- New: spend coins to skip the between-round ad
- Store: new ship skin + rebalanced item prices
- Fixed: Mars draw-the-path not working; Jupiter lane tap landing on the wrong lane
- Jupiter rounds now capped at 200s
- New bottom navigation bar; various ad fixes
```

**Tiếng Việt**
```
- Mới: dùng coin để bỏ qua quảng cáo giữa ván
- Cửa hàng: thêm skin tàu mới + cân bằng lại giá vật phẩm
- Sửa: Mars không vẽ được đường; Jupiter chạm sai làn
- Giới hạn mỗi ván Jupiter còn 200s
- Thêm thanh điều hướng dưới đáy; nhiều sửa lỗi quảng cáo
```

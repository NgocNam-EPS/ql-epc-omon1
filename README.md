# QL EPC Ô Môn I: triển khai lên GitHub Pages + Firebase

Ứng dụng kiểm soát tiến độ & giám sát dự án EPC Ô Môn I (phần việc EPS), bản chạy độc lập:

- **GitHub Pages** phát giao diện web (miễn phí).
- **Firebase Authentication** quản lý đăng nhập 7 tài khoản đơn vị.
- **Cloud Firestore** lưu dữ liệu: mốc, tiến độ L4, cuộc họp, nhật ký, tồn tại.
- **Firebase Storage** lưu file đính kèm. Phần này **tuỳ chọn** và cần gói Blaze. Nếu không bật, ứng dụng cho **gắn link Google Drive/OneDrive** thay cho tải file.

Thời gian làm lần đầu: khoảng 45–60 phút.

---

## Các file trong gói

| File | Dùng để |
|---|---|
| `index.html` | Ứng dụng (giống bản trên Claude, đã nối với Firebase) |
| `firebase-adapter.js` | Cầu nối ứng dụng với Firebase. **Không cần sửa** |
| `firebase-config.js` | **Cấu hình của bạn.** Bước 2 sửa file này |
| `firestore.rules` | Quy tắc phân quyền dữ liệu, dán vào Firebase ở bước 4 |
| `storage.rules` | Quy tắc cho kho file (chỉ khi dùng Storage) |
| `cors.json` | Cho phép xem PDF trực tiếp từ kho file (chỉ khi dùng Storage) |
| `tools/import.html` | Trang nhập dữ liệu một lần |
| `tools/DuLieu_BanDau.json` | Dữ liệu ban đầu: 82 mốc, 6 tồn tại, 141 công việc L4 Rev.4 |

---

## Bước 1. Tạo dự án Firebase

1. Vào <https://console.firebase.google.com>, đăng nhập bằng tài khoản Google (nên dùng tài khoản của phòng, không dùng tài khoản cá nhân).
2. Bấm **Create a project** (Tạo dự án), đặt tên ví dụ `epc-omon1`. Có thể tắt Google Analytics.
3. Trong dự án, bấm biểu tượng **Web `</>`** để thêm ứng dụng web. Đặt tên `QL EPC Ô Môn I` và **không** tick Firebase Hosting.
4. Firebase hiện đoạn `const firebaseConfig = { apiKey: ..., ... }`. Giữ màn hình này để làm bước 2.

## Bước 2. Sửa `firebase-config.js`

Mở file bằng Notepad, thay các giá trị `YOUR_...` bằng giá trị ở bước 1:

```js
window.FIREBASE_CONFIG = {
  apiKey: "AIza....",
  authDomain: "epc-omon1.firebaseapp.com",
  projectId: "epc-omon1",
  storageBucket: "epc-omon1.firebasestorage.app",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abc..."
};
window.APP_OPTIONS = { emailDomain: "epc-omon1.app", useStorage: false };
```

- `useStorage: false`: dùng **gắn link** Google Drive/OneDrive, không cần thẻ thanh toán.
- `useStorage: true`: tải file lên Firebase Storage (làm thêm bước 5).

> Các khoá trong `firebaseConfig` được phép công khai. Dữ liệu được bảo vệ bằng đăng nhập và quy tắc ở bước 4.

## Bước 3. Bật đăng nhập và tạo 7 tài khoản

1. Firebase Console > **Build > Authentication** > **Get started**.
2. Tab **Sign-in method** > **Email/Password** > bật **Enable** > **Save**.
3. Tab **Users** > **Add user**, tạo lần lượt 7 tài khoản. Email phải **đúng y như bảng** vì quyền gắn theo email; mật khẩu tự đặt, tối thiểu 6 ký tự.

| Đơn vị | Tên đăng nhập trên ứng dụng | Email tạo trong Firebase | Quyền |
|---|---|---|---|
| Admin – P.KT-AT | `admin` | `admin@epc-omon1.app` | Sửa tất cả |
| P.KH-VT | `pkhvt` | `pkhvt@epc-omon1.app` | Việc của P.KH-VT |
| PXSCC PM | `pxscc` | `pxscc@epc-omon1.app` | Việc của PXSCC PM |
| PXSCĐ PM | `pxscd` | `pxscd@epc-omon1.app` | Việc của PXSCĐ PM |
| PX GC-PH | `pxgcph` | `pxgcph@epc-omon1.app` | Việc của PX GC-PH |
| P.KD | `pkd` | `pkd@epc-omon1.app` | Việc của P.KD |
| Lãnh đạo | `lanhdao` | `lanhdao@epc-omon1.app` | Chỉ xem |

Người dùng chỉ gõ **tên đăng nhập** (ví dụ `pkhvt`), ứng dụng tự thêm đuôi `@epc-omon1.app`. Email này không cần có thật. Nếu đổi đuôi, sửa `emailDomain` ở bước 2 cho khớp.

**Đặt lại mật khẩu khi có người quên:** trong tab Users, xoá người dùng đó rồi **Add user** lại đúng email với mật khẩu mới. Quyền gắn theo email nên không bị mất.

## Bước 4. Tạo cơ sở dữ liệu Firestore và dán quy tắc

1. **Build > Firestore Database** > **Create database**.
2. Location: chọn **asia-southeast1 (Singapore)** để nhanh nhất từ Việt Nam. Vị trí này **không đổi được** sau khi tạo.
3. Chọn **Start in production mode** > **Create**.
4. Tab **Rules**: xoá hết nội dung cũ, dán toàn bộ nội dung file `firestore.rules`, rồi bấm **Publish**.

Quy tắc này đảm bảo:
- Phải đăng nhập mới xem được.
- Mỗi đơn vị chỉ sửa được tình trạng các việc do đơn vị mình phụ trách.
- Lãnh đạo chỉ xem.
- Chỉ Admin thêm, xoá mốc, ghi cuộc họp và đổi kế hoạch.

Đây là **bảo mật thật**, kiểm tra ở máy chủ Google, không phải chỉ ẩn nút trên giao diện.

## Bước 5 (tuỳ chọn). Bật kho file Firebase Storage

Bỏ qua bước này nếu dùng `useStorage: false`.

1. **Build > Storage** > **Get started**. Firebase yêu cầu nâng lên gói **Blaze** (trả theo mức dùng, cần thẻ thanh toán quốc tế).
   - Gói Blaze vẫn có mức sử dụng miễn phí. Để nằm trong mức miễn phí của Cloud Storage, chọn vùng **US-CENTRAL1, US-EAST1 hoặc US-WEST1** khi tạo bucket.
   - Nên vào **Google Cloud Console > Billing > Budgets & alerts** đặt cảnh báo ngân sách, ví dụ 5 USD/tháng, để không bị bất ngờ.
2. Tab **Rules** của Storage: dán nội dung `storage.rules` > **Publish**.
3. Cho phép xem PDF trực tiếp trong ứng dụng (CORS):
   - Sửa `cors.json`, thay `TEN-GITHUB-CUA-BAN` bằng tên tài khoản GitHub (bước 6).
   - Mở <https://console.cloud.google.com>, chọn đúng dự án, bấm biểu tượng **Cloud Shell** `>_` ở góc trên.
   - Tải `cors.json` lên Cloud Shell (menu ⋮ > Upload), rồi chạy lệnh (thay tên bucket bằng tên ở mục Storage):
     ```
     gsutil cors set cors.json gs://epc-omon1.firebasestorage.app
     ```
4. Trong `firebase-config.js` đổi thành `useStorage: true`.

## Bước 6. Đưa lên GitHub Pages

1. Tạo tài khoản tại <https://github.com> nếu chưa có.
2. Bấm **New repository**:
   - Tên ví dụ `ql-epc-omon1`.
   - Chọn **Public**: gói GitHub miễn phí chỉ bật Pages cho kho công khai, gói trả phí mới dùng được kho Private.
   - Kho công khai thì ai cũng xem được **mã nguồn**, nhưng **không xem được dữ liệu** vì dữ liệu nằm trong Firebase và có đăng nhập.
3. Trong kho vừa tạo: **Add file > Upload files**, kéo thả **toàn bộ** các file của gói, kể cả thư mục `tools`. Không cần đưa `cors.json` lên. Bấm **Commit changes**.
4. **Settings > Pages**: mục *Source* chọn **Deploy from a branch**, Branch **main**, thư mục **/ (root)** > **Save**.
5. Sau 1–2 phút, địa chỉ ứng dụng hiện ở đầu trang: `https://TEN-GITHUB-CUA-BAN.github.io/ql-epc-omon1/`.

## Bước 7. Cho phép tên miền GitHub đăng nhập Firebase

Firebase Console > **Authentication > Settings > Authorized domains** > **Add domain** > nhập `TEN-GITHUB-CUA-BAN.github.io` > **Add**.

Thiếu bước này thì màn hình đăng nhập sẽ báo lỗi `auth/unauthorized-domain`.

## Bước 8. Nhập dữ liệu

**Cách A: chuyển toàn bộ dữ liệu hiện tại từ ứng dụng trên Claude (khuyên dùng)**

1. Mở ứng dụng trên Claude, đăng nhập `admin`, bấm **Sao lưu JSON** trên thanh trên cùng. Máy tải về file `SaoLuu_DuLieu_OMonI_<ngày>.json`.
2. Mở `https://TEN-GITHUB-CUA-BAN.github.io/ql-epc-omon1/tools/import.html`.
3. Đăng nhập `admin` (mật khẩu đặt ở bước 3) > chọn file JSON > **Nhập dữ liệu**.

**Cách B: bắt đầu từ dữ liệu ban đầu.** Làm như cách A nhưng chọn `tools/DuLieu_BanDau.json`.

> **File đính kèm** đã tải lên ứng dụng trên Claude (ví dụ BBH 06.08.2026) **không chuyển sang được**, vì chúng nằm trong kho của Claude. Sau khi nhập, hãy tải lại file đó hoặc gắn link Drive trong ứng dụng mới.

## Bước 9. Kiểm tra

1. Mở `https://TEN-GITHUB-CUA-BAN.github.io/ql-epc-omon1/`.
2. Đăng nhập `admin`: thấy đủ dữ liệu và sửa được mọi mục.
3. Đăng nhập `pkhvt`: chỉ mục của P.KH-VT có nút **Lưu**, mục khác hiện "chỉ xem".
4. Đăng nhập `lanhdao`: không có nút thêm hay sửa, vẫn xem và xuất Excel/Word được.
5. Bấm **Xuất Excel**, **Báo cáo nhanh > Xuất Word**: file tải về thư mục Downloads của máy.

---

## Khác biệt so với bản trên Claude

| Tính năng | Bản Claude | Bản GitHub + Firebase |
|---|---|---|
| Đăng nhập, phân quyền | Mật khẩu trong ứng dụng, chỉ ẩn nút | Firebase Authentication + quy tắc máy chủ (bảo mật thật) |
| Người khác cập nhật được | Chỉ chủ ứng dụng (gói cá nhân) | Mọi đơn vị theo quyền |
| File đính kèm | Tải lên Claude | Firebase Storage (Blaze) hoặc gắn link Drive |
| Trợ lý dự án (chat) | Có | **Không có.** Cần API Anthropic trả phí và một máy chủ trung gian |
| Chi phí | Theo gói Claude | Thường **0 đồng** ở quy mô một dự án (Firestore miễn phí trong hạn mức); Storage theo Blaze |

## Cập nhật ứng dụng sau này

Khi có bản `index.html` mới, vào kho GitHub > bấm vào file `index.html` > biểu tượng ✏️ hoặc **Upload files** để ghi đè > **Commit**. Trang cập nhật sau khoảng 1 phút. Dữ liệu trong Firebase không bị ảnh hưởng.

## Sao lưu dữ liệu

- Hàng tuần: **Xuất Excel** và lưu vào `D:\01_Claude\Claude_QL EPC omon\02_BaoCao_XuatRa`.
- Sao lưu toàn bộ Firestore định kỳ: dùng tính năng **Export** của Firestore (cần Blaze), hoặc nhờ IT thiết lập.

## Xử lý sự cố

| Hiện tượng | Cách xử lý |
|---|---|
| "Chưa cấu hình Firebase" | Chưa sửa `firebase-config.js` hoặc sửa sai cú pháp (thiếu dấu ngoặc kép, dấu phẩy) |
| `auth/unauthorized-domain` | Làm bước 7 |
| "Sai tên đăng nhập hoặc mật khẩu" | Kiểm tra email trong Authentication đúng dạng `tendangnhap@epc-omon1.app` |
| Đăng nhập được nhưng không thấy dữ liệu | Chưa dán `firestore.rules` (bước 4) hoặc chưa nhập dữ liệu (bước 8) |
| "Không có quyền lưu mục này" | Mục do đơn vị khác phụ trách. Admin đổi "Đơn vị thực hiện" nếu giao sai |
| PDF không hiện trong ứng dụng | Chưa cấu hình CORS (bước 5.3). Vẫn bấm "Mở tab mới" để xem được |
| Thay đổi file trên GitHub nhưng trang chưa đổi | Chờ 1–2 phút rồi nhấn Ctrl+F5 |

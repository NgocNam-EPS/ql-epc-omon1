/* =====================================================================
   CẤU HÌNH FIREBASE – sửa file này theo dự án Firebase của bạn
   (Firebase Console > Project settings > General > Your apps > Web app > Config)
   Các khoá này được phép công khai; dữ liệu được bảo vệ bằng đăng nhập
   và quy tắc firestore.rules / storage.rules.
   ===================================================================== */
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyAyeReLAYuUkvNipVHsroV3IH-CDbU9Mp8",
  authDomain: "epc-omon1.firebaseapp.com",
  projectId: "epc-omon1",
  storageBucket: "epc-omon1.firebasestorage.app",
  messagingSenderId: "389825195701",
  appId: "1:389825195701:web:764feb1a5ad0f3dc7f18fc"
};

window.APP_OPTIONS = {
  /* Đuôi email của 7 tài khoản tạo trong Firebase Authentication.
     Tên đăng nhập "pkhvt" sẽ thành email "pkhvt@epc-omon1.app". */
  emailDomain: "epc-omon1.app",
  /* true  = tải file lên Firebase Storage (cần gói Blaze, xem README)
     false = không tải file, chỉ gắn link Google Drive / OneDrive */
  useStorage: false
};

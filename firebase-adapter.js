/* Cầu nối: cung cấp cho ứng dụng các dịch vụ dữ liệu, file, tải về
   giống như khi chạy trên Claude, nhưng dùng Firebase. Không cần sửa. */
const V = "10.12.2", B = "https://www.gstatic.com/firebasejs/" + V + "/";
const none = { use: () => null };
try {
  const cfg = window.FIREBASE_CONFIG || {}, opt = window.APP_OPTIONS || {};
  if (!cfg.apiKey || /YOUR_/.test(cfg.apiKey + cfg.projectId)) throw new Error("CONFIG");
  const { initializeApp } = await import(B + "firebase-app.js");
  const A = await import(B + "firebase-auth.js");
  const F = await import(B + "firebase-firestore.js");
  const app = initializeApp(cfg), auth = A.getAuth(app), fs = F.getFirestore(app);
  let SM = null, storage = null;
  if (opt.useStorage) { SM = await import(B + "firebase-storage.js"); storage = SM.getStorage(app); }

  const CODES = { "permission-denied": "permission_denied", "unauthenticated": "permission_denied", "unavailable": "unavailable",
    "resource-exhausted": "resource_exhausted", "invalid-argument": "invalid_argument" };
  const E = e => ({ code: CODES[e && e.code] || "unavailable", message: (e && e.message) || String(e) });
  const ds = d => ({ id: d.id, exists: d.exists(), data: () => d.data(), metadata: d.metadata });
  const qs = s => ({ docs: s.docs.map(ds), size: s.size, empty: s.empty, metadata: s.metadata, docChanges: () => [] });
  const docRef = (path, id) => {
    const r = id ? F.doc(fs, path, id) : F.doc(F.collection(fs, path));
    return { id: r.id, path: r.path,
      get: () => F.getDoc(r).then(ds, e => { throw E(e); }),
      set: d => F.setDoc(r, d).catch(e => { throw E(e); }),
      update: d => F.updateDoc(r, d).catch(e => { throw E(e); }),
      delete: () => F.deleteDoc(r).catch(e => { throw E(e); }),
      onSnapshot: (n, er) => F.onSnapshot(r, s => n(ds(s)), x => er && er(E(x))) };
  };
  const colRef = path => { const c = F.collection(fs, path); return { path,
    doc: id => docRef(path, id),
    add: d => F.addDoc(c, d).then(r => docRef(path, r.id), e => { throw E(e); }),
    get: () => F.getDocs(c).then(qs, e => { throw E(e); }),
    onSnapshot: (n, er) => F.onSnapshot(c, s => n(qs(s)), x => er && er(E(x))) }; };
  const dbApi = { collection: colRef, doc: p => { const a = p.split("/"); return docRef(a.slice(0, -1).join("/"), a[a.length - 1]); } };

  const SE = e => ({ code: e && e.code === "storage/unauthorized" ? "not_granted" : e && e.code === "storage/quota-exceeded" ? "quota_or_state" : "upstream_error", message: (e && e.message) || String(e) });
  const assetsApi = storage ? {
    upload: async (blob, o) => {
      const safe = (blob.name || "file").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w.\-]+/g, "_").slice(-80);
      const path = "files/" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7) + "_" + safe;
      const r = SM.ref(storage, path);
      let snap; try { snap = await SM.uploadBytes(r, blob, { contentType: (o && o.type) || blob.type }); } catch (e) { throw SE(e); }
      const url = await SM.getDownloadURL(r);
      return { id: path, url, sizeBytes: snap.metadata.size, contentType: snap.metadata.contentType };
    },
    delete: async id => { try { await SM.deleteObject(SM.ref(storage, id)); return { deleted: true }; }
      catch (e) { if (e.code === "storage/object-not-found") return { deleted: false }; throw SE(e); } },
    list: async () => ({ assets: [], usage: {} })
  } : fsAssets();

  /* Lưu file ngay trong Firestore (gói miễn phí): chia file thành các mảnh ≤ 700 KB */
  function fsAssets() {
    const CH = 700 * 1024, MAX = 10 * 1048576;
    const who = () => { const u = auth.currentUser; return u && u.email ? u.email.split("@")[0] : ""; };
    const cache = window.FBBLOBC = {};
    window.FBBLOB = async (id, type) => {
      if (cache[id]) return cache[id];
      try {
        const m = await F.getDoc(F.doc(fs, "blobs", id));
        if (!m.exists()) throw { code: "not_found" };
        const md = m.data(), parts = [];
        for (let i = 0; i < md.n; i++) {
          const c = await F.getDoc(F.doc(fs, "blobs", id, "c", String(i)));
          parts.push(c.data().d.toUint8Array());
        }
        return cache[id] = URL.createObjectURL(new Blob(parts, { type: md.type || type || "application/octet-stream" }));
      } catch (e) { throw e && e.code === "not_found" ? e : E(e); }
    };
    return {
      upload: async (blob, o) => {
        if (blob.size > MAX) throw { code: "too_large" };
        const buf = new Uint8Array(await blob.arrayBuffer()), n = Math.max(1, Math.ceil(buf.length / CH));
        const id = "f" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8), type = (o && o.type) || blob.type || "application/octet-stream";
        try {
          await F.setDoc(F.doc(fs, "blobs", id), { name: blob.name || "file", type, size: buf.length, n, by: who(), at: Date.now() });
          for (let i = 0; i < n; i++)
            await F.setDoc(F.doc(fs, "blobs", id, "c", String(i)), { d: F.Bytes.fromUint8Array(buf.subarray(i * CH, (i + 1) * CH)) });
        } catch (e) { const x = E(e); throw { code: x.code === "permission_denied" ? "not_granted" : x.code === "resource_exhausted" ? "quota_or_state" : x.code, message: x.message }; }
        cache[id] = URL.createObjectURL(blob);
        return { id, sizeBytes: buf.length, contentType: type };
      },
      delete: async id => {
        try {
          const m = await F.getDoc(F.doc(fs, "blobs", id));
          if (!m.exists()) return { deleted: false };
          for (let i = 0; i < (m.data().n || 0); i++) await F.deleteDoc(F.doc(fs, "blobs", id, "c", String(i)));
          await F.deleteDoc(F.doc(fs, "blobs", id)); return { deleted: true };
        } catch (e) { const x = E(e); throw { code: x.code === "permission_denied" ? "not_uploader" : x.code }; }
      },
      list: async () => ({ assets: [], usage: {} })
    };
  }

  const downloadsApi = { save: async ({ filename, data }) => {
    const blob = data instanceof Blob ? data : new Blob([data]);
    const u = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = u; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 5000); return { status: "saved" };
  } };

  const user = await new Promise(res => { const un = A.onAuthStateChanged(auth, u => { un(); res(u); }); });
  window.FBUSER = user;
  window.FB = { domain: opt.emailDomain || "epc-omon1.app",
    signIn: async (email, pw, remember) => { await A.setPersistence(auth, remember ? A.browserLocalPersistence : A.browserSessionPersistence); return A.signInWithEmailAndPassword(auth, email, pw); },
    signOut: () => A.signOut(auth),
    changePw: async (oldPw, newPw) => { const u = auth.currentUser; await A.reauthenticateWithCredential(u, A.EmailAuthProvider.credential(u.email, oldPw)); await A.updatePassword(u, newPw); } };
  const userApi = { id: async () => user ? user.uid : null, can: async () => !!user, isOwner: async () => false, canEdit: async () => !!user,
    me: async () => ({ id: user && user.uid, name: "", email: user && user.email }) };
  window.__fbResolve({ use: n => n === "db" ? (user ? dbApi : null) : n === "assets" ? (user ? assetsApi : null)
    : n === "downloads" ? downloadsApi : n === "user" ? userApi : null });
} catch (e) {
  console.error(e);
  window.__fbError = e && e.message === "CONFIG" ? "Chưa cấu hình Firebase: hãy sửa file firebase-config.js." : "Không khởi động được Firebase: " + ((e && e.message) || e);
  window.__fbResolve(none);
}

// js/login.js
// ================= ログインページ =================

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("login-form");
  const pwInput = document.getElementById("password");
  const errorEl = document.getElementById("login-error");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.textContent = "";

    const pw = pwInput.value;
    if (!pw) {
      errorEl.textContent = "パスワードを入力してください。";
      return;
    }

    try {
      const res = await fetch("/auth-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });

      if (res.status === 204) {
        localStorage.setItem("valoAuthOK", "1");
        location.href = "viewer.html";
      } else if (res.status === 401) {
        errorEl.textContent = "パスワードが違います。";
      } else {
        errorEl.textContent = "サーバーエラーが発生しました。";
      }
    } catch (err) {
      console.error(err);
      errorEl.textContent = "通信エラーが発生しました。";
    }
  });
});

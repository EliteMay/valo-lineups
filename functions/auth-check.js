// Cloudflare Pages Functions: パスワードを確認するだけのミニAPI
// POST /auth-check で { password } を受け取り、OK なら 204、NG なら 401 を返す
export const onRequestPost = async ({ request, env }) => {
  const ADMIN_PASS = env.ADMIN_PASS; // Pages の環境変数で設定
  if (!ADMIN_PASS) return new Response("Server not configured", { status: 500 });

  const ct = request.headers.get("content-type") || "";
  let pw = "";
  if (ct.includes("application/json")) {
    const body = await request.json().catch(()=>({}));
    pw = String(body.password || "");
  } else {
    const form = await request.formData();
    pw = String(form.get("password") || "");
  }

  if (pw !== ADMIN_PASS) {
    return new Response("Unauthorized", { status: 401 });
  }
  return new Response(null, { status: 204 });
};

export const onRequestGet = () =>
  new Response("Method Not Allowed", { status: 405 });

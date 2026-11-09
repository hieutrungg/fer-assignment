import { useState } from "react";
import { Button, Form } from "react-bootstrap";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Brand } from "../components/AppNavbar";
import { ActionError, TextField } from "../components/Page";
import { useAction } from "../hooks";
import { homeFor, useSession } from "../session";

export default function LoginPage() {
  const { session, login } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const action = useAction();
  if (session) return <Navigate to={homeFor(session)} replace />;

  function submit(event) {
    event.preventDefault();
    action.run(async () => {
      const next = await login(email, password);
      navigate(location.state?.from || homeFor(next), { replace: true });
    });
  }

  return (
    <main className="login-shell container">
      <div className="login-panel surface">
        <Brand />
        <h1 className="mt-4">Đăng nhập</h1>
        <p className="text-body-secondary mb-4">Tra từ, ôn flashcard và làm bài với WordQuest.</p>
        <ActionError error={action.error} />
        <Form onSubmit={submit}>
          <fieldset disabled={action.busy}>
            <TextField id="email" label="Email" type="email" autoComplete="username" required
              value={email} onChange={(event) => setEmail(event.target.value)} />
            <TextField id="password" label="Mật khẩu" type="password" autoComplete="current-password" required
              value={password} onChange={(event) => setPassword(event.target.value)} />
            <Button type="submit" className="w-100">{action.busy ? "Đang đăng nhập…" : "Đăng nhập"}</Button>
          </fieldset>
        </Form>
        <div className="demo-note small">
          <strong>Tài khoản demo</strong>
          <div>Giảng viên · teacher@wordquest.test</div>
          <div>Người học · linh@wordquest.test</div>
          <div>Mật khẩu mẫu · <code>wordquest-demo</code></div>
        </div>
      </div>
    </main>
  );
}

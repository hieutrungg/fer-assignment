import { useState } from "react";
import { Button, Container, Nav, Navbar } from "react-bootstrap";
import { FiBookOpen } from "react-icons/fi";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { homeFor, useSession } from "../session";

export function Brand() {
  return <span className="brand"><FiBookOpen aria-hidden="true" /> WordQuest</span>;
}

export default function AppNavbar() {
  const { session, logout } = useSession();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const teacher = session.role === "teacher";
  const links = [
    ["/words", "Từ vựng"], ["/decks", "Flashcard"],
    ...(teacher ? [["/topics", "Chủ đề"], ["/questions", "Câu hỏi"]] : []),
    ["/assignments", "Bài giao"],
    ...(!teacher ? [["/progress", "Tiến độ"]] : []),
  ];

  return (
    <Navbar expand="lg" className="app-nav" expanded={expanded} onToggle={setExpanded}>
      <Container>
        <Navbar.Brand as={Link} to={homeFor(session)} onClick={() => setExpanded(false)}><Brand /></Navbar.Brand>
        <Navbar.Toggle aria-controls="wordquest-nav" aria-expanded={expanded} label="Menu điều hướng" />
        <Navbar.Collapse id="wordquest-nav">
          <Nav className="me-auto" aria-label="Điều hướng chính">
            {links.map(([to, label]) => (
              <Nav.Link key={to} as={NavLink} to={to} onClick={() => setExpanded(false)}>{label}</Nav.Link>
            ))}
          </Nav>
          <div className="nav-account d-flex flex-wrap align-items-center gap-2">
            <span className="small">{session.displayName} · {teacher ? "Giảng viên" : "Người học"}</span>
            <Button variant="outline-secondary" size="sm" onClick={() => {
              logout();
              navigate("/login", { replace: true });
            }}>Đăng xuất</Button>
          </div>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

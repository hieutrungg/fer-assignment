import { BrowserRouter, Link, Navigate, Outlet, Route, Routes } from "react-router-dom";
import AppNavbar from "./components/AppNavbar";
import { PageHeading } from "./components/Page";
import { RequireSession, SessionProvider, homeFor, useSession } from "./session";
import LoginPage from "./pages/LoginPage";
import WordListPage from "./pages/WordListPage";
import WordDetailPage from "./pages/WordDetailPage";
import WordFormPage from "./pages/WordFormPage";
import TopicListPage from "./pages/TopicListPage";
import { DeckDetailPage, DeckFormPage, DeckListPage } from "./pages/DeckPages";
import FlashcardPage from "./pages/FlashcardPage";
import { QuestionFormPage, QuestionListPage } from "./pages/QuestionPages";
import { AssignmentDetailPage, AssignmentFormPage, AssignmentListPage } from "./pages/AssignmentPages";
import QuizPage from "./pages/QuizPage";
import ProgressPage, { QuizHistoryPage } from "./pages/ProgressPage";
import "./App.css";

function Layout() {
  const { session } = useSession();
  return <>
    <AppNavbar key={session.id} />
    <main className="container app-main"><Outlet key={session.id} /></main>
  </>;
}

function Home() {
  const { session } = useSession();
  return <Navigate to={homeFor(session)} replace />;
}

function NotFound() {
  const { session } = useSession();
  return <main className="container app-main">
    <PageHeading title="404 · Không tìm thấy trang" description="Địa chỉ này không có trong WordQuest." />
    <Link to={session ? homeFor(session) : "/login"}>Về trang chính</Link>
  </main>;
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <SessionProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RequireSession />}>
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="/words" element={<WordListPage />} />
              <Route path="/words/:id" element={<WordDetailPage />} />
              <Route path="/decks" element={<DeckListPage />} />
              <Route path="/decks/:id" element={<DeckDetailPage />} />
              <Route path="/assignments" element={<AssignmentListPage />} />
              <Route element={<RequireSession role="teacher" />}>
                <Route path="/words/new" element={<WordFormPage />} />
                <Route path="/words/:id/edit" element={<WordFormPage />} />
                <Route path="/topics" element={<TopicListPage />} />
                <Route path="/decks/new" element={<DeckFormPage />} />
                <Route path="/decks/:id/edit" element={<DeckFormPage />} />
                <Route path="/questions" element={<QuestionListPage />} />
                <Route path="/questions/new" element={<QuestionFormPage />} />
                <Route path="/questions/:id/edit" element={<QuestionFormPage />} />
                <Route path="/assignments/new" element={<AssignmentFormPage />} />
                <Route path="/assignments/:id" element={<AssignmentDetailPage />} />
                <Route path="/assignments/:id/edit" element={<AssignmentFormPage />} />
              </Route>
              <Route element={<RequireSession role="learner" />}>
                <Route path="/decks/:id/review" element={<FlashcardPage />} />
                <Route path="/decks/:id/quiz" element={<QuizPage />} />
                <Route path="/assignments/:id/quiz" element={<QuizPage assigned />} />
                <Route path="/progress" element={<ProgressPage />} />
                <Route path="/progress/quiz/:id" element={<QuizHistoryPage />} />
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </SessionProvider>
    </BrowserRouter>
  );
}

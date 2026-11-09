import { useState } from "react";
import { Button, Col, Form, Row, Table } from "react-bootstrap";
import { Link, useParams } from "react-router-dom";
import { DataState, Empty, PageHeading } from "../components/Page";
import { useData } from "../hooks";
import { useSession } from "../session";
import { dateTime, localInput } from "../dates";
import { listDecks } from "../services/deckService";
import { getStudyHistory } from "../services/studyService";
import { get, requireRule } from "../services/api";
import { score } from "../services/quizService";
import { listWords } from "../services/wordService";
import { QuizResult } from "./QuizPage";

function ProgressContent({ data }) {
  const [{ logs, progress, attempts }, decks, words] = data;
  const [deckId, setDeckId] = useState("");
  const [date, setDate] = useState("");
  const [result, setResult] = useState("");
  const deckNames = new Map(decks.map((deck) => [deck.id, deck.name]));
  const wordNames = new Map(words.map((word) => [word.id, word.word]));
  const mastered = progress.filter((item) => item.status === "mastered");
  const favorites = progress.filter((item) => item.isFavorite);
  const filtered = logs.filter((log) =>
    (!deckId || log.deckId === deckId) && (!result || log.result === result) &&
    (!date || localInput(log.reviewedAt).slice(0, 10) === date)
  );
  const remembered = filtered.filter((log) => log.result === "remembered").length;
  const rate = filtered.length ? Math.round(100 * remembered / filtered.length) : 0;

  return (
    <>
      <Row className="g-4 mb-4">
        <Col md={6}>
          <h2 className="h5">Từ đã thuộc <span className="stat-count">{mastered.length}</span></h2>
          {mastered.length ? <WordLinks items={mastered} names={wordNames} /> :
            <Empty>Chưa có từ đã thuộc. Ôn flashcard và chọn Nhớ để bắt đầu.</Empty>}
        </Col>
        <Col md={6}>
          <h2 className="h5">Từ yêu thích <span className="stat-count">{favorites.length}</span></h2>
          {favorites.length ? <WordLinks items={favorites} names={wordNames} /> :
            <Empty>Mở chi tiết từ để thêm vào yêu thích.</Empty>}
        </Col>
      </Row>
      <section className="mb-4">
        <h2 className="h5">Lịch sử quiz</h2>
        {!attempts.length ? <Empty>Bạn chưa nộp quiz nào.</Empty> :
          <Table responsive className="surface">
            <thead><tr><th scope="col">Bộ flashcard</th><th scope="col">Loại quiz</th><th scope="col">Đã nộp</th><th scope="col" className="text-end">Điểm</th></tr></thead>
            <tbody>{attempts.map((attempt) => {
              const { correct, total, percent } = score(attempt);
              return <tr key={attempt.id}>
                <td><Link to={`/progress/quiz/${attempt.id}`}>{deckNames.get(attempt.deckId) || "Kết quả quiz"}</Link></td>
                <td className="text-nowrap">{attempt.assignmentId ? "Bài giao" : "Tự luyện"}</td>
                <td><time dateTime={attempt.completedAt}>{dateTime(attempt.completedAt)}</time></td>
                <td className="text-end text-nowrap">{correct}/{total} ({percent}%)</td>
              </tr>;
            })}</tbody>
          </Table>}
      </section>
      <section>
        <h2 className="h5">Nhật ký ôn</h2>
        <Row className="g-2 align-items-end mb-3">
          <Col sm={5}><Form.Group controlId="log-deck">
            <Form.Label>Bộ flashcard</Form.Label>
            <Form.Select value={deckId} onChange={(e) => setDeckId(e.target.value)}>
              <option value="">Tất cả bộ</option>
              {decks.map((deck) => <option key={deck.id} value={deck.id}>{deck.name}</option>)}
            </Form.Select>
          </Form.Group></Col>
          <Col sm={3}><Form.Group controlId="log-date">
            <Form.Label>Ngày ôn</Form.Label>
            <Form.Control type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Form.Group></Col>
          <Col sm={2}><Form.Group controlId="log-result">
            <Form.Label>Kết quả</Form.Label>
            <Form.Select value={result} onChange={(e) => setResult(e.target.value)}>
              <option value="">Tất cả</option><option value="remembered">Nhớ</option><option value="forgot">Quên</option>
            </Form.Select>
          </Form.Group></Col>
          <Col sm="auto"><Button variant="outline-secondary" disabled={!deckId && !date && !result}
            onClick={() => { setDeckId(""); setDate(""); setResult(""); }}>Xóa bộ lọc</Button></Col>
        </Row>
        <p aria-live="polite">Tỷ lệ nhớ <strong>{rate}%</strong> ({remembered}/{filtered.length} lượt)</p>
        {!filtered.length ? <Empty>Chưa có lượt ôn trong phạm vi này.</Empty> :
          <Table responsive className="surface">
            <thead><tr><th scope="col">Từ</th><th scope="col">Bộ flashcard</th><th scope="col">Ngày ôn</th><th scope="col">Kết quả</th></tr></thead>
            <tbody>{filtered.map((log) => <tr key={log.id}>
              <td lang="en">{wordNames.get(log.wordId) || "—"}</td><td>{deckNames.get(log.deckId) || "—"}</td>
              <td><time dateTime={log.reviewedAt}>{dateTime(log.reviewedAt)}</time></td>
              <td>{log.result === "remembered" ? "Nhớ" : "Quên"}</td>
            </tr>)}</tbody>
          </Table>}
      </section>
    </>
  );
}

function WordLinks({ items, names }) {
  return <ul className="list-inline mb-0">
    {items.map(({ wordId }) => <li key={wordId} className="list-inline-item mb-1">
      <Link className="word-link" to={`/words/${wordId}`} lang="en">{names.get(wordId) || "—"}</Link>
    </li>)}
  </ul>;
}

export default function ProgressPage() {
  const { session } = useSession();
  const { learnerId } = session;
  const state = useData(() => Promise.all([getStudyHistory(learnerId), listDecks({ includeArchived: true }), listWords()]), learnerId);
  return (
    <>
      <PageHeading title="Tiến độ của tôi" description="Theo dõi từ đã học, điểm quiz và các lượt ôn." />
      <DataState state={state} />
      {state.data && <ProgressContent key={learnerId} data={state.data} />}
    </>
  );
}

export function QuizHistoryPage() {
  const { id } = useParams();
  const { session } = useSession();
  const state = useData(async () => {
    const attempt = await get("quizAttempts", id);
    requireRule(attempt.learnerId === session.learnerId, "Bạn chỉ có thể xem kết quả quiz của mình.");
    return attempt;
  }, `${session.learnerId}:${id}`);
  return (
    <>
      <Link className="back-link" to="/progress">Về tiến độ</Link>
      <PageHeading title="Lịch sử quiz" />
      <DataState state={state} />
      {state.data && <QuizResult result={state.data} />}
    </>
  );
}

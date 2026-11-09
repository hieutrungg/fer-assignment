import { useState } from "react";
import { Badge, Button, Col, Form, Row, Table } from "react-bootstrap";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ActionError, DataState, Empty, PageHeading, TextField } from "../components/Page";
import { useAction, useData } from "../hooks";
import { useSession } from "../session";
import { listDecks, listLearners } from "../services/deckService";
import {
  assignmentAttempts, canSubmit, closeAssignment, getAssignment, listAssignments, listAttempts,
  listQuestions, pastDue, questionsForDeck, saveAssignment, score, visibleAssignment,
} from "../services/quizService";
import { dateTime, localInput } from "../dates";

const teacherStatus = {
  DRAFT: ["Bản nháp", "secondary"], PUBLISHED: ["Đã giao", "primary"], CLOSED: ["Đã đóng", "dark"],
};

function learnerStatus(assignment, attempt) {
  if (attempt) return ["Đã nộp", "success"];
  if (pastDue(assignment)) return ["Quá hạn", "danger"];
  return ["Chưa nộp", "secondary"];
}

export function AssignmentListPage() {
  const { session } = useSession();
  const teacher = session.role === "teacher";
  const state = useData(() => Promise.all([listAssignments(), listDecks(), listAttempts()]), session.id);
  const [assignments, decks, attempts] = state.data || [[], [], []];
  const visible = assignments.filter((item) => teacher || visibleAssignment(item, session.learnerId));

  return (
    <>
      <PageHeading title={teacher ? "Bài giao" : "Bài giao của tôi"}
        description={teacher ? "Giao quiz và theo dõi lượt nộp của người học." : "Xem hạn nộp và kết quả các bài được giao."}>
        {teacher && <Link to="/assignments/new" className="btn btn-primary">Tạo bài giao</Link>}
      </PageHeading>
      <DataState state={state} />
      {state.data && (!visible.length ? <Empty>{teacher ? "Chưa có bài giao." : "Bạn chưa được giao bài quiz nào."}</Empty> :
        <div className="list-group">
          {visible.map((assignment) => {
            const submitted = assignmentAttempts(attempts, assignment.id);
            const attempt = submitted.find((item) => item.learnerId === session.learnerId);
            const [status, variant] = teacher ? teacherStatus[assignment.status] : learnerStatus(assignment, attempt);
            const to = `/assignments/${assignment.id}${teacher ? "" : "/quiz"}`;
            const accessible = teacher || attempt || canSubmit(assignment);
            return (
              <article key={assignment.id} className="list-group-item item-row">
                <div>
                  <h2 className="h5 mb-1 text-break">{accessible ? <Link to={to}>{assignment.title}</Link> : assignment.title}</h2>
                  <p className="small text-body-secondary mb-1">
                    {decks.find((deck) => deck.id === assignment.deckId)?.name || "—"} · {assignment.questionIds.length} câu
                  </p>
                  <p className="small text-body-secondary mb-0">Hạn nộp {dateTime(assignment.dueAt)}</p>
                </div>
                <div className="d-flex flex-wrap align-items-center gap-2">
                  <Badge bg={variant}>{status}</Badge>
                  {teacher && <span className="small">{submitted.length}/{assignment.learnerIds.length} đã nộp</span>}
                  {!teacher && assignment.status === "CLOSED" && <Badge bg="dark">Đã đóng</Badge>}
                  {!teacher && accessible && <Link to={to} className="btn btn-outline-primary btn-sm">
                    {attempt ? "Xem kết quả" : "Làm bài"}
                  </Link>}
                </div>
              </article>
            );
          })}
        </div>)}
    </>
  );
}

function AssignmentForm({ assignment, decks, questions, learners, locked, teacherId }) {
  const [form, setForm] = useState({
    title: assignment?.title || "", deckId: assignment?.deckId || "",
    questionIds: assignment?.questionIds || [], learnerIds: assignment?.learnerIds || [],
    dueAt: localInput(assignment?.dueAt || new Date(Date.now() + 7 * 86400000)),
  });
  const action = useAction();
  const navigate = useNavigate();
  const published = assignment?.status === "PUBLISHED";
  const available = questionsForDeck(questions, decks.find((deck) => deck.id === form.deckId));

  function changeChecked(field, id, checked) {
    setForm({
      ...form, [field]: checked ? [...form[field], id] : form[field].filter((value) => value !== id),
    });
  }

  return (
    <Form className="surface form-panel" onSubmit={(event) => {
      event.preventDefault();
      const status = published ? "PUBLISHED" : event.nativeEvent.submitter?.value || "DRAFT";
      action.run(async () => {
        const date = new Date(form.dueAt);
        const saved = await saveAssignment(assignment?.id, teacherId, {
          ...form, title: form.title.trim(), dueAt: Number.isFinite(date.getTime()) ? date.toISOString() : "",
        }, status);
        navigate(`/assignments/${saved.id}`);
      });
    }}>
      <ActionError error={action.error} />
      {locked && <p role="status">Bài đã có lượt nộp. Bộ flashcard, câu hỏi và người nhận đã được khóa.</p>}
      <fieldset disabled={action.busy}>
        <TextField id="assignment-title" label="Tên bài giao" required value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <Form.Group controlId="assignment-deck" className="mb-3">
          <Form.Label>Bộ flashcard</Form.Label>
          <Form.Select disabled={locked} required value={form.deckId}
            onChange={(e) => setForm({ ...form, deckId: e.target.value, questionIds: [] })}>
            <option value="">Chọn bộ flashcard</option>
            {decks.map((deck) => <option key={deck.id} value={deck.id}>{deck.name}</option>)}
          </Form.Select>
        </Form.Group>
        <TextField id="assignment-due" label="Hạn nộp (giờ trên thiết bị)" type="datetime-local" required value={form.dueAt}
          onChange={(e) => setForm({ ...form, dueAt: e.target.value })} />
        <Row>
          <Col md={7}><fieldset className="mb-4" disabled={locked}>
            <legend className="h6">Câu hỏi</legend>
            {!available.length && <p className="text-body-secondary">
              {form.deckId ? "Bộ này chưa có câu hỏi. Hãy thêm câu hỏi cho từ trong bộ." : "Chọn bộ để thấy câu hỏi."}
            </p>}
            <div className="choice-list">{available.map((question) => <Form.Check key={question.id}
              id={`assignment-question-${question.id}`} label={question.prompt}
              checked={form.questionIds.includes(question.id)}
              onChange={(e) => changeChecked("questionIds", question.id, e.target.checked)} />)}</div>
          </fieldset></Col>
          <Col md={5}><fieldset className="mb-4" disabled={locked}>
            <legend className="h6">Người nhận</legend>
            {!learners.length && <p className="text-body-secondary">Chưa có hồ sơ người học.</p>}
            <div className="choice-list">{learners.map((learner) => <Form.Check key={learner.id}
              id={`recipient-${learner.id}`} label={learner.displayName}
              checked={form.learnerIds.includes(learner.id)}
              onChange={(e) => changeChecked("learnerIds", learner.id, e.target.checked)} />)}</div>
          </fieldset></Col>
        </Row>
        <div className="d-flex flex-wrap gap-2">
          {published ? <Button type="submit">{action.busy ? "Đang lưu…" : "Lưu thay đổi"}</Button> : <>
            <Button type="submit" value="DRAFT" variant="outline-primary">Lưu nháp</Button>
            <Button type="submit" value="PUBLISHED">Giao bài</Button>
          </>}
          <Link to={assignment ? `/assignments/${assignment.id}` : "/assignments"} className="btn btn-outline-secondary">Hủy</Link>
        </div>
        {action.busy && !published && <p role="status" className="mt-2 mb-0">Đang lưu…</p>}
      </fieldset>
    </Form>
  );
}

export function AssignmentFormPage() {
  const { id } = useParams();
  const { session } = useSession();
  const state = useData(() => Promise.all([
    id ? getAssignment(id) : null, listDecks(), listQuestions(), listLearners(), id ? listAttempts() : [],
  ]), id);
  const [assignment, decks, questions, learners, attempts] = state.data || [];
  return (
    <>
      <PageHeading title={id ? "Sửa bài giao" : "Tạo bài giao"} />
      <DataState state={state} />
      {state.data && (assignment?.status === "CLOSED" ? <Empty>Bài giao đã đóng.</Empty> :
        <AssignmentForm key={id || "new"} assignment={assignment} decks={decks} questions={questions}
          learners={learners} locked={!!assignmentAttempts(attempts, id).length && !!id} teacherId={session.id} />)}
    </>
  );
}

export function AssignmentDetailPage() {
  const { id } = useParams();
  const state = useData(() => Promise.all([getAssignment(id), listAttempts(), listLearners(), listDecks(), listQuestions()]), id);
  const action = useAction();
  if (!state.data) return <DataState state={state} />;
  const [assignment, attempts, learners, decks, questions] = state.data;
  const submitted = assignmentAttempts(attempts, id);
  const [status, variant] = teacherStatus[assignment.status];

  return (
    <>
      <Link className="back-link" to="/assignments">Về bài giao</Link>
      <PageHeading title={assignment.title}
        description={`${decks.find((deck) => deck.id === assignment.deckId)?.name || "—"} · Hạn nộp ${dateTime(assignment.dueAt)}`}>
        <Badge bg={variant}>{status}</Badge>
      </PageHeading>
      <ActionError error={action.error} />
      <div className="d-flex flex-wrap gap-2 mb-4">
        {assignment.status !== "CLOSED" && <Link to={`/assignments/${id}/edit`} className="btn btn-primary">
          {assignment.status === "DRAFT" ? "Sửa nháp hoặc giao bài" : "Sửa bài giao"}
        </Link>}
        {assignment.status === "PUBLISHED" && <Button variant="outline-danger" disabled={action.busy}
          onClick={() => action.run(async () => { await closeAssignment(id); state.reload(); })}>
          {action.busy ? "Đang đóng…" : "Đóng bài"}
        </Button>}
      </div>
      <h2 className="h5">Lượt nộp ({submitted.length}/{assignment.learnerIds.length})</h2>
      {!assignment.learnerIds.length ? <Empty>Bài chưa có người nhận.</Empty> :
        <Table responsive className="surface">
          <thead><tr><th scope="col">Người học</th><th scope="col">Trạng thái</th><th scope="col">Thời điểm nộp</th><th scope="col" className="text-end">Điểm</th></tr></thead>
          <tbody>{assignment.learnerIds.map((learnerId) => {
            const attempt = submitted.find((item) => item.learnerId === learnerId);
            const points = attempt && score(attempt);
            return <tr key={learnerId}>
              <td>{learners.find((learner) => learner.id === learnerId)?.displayName || "—"}</td>
              <td>{attempt ? "Đã nộp" : "Chưa nộp"}</td>
              <td>{attempt ? dateTime(attempt.completedAt) : "—"}</td>
              <td className="text-end text-nowrap">{points ? `${points.correct}/${points.total} (${points.percent}%)` : "—"}</td>
            </tr>;
          })}</tbody>
        </Table>}
      <h2 className="h5 mt-4">Câu hỏi ({assignment.questionIds.length})</h2>
      <ol className="question-outline">{assignment.questionIds.map((id) => (
        <li key={id}>{questions.find((question) => question.id === id)?.prompt || "—"}</li>
      ))}</ol>
    </>
  );
}

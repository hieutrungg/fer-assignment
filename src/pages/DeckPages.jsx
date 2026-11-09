import { useState } from "react";
import { Badge, Button, Col, Form, Row, Table } from "react-bootstrap";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ActionError, DataState, Empty, PageHeading, TextField } from "../components/Page";
import ConfirmDelete from "../components/ConfirmDelete";
import DeckCards from "../components/DeckCards";
import { cardRecords, resolveCards } from "../flashcards";
import { useAction, useData } from "../hooks";
import { useSession } from "../session";
import { changeMembership, deleteDeck, getDeck, isJoined, listDecks, listLearners, saveDeck } from "../services/deckService";
import { listTopics, listWords } from "../services/wordService";

const labelFor = (items, id, key) => items.find((item) => item.id === id)?.[key] || "—";

function DeckStatus({ status }) {
  return <Badge bg={status === "OPEN" ? "success" : "secondary"}>{status === "OPEN" ? "OPEN · Đang mở" : "CLOSED · Đã đóng"}</Badge>;
}

export function DeckListPage() {
  const { session } = useSession();
  const state = useData(() => Promise.all([listDecks(), listTopics()]));
  const [decks, topics] = state.data || [[], []];

  return (
    <>
      <PageHeading title="Bộ flashcard" description="Chọn một bộ để xem từ và thành viên.">
        {session.role === "teacher" && <Link to="/decks/new" className="btn btn-primary">Tạo bộ</Link>}
      </PageHeading>
      <DataState state={state} />
      {state.data && (!decks.length ? <Empty>Chưa có bộ flashcard.</Empty> : (
        <div className="list-group">
          {decks.map((deck) => (
            <article key={deck.id} className="list-group-item item-row">
              <div>
                <h2 className="h5 mb-1"><Link to={`/decks/${deck.id}`}>{deck.name}</Link></h2>
                <p className="small text-body-secondary mb-0">
                  {deck.topicId && <>{labelFor(topics, deck.topicId, "name")} · </>}
                  {cardRecords(deck).length} thẻ · {deck.members.filter((member) => member.status === "joined").length} thành viên
                </p>
                {deck.description && <p className="mb-0 mt-1">{deck.description}</p>}
              </div>
              <DeckStatus status={deck.status} />
            </article>
          ))}
        </div>
      ))}
    </>
  );
}

export function DeckDetailPage() {
  const { id } = useParams();
  const { session } = useSession();
  const navigate = useNavigate();
  const state = useData(() => Promise.all([getDeck(id), listTopics(), listWords(), listLearners()]), id);
  const action = useAction();
  const [deleting, setDeleting] = useState(false);
  if (!state.data) return <DataState state={state} />;
  const [deck, topics, words, learners] = state.data;
  const learner = learners.find((item) => item.id === session.learnerId);
  const joined = learner && isJoined(deck, learner.id);
  const active = learner?.status === "ACTIVE";
  const open = deck.status === "OPEN";
  const teacher = session.role === "teacher";

  return (
    <>
      <Link className="back-link" to="/decks">Về bộ flashcard</Link>
      <PageHeading title={deck.name} description={deck.topicId ? labelFor(topics, deck.topicId, "name") : deck.description}>
        <DeckStatus status={deck.status} />
      </PageHeading>
      {deck.topicId && deck.description && <p className="card-definition">{deck.description}</p>}
      <ActionError error={action.error} />
      <div className="d-flex flex-wrap gap-2 mb-4">
        {teacher && <>
          <Link to={`/decks/${id}/edit`} className="btn btn-primary">Sửa bộ và thành viên</Link>
          <Button variant="outline-danger" onClick={() => setDeleting(true)}>Xóa bộ</Button>
        </>}
        {learner && open && (joined || active) && <>
          {joined && active && <Link to={`/decks/${id}/review`} className="btn btn-primary">Ôn flashcard</Link>}
          {active && deck.wordIds.length > 0 && <Link to={`/decks/${id}/quiz`} className="btn btn-outline-primary">Quiz tự luyện</Link>}
          <Button variant="outline-secondary" disabled={action.busy} onClick={() => action.run(async () => {
            await changeMembership(id, learner.id, joined ? "left" : "joined");
            state.reload();
          })}>{action.busy ? "Đang lưu…" : joined ? "Rời bộ" : "Tham gia bộ"}</Button>
        </>}
      </div>
      {learner && !active && <p className="text-body-secondary">Hồ sơ người học đang ngừng hoạt động.</p>}
      {active && open && !joined && <p className="text-body-secondary">Tham gia bộ để ghi lượt ôn flashcard.</p>}
      <Row className="g-4">
        <Col md={7}>
          <DeckCards deckId={id} cards={resolveCards(deck, words)} teacher={teacher} reload={state.reload} />
        </Col>
        <Col md={5}>
          <h2 className="h5">Thành viên ({deck.members.filter((item) => item.status === "joined").length} đang tham gia)</h2>
          {!deck.members.length ? <Empty>Bộ này chưa có thành viên.</Empty> :
            <Table responsive className="surface">
              <thead><tr><th scope="col">Người học</th><th scope="col">Trạng thái</th></tr></thead>
              <tbody>{deck.members.map((item) => <tr key={item.learnerId}>
                <td>{labelFor(learners, item.learnerId, "displayName")}</td>
                <td>{item.status === "joined" ? "Đang tham gia" : "Đã rời"}</td>
              </tr>)}</tbody>
            </Table>}
        </Col>
      </Row>
      {deleting && <ConfirmDelete name={deck.name} detail="Các thẻ, tiến độ học và dấu sao trong bộ sẽ bị xóa."
        onHide={() => setDeleting(false)} onDelete={async () => {
          await deleteDeck(id);
          navigate("/decks");
        }} />}
    </>
  );
}

function DeckForm({ deck, topics, words, learners }) {
  const [form, setForm] = useState({
    name: deck?.name || "", description: deck?.description || "", topicId: deck?.topicId || "",
    wordIds: deck?.wordIds || [], status: deck?.status || "OPEN", memberChanges: {},
  });
  const navigate = useNavigate();
  const action = useAction();
  const topicWords = words.filter((word) => word.topicId === form.topicId);

  return (
    <Form className="surface form-panel" onSubmit={(event) => {
      event.preventDefault();
      action.run(async () => {
        const saved = await saveDeck(deck?.id, { ...form, originalWordIds: deck?.wordIds });
        navigate(`/decks/${saved.id}`);
      });
    }}>
      <ActionError error={action.error} />
      <fieldset disabled={action.busy}>
        <TextField id="deck-name" label="Tên bộ" required value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <TextField id="deck-description" label="Mô tả bộ" as="textarea" rows={3} value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <Row>
          <Col sm={7}><Form.Group controlId="deck-topic" className="mb-3">
            <Form.Label>Chủ đề</Form.Label>
            <Form.Select disabled={!!deck?.wordIds.length} value={form.topicId}
              onChange={(e) => setForm({ ...form, topicId: e.target.value, wordIds: [] })}>
              <option value="">Không chọn chủ đề</option>
              {topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}
            </Form.Select>
          </Form.Group></Col>
          <Col sm={5}><Form.Group controlId="deck-status" className="mb-3">
            <Form.Label>Trạng thái bộ</Form.Label>
            <Form.Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="OPEN">OPEN · Đang mở</option>
              <option value="CLOSED">CLOSED · Đã đóng</option>
            </Form.Select>
          </Form.Group></Col>
        </Row>
        <fieldset className="mb-4">
          <legend className="h6">Thẻ từ ngân hàng từ vựng</legend>
          <p className="small text-body-secondary">Bạn có thể thêm thẻ riêng hoặc xóa thẻ đã có trên trang chi tiết bộ.</p>
          {topicWords.length === 0 && form.topicId && <p className="text-body-secondary">Chủ đề này chưa có từ.</p>}
          <div className="choice-list">{topicWords.map((word) => (
            <Form.Check key={word.id} id={`deck-word-${word.id}`} label={`${word.word} — ${word.meaning}`}
              checked={form.wordIds.includes(word.id)} disabled={deck?.wordIds.includes(word.id)} onChange={(e) => setForm({
                ...form, wordIds: e.target.checked ? [...form.wordIds, word.id] : form.wordIds.filter((id) => id !== word.id),
              })} />
          ))}</div>
        </fieldset>
        <fieldset className="mb-4">
          <legend className="h6">Thành viên</legend>
          {!learners.length && <p className="text-body-secondary">Chưa có hồ sơ người học.</p>}
          <div className="choice-list">{learners.map((learner) => {
            const original = deck?.members.find((member) => member.learnerId === learner.id)?.status || "";
            const status = form.memberChanges[learner.id] ?? original;
            return (
              <Form.Group key={learner.id} controlId={`member-${learner.id}`} className="item-row member-row">
                <Form.Label className="mb-0">{learner.displayName}{learner.status !== "ACTIVE" ? " (ngừng hoạt động)" : ""}</Form.Label>
                <Form.Select value={status} onChange={(e) => {
                  const memberChanges = { ...form.memberChanges };
                  if (e.target.value === original) delete memberChanges[learner.id];
                  else memberChanges[learner.id] = e.target.value;
                  setForm({ ...form, memberChanges });
                }}>
                  {!original && <option value="">Chưa từng tham gia</option>}
                  <option value="joined">Đang tham gia</option>
                  <option value="left">Đã rời</option>
                </Form.Select>
              </Form.Group>
            );
          })}</div>
        </fieldset>
        <div className="d-flex gap-2">
          <Button type="submit">{action.busy ? "Đang lưu…" : "Lưu bộ"}</Button>
          <Link to={deck ? `/decks/${deck.id}` : "/decks"} className="btn btn-outline-secondary">Hủy</Link>
        </div>
      </fieldset>
    </Form>
  );
}

export function DeckFormPage() {
  const { id } = useParams();
  const state = useData(() => Promise.all([id ? getDeck(id) : null, listTopics(), listWords(), listLearners()]), id);
  return (
    <>
      <PageHeading title={id ? "Sửa bộ flashcard" : "Tạo bộ flashcard"} />
      <DataState state={state} />
      {state.data && <DeckForm key={id || "new"} deck={state.data[0]} topics={state.data[1]}
        words={state.data[2]} learners={state.data[3]} />}
    </>
  );
}

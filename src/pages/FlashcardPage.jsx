import { useRef, useState } from "react";
import { Alert, Button, Form, ProgressBar } from "react-bootstrap";
import { FiChevronLeft, FiChevronRight, FiRefreshCw, FiStar } from "react-icons/fi";
import { Link, useParams } from "react-router-dom";
import { ActionError, DataState, Empty, PageHeading } from "../components/Page";
import { shuffleCards, studyLabels, studySummary } from "../flashcards";
import { useAction, useData } from "../hooks";
import { useSession } from "../session";
import { loadCardStudy, saveCardProgress } from "../services/studyService";

function StudyStats({ cards, progress }) {
  const summary = studySummary(cards, progress);
  return (
    <section aria-label="Tiến độ bộ" className="mb-4">
      <div className="d-flex justify-content-between flex-wrap gap-2 mb-2">
        <strong>{summary.percent}% đã thuộc</strong>
        <span className="text-body-secondary">{summary.known}/{summary.total} thẻ</span>
      </div>
      <ProgressBar now={summary.percent} aria-label="Tỷ lệ thẻ đã thuộc" />
      <p className="small text-body-secondary mt-2 mb-0">
        Tổng {summary.total} · Đã thuộc {summary.known} · Chưa thuộc {summary.learning} · Chưa học {summary.unseen}
      </p>
    </section>
  );
}

function FlipCard({ card, flipped, reverse, onFlip }) {
  const faces = [
    { label: "Thuật ngữ", text: card.term },
    { label: "Định nghĩa", text: card.definition, example: card.example },
  ];
  if (reverse) faces.reverse();

  return (
    <button type="button" className="study-card" aria-label={`Lật thẻ: ${faces[Number(flipped)].text}`}
      aria-pressed={flipped} onClick={onFlip}>
      <span className={`study-card-inner${flipped ? " is-flipped" : ""}`}>
        {faces.map(({ label, text, example }, index) => (
          <span className={`study-face surface${index ? " study-face-back" : ""}`}
            aria-hidden={index !== Number(flipped)} key={label}>
            <span className="small text-body-secondary">{label}</span>
            <span className="study-face-text">{text}</span>
            {example && <span className="text-body-secondary" lang="en">{example}</span>}
            <span className="study-flip-hint small"><FiRefreshCw aria-hidden="true" /> Lật thẻ</span>
          </span>
        ))}
      </span>
    </button>
  );
}

function StudySession({ deck, cards, initialProgress, learnerId, reload }) {
  const [progress, setProgress] = useState(initialProgress);
  const [order, setOrder] = useState(() => cards.map(({ id }) => id));
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [finished, setFinished] = useState(false);
  const [scope, setScope] = useState("all");
  const [shuffle, setShuffle] = useState(false);
  const [reverse, setReverse] = useState(false);
  const [retry, setRetry] = useState(false);
  const pending = useRef(null);
  const action = useAction();
  const card = cards.find(({ id }) => id === order[index]);
  const current = progress[card?.id];
  const remaining = cards.filter(({ id }) => progress[id].status !== "known");
  const locked = action.busy || retry;

  function start(ids, nextScope = scope, shuffled = shuffle) {
    setOrder(shuffled ? shuffleCards(ids) : ids);
    setScope(nextScope);
    setIndex(0);
    setFlipped(false);
    setFinished(false);
  }

  function move(position) {
    setIndex(position);
    setFlipped(false);
  }

  function persist(change) {
    action.run(async () => {
      if (!pending.current) pending.current = {
        deckId: deck.id, learnerId, cardId: card.id, eventId: crypto.randomUUID(), ...change,
      };
      setRetry(true);
      const saved = await saveCardProgress(pending.current);
      setProgress((previous) => ({
        ...previous, [saved.cardId]: { ...previous[saved.cardId], ...saved },
      }));
      if (scope === "starred" && saved.starred === false) {
        const next = order.filter((id) => id !== saved.cardId);
        setOrder(next);
        move(Math.max(0, Math.min(index, next.length - 1)));
      }
      pending.current = null;
      setRetry(false);
    });
  }

  return (
    <div className="study-panel">
      <StudyStats cards={cards} progress={progress} />
      {!cards.length ? <Empty>Bộ này chưa có thẻ để học.</Empty> : <>
        <fieldset disabled={locked} className="study-settings">
          <legend className="visually-hidden">Tùy chọn học</legend>
          <Form.Check type="switch" id="study-shuffle" label="Trộn thẻ" checked={shuffle} onChange={(e) => {
            const value = e.target.checked;
            setShuffle(value);
            start(cards.filter(({ id }) => order.includes(id)).map(({ id }) => id), scope, value);
          }} />
          <Form.Check type="switch" id="study-reverse" label="Định nghĩa trước" checked={reverse} onChange={(e) => {
            setReverse(e.target.checked);
            setFlipped(false);
          }} />
          <Form.Check type="switch" id="study-starred" label="Chỉ thẻ có sao" checked={scope === "starred"} onChange={(e) => {
            const starred = e.target.checked;
            start(cards.filter(({ id }) => !starred || progress[id].starred).map(({ id }) => id), starred ? "starred" : "all");
          }} />
        </fieldset>
        <ActionError error={action.error} />
        {action.busy && <p role="status" className="small mb-2">Đang lưu…</p>}
        {retry && !action.busy && <div className="d-flex flex-wrap gap-2 mb-3">
          <Button onClick={() => persist()}>Thử lưu lại</Button>
          <Button variant="outline-secondary" onClick={reload}>Tải lại bộ</Button>
        </div>}
        {finished ? (
          <section className="surface form-panel">
            <h2 className="h5">Đã kết thúc lượt học</h2>
            <p>Bạn đã đến cuối lượt gồm {order.length} thẻ.</p>
            <p>{remaining.length ? `Còn ${remaining.length} thẻ chưa thuộc hoặc chưa học trong bộ.` : "Đã thuộc toàn bộ thẻ."}</p>
            <div className="d-flex flex-wrap gap-2">
              {remaining.length > 0 && <Button onClick={() => start(remaining.map(({ id }) => id), "review")}>Ôn thẻ cần học</Button>}
              <Button variant="outline-primary" onClick={() => start(cards.map(({ id }) => id), "all")}>Bắt đầu lượt mới</Button>
            </div>
          </section>
        ) : !card ? <Empty>Chưa có thẻ được đánh dấu sao. Tắt bộ lọc để xem toàn bộ thẻ.</Empty> : (
          <>
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
              <p className="mb-0" aria-live="polite">
                {scope === "review" && <span className="text-body-secondary me-2">Ôn thẻ cần học</span>}
                <strong>Thẻ {index + 1} / {order.length}</strong>
              </p>
              <Button variant={current.starred ? "primary" : "outline-secondary"} size="sm" disabled={locked}
                aria-pressed={current.starred} onClick={() => persist({ starred: !current.starred })}>
                <FiStar aria-hidden="true" className="me-1" /> {current.starred ? "Bỏ sao" : "Đánh dấu sao"}
              </Button>
            </div>
            <FlipCard card={card} reverse={reverse} flipped={flipped} onFlip={() => setFlipped(!flipped)} />
            <fieldset className="mt-3 mb-3" disabled={locked}>
              <legend className="h6 mb-2">Đánh giá thẻ</legend>
              <div className="d-flex flex-wrap gap-2">
                {Object.entries(studyLabels).map(([status, label]) => (
                  <Button key={status} variant={current.status === status ? "primary" : "outline-secondary"}
                    aria-pressed={current.status === status} onClick={() => {
                      if (current.status !== status) persist({ status });
                    }}>{label}</Button>
                ))}
              </div>
            </fieldset>
            <div className="study-navigation">
              <Button variant="outline-secondary" disabled={locked || index === 0} onClick={() => move(index - 1)}>
                <FiChevronLeft aria-hidden="true" /> Trước
              </Button>
              <Button variant="outline-secondary" disabled={locked} onClick={() => move(0)}>Học lại từ đầu</Button>
              <Button variant="outline-primary" disabled={locked} onClick={() => {
                if (index === order.length - 1) setFinished(true);
                else move(index + 1);
              }}>
                {index === order.length - 1 ? "Kết thúc lượt" : <>Tiếp <FiChevronRight aria-hidden="true" /></>}
              </Button>
            </div>
          </>
        )}
      </>}
    </div>
  );
}

export default function FlashcardPage() {
  const { id } = useParams();
  const { session: { learnerId } } = useSession();
  const state = useData(() => loadCardStudy(id, learnerId), `${id}:${learnerId}`);
  const study = state.data;

  return (
    <>
      <Link className="back-link" to={`/decks/${id}`}>Về chi tiết bộ</Link>
      <PageHeading title="Ôn flashcard" description={study?.deck.name} />
      <DataState state={state} />
      {study && (study.allowed
        ? <StudySession key={`${id}:${learnerId}`} deck={study.deck} cards={study.cards}
          initialProgress={study.progress} learnerId={learnerId} reload={state.reload} />
        : <Alert variant="warning">Bạn cần có hồ sơ đang hoạt động và đang tham gia một bộ mở để ôn.</Alert>)}
    </>
  );
}

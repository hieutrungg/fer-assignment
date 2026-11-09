import { useState } from "react";
import { Button, Form } from "react-bootstrap";
import { Link } from "react-router-dom";
import ConfirmDelete from "./ConfirmDelete";
import { ActionError, Empty, TextField } from "./Page";
import { useAction } from "../hooks";
import { deleteCard, saveCard } from "../services/deckService";

function CardForm({ deckId, card, onCancel, onSaved }) {
  const [term, setTerm] = useState(card.term ?? "");
  const [definition, setDefinition] = useState(card.definition ?? "");
  const [newId] = useState(() => crypto.randomUUID());
  const action = useAction();

  return (
    <Form className="surface form-panel mb-3" onSubmit={(event) => {
      event.preventDefault();
      action.run(async () => {
        await saveCard(deckId, card.id, { id: newId, term, definition });
        onSaved();
      });
    }}>
      <h3 className="h6">{card.id ? "Sửa thẻ" : "Thẻ mới"}</h3>
      <ActionError error={action.error} />
      <fieldset disabled={action.busy}>
        <TextField id="card-term" label="Thuật ngữ" required value={term} onChange={(e) => setTerm(e.target.value)} />
        <TextField id="card-definition" label="Định nghĩa" as="textarea" rows={3} required
          value={definition} onChange={(e) => setDefinition(e.target.value)} />
        <div className="d-flex gap-2">
          <Button type="submit">{action.busy ? "Đang lưu…" : "Lưu thẻ"}</Button>
          <Button variant="outline-secondary" onClick={onCancel}>Hủy</Button>
        </div>
      </fieldset>
    </Form>
  );
}

export default function DeckCards({ deckId, cards, teacher, reload }) {
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  return (
    <section aria-labelledby="deck-cards">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
        <h2 className="h5 mb-0" id="deck-cards">Flashcard ({cards.length})</h2>
        {teacher && <Button size="sm" variant="outline-primary" disabled={!!editing} onClick={() => setEditing({})}>Thêm thẻ</Button>}
      </div>
      {editing && <CardForm key={editing.id || "new"} deckId={deckId} card={editing}
        onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />}
      {!cards.length ? <Empty>Bộ này chưa có thẻ.</Empty> :
        <ol className="list-group list-group-numbered">
          {cards.map((card) => <li key={card.id} className="list-group-item d-flex align-items-start gap-2">
            <div className="flex-grow-1">
              <strong>{card.term}</strong>
              <p className="mb-0 text-body-secondary card-definition">{card.definition}</p>
              {card.wordId && <Link className="small" to={`/words/${card.wordId}`}>Xem từ gốc</Link>}
            </div>
            {teacher && <div className="d-flex flex-wrap gap-1">
              <Button size="sm" variant="outline-secondary" disabled={!!editing}
                aria-label={`Sửa thẻ ${card.term}`} onClick={() => setEditing(card)}>Sửa</Button>
              <Button size="sm" variant="outline-danger" disabled={!!editing}
                aria-label={`Xóa thẻ ${card.term}`} onClick={() => setDeleting(card)}>Xóa</Button>
            </div>}
          </li>)}
        </ol>}
      {deleting && <ConfirmDelete name={deleting.term} detail="Tiến độ và dấu sao của thẻ này sẽ bị xóa."
        onHide={() => setDeleting(null)} onDelete={async () => {
          await deleteCard(deckId, deleting.id);
          setDeleting(null);
          reload();
        }} />}
    </section>
  );
}

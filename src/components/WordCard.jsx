import { Badge, Button, Card } from "react-bootstrap";
import { Link } from "react-router-dom";

export default function WordCard({ word, onViewDetail, teacher, onDelete }) {
  return (
    <Card as="article" className="h-100">
      <Card.Body className="d-flex flex-column">
        <div className="d-flex align-items-start justify-content-between gap-2">
          <h2 className="h5 mb-1 text-break" lang="en">{word.word}</h2>
          <Badge bg="light" text="dark">{word.level}</Badge>
        </div>
        {word.phonetic && <p className="small mb-2 text-body-secondary">{word.phonetic}</p>}
        <p className="mb-3 text-break">{word.meaning}</p>
        <div className="d-flex flex-wrap gap-2 mt-auto">
          <Button onClick={() => onViewDetail(word)} variant="outline-primary" size="sm">Xem chi tiết</Button>
          {teacher && <>
            <Link to={`/words/${word.id}/edit`} className="btn btn-outline-secondary btn-sm">Sửa</Link>
            <Button onClick={() => onDelete(word)} variant="outline-danger" size="sm">Xóa</Button>
          </>}
        </div>
      </Card.Body>
    </Card>
  );
}

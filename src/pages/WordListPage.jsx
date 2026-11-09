import { useState } from "react";
import { Button, Col, Form, Modal, Row } from "react-bootstrap";
import { Link } from "react-router-dom";
import WordCard from "../components/WordCard";
import ConfirmDelete from "../components/ConfirmDelete";
import { DataState, Empty, PageHeading } from "../components/Page";
import { useData } from "../hooks";
import { useSession } from "../session";
import { deleteWord, levels, listTopics, listWords } from "../services/wordService";
import { WordDetails } from "./WordDetailPage";

export default function WordListPage() {
  const { session } = useSession();
  const teacher = session.role === "teacher";
  const state = useData(() => Promise.all([listWords(), listTopics()]));
  const [keyword, setKeyword] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("");
  const [selectedWord, setSelectedWord] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [words, topics] = state.data || [[], []];
  const term = keyword.trim().toLocaleLowerCase("vi");
  const filtered = words.filter((item) =>
    [item.word, item.meaning].some((value) => value.toLocaleLowerCase("vi").includes(term)) &&
    (!selectedLevel || item.level === selectedLevel) && (!selectedTopic || item.topicId === selectedTopic)
  );

  return (
    <>
      <PageHeading title="Danh sách từ vựng" description="Tra từ tiếng Anh hoặc nghĩa tiếng Việt.">
        {teacher && <Link to="/words/new" className="btn btn-primary">Thêm từ</Link>}
      </PageHeading>
      <DataState state={state} />
      {state.data && <>
        <Row className="g-2 mb-3">
          <Col xs={12} md><Form.Control type="search" placeholder="Ví dụ: apple hoặc quả táo"
            aria-label="Tìm từ hoặc nghĩa" value={keyword} onChange={(e) => setKeyword(e.target.value)} /></Col>
          <Col xs={7} md={3}><Form.Select aria-label="Lọc theo chủ đề" value={selectedTopic} onChange={(e) => setSelectedTopic(e.target.value)}>
            <option value="">Tất cả chủ đề</option>
            {topics.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </Form.Select></Col>
          <Col xs={5} md={2}><Form.Select aria-label="Lọc theo trình độ" value={selectedLevel} onChange={(e) => setSelectedLevel(e.target.value)}>
            <option value="">Mọi trình độ</option>
            {levels.map((level) => <option key={level}>{level}</option>)}
          </Form.Select></Col>
          <Col xs="auto"><Button variant="outline-secondary" disabled={!keyword && !selectedLevel && !selectedTopic}
            onClick={() => { setKeyword(""); setSelectedTopic(""); setSelectedLevel(""); }}>Xóa bộ lọc</Button></Col>
        </Row>
        <p className="small text-body-secondary" aria-live="polite">Tìm thấy {filtered.length} từ.</p>
        {!filtered.length && <Empty>{words.length ? "Không tìm thấy từ phù hợp với bộ lọc." : "Chưa có từ vựng."}</Empty>}
        <Row className="g-3">
          {filtered.map((word) => (
            <Col key={word.id} xs={12} sm={6} xl={4}>
              <WordCard word={word} teacher={teacher} onViewDetail={setSelectedWord} onDelete={setDeleting} />
            </Col>
          ))}
        </Row>
      </>}
      <Modal show={!!selectedWord} onHide={() => setSelectedWord(null)} centered>
        <Modal.Header closeButton><Modal.Title lang="en">{selectedWord?.word}</Modal.Title></Modal.Header>
        <Modal.Body>{selectedWord && <WordDetails key={selectedWord.id} word={selectedWord} />}</Modal.Body>
        <Modal.Footer><Button variant="outline-secondary" onClick={() => setSelectedWord(null)}>Đóng</Button></Modal.Footer>
      </Modal>
      {deleting && <ConfirmDelete name={deleting.word} onHide={() => setDeleting(null)} onDelete={async () => {
        await deleteWord(deleting.id);
        setDeleting(null);
        state.reload();
      }} />}
    </>
  );
}

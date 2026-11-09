import { useState } from "react";
import { Button, Col, Form, Row } from "react-bootstrap";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ActionError, DataState, PageHeading, TextField } from "../components/Page";
import { useAction, useData } from "../hooks";
import { getWord, levels, listTopics, saveWord } from "../services/wordService";

const fields = [
  ["word", "Từ tiếng Anh"], ["meaning", "Nghĩa tiếng Việt"], ["phonetic", "Phiên âm"],
  ["partOfSpeech", "Loại từ"], ["example", "Ví dụ"], ["exampleTranslation", "Bản dịch ví dụ"],
  ["imageUrl", "URL ảnh"], ["audioUrl", "URL âm thanh"],
];

function WordForm({ id, initial, topics }) {
  const [form, setForm] = useState({
    ...Object.fromEntries(fields.map(([name]) => [name, initial?.[name] || ""])),
    topicId: initial?.topicId || "", level: initial?.level || "A1",
  });
  const navigate = useNavigate();
  const action = useAction();
  const change = (name) => (event) => setForm({ ...form, [name]: event.target.value });

  return (
    <Form className="surface form-panel" onSubmit={(event) => {
      event.preventDefault();
      action.run(async () => {
        await saveWord(id, Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value.trim()])));
        navigate("/words");
      });
    }}>
      <ActionError error={action.error} />
      <fieldset disabled={action.busy}>
        <Row>
          {fields.slice(0, 2).map(([name, label]) => <Col xs={12} md={6} key={name}>
            <TextField id={name} label={label} required value={form[name]} onChange={change(name)} />
          </Col>)}
          <Col xs={12} md={6}><Form.Group controlId="topicId" className="mb-3">
            <Form.Label>Chủ đề</Form.Label>
            <Form.Select required value={form.topicId} onChange={change("topicId")}>
              <option value="">Chọn chủ đề</option>
              {topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}
            </Form.Select>
          </Form.Group></Col>
          <Col xs={12} md={6}><Form.Group controlId="level" className="mb-3">
            <Form.Label>Trình độ</Form.Label>
            <Form.Select required value={form.level} onChange={change("level")}>
              {levels.map((level) => <option key={level}>{level}</option>)}
            </Form.Select>
          </Form.Group></Col>
          {fields.slice(2).map(([name, label]) => <Col xs={12} md={6} key={name}>
            <TextField id={name} label={label} value={form[name]} onChange={change(name)}
              type={name.endsWith("Url") ? "url" : "text"} />
          </Col>)}
        </Row>
        {!topics.length && <p>Hãy <Link to="/topics">tạo chủ đề</Link> trước khi lưu từ.</p>}
        <div className="d-flex gap-2">
          <Button type="submit" disabled={!topics.length}>{action.busy ? "Đang lưu…" : "Lưu từ"}</Button>
          <Link to="/words" className="btn btn-outline-secondary">Hủy</Link>
        </div>
      </fieldset>
    </Form>
  );
}

export default function WordFormPage() {
  const { id } = useParams();
  const state = useData(() => Promise.all([listTopics(), id ? getWord(id) : null]), id);
  return (
    <>
      <PageHeading title={id ? "Sửa từ vựng" : "Thêm từ vựng"} />
      <DataState state={state} />
      {state.data && <WordForm key={id || "new"} id={id} topics={state.data[0]} initial={state.data[1]} />}
    </>
  );
}

import { useState } from "react";
import { Button, Form } from "react-bootstrap";
import ConfirmDelete from "../components/ConfirmDelete";
import { ActionError, DataState, Empty, PageHeading, TextField } from "../components/Page";
import { useAction, useData } from "../hooks";
import { deleteTopic, listTopics, saveTopic } from "../services/wordService";

function TopicForm({ topic, onClose, onSaved }) {
  const [name, setName] = useState(topic.name || "");
  const [description, setDescription] = useState(topic.description || "");
  const [imageUrl, setImageUrl] = useState(topic.imageUrl || "");
  const action = useAction();
  return (
    <Form className="surface form-panel mb-4" onSubmit={(event) => {
      event.preventDefault();
      action.run(async () => {
        await saveTopic(topic.id, { name: name.trim(), description: description.trim(), imageUrl: imageUrl.trim() });
        onSaved();
      });
    }}>
      <h2 className="h5">{topic.id ? "Sửa chủ đề" : "Chủ đề mới"}</h2>
      <ActionError error={action.error} />
      <fieldset disabled={action.busy}>
        <TextField id="topic-name" label="Tên chủ đề" required value={name} onChange={(e) => setName(e.target.value)} />
        <TextField id="topic-description" label="Mô tả" value={description} onChange={(e) => setDescription(e.target.value)} />
        <TextField id="topic-image" label="URL ảnh" type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
        <Button type="submit">{action.busy ? "Đang lưu…" : "Lưu chủ đề"}</Button>
        <Button variant="outline-secondary" className="ms-2" onClick={onClose}>Hủy</Button>
      </fieldset>
    </Form>
  );
}

export default function TopicListPage() {
  const state = useData(listTopics);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  return (
    <>
      <PageHeading title="Chủ đề" description="Quản lý danh mục dùng cho từ vựng và bộ flashcard.">
        <Button disabled={!!editing || !state.data} onClick={() => setEditing({})}>Thêm chủ đề</Button>
      </PageHeading>
      <DataState state={state} />
      {editing && <TopicForm topic={editing} onClose={() => setEditing(null)} onSaved={() => {
        setEditing(null);
        state.reload();
      }} />}
      {state.data?.length === 0 && <Empty>Chưa có chủ đề. Thêm chủ đề để phân loại từ vựng.</Empty>}
      {state.data?.length > 0 && <div className="list-group">
        {state.data.map((topic) => (
          <article key={topic.id} className="list-group-item item-row">
            <div><h2 className="h6 mb-1 text-break">{topic.name}</h2><p className="mb-0 text-body-secondary text-break">{topic.description || "—"}</p></div>
            <div className="d-flex gap-2">
              <Button disabled={!!editing} size="sm" variant="outline-secondary" onClick={() => setEditing(topic)}>Sửa</Button>
              <Button disabled={!!editing} size="sm" variant="outline-danger" onClick={() => setDeleting(topic)}>Xóa</Button>
            </div>
          </article>
        ))}
      </div>}
      {deleting && <ConfirmDelete name={deleting.name} onHide={() => setDeleting(null)} onDelete={async () => {
        await deleteTopic(deleting.id);
        setDeleting(null);
        state.reload();
      }} />}
    </>
  );
}

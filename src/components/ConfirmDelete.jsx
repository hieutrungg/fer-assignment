import { Button, Modal } from "react-bootstrap";
import { ActionError } from "./Page";
import { useAction } from "../hooks";

export default function ConfirmDelete({ name, detail, onHide, onDelete }) {
  const action = useAction();
  return (
    <Modal show centered onHide={() => { if (!action.busy) onHide(); }}>
      <Modal.Header closeButton={!action.busy}><Modal.Title>Xác nhận xóa</Modal.Title></Modal.Header>
      <Modal.Body>
        <ActionError error={action.error} />
        <p className="mb-0">Bạn muốn xóa <strong>{name}</strong>?</p>
        {detail && <p className="mt-2 mb-0">{detail}</p>}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" disabled={action.busy} onClick={onHide}>Hủy</Button>
        <Button variant="danger" disabled={action.busy} onClick={() => action.run(onDelete)}>
          {action.busy ? "Đang xóa…" : "Xóa"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

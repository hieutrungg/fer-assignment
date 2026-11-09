import { Alert, Button, Form, Spinner } from "react-bootstrap";

export function PageHeading({ title, description, children }) {
  return (
    <header className="page-heading d-flex flex-wrap justify-content-between align-items-start gap-3">
      <div>
        <h1>{title}</h1>
        {description && <p className="text-body-secondary mb-0">{description}</p>}
      </div>
      {children}
    </header>
  );
}

export function DataState({ state }) {
  if (state.loading) return (
    <p className="d-flex align-items-center gap-2" role="status">
      <Spinner size="sm" animation="border" aria-hidden="true" /> Đang tải…
    </p>
  );
  if (state.error) return (
    <Alert variant="danger">
      {state.error} <Button size="sm" variant="outline-danger" onClick={state.reload}>Tải lại</Button>
    </Alert>
  );
  return null;
}

export function Empty({ children }) {
  return <p className="empty-state text-body-secondary">{children}</p>;
}

export function ActionError({ error }) {
  return error ? <Alert variant="danger">{error}</Alert> : null;
}

export function TextField({ id, label, ...props }) {
  return (
    <Form.Group controlId={id} className="mb-3">
      <Form.Label>{label}</Form.Label>
      <Form.Control {...props} />
    </Form.Group>
  );
}

import { useState } from "react";
import { Badge, Button, Form } from "react-bootstrap";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ActionError, DataState, Empty, PageHeading, TextField } from "../components/Page";
import { useAction, useData } from "../hooks";
import { getQuestion, listAssignments, listAttempts, listQuestions, saveQuestion } from "../services/quizService";
import { listWords } from "../services/wordService";

export function QuestionListPage() {
  const state = useData(() => Promise.all([listQuestions(), listWords()]));
  const [questions, words] = state.data || [[], []];
  return (
    <>
      <PageHeading title="Ngân hàng câu hỏi" description="Quản lý câu hỏi trắc nghiệm theo từng từ.">
        <Link to="/questions/new" className="btn btn-primary">Thêm câu hỏi</Link>
      </PageHeading>
      <DataState state={state} />
      {state.data && (!questions.length ? <Empty>Chưa có câu hỏi trắc nghiệm.</Empty> :
        <div className="list-group">
          {questions.map((question) => <article key={question.id} className="list-group-item item-row">
            <div>
              <h2 className="h6 text-break">{question.prompt}</h2>
              <Badge bg="light" text="dark" lang="en">{words.find((word) => word.id === question.wordId)?.word || "—"}</Badge>
            </div>
            <Link to={`/questions/${question.id}/edit`} className="btn btn-outline-secondary btn-sm">Sửa</Link>
          </article>)}
        </div>)}
    </>
  );
}

function QuestionForm({ question, words, locked }) {
  const [wordId, setWordId] = useState(question?.wordId || "");
  const [prompt, setPrompt] = useState(question?.prompt || "");
  const [options, setOptions] = useState(question?.options || ["", "", "", ""]);
  const [correct, setCorrect] = useState(question ? question.options.indexOf(question.correctAnswer) : -1);
  const [explanation, setExplanation] = useState(question?.explanation || "");
  const navigate = useNavigate();
  const action = useAction();

  return (
    <Form className="surface form-panel" onSubmit={(event) => {
      event.preventDefault();
      action.run(async () => {
        const trimmed = options.map((option) => option.trim());
        await saveQuestion(question?.id, {
          wordId, prompt: prompt.trim(), options: trimmed,
          correctAnswer: trimmed[correct], explanation: explanation.trim(),
        });
        navigate("/questions");
      });
    }}>
      <ActionError error={action.error} />
      {locked && <p role="status">Câu hỏi đã có lượt nộp trong một bài giao. Bạn có thể tạo câu hỏi mới để dùng nội dung khác.</p>}
      <fieldset disabled={action.busy || locked}>
        <Form.Group controlId="question-word" className="mb-3">
          <Form.Label>Từ vựng</Form.Label>
          <Form.Select required value={wordId} onChange={(e) => setWordId(e.target.value)}>
            <option value="">Chọn từ</option>
            {words.map((word) => <option key={word.id} value={word.id}>{word.word} — {word.meaning}</option>)}
          </Form.Select>
        </Form.Group>
        <TextField id="question-prompt" label="Nội dung câu hỏi" required value={prompt} onChange={(e) => setPrompt(e.target.value)} />
        <fieldset className="mb-3">
          <legend className="h6">Lựa chọn và đáp án đúng</legend>
          {options.map((option, index) => (
            <div className="option-editor" key={index}>
              <TextField id={`option-${index}`} label={`Lựa chọn ${index + 1}`} required value={option}
                onChange={(e) => setOptions(options.map((value, i) => i === index ? e.target.value : value))} />
              <Form.Check type="radio" id={`correct-${index}`} name="correct" required
                label="Đúng" aria-label={`Lựa chọn ${index + 1} là đáp án đúng`}
                checked={correct === index} onChange={() => setCorrect(index)} />
            </div>
          ))}
        </fieldset>
        <TextField id="explanation" label="Giải thích" as="textarea" rows={3} required
          value={explanation} onChange={(e) => setExplanation(e.target.value)} />
        {!words.length && <p>Hãy <Link to="/words/new">thêm từ</Link> trước khi tạo câu hỏi.</p>}
        <Button type="submit" disabled={!words.length}>{action.busy ? "Đang lưu…" : "Lưu câu hỏi"}</Button>
      </fieldset>
      <Link className="d-inline-block mt-3" to="/questions">Về ngân hàng câu hỏi</Link>
    </Form>
  );
}

export function QuestionFormPage() {
  const { id } = useParams();
  const state = useData(() => Promise.all([
    id ? getQuestion(id) : null, listWords(), id ? listAssignments() : [], id ? listAttempts() : [],
  ]), id);
  const [question, words, assignments, attempts] = state.data || [];
  const locked = id && assignments?.some((item) =>
    item.questionIds.includes(id) && attempts.some((attempt) => attempt.assignmentId === item.id));
  return (
    <>
      <PageHeading title={id ? "Sửa câu hỏi" : "Thêm câu hỏi"} />
      <DataState state={state} />
      {state.data && <QuestionForm key={id || "new"} question={question} words={words} locked={locked} />}
    </>
  );
}

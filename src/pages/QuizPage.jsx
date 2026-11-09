import { useState } from "react";
import { Badge, Button, Form } from "react-bootstrap";
import { Link, useParams } from "react-router-dom";
import { ActionError, DataState, Empty, PageHeading } from "../components/Page";
import { useAction, useData } from "../hooks";
import { useSession } from "../session";
import { loadQuiz, score, submitQuiz } from "../services/quizService";
import { dateTime } from "../dates";

export function QuizResult({ result }) {
  const { correct, total, percent } = score(result);
  return (
    <section className="quiz-panel">
      <div className="surface form-panel mb-3">
        <h2 className="h5">Kết quả</h2>
        <p className="h3 mb-1">{correct}/{total} câu đúng · {percent}%</p>
        <p className="small text-body-secondary mb-0">Đã nộp {dateTime(result.completedAt)}</p>
      </div>
      <ol className="list-group list-group-numbered">
        {result.answers.map((answer, index) => {
          const correct = answer.correctAnswer === answer.selectedAnswer;
          return <li key={answer.questionId || index} className="list-group-item d-flex gap-2">
            <div className="flex-grow-1">
              <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
                <h3 className="h6 mb-0 text-break">{answer.prompt}</h3>
                <Badge bg={correct ? "success" : "danger"}>{correct ? "Đúng" : "Sai"}</Badge>
              </div>
              <p className="mb-1">Bạn chọn <strong>{answer.selectedAnswer}</strong></p>
              <p className="mb-1">Đáp án đúng <strong>{answer.correctAnswer}</strong></p>
              {answer.explanation && <p className="text-body-secondary mb-0">{answer.explanation}</p>}
            </div>
          </li>;
        })}
      </ol>
    </section>
  );
}

function QuizForm({ params, questions, reload }) {
  const [selections, setSelections] = useState({});
  const [result, setResult] = useState(null);
  const action = useAction();
  if (result) return <QuizResult result={result} />;

  return (
    <Form className="quiz-panel" onSubmit={(event) => {
      event.preventDefault();
      action.run(async () => setResult(await submitQuiz(params, questions, selections)));
    }}>
      <ActionError error={action.error} />
      <fieldset disabled={action.busy}>
        <p className="text-body-secondary small" aria-live="polite">
          Đã trả lời {Object.keys(selections).length}/{questions.length} câu
        </p>
        {questions.map((question, index) => (
          <section key={question.id} className="surface form-panel mb-3">
            <fieldset>
              <legend className="h6">{index + 1}. {question.prompt}</legend>
              <div className="choice-list">
                {question.options.map((option, index) => (
                  <Form.Check key={index} type="radio" name={`quiz-${question.id}`}
                    id={`quiz-${question.id}-${index}`} label={option}
                    checked={selections[question.id] === option}
                    onChange={() => setSelections({ ...selections, [question.id]: option })} />
                ))}
              </div>
            </fieldset>
          </section>
        ))}
        <Button type="submit">{action.busy ? "Đang nộp…" : "Nộp quiz"}</Button>
        {action.error && <Button className="ms-2" variant="outline-secondary" onClick={reload}>Tải lại bài</Button>}
      </fieldset>
    </Form>
  );
}

export default function QuizPage({ assigned = false }) {
  const { id } = useParams();
  const { session } = useSession();
  const params = {
    learnerId: session.learnerId, ...(assigned ? { assignmentId: id } : { deckId: id }),
  };
  const key = `${session.learnerId}:${assigned}:${id}`;
  const state = useData(() => loadQuiz(params), key);
  return (
    <>
      <Link className="back-link" to={assigned ? "/assignments" : `/decks/${id}`}>{assigned ? "Về bài giao" : "Về chi tiết bộ"}</Link>
      <PageHeading title={state.data?.title || (assigned ? "Quiz bài giao" : "Quiz tự luyện")}
        description={assigned ? "Quiz bài giao" : "Quiz tự luyện"} />
      <DataState state={state} />
      {state.data && (state.data.result ? <QuizResult result={state.data.result} /> :
        state.data.questions.length ? <QuizForm key={key} params={params} questions={state.data.questions} reload={state.reload} /> :
          <Empty>Bộ này chưa có câu hỏi để tự luyện.</Empty>)}
    </>
  );
}

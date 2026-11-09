import { Badge, Button } from "react-bootstrap";
import { Link, useParams } from "react-router-dom";
import { ActionError, DataState, PageHeading } from "../components/Page";
import { useAction, useData } from "../hooks";
import { useSession } from "../session";
import { list } from "../services/api";
import { toggleFavorite } from "../services/studyService";
import { getWord } from "../services/wordService";

export function WordDetails({ word }) {
  const { session } = useSession();
  const learnerId = session.learnerId;
  const action = useAction();
  const favorite = useData(async () => learnerId
    ? (await list("learningProgress")).some((item) =>
      item.learnerId === learnerId && item.wordId === word.id && item.isFavorite)
    : false, word.id);

  return (
    <>
      <p className="text-body-secondary">{[word.phonetic, word.partOfSpeech].filter(Boolean).join(" · ") || "Chưa có phiên âm và loại từ"}</p>
      <h2 className="h5 text-break">{word.meaning}</h2>
      {word.imageUrl && <img className="img-fluid rounded my-3" src={word.imageUrl} alt={word.word} />}
      <div className="border-top pt-3 mt-3">
        <h3 className="h6">Ví dụ</h3>
        <p lang="en" className="mb-1 text-break">{word.example || "—"}</p>
        <p className="text-body-secondary text-break">{word.exampleTranslation || "—"}</p>
      </div>
      {word.audioUrl && <audio className="mw-100 d-block mb-3" src={word.audioUrl} controls preload="none" aria-label="Nghe phát âm" />}
      {learnerId && <>
        <DataState state={favorite} />
        <ActionError error={action.error} />
        {favorite.data !== undefined && <Button variant="outline-primary" disabled={action.busy} aria-pressed={favorite.data}
          onClick={() => action.run(async () => { await toggleFavorite(learnerId, word.id); favorite.reload(); })}>
          {favorite.data ? "Bỏ yêu thích" : "Thêm vào yêu thích"}
        </Button>}
      </>}
    </>
  );
}

export default function WordDetailPage() {
  const { id } = useParams();
  const state = useData(() => getWord(id), id);
  if (!state.data) return <DataState state={state} />;
  const word = state.data;
  return (
    <>
      <Link to="/words" className="btn btn-outline-secondary mb-3">Về từ vựng</Link>
      <PageHeading title={word.word}><Badge bg="light" text="dark">{word.level}</Badge></PageHeading>
      <div className="surface form-panel"><WordDetails key={word.id} word={word} /></div>
    </>
  );
}

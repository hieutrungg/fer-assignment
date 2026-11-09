import { useEffect, useRef, useState } from "react";
import { errorMessage } from "./services/api";

export function useData(load, key) {
  const [state, setState] = useState({ loading: true });
  const [revision, setRevision] = useState(0);
  const loader = useRef(load);

  useEffect(() => {
    loader.current = load;
  }, [load]);

  useEffect(() => {
    let active = true;
    loader.current().then(
      (data) => { if (active) setState({ data, key, revision }); },
      (error) => { if (active) setState({ error: errorMessage(error), key, revision }); }
    );
    return () => { active = false; };
  }, [key, revision]);

  const current = state.key === key && state.revision === revision ? state : { loading: true };
  return { ...current, reload: () => setRevision((value) => value + 1) };
}

export function useAction() {
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run(action) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      return await action();
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  return { busy, error, run, clearError: () => setError("") };
}

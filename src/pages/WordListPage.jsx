import React, { useEffect, useState } from "react";
import axios from "axios";
import { Col, Container, Row } from "react-bootstrap";
import WordCard from "../components/WordCard";

function WordListPage() {
  const [word, setWord] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() =>{
    async function fetchData(){
        try {
            const res = await axios.get("http://localhost:3001/words");
            setWord(res.data);
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    }
    fetchData();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Words</h2>
      <ul>
        {word.map((w) => (
          <li key={w.id}>{w.word}: {w.meaning}</li>
        ))}
      </ul>
    </div>
  );
}

export default WordListPage;

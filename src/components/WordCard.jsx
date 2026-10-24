import { Badge, Card } from "react-bootstrap";

import React from "react";

function WordCard({ word }) {
  return (
    <div>
      <Card className='h-100 shadow-sm'>
        <Card.Body>
          <Card.Title>{word.word}</Card.Title>
          <Card.Subtitle className="mb-2 text-muted">{word.phonetic}</Card.Subtitle>
          <Card.Text>{word.meaning}</Card.Text>
          <Badge bg="primary">{word.level}</Badge>
        </Card.Body>
      </Card>
    </div>
  );
}

export default WordCard;

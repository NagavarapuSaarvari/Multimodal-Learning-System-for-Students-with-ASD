from pydantic import BaseModel


class TopicRequest(BaseModel):
    topic: str


class TestRequest(BaseModel):
    topic: str
    difficulty: str


class ScoreRequest(BaseModel):
    topic: str
    score: int
    difficulty: str
    emotion: str
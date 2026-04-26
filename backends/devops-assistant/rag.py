"""
A simple RAG implementation using ChromaDB and OpenAI embeddings.
This module provides functions to:
1. Create or load a ChromaDB database for logs.
2. Add logs to the database with basic deduplication.
3. Query the database for relevant log chunks based on a question.
The main.py file will use these functions to handle API requests for adding logs and asking questions.
"""
import time
from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings
from langchain_core.documents import Document
from chromadb.config import Settings
from config import config
from parser import parse_log_line


def get_db():
    """Create or load a ChromaDB database for logs."""
    return Chroma(
        collection_name=config["rag"]["collection_name"],
        embedding_function=OpenAIEmbeddings(model="text-embedding-3-small"),
        persist_directory=config["rag"]["persist_dir"],
        client_settings=Settings(anonymized_telemetry=False),
    )


def add_logs_to_db(db, text):
    """Add logs to the database with basic deduplication.
    Args:
        db: The ChromaDB instance.
        text: The raw log text to be added.
    Returns:
        The number of new chunks added to the database.
    """
    lines = text.splitlines()
    docs = []

    for line in lines:
        parsed = parse_log_line(line)
        if not parsed:
            continue

        docs.append(Document(
            page_content=parsed["content"],
            metadata=parsed["metadata"]
        ))

    if docs:
        db.add_documents(docs)

    return len(docs)


def query_logs(db, question):
    """Query the database for relevant log chunks based on a question.
    Args:
        db: The ChromaDB instance.
        question: The question to query against the logs.
    Returns:
        A string containing the relevant log chunks.
    """
    results = db.similarity_search(question, k=5)
    
    return "\n".join([
        f"[{r.metadata.get('timestamp')}] {r.metadata.get('level')} {r.metadata.get('service')}: {r.page_content}"
        for r in results
    ])


def cleanup_old_logs(db, max_age_seconds):
    """Remove log chunks that are older than the specified age.
    Args:
        db: The ChromaDB instance.
        max_age_seconds: The maximum age of log chunks in seconds. Chunks older than this will be removed.
    """
    now = int(time.time())
    data = db.get(include=["metadatas"])

    ids_to_delete = []

    for i, meta in enumerate(data.get("metadatas", [])):
        if not meta:
            continue

        ts = meta.get("timestamp_epoch")
        if ts and now - ts > max_age_seconds:
            ids_to_delete.append(data["ids"][i])

    if ids_to_delete:
        db.delete(ids=ids_to_delete)

    return len(ids_to_delete)

"""
A simple RAG implementation using ChromaDB and OpenAI embeddings.
This module provides a FastAPI application with two endpoints:
1. POST /logs: Accepts raw log text and adds it to the ChromaDB database with basic deduplication.
2. GET /ask: Accepts a question as a query parameter, retrieves relevant log chunks from the database, and uses an LLM to generate an answer based on the logs.
The application uses the functions defined in rag.py to handle database interactions and llm.py to interact with the LLM.
Note: In a production system, you would want to add error handling, logging, and possibly more sophisticated deduplication and querying logic. This is a basic implementation to demonstrate the concept.
"""
import threading
import time
import os
import shutil
from fastapi import FastAPI, Request, HTTPException, Depends
from config import config
from rag import get_db, add_logs_to_db, query_logs, cleanup_old_logs
from llm import ask_llm
from security import verify_api_key
from rate_limiter import rate_limit

app = FastAPI()

db = get_db()

@app.post("/logs")
async def add_logs(
    request: Request,
    _: bool = Depends(verify_api_key),
    __: None = Depends(rate_limit)
):
    body = await request.body()

    if len(body) > config["app"]["max_log_size"]:
        raise HTTPException(status_code=413, detail="Log size exceeds maximum allowed")
    
    text = body.decode("utf-8", errors="replace")

    added = add_logs_to_db(db, text)

    return {"added": added}

@app.get("/ask")
def ask(
    question: str,
    request: Request,
    _: bool = Depends(verify_api_key),
    __: None = Depends(rate_limit)
):
    data = db.get()
    if not data.get("documents"):
        raise HTTPException(status_code=400, detail="No logs found in database")
    
    context = query_logs(db, question)

    if not context:
        raise HTTPException(status_code=404, detail="No relevant logs found for the question")
    
    answer = ask_llm(context, question)

    return {"answer": answer}

@app.delete("/logs")
def clear_logs(_: bool = Depends(verify_api_key)):
    persist_dir = config["rag"]["persist_dir"]
    if os.path.exists(persist_dir):
        shutil.rmtree(persist_dir)

    global db
    db = get_db()

    return {"status": "Logs cleared"}

def retention_worker():
    if not config["retention"]["enabled"]:
        return

    cleanup_interval = config["retention"].get(
        "cleanup_interval_seconds",
        config["retention"]["max_age_seconds"]
    )
    
    while True:
        cleanup_old_logs(db, config["retention"]["max_age_seconds"])
        time.sleep(cleanup_interval)

@app.on_event("startup")
def start_worker():
    thread = threading.Thread(target=retention_worker, daemon=True)
    thread.start()
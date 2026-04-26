"""
A simple RAG implementation using ChromaDB and OpenAI embeddings.
"""
import os
from openai import OpenAI

def get_openai_client():
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not set")
    return OpenAI(api_key=api_key)


def ask_llm(context, question):
    """Ask the LLM a question based on the provided context.
    Args:
        context: The relevant log chunks retrieved from the database.
        question: The question to be answered based on the logs.
    Returns:
        A string containing the generated answer.
    """
    prompt = f"""
You are a DevOps assistant. Use the logs below to answer:

Logs:
{context}

Question:
{question}
"""
    client = get_openai_client()

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "user", "content": prompt}
        ],
    )

    return response.choices[0].message.content
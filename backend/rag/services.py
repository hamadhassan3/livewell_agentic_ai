import os
import chromadb
import asyncio
from agent.models import Message
from asgiref.sync import sync_to_async
from langchain_huggingface import HuggingFaceEmbeddings

print("CHROMA_HOST:", os.environ.get('CHROMA_HOST'))
print("CHROMA_PORT:", os.environ.get('CHROMA_PORT'))

# Initialize these lazily to avoid connection errors at startup
client = None
collection = None
embeddings = None

def get_chroma_client():
    global client
    if client is None:
        client = chromadb.HttpClient(host=os.environ.get('CHROMA_HOST'), port=os.environ.get('CHROMA_PORT'))
    return client

def get_collection():
    global collection
    if collection is None:
        collection = get_chroma_client().get_or_create_collection("chat_history")
    return collection

def get_embeddings():
    global embeddings
    if embeddings is None:
        embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
    return embeddings

def embed_and_store_messages(messages: list[Message]):
    """
    Asynchronously embed and store messages in ChromaDB.
    """
    asyncio.run(_async_embed_and_store(messages))

async def _async_embed_and_store(messages: list[Message]):
    """
    Embeds and stores a list of messages in ChromaDB with user isolation.
    """
    if not message_data:
        return

    # Get contents and ids
    contents = [msg['content'] for msg in message_data]
    ids = [msg['id'] for msg in message_data]
    
    # Prepare metadata for user isolation
    metadatas = []
    for msg in message_data:
        metadata = {
            "role": msg['role'],
            "timestamp": msg['timestamp'],
        }
        
        # Add conversation_id if available
        if msg.get('conversation_id'):
            metadata["conversation_id"] = msg['conversation_id']
        
        # Add session_id if available
        if msg.get('session_id'):
            metadata["session_id"] = msg['session_id']
        
        # Add user_id if available
        if msg.get('user_id'):
            metadata["user_id"] = msg['user_id']
            
        metadatas.append(metadata)

    # Embed contents
    embedded_vectors = get_embeddings().embed_documents(contents)

    # Store in ChromaDB with metadata
    try:
        get_collection().add(
            embeddings=embedded_vectors,
            documents=contents,
            ids=ids,
            metadatas=metadatas
        )
        
        # Update messages to mark as stored
        # Since we're in async context, update the database properly
        from asgiref.sync import sync_to_async
        
        @sync_to_async
        def update_messages():
            from django.db import models
            Message.objects.filter(id__in=message_ids).update(
                embedding_stored=True,
                embedding_id=models.F('id')
            )
        
        await update_messages()
        
    except Exception as e:
        print(f"Error storing embeddings in ChromaDB: {e}")


def embed_and_store_summary(summary_text: str, session_id: str, user_id: str = None):
    """
    Store or update a conversation summary in ChromaDB.
    
    Args:
        summary_text: The summary text to store
        session_id: Session identifier for the conversation
        user_id: User identifier for filtering
    """
    if not summary_text or not session_id:
        return
    
    try:
        # Create a unique ID for the summary
        summary_id = f"summary_{session_id}"
        
        # Prepare metadata
        from datetime import datetime
        metadata = {
            "type": "summary",
            "session_id": session_id,
            "timestamp": datetime.now().isoformat()
        }
        
        # Add user_id if provided
        if user_id:
            metadata["user_id"] = str(user_id)
        
        # Embed the summary
        embedded_vector = get_embeddings().embed_documents([summary_text])
        
        # Check if summary already exists
        collection = get_collection()
        try:
            existing = collection.get(ids=[summary_id])
            if existing['ids']:
                # Update existing summary
                collection.update(
                    ids=[summary_id],
                    embeddings=embedded_vector,
                    documents=[summary_text],
                    metadatas=[metadata]
                )
            else:
                # Create new summary
                collection.add(
                    embeddings=embedded_vector,
                    documents=[summary_text],
                    ids=[summary_id],
                    metadatas=[metadata]
                )
        except Exception:
            # If get fails, try to add (summary doesn't exist)
            collection.add(
                embeddings=embedded_vector,
                documents=[summary_text],
                ids=[summary_id],
                metadatas=[metadata]
            )
        
    except Exception as e:
        print(f"Error storing summary in ChromaDB: {e}")


def retrieve_relevant_history(query: str, user_id: str = None, session_id: str = None, limit: int = 10):
    """
    Retrieve relevant chat history using RAG with user isolation.
    
    Args:
        query: The query to find relevant context for
        user_id: User ID for filtering (ensures users can only access their own data)
        session_id: Session ID for additional filtering
        limit: Maximum number of results to return
    
    Returns:
        List of relevant message content with metadata
    """
    if not query:
        return []
    
    try:
        # Build where clause for user isolation
        where_conditions = []
        
        # Always filter by user_id if provided to ensure data isolation
        if user_id:
            where_conditions.append({"user_id": str(user_id)})
        
        # Additional session filtering if provided
        if session_id:
            where_conditions.append({"session_id": str(session_id)})
        
        # If no user_id provided, don't return any results for security
        if not user_id:
            return []
        
        # Build proper where clause with $and operator if multiple conditions
        if len(where_conditions) > 1:
            where_clause = {"$and": where_conditions}
        elif len(where_conditions) == 1:
            where_clause = where_conditions[0]
        else:
            where_clause = {}
        
        # Embed the query
        query_embedding = get_embeddings().embed_query(query)
        
        # Query ChromaDB with user filtering
        results = get_collection().query(
            query_embeddings=[query_embedding],
            where=where_clause,
            n_results=limit,
            include=["documents", "metadatas", "distances"]
        )
        
        # Format results
        relevant_messages = []
        if results and results['documents'] and len(results['documents'][0]) > 0:
            for i, (doc, metadata, distance) in enumerate(zip(
                results['documents'][0],
                results['metadatas'][0],
                results['distances'][0]
            )):
                relevant_messages.append({
                    'content': doc,
                    'role': metadata.get('role', 'unknown'),
                    'timestamp': metadata.get('timestamp'),
                    'conversation_id': metadata.get('conversation_id'),
                    'session_id': metadata.get('session_id'),
                    'similarity_score': 1 - (distance / 2)  # Convert L2 distance to cosine similarity
                })
        
        return relevant_messages
        
    except Exception as e:
        print(f"Error retrieving relevant history: {e}")
        return []


def retrieve_relevant_summaries(query: str, user_id: str = None, limit: int = 5):
    """
    Retrieve relevant conversation summaries using RAG with user isolation.
    
    Args:
        query: The query to find relevant summaries for
        user_id: User ID for filtering (ensures users can only access their own data)
        limit: Maximum number of results to return
    
    Returns:
        List of relevant summaries with metadata
    """
    if not query:
        return []
    
    try:
        # Build where clause for user isolation and summary type
        where_conditions = [{"type": "summary"}]
        
        # Always filter by user_id if provided to ensure data isolation
        if user_id:
            where_conditions.append({"user_id": str(user_id)})
        
        # If no user_id provided, don't return any results for security
        if not user_id:
            return []
        
        # Build proper where clause with $and operator
        where_clause = {"$and": where_conditions}
        
        # Embed the query
        query_embedding = get_embeddings().embed_query(query)
        
        # Query ChromaDB with user filtering
        results = get_collection().query(
            query_embeddings=[query_embedding],
            where=where_clause,
            n_results=limit,
            include=["documents", "metadatas", "distances"]
        )
        
        # Format results
        relevant_summaries = []
        if results and results['documents'] and len(results['documents'][0]) > 0:
            for i, (doc, metadata, distance) in enumerate(zip(
                results['documents'][0],
                results['metadatas'][0],
                results['distances'][0]
            )):
                relevant_summaries.append({
                    'content': doc,
                    'type': 'summary',
                    'session_id': metadata.get('session_id'),
                    'timestamp': metadata.get('timestamp'),
                    'similarity_score': 1 - (distance / 2)  # Convert L2 distance to cosine similarity
                })
        
        return relevant_summaries
        
    except Exception as e:
        print(f"Error retrieving relevant summaries: {e}")
        return []
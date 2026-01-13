from chromadb import HttpClient
import json

client = HttpClient(host="localhost", port=8002)

def main():
    print("✅ Connected to Chroma at localhost:8002\n")

    collections = client.list_collections()
    if not collections:
        print("No collections found.")
        return

    for collection in collections:
        print(f"\n=== 📘 Collection: {collection.name} ===")
        print(json.dumps(collection.metadata, indent=2))

        # Fetch up to 1000 items from the collection
        data = collection.get(limit=1000) or {}

        # Safely handle possible None values
        documents = data.get("documents") or []
        metadatas = data.get("metadatas") or []
        embeddings = data.get("embeddings") or []

        print("\nDocuments:")
        print(json.dumps(documents, indent=2))

        print("\nMetadatas:")
        print(json.dumps(metadatas, indent=2))

        print("\nEmbeddings (truncated):")
        for i, emb in enumerate(embeddings):
            if emb:
                print(f"  {i}: len={len(emb)} values={emb[:5]}...")
            else:
                print(f"  {i}: (empty embedding)")

if __name__ == "__main__":
    main()

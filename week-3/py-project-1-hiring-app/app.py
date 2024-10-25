import os
import pandas as pd
import openai
from pinecone import Pinecone
from dotenv import load_dotenv
import argparse
import json

load_dotenv()
pinecone_api_key = os.getenv("PINECONE_API_KEY")
pinecone_host = os.getenv("PINECONE_HOST")
pinecone = Pinecone(api_key=pinecone_api_key, environment=pinecone_host)
index = pinecone.Index("index3")
if not pinecone_api_key:
    raise ValueError("PINECONE_API_KEY environment variable not set!")
if not pinecone_host:
    raise ValueError("PINECONE_HOST environment variable not set!")

openai_api_key = os.getenv("OPENAI_API_KEY")

if not openai_api_key:
    raise ValueError("OPENAI_API_KEY environment variable not set!")

client = openai.OpenAI(api_key=openai_api_key)

def parseCSVFile(csv_path):
    df = pd.read_csv(csv_path)
    df = df.drop_duplicates(subset=['Resume'])
    df = df.sample(frac=1).reset_index(drop=True)  # Shuffle
    reduced_length = len(df) // 50
    df = df[:reduced_length]
    
    data = [
        {
            "id": idx + 1,
            "resume": row['Resume']
        }
        for idx, row in df.iterrows()
    ]

    return data

def generate_embedding(text):
    response = client.embeddings.create(
        input=text,
        model="text-embedding-ada-002"  
    )        
    embedding = response.data[0].embedding
    return embedding

def store_embeddings_in_pinecone(data):
    embedding = ''
    for i, row in enumerate(data):
        embedding = generate_embedding(row["resume"])
        index.upsert([{
            "id": f"text-{i}",
            "values": embedding,
            "metadata": {
                "id": row["id"],
                "resume": row["resume"]
            }
        }])

    print(f"Successfully stored {len(embedding)} data points in Pinecone")

def generate_response(query, top_candidates):
    candidate_data = [
        {
            "id": candidate["id"],
            "resume": candidate["resume"]
        }
        for candidate in top_candidates
    ]

    candidates_json = json.dumps(candidate_data)

    prompt = f"""You are a skilled talent recruiter. You have access to the resumes of the top candidates. Provide a brief summary of each candidate's resume to help your client make an informed decision. Don't skip any candidates—talk about all the candidates you are given.

    Candidates:
    {candidates_json}
    """
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": prompt},
            {"role": "user", "content": f"Who are the top candidates for ${query}?"}
        ],
        max_tokens=1000
    )
    return response.choices[0].message.content

if __name__ == "__main__":
    csv_path = "Resume.csv"
    data = parseCSVFile(csv_path)
    store_embeddings_in_pinecone(data)
    parser = argparse.ArgumentParser(description="Chat with OpenAI GPT model via command line.")
    parser.add_argument('query', type=str, help="The initial query text.")
    args = parser.parse_args()
    user_query = args.query

    while True:
        query_embedding = generate_embedding(user_query)

        results = index.query(vector=query_embedding, top_k=10, include_metadata=True)
        print("Results", results)
        score_threshold = 0.75
        print("Our threshold", score_threshold)
        top_candidates = []
        for match in results['matches']:
            print("Match", match)
            if match['score'] > score_threshold:
                top_candidates.append({
                    "id": match['metadata']['id'],
                    "score": match['score'],
                    "resume": match['metadata']['resume']
                })
        print(f"Found {len(top_candidates)} top candidates.")
        print("Ordered by score:")
        print("\n".join([f"ID: {candidate['id']}, Score: {candidate['score']}" for candidate in top_candidates]))
 
        detailed_response = ""
        if top_candidates:
            detailed_response = generate_response(user_query, top_candidates)
            print(f"Response: {detailed_response}")
        else:
            detailed_response = "No relevant results found above the threshold."
            print(detailed_response)

        user_query = input("Enter your next query (or type 'exit' to quit): ")
        if user_query.lower() == 'exit':
            break


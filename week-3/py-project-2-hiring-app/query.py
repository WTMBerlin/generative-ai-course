import os
import numpy as np
import pandas as pd
from pinecone import Pinecone
import argparse
from openai import OpenAI
from dotenv import load_dotenv
load_dotenv()
pinecone_api_key = os.getenv("PINECONE_API_KEY")
pinecone_host = os.getenv("PINECONE_HOST")
openai_api_key = os.getenv("OPENAI_API_KEY")

if not pinecone_api_key:
    raise ValueError("PINECONE_API_KEY environment variable not set!")
if not pinecone_host:
    raise ValueError("PINECONE_HOST environment variable not set!")
if not openai_api_key:
    raise ValueError("OPENAI_API_KEY environment variable not set!")

pc = Pinecone(api_key=pinecone_api_key)

index_name = "index3" # Replace with your pinecone database index name

index = pc.Index(index_name, host=pinecone_host)

client = OpenAI(api_key=openai_api_key)

def generate_embedding_for_query(query):
    response = client.embeddings.create(
        input=query,
        model="text-embedding-ada-002"  
    )
    embedding = response.data[0].embedding
    return embedding

def generate_response_from_chunks(chunks, user_query, context):
    combined_text = "\n".join(chunk['metadata']['text'][:1000] for chunk in chunks)  # Limit to 1000 characters per resume

    prompt = (
        f"You are an AI assistant. Based on the following resume information"
        f"provide the top candidates for the role '{user_query}'. The candidates should match based on experience, skills, and relevant category.\n\n"
        f"Here is the resume data:\n\n{combined_text}\n\nResponse:"
    )

    response = client.chat.completions.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": "You are an AI assistant providing detailed responses based on given resume data."},
            {"role": "user", "content": prompt}
        ],
        max_tokens=500
    )
    return response.choices[0].message.content

def display_candidate_info(candidate, metadata):
    print(f"Candidate ID: {metadata['ID']} | Score: {candidate['score']}")
    print(f"Resume: {metadata['text'][:300]}...")  # Only display first 300 chars for brevity
    print("*" * 30)

def main():
    parser = argparse.ArgumentParser(description="Chat with OpenAI GPT model via command line.")
    parser.add_argument('query', type=str, help="The initial query text.")
    args = parser.parse_args()

    user_query = args.query
    context = ""  

    while True:
        query_embedding = generate_embedding_for_query(user_query)
        embedding_dimension = 1536
        query_vector = np.array(query_embedding)

        if query_vector.size < embedding_dimension:
            padded_query_vector = np.pad(query_vector, (0, embedding_dimension - query_vector.size), 'constant')
        else:
            padded_query_vector = query_vector

        print("Query Vector:", padded_query_vector)

        if np.isnan(padded_query_vector).any():
            print("Error: Query vector contains NaN values. Cannot proceed.")
            return

        results = index.query(vector=padded_query_vector.tolist(), top_k=10, include_metadata=True)
        score_threshold = 0.85
        print("Our threshold", score_threshold)
    
        filtered_matches = [match for match in results['matches'] if match['score'] > score_threshold]
        print("*" * 30)
        print("filtered_matches")
        for match in filtered_matches:
            print(f"Score: {match['score']}")
        
        for match in filtered_matches:
            metadata = match['metadata']
            display_candidate_info(match, metadata)
            
        detailed_response = ""

        if filtered_matches:
            detailed_response = generate_response_from_chunks(filtered_matches, user_query, context)
            print(f"Response: {detailed_response}")
        else:
            detailed_response = "No relevant results found above the threshold."
            print(detailed_response)

        context += f"\nUser query: {user_query}\nResponse: {detailed_response}\n"

        user_query = input("Enter your next query (or type 'exit' to quit): ")
        if user_query.lower() == 'exit':
            break
        else:
            user_query = f"{user_query}. Answer this from my resume database information provided to you. Don't add any additional information that is not mentioned in the resume database."

if __name__ == "__main__":
    main()

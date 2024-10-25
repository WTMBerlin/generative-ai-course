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


def extract_categories_from_text(text):
    response = openai.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "system",
                "content": "You extract information from resumes and return them in a structured JSON format."
            },
            {
                "role": "user",
                "content": f"""Extract or predict the following information from the given resume text:
- Roles: the roles held by the individual (e.g., Software Engineer, Project Manager).
- Skills: the technical skills possessed by the individual (e.g., Java, Python, Project Management).
- Seniority: extract or predict the seniority level from experience, technologies, etc. (e.g., Junior, Mid-level, Senior, or years of experience).
- Industry: the industry/industries related to the experience (e.g., IT, Finance, Healthcare).

Resume:
{text}"""
            }
        ],
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": "resume_extraction_schema",
                "schema": {
                    "type": "object",
                    "properties": {
                        "roles": {
                            "description": "Roles held by the individual",
                            "type": "array",
                            "items": {"type": "string"}
                        },
                        "skills": {
                            "description": "Technical skills of the individual",
                            "type": "array",
                            "items": {"type": "string"}
                        },
                        "seniority": {
                            "description": "Seniority level",
                            "type": "array",
                            "items": {"type": "string"}
                        },
                        "industry": {
                            "description": "Related industries",
                            "type": "array",
                            "items": {"type": "string"}
                        },
                    },
                    "required": ["roles", "skills", "seniority", "industry"],
                    "additionalProperties": False
                }
            }
        }
    )

    extracted_data = json.loads(response.choices[0].message.content)
    print("extractedData:", extracted_data)
    return extracted_data

def generate_category_embeddings(categories):
    embeddings = {}

    for category, text in categories.items():
        response = openai.embeddings.create(
            input=", ".join(text),
            model="text-embedding-ada-002"
        )
        embeddings[category] = response.data[0].embedding
    
    return embeddings

def store_embeddings_in_pinecone(texts):
    for text in texts:
        categories = extract_categories_from_text(text['resume'])
        category_embeddings = generate_category_embeddings(categories)

        for category, embedding in category_embeddings.items():
            index.upsert([
                {
                    "id": f"text_{text['id']}_{category}",
                    "values": embedding,
                    "metadata": {
                        "id": text['id'],
                        "resume": text['resume'],
                        "content": ", ".join(categories[category]),
                        "category": category
                    }
                }
            ])
    
    print("Embeddings generated and stored in Pinecone.")

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
        extracted_categories = extract_categories_from_text(user_query)
        query_embeddings = generate_category_embeddings(extracted_categories)
        categories = ['roles', 'skills', 'seniority', 'industry']

        candidate_scores = {}

        for category in categories:
            query_embedding = query_embeddings[category]
            
            results = index.query(
                vector=query_embedding,
                top_k=10,
                include_metadata=True,
                filter={"category": category}
            )

            for match in results['matches']:
                if match['metadata']['id'] not in candidate_scores:
                    candidate_scores[match['metadata']['id']] = {
                        "id": match['metadata']['id'],
                        "score": 0,
                        "resume": match['metadata']['resume']
                    }

                candidate_scores[match['metadata']['id']]["score"] += match['score']

        top_candidates = sorted(candidate_scores.values(), key=lambda x: x["score"], reverse=True)[:10]

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


import os
import pandas as pd
import openai
from pinecone import Pinecone
from dotenv import load_dotenv
load_dotenv()
pinecone_api_key = os.getenv("PINECONE_API_KEY")
pinecone_host = os.getenv("PINECONE_HOST")

if not pinecone_api_key:
    raise ValueError("PINECONE_API_KEY environment variable not set!")
if not pinecone_host:
    raise ValueError("PINECONE_HOST environment variable not set!")

openai_api_key = os.getenv("OPENAI_API_KEY")

if not openai_api_key:
    raise ValueError("OPENAI_API_KEY environment variable not set!")

def read_csv_data(csv_path, columns):
    df = pd.read_csv(csv_path)
    df = df.drop_duplicates(subset=columns)
    df = df.sample(frac=1).reset_index(drop=True) # shuffle
    half_length = len(df) // 15 # To reduce the size of the dataframe
    df = df[:half_length]
    df['text'] = df.apply(lambda row: ". ".join([f"{col}: {row[col]}" for col in columns]), axis=1)
    return df['text'].tolist()

def generate_embeddings(texts):
    client = openai.OpenAI(api_key=openai_api_key)

    embeddings = []
    for text in texts:
        response = client.embeddings.create(
            input=text,
            model="text-embedding-ada-002"  # Replace with your desired model
        )

        
        embedding = response.data[0].embedding
        embeddings.append(embedding)
    return embeddings

def store_embeddings_in_pinecone(embeddings, texts, index_name, batch_size=100):
    embedding_dimension = 1536  # Update based on your OpenAI model or experiment

    print(f"Retrieved Pinecone API key: {pinecone_api_key}")

    pinecone = Pinecone(api_key=pinecone_api_key, environment=pinecone_host)
    index = pinecone.Index(index_name)

    data_points = []
    for i, (text, embedding) in enumerate(zip(texts, embeddings)):
        data_point = {
            "id": f"text_{i+1}",
            "values": embedding,
            "metadata": {"ID": f"text_{i+1}",
                         "text": text}
        }
        data_points.append(data_point)

        if len(data_points) >= batch_size:
            index.upsert(data_points)
            data_points = []

    if data_points:
        index.upsert(data_points)

    print(f"Successfully stored {len(embeddings)} data points in Pinecone")

if __name__ == "__main__":
    csv_path = "Resume.csv"

    columns = ["Category", "Resume"] # Replace columns with column names of your csv file

    pinecone_index_name = "index3" # Replace with your pineconde database index name

    csv_data = read_csv_data(csv_path, columns)
    print("CSV Data:", csv_data)

    embeddings = generate_embeddings(csv_data)
    print("Embeddings:")
    for i, embedding in enumerate(embeddings):
        print(f"Embedding {i+1}:\n{embedding[:20]}\n")  # Print only first 20 elements

    store_embeddings_in_pinecone(embeddings, csv_data, pinecone_index_name)

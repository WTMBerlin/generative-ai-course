## Hiring App : Resume Search Application with Pinecone and OpenAI

This project implements a resume search application that stores resume data from a CSV file, generates embeddings using OpenAI, and allows for querying the most relevant candidates based on Pinecone vector search.

### Requirements:

    Python 3.11.5

### Pinecone Setup for Storing Embeddings

To store embeddings, the Pinecone database is used in this project. A free Pinecone account was utilized ([Pinecone.io](https://www.pinecone.io/)) with the following configuration:

1. **Pinecone Index** is used to store the embeddings.
2. **Dimensions**: 1536 (based on the OpenAI text-embedding-ada-002 model).
3. **Host type**: Serverless.

### Installation

- Clone the repository:

```
git clone https://github.com/WTMBerlin/generative-ai-course.git
```

- Go to the project directory:

```
cd week-3/py-project-1-hiring-app
```

- Create and activate a virtual environment:

```
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

- Install required dependencies:

```
pip install -r requirements.txt
```

- Create a .env file then add your keys:

```
OPENAI_API_KEY=your_openai_api_key
PINECONE_API_KEY = pinecone_api_key
PINECONE_HOST = pinecone_host
```

- Create embeddings from csv file:

```
python create-embeddings.py
```

- Query from csv file:

```
python query.py "Find software developer with data science experience"
```

## Resume Data

Dataset is obtained from [Kaggle](https://www.kaggle.com/datasets/jillanisofttech/updated-resume-dataset).
The `Resume.csv` file used in this project contains only the resumes of individuals working in the IT sector. Each row in the file represents a candidate with various attributes, such as category and resume details, which are used for generating embeddings and performing queries.

## License

This project includes code from [Data-Query-with-RAG-OpenAI-Embeddings-and-Vector-Database](https://github.com/mmr116/Data-Query-with-RAG-OpenAI-Embeddings-and-Vector-Database) which is licensed under the [MIT License](https://github.com/mmr116/Data-Query-with-RAG-OpenAI-Embeddings-and-Vector-Database/blob/main/LICENSE).

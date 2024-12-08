## Hiring App : Resume Search Application with Pinecone and OpenAI using Parallel Search

This application takes the Resume.csv file as input and generates four embeddings for each individual's resume: roles, industry, skills, and seniority. Then, when a search is performed, a parallel search is conducted to rank and determine the top candidates. These top candidates are sent back to GPT to select the best candidates, ensuring the accuracy of the selections. The final result is displayed in the frontend.

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
cd week-3/js-project-2-rag-with-parallel-search
```

- Install dependencies

```
npm install
```

- Create a .env file then add your keys:

```
OPENAI_API_KEY = your_openai_api_key
PINECONE_API_KEY = pinecone_api_key
PINECONE_HOST = pinecone_host
```

- Start the server:

```
node app.js
```

## Resume Data

Dataset is obtained from [Kaggle](https://www.kaggle.com/datasets/jillanisofttech/updated-resume-dataset).
The `Resume.csv` file used in this project contains only the resumes of individuals working in the IT sector. Each row in the file represents a candidate with various attributes, such as category and resume details, which are used for generating embeddings and performing queries.

## License

This project includes code from [Data-Query-with-RAG-OpenAI-Embeddings-and-Vector-Database](https://github.com/mmr116/Data-Query-with-RAG-OpenAI-Embeddings-and-Vector-Database) which is licensed under the [MIT License](https://github.com/mmr116/Data-Query-with-RAG-OpenAI-Embeddings-and-Vector-Database/blob/main/LICENSE).

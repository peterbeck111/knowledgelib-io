# Input:  Directory of documents + user query
# Output: LLM answer grounded in retrieved context with sources

from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_community.vectorstores import Chroma
from langchain_community.document_loaders import DirectoryLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser

# 1. Load and chunk
docs = DirectoryLoader("./docs", glob="**/*.md").load()
chunks = RecursiveCharacterTextSplitter(chunk_size=512, chunk_overlap=64).split_documents(docs)

# 2. Embed and store
db = Chroma.from_documents(chunks, OpenAIEmbeddings(model="text-embedding-3-small"))
retriever = db.as_retriever(search_kwargs={"k": 5})

# 3. Generate
prompt = ChatPromptTemplate.from_template(
    "Answer based on context:\n{context}\n\nQuestion: {question}"
)
chain = (
    {"context": retriever | (lambda docs: "\n".join(d.page_content for d in docs)),
     "question": RunnablePassthrough()}
    | prompt | ChatOpenAI(model="gpt-4o", temperature=0) | StrOutputParser()
)
print(chain.invoke("How does RAG work?"))

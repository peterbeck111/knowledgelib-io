// Input:  Array of text documents + user query string
// Output: LLM-generated answer grounded in retrieved context

import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { PineconeStore } from "@langchain/pinecone";
import { Pinecone } from "@pinecone-database/pinecone";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence, RunnablePassthrough } from "@langchain/core/runnables";

const pinecone = new Pinecone();
const index = pinecone.Index("rag-index");

const vectorStore = await PineconeStore.fromExistingIndex(
  new OpenAIEmbeddings({ modelName: "text-embedding-3-small" }),
  { pineconeIndex: index }
);

const retriever = vectorStore.asRetriever({ k: 5 });
const llm = new ChatOpenAI({ modelName: "gpt-4o", temperature: 0 });
const prompt = ChatPromptTemplate.fromTemplate(
  "Answer based on context:\n{context}\n\nQuestion: {question}"
);

const chain = RunnableSequence.from([
  { context: retriever.pipe((docs) => docs.map((d) => d.pageContent).join("\n")),
    question: new RunnablePassthrough() },
  prompt, llm, new StringOutputParser(),
]);
const answer = await chain.invoke("How does RAG work?");

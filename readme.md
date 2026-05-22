AI-Assisted HR Data Room
Technical Documentation
📌 Overview

AI-Assisted HR Data Room is a full-stack intelligent recruitment system that automates:

Resume parsing and indexing

Semantic candidate search

AI-assisted interview workflows

Resume-grounded chatbot responses

Structured interview evaluation

The system combines classical NLP (TF-IDF) with modern LLM-based Retrieval-Augmented Generation (RAG) to deliver deterministic, resume-grounded insights.

🏗️ System Architecture
Frontend (UI Layer)
        ↓
Django Backend (Functional Views)
        ↓
MongoDB Database
        ↓
Cloudinary (Cloud File Storage)
        ↓
TF-IDF Indexing Engine
        ↓
RAG Chatbot (LLM Integration)
🛠 Technology Stack
Backend

Django (Functional-Based Views)

Python 3.x

REST-style APIs

Database

MongoDB

PyMongo

NLP & AI

scikit-learn (TF-IDF Vectorizer)

Cosine Similarity

OpenAI API (LLM)

Retrieval-Augmented Generation (RAG)

File Processing

pdfplumber (PDF extraction)

python-docx (DOCX extraction)

Cloud

Cloudinary (Cloud CV storage)

Serialization & Utilities

Pickle (TF-IDF persistence)

BSON (MongoDB ObjectId handling)

🔐 Authentication & Authorization

Django Authentication System

Password Hashing

Role-Based Access Control (RBAC)

Custom role_required decorator

User Roles

Admin

HR

Interviewer

Access is restricted at the API level.

📄 Resume Management Module
Features

CV upload (PDF / DOCX)

Cloud storage via Cloudinary

Resume text extraction

Resume chunking (300-word segments)

MongoDB storage of chunks

Automatic TF-IDF index rebuild

Data Flow
Upload CV
   ↓
Cloud Storage
   ↓
Text Extraction
   ↓
Chunking
   ↓
MongoDB Storage
   ↓
Index Rebuild
🧮 TF-IDF Indexing Engine
Implementation

TfidfVectorizer

English stop-word removal

Cosine similarity scoring

Top-K chunk retrieval

Persistent index (pickle)

Why TF-IDF?

Lightweight

Deterministic

Interpretable

Suitable for academic implementation

No external vector database required

🤖 RAG Chatbot Module
Retrieval-Augmented Generation Pipeline
User Query
     ↓
TF-IDF Retrieval
     ↓
Resume Context Assembly
     ↓
LLM Generation (Temperature = 0)
     ↓
Grounded Response
Features

Resume-grounded answers

Hallucination control via prompt constraints

Deterministic outputs

Conversation logging

Strict context injection

🎤 Interview Management Module
Structured Workflow

Create Interview Session

Ask Question

AI Suggests Resume-Based Answer

Record Candidate Response

Add Interviewer Notes

Generate AI Interview Summary

Stored Interview Structure

Candidate ID

Interviewer

Questions array

AI suggested answers

Candidate answers

Interviewer notes

AI-generated summary

Timestamp

🗄 Database Schema Overview
Users Collection

username

role

hashed password

Documents Collection

candidate_id

file_url

uploaded_by

timestamp

Chunks Collection

document_id

text

Interviews Collection

candidate_id

interviewer

questions[]

summary

Conversations Collection

user

query

retrieved_chunks

response

📊 Functional Features

Resume Upload

Resume Parsing

Resume Indexing

Semantic Search

AI Chatbot

AI Interview Assistant

Interview Summary Generation

Role-Based Access Control

Cloud File Handling

⚙ Non-Functional Features

Deterministic AI responses

Modular service-based architecture

Scalable NoSQL schema

Secure API endpoints

Maintainable codebase

Persistent index loading

Cloud-based storage reliability

🧠 NLP Techniques Used

Tokenization

Stop-word removal

TF-IDF Vectorization

Cosine Similarity

Prompt Engineering

Retrieval-Augmented Generation

📦 Project Structure (Backend)
core/
    services/
        text_extraction.py
        chunking.py
        tfidf_service.py
        chatbot_service.py
    views.py
    urls.py
    database.py
🚀 Future Enhancements
AI & NLP Improvements

Replace TF-IDF with embeddings (Sentence Transformers)

Vector database (FAISS / Pinecone)

Hybrid search (keyword + semantic)

Resume ranking system

Skill extraction module

System Enhancements

PDF export of interview reports

Candidate comparison dashboard

HR analytics panel

Bias detection module

Multi-language resume support

Real-time indexing updates

Infrastructure

Docker containerization

Kubernetes deployment

CI/CD pipeline

Cloud deployment (AWS / GCP)

🎯 Academic Strengths

Combines classical IR (TF-IDF) with modern LLMs

Implements full RAG architecture

Reduces hallucination via strict prompt grounding

Demonstrates modular backend engineering

Implements complete HR workflow automation

🧪 Testing Strategy

Unit testing for text extraction

Integration testing for indexing

API testing for RAG responses

Interview workflow validation

Role-based access verification

🔒 Security Considerations

Role-based endpoint restriction

Hashed password storage

API key stored in environment variables

Controlled LLM temperature

No direct file storage on local disk

📈 Scalability Considerations

MongoDB flexible schema

Modular service architecture

Index persistence

Future vector DB integration ready

🏁 Conclusion

AI-Assisted HR Data Room integrates deterministic NLP indexing with LLM-powered reasoning to create a secure, scalable, and academically defendable intelligent recruitment system.

It balances classical information retrieval techniques with modern AI capabilities while maintaining human oversight in decision-making.
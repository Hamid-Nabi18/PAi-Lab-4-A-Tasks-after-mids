import os
import pickle
import numpy as np
import pandas as pd
from flask import Flask, render_template, request, jsonify
from sentence_transformers import SentenceTransformer
import faiss

# Initialize Flask app
app = Flask(__name__)

# Load model and index at startup
print("Loading Sentence Transformer model...")
model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')

print("Loading FAISS index...")
index = faiss.read_index('faiss_index/hadith_index.faiss')

print("Loading metadata...")
with open('faiss_index/metadata.pkl', 'rb') as f:
    metadata = pickle.load(f)

# Load Hadith mapping
hadith_df = pd.read_csv('data/hadith_mapping.csv')

print(f"Loaded {index.ntotal} Hadith entries")
print("Server is ready!")

def search_hadith(query, top_k=3):
    """Search for most relevant Hadith"""
    # Encode query
    query_embedding = model.encode([query])
    faiss.normalize_L2(query_embedding)
    
    # Search FAISS index
    distances, indices = index.search(query_embedding, top_k)
    
    results = []
    for dist, idx in zip(distances[0], indices[0]):
        result = {
            'hadith_id': int(metadata['hadith_ids'][idx]),
            'source': metadata['sources'][idx].strip(),
            'chapter': metadata['chapters'][idx].strip(),
            'hadith_no': int(metadata['hadith_nos'][idx]),
            'text': metadata['texts'][idx],
            'score': float(dist)
        }
        results.append(result)
    
    return results

@app.route('/')
def home():
    """Render main chat interface"""
    return render_template('index.html')

@app.route('/ask', methods=['POST'])
def ask():
    """Handle user questions"""
    try:
        data = request.get_json()
        query = data.get('question', '').strip()
        
        if not query:
            return jsonify({'error': 'Please enter a question'}), 400
        
        # Search for Hadith
        results = search_hadith(query, top_k=3)
        
        if not results or results[0]['score'] < 0.3:
            return jsonify({
                'answer': 'I could not find a relevant Hadith for your question. Please try rephrasing.',
                'has_results': False
            })
        
        # Format response
        top_result = results[0]
        supporting = results[1:] if len(results) > 1 else []
        
        response = {
            'has_results': True,
            'main_hadith': {
                'text': top_result['text'],
                'source': top_result['source'],
                'chapter': top_result['chapter'],
                'hadith_no': top_result['hadith_no']
            },
            'supporting_hadiths': [
                {
                    'text': r['text'],
                    'source': r['source'],
                    'chapter': r['chapter'],
                    'hadith_no': r['hadith_no']
                } for r in supporting
            ]
        }
        
        return jsonify(response)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/result', methods=['GET'])
def result():
    """Direct result endpoint"""
    query = request.args.get('query', '')
    if not query:
        return jsonify({'error': 'No query provided'}), 400
    
    results = search_hadith(query, top_k=3)
    return jsonify(results)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
'use client';

import { useState, useEffect } from 'react';
import { Play, ExternalLink, X, Film } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Temporary mock data for preview if Notion is not connected
const mockData = [
  { id: '1', yarnId: 'example-1', title: 'Why so serious?', videoUrl: 'https://y.yarn.co/8ef0c2ee-4cf1-487e-90e1-905a735d5871.mp4', thumbUrl: 'https://y.yarn.co/8ef0c2ee-4cf1-487e-90e1-905a735d5871_screenshot.jpg' },
  { id: '2', yarnId: 'example-2', title: "I'm going to make him an offer he can't refuse.", videoUrl: 'https://y.yarn.co/0df4a781-6782-4161-9f93-1b9f6b4e0e56.mp4', thumbUrl: 'https://y.yarn.co/0df4a781-6782-4161-9f93-1b9f6b4e0e56_screenshot.jpg' },
  { id: '3', yarnId: 'example-3', title: 'Life is like a box of chocolates.', videoUrl: 'https://y.yarn.co/43a2283a-8664-4e43-8588-44444b445555.mp4', thumbUrl: 'https://y.yarn.co/43a2283a-8664-4e43-8588-44444b445555_screenshot.jpg' },
];

export default function Gallery() {
  const [items, setItems] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/videos');
        const data = await response.json();
        if (data && data.length > 0) {
          setItems(data);
        } else {
          setItems([]); // No mock data
        }
      } catch (err) {
        console.error('Fetch error:', err);
        setItems([]);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <div className="container">
      <header className="header">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1>Content Archive</h1>
          <p>Douyin & Taobao saver to Notion</p>
        </motion.div>
      </header>

      {/* New Search Section */}
      <motion.div
        className="search-section"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={{ margin: '2rem auto', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '1rem' }}
      >
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            placeholder="Search term (e.g. 'cat', 'fashion')..."
            className="search-input"
            id="searchInput"
            style={{
              flex: 1,
              padding: '12px 20px',
              borderRadius: '25px',
              border: '1px solid #334155',
              background: '#1e293b',
              color: 'white',
              fontSize: '1rem',
              outline: 'none'
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          {['douyin', 'taobao'].map(platform => (
            <button
              key={platform}
              onClick={async () => {
                const input = document.getElementById('searchInput');
                const query = input.value;
                if (!query) return alert('Please enter a search term');

                const btn = document.getElementById(`btn-${platform}`);
                const originalText = btn.innerText;
                btn.innerText = 'Searching...';
                btn.disabled = true;

                try {
                  const res = await fetch('/api/scrape', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query, platform })
                  });
                  if (res.ok) {
                    alert(`${platform} search completed! Check Notion.`);
                    // Ideally refresh list here
                    window.location.reload();
                  } else {
                    alert('Error scraping. Check console/logs.');
                  }
                } catch (e) {
                  console.error(e);
                  alert('Request failed');
                } finally {
                  btn.innerText = originalText;
                  btn.disabled = false;
                }
              }}
              id={`btn-${platform}`}
              style={{
                padding: '10px 20px',
                borderRadius: '20px',
                border: 'none',
                background: platform === 'douyin' ? '#000000' : '#ff5000', // Basic brand colors
                color: 'white',
                cursor: 'pointer',
                fontWeight: 'bold',
                textTransform: 'capitalize',
                transition: 'transform 0.2s',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
              }}
              onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              Search {platform}
            </button>
          ))}
        </div>
      </motion.div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '5rem' }}>Loading Gallery...</div>
      ) : (
        <motion.div
          className="grid"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.1 }
            }
          }}
        >
          {items.map((item) => (
            <motion.div
              key={item.id}
              className="card"
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 }
              }}
              onClick={() => setSelectedVideo(item)}
            >
              <div className="thumbnail-container">
                <img src={item.thumbUrl} alt={item.title} className="thumbnail" />
                <div className="play-overlay">
                  <div className="play-icon">
                    <Play fill="white" size={24} />
                  </div>
                </div>
              </div>
              <div className="card-content">
                <div className="card-title">{item.title}</div>
                <div className="card-meta">
                  <span>ID: {item.yarnId}</span>
                  <a
                    href={item.clipUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-view"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      <AnimatePresence>
        {selectedVideo && (
          <motion.div
            className="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedVideo(null)}
          >
            <motion.div
              className="modal-content"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button className="close-btn" onClick={() => setSelectedVideo(null)}>
                <X size={24} />
              </button>
              <video
                className="video-player"
                controls
                autoPlay
                src={selectedVideo.videoUrl}
              />
              <div className="modal-info">
                <h3>{selectedVideo.title}</h3>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Yarn Reference: {selectedVideo.yarnId}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer style={{ marginTop: '5rem', textAlign: 'center', color: '#475569', fontSize: '0.9rem' }}>
        Built with Next.js & Notion API
      </footer>
    </div>
  );
}

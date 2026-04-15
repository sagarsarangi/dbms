import { useState, useRef, useEffect } from 'react';
import { executeQuery } from '../utils/api';
import './Terminal.css';

export default function Terminal({ title, panelContext, welcomeMessage }) {
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [queryHistory, setQueryHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const outputRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    // Auto-scroll to bottom
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [history, loading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const query = input.trim();
    if (!query || loading) return;

    // Add to query history
    setQueryHistory(prev => [query, ...prev.filter(q => q !== query)]);
    setHistoryIndex(-1);
    setInput('');

    // Add query to display history
    setHistory(prev => [...prev, { type: 'query', text: query }]);
    setLoading(true);

    try {
      const result = await executeQuery(query, panelContext);

      if (result.error) {
        setHistory(prev => [...prev, { type: 'error', text: result.error }]);
      } else if (result.rows && result.rows.length > 0) {
        setHistory(prev => [...prev, { type: 'table', data: result.rows }]);
      } else if (result.message) {
        setHistory(prev => [...prev, { type: 'success', text: result.message }]);
      } else {
        setHistory(prev => [...prev, { type: 'success', text: 'Query executed successfully. No rows returned.' }]);
      }
    } catch (err) {
      setHistory(prev => [...prev, { type: 'error', text: err.message }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    // Arrow up — previous query
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (queryHistory.length > 0) {
        const newIndex = Math.min(historyIndex + 1, queryHistory.length - 1);
        setHistoryIndex(newIndex);
        setInput(queryHistory[newIndex]);
      }
    }
    // Arrow down — next query
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(queryHistory[newIndex]);
      } else {
        setHistoryIndex(-1);
        setInput('');
      }
    }
  };

  const handleClear = () => {
    setHistory([]);
  };

  const focusInput = () => {
    inputRef.current?.focus();
  };

  return (
    <div className="terminal-container" onClick={focusInput}>
      {/* Light Theme Title Bar */}
      <div className="terminal-titlebar">
        <div className="terminal-title">
          <span>◇</span> {title} Data View
        </div>
        <div className="terminal-actions">
          <button className="terminal-action-btn" onClick={handleClear} type="button">
            Clear Output
          </button>
        </div>
      </div>

      {/* Dark Code Sandbox */}
      <div className="terminal-body">
        <div className="terminal-output" ref={outputRef}>
          {/* Welcome message */}
          {welcomeMessage && (
            <div className="terminal-welcome">
              {welcomeMessage.split('\n').map((line, i) => (
                <div key={i} dangerouslySetInnerHTML={{
                  __html: line.replace(
                    /`([^`]+)`/g,
                    '<span class="highlight">$1</span>'
                  )
                }} />
              ))}
            </div>
          )}

          {/* History entries */}
          {history.map((entry, idx) => (
            <div key={idx} className="terminal-entry">
              {entry.type === 'query' && (
                <div className="terminal-prompt-line">
                  <span className="terminal-prompt-symbol">❯</span>
                  <span className="terminal-query-text">{entry.text}</span>
                </div>
              )}
              {entry.type === 'table' && (
                <div className="terminal-result">
                  <div className="result-table-wrapper">
                    <table className="result-table">
                      <thead>
                        <tr>
                          {Object.keys(entry.data[0]).map(col => (
                            <th key={col}>{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {entry.data.map((row, rIdx) => (
                          <tr key={rIdx}>
                            {Object.values(row).map((val, cIdx) => (
                              <td key={cIdx}>{val === null ? 'NULL' : String(val)}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="result-row-count">
                    {entry.data.length} row{entry.data.length !== 1 ? 's' : ''} returned
                  </div>
                </div>
              )}
              {entry.type === 'success' && (
                <div className="terminal-result success">{entry.text}</div>
              )}
              {entry.type === 'error' && (
                <div className="terminal-result error">{entry.text}</div>
              )}
            </div>
          ))}

          {/* Loading indicator */}
          {loading && (
            <div className="terminal-loading">
              <div className="terminal-loading-dot" />
              <div className="terminal-loading-dot" />
              <div className="terminal-loading-dot" />
            </div>
          )}
        </div>

        {/* Input line */}
        <form onSubmit={handleSubmit} className="terminal-input-line">
          <span className="terminal-input-prompt">SQL❯</span>
          <input
            ref={inputRef}
            type="text"
            className="terminal-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your SQL query here and press Enter..."
            autoFocus
            disabled={loading}
            autoComplete="off"
            spellCheck="false"
          />
        </form>
      </div>

    </div>
  );
}

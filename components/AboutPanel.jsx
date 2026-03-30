'use client';

export default function AboutPanel({ onClose }) {
    return (
        <div className="about-panel-overlay" onClick={onClose}>
            <div className="about-panel" onClick={(e) => e.stopPropagation()}>
                <button className="about-panel-close" onClick={onClose} aria-label="关闭">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
                <div className="about-panel-body">
                    <h1 className="about-title">深圳天气</h1>
                    <p className="about-subtitle">SZ Weather</p>
                    <p className="about-desc">通过气象摄像头实时观测深圳天气</p>
                    <div className="about-divider"></div>
                    <div className="about-meta">
                        <div className="about-meta-row">
                            <span className="about-meta-label">数据来源</span>
                            <span className="about-meta-value">深圳市气象局 weather.121.com.cn</span>
                        </div>
                        <div className="about-meta-row">
                            <span className="about-meta-label">作者</span>
                            <span className="about-meta-value">刘一笔</span>
                        </div>
                    </div>
                    <div className="about-links">
                        <a className="about-link" href="#" target="_blank" rel="noopener noreferrer">博客</a>
                        <a className="about-link" href="#" target="_blank" rel="noopener noreferrer">GitHub</a>
                    </div>
                </div>
            </div>
        </div>
    );
}

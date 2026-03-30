/**
 * Header 组件 - 顶部状态栏
 */
export default function Header({ onAboutOpen }) {
    return (
        <header className="header">
            <div className="header-content">
                <div className="header-left">
                    <span className="site-title">深圳天气实景</span>
                </div>
                <div className="header-right">
                    <div className="status-indicator">
                        <span className="status-dot"></span>
                        <span className="status-text">LIVE</span>
                    </div>
                    <button className="about-btn" onClick={onAboutOpen} aria-label="关于">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="12" y1="8" x2="12" y2="8" strokeWidth="2" strokeLinecap="round"/>
                            <line x1="12" y1="11" x2="12" y2="16" strokeLinecap="round"/>
                        </svg>
                    </button>
                </div>
            </div>
        </header>
    );
}

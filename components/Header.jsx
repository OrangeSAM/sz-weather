/**
 * Header 组件 - 顶部状态栏
 */
export default function Header() {
    return (
        <header className="header">
            <div className="header-content">
                <div className="status-indicator">
                    <span className="status-dot"></span>
                    <span className="status-text">LIVE</span>
                </div>
            </div>
        </header>
    );
}

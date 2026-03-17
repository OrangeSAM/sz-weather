/**
 * Header 组件 - 顶部状态栏
 */
export default function Header({ cameraName, updateTime, isLive }) {
    return (
        <header className="header">
            <div className="header-content">
                <div className="status-indicator">
                    <span className="status-dot"></span>
                    <span className="status-text">LIVE</span>
                </div>
                <h1 className="camera-name" id="cameraName">{cameraName}</h1>
                <div className="header-meta">
                    <span className="update-time" id="updateTime">{updateTime}</span>
                </div>
            </div>
            <div className="header-accent"></div>
        </header>
    );
}

import { Link } from 'react-router-dom';

function NotFoundPage() {
  return (
    <div className="app">
      <div className="loading-container">
        <h1>404 — Page Not Found</h1>
        <p>The page you are looking for does not exist.</p>
        <Link to="/" className="btn btn-primary" style={{ marginTop: '1rem' }}>
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}

export default NotFoundPage;

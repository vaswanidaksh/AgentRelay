import { useParams } from 'react-router-dom';

export default function SessionDetailPage() {
  const { id } = useParams();

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold tracking-tight mb-4">
          Session <span className="text-indigo-400">{id}</span>
        </h1>
        <p className="text-gray-400 text-sm">
          Session detail view (driver controls, redirect queue, diffs) will be built in a future phase.
        </p>
      </div>
    </div>
  );
}

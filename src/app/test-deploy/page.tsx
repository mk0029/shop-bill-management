export default function TestDeploy() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4">Deployment Test</h1>
        <p className="text-gray-300 mb-8">
          If you can see this page, the deployment is working!
        </p>
        <div className="bg-green-600 text-white px-4 py-2 rounded">
          ✅ Vercel Deployment Successful
        </div>
      </div>
    </div>
  );
}

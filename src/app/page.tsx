export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-4xl font-bold tracking-tight">mjufinder</h1>
      <p className="text-lg text-gray-500">
        Next.js + FastAPI + Supabase 기반 프로젝트
      </p>
      <div className="flex flex-wrap justify-center gap-4 text-sm">
        <span className="rounded-full border px-4 py-1">Next.js (App Router)</span>
        <span className="rounded-full border px-4 py-1">TypeScript</span>
        <span className="rounded-full border px-4 py-1">Tailwind CSS</span>
        <span className="rounded-full border px-4 py-1">Supabase</span>
      </div>
      <p className="text-sm text-gray-400">
        개발 시작: <code className="font-mono">src/app/page.tsx</code> 를 수정하세요.
      </p>
    </main>
  );
}

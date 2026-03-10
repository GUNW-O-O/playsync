import Link from 'next/link';

async function getSessions() {
  const res = await fetch(`${process.env.BACKEND_URL}/tournaments`, {
    next: { revalidate: 10 } // 10초마다 갱신
  });
  return res.json();
}

export default async function TournamentsPage() {
  const sessions = await getSessions();

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">참여 가능한 대회</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sessions.map((s: any) => (
          <Link href={`/tournaments/${s.id}`} key={s.id}>
            <div className="border rounded-xl p-4 hover:shadow-md transition bg-white">
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                {s.type}
              </span>
              <h2 className="text-lg text-gray-800 font-bold mt-2">{s.name}</h2>
              <p className="text-sm text-gray-500 mt-1">{s.store?.storeName}</p>
              <div className="mt-4 flex justify-between items-center border-t pt-3">
                <span className="font-bold text-orange-600">{s.entryFee.toLocaleString()}원</span>
                <span className="text-xs text-gray-400">레지 마감 전</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
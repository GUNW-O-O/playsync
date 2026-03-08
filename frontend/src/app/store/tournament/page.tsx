import { createTournament } from "../action";

export default function StoreDetailPage({ params }: { params: { id: string } }) {
  // 클라이언트 컴포넌트로 분리하여 폼을 만들거나, 
  // 단순하게 서버 액션을 직접 연결할 수 있습니다.
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">대회 생성 (상점 ID: {params.id})</h1>
      
      <form action={async (formData) => {
        'use server';
        await createTournament(params.id, formData);
      }} className="flex flex-col gap-4 max-w-sm">
        <input name="title" placeholder="대회 명칭" className="border p-2" required />
        <input name="entryFee" type="number" placeholder="참가비" className="border p-2" required />
        {/* 블라인드 구조 선택 등을 추가 */}
        <button type="submit" className="bg-blue-600 text-white p-2 rounded">
          대회 개설하기
        </button>
      </form>
    </div>
  );
}
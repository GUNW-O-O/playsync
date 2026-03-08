'use server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

const BACKEND_URL = process.env.BACKEND_URL;

export async function createTournamentWithBlinds(storeId: string, formData: FormData) {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;

  const blindData = JSON.parse(formData.get('blindData') as string);
  const res = await fetch(`${BACKEND_URL}/store/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      dto : {
        storeId: storeId,
        name: formData.get('name'),
        type: 'TOURNAMENT',
        entryFee: Number(formData.get('entryFee')),
        startStack: Number(formData.get('startStack')),
        rebuyUntil: Number(formData.get('rebuyUntil')),
        itmCount: Number(formData.get('itmCount')),
        // isRegistrationOpen: formData.get('isRegistrationOpen'),
      },
      blindStructure: blindData
    }),
  });

  if (!res.ok) {
    const error = await res.json();
    console.error("생성 에러:", error);
    return { error: error.message };
  }

  revalidatePath(`/store/${storeId}`);
}

// 대회 시작 (Patch)
export async function startTournament(storeId: string, tournamentId: string) {
  const token = (await cookies()).get('accessToken')?.value;
  
  const res = await fetch(`${BACKEND_URL}/store/sessions/${tournamentId}/start`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (res.ok) revalidatePath(`/store/${storeId}`);
  return res.ok;
}

// 대회 종료 (Patch)
export async function completeTournament(storeId: string, tournamentId: string) {
  const token = (await cookies()).get('accessToken')?.value;

  const res = await fetch(`${BACKEND_URL}/store/sessions/${tournamentId}/complete`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (res.ok) revalidatePath(`/store/${storeId}`);
  return res.ok;
}
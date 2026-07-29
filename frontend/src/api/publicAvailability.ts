import client from './client';

export type PublicAvailabilityStatus = 'AVAILABLE' | 'FULL' | 'HIDDEN';

export type PublicAvailabilityRoom = {
  id: number;
  code: string;
  name: string | null;
  floor: string | null;
  publicStatus: PublicAvailabilityStatus;
};

export type PublicAvailabilitySetup = {
  onlineBookingEnabled: boolean;
  rooms: PublicAvailabilityRoom[];
};

function ownerPinHeaders(pin: string) {
  return { 'X-Availability-Pin': pin };
}

export async function getPublicAvailabilitySetup(pin: string) {
  const response = await client.get<{ data: PublicAvailabilitySetup }>('/public/availability/setup', {
    headers: ownerPinHeaders(pin),
  });
  return response.data.data;
}

export async function savePublicAvailabilitySetup(
  pin: string,
  rooms: Array<{ roomId: number; status: PublicAvailabilityStatus }>,
) {
  const response = await client.put<{ data: PublicAvailabilitySetup }>(
    '/public/availability/setup',
    { rooms },
    { headers: ownerPinHeaders(pin) },
  );
  return response.data.data;
}

import ObservatoryClient from '@/components/ObservatoryClient';
import { CAMERAS, getCurrentEpochMs } from '@/lib/cameras';

export const dynamic = 'force-dynamic';

export default async function Home({ searchParams }) {
    const resolved = (await searchParams) || {};
    const camId = Number(resolved.cam);
    const camIdx = camId ? CAMERAS.findIndex((c) => c.id === camId) : 0;
    const initialNowMs = getCurrentEpochMs();

    return (
        <ObservatoryClient
            initialCameraIndex={camIdx >= 0 ? camIdx : 0}
            initialTimestampStr={typeof resolved.t === 'string' ? resolved.t : null}
            initialViewMode={resolved.view === 'grid' ? 'grid' : 'single'}
            initialNowMs={initialNowMs}
        />
    );
}

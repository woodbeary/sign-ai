'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';

const DynamicHandTracker = dynamic(
  () => import('./hand-tracker').then(mod => mod.HandTracker),
  { ssr: false }
);

export function HandTrackerWrapper() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DynamicHandTracker />
    </Suspense>
  );
} 
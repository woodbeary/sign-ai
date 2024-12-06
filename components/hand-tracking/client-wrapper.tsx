'use client';

import dynamic from 'next/dynamic';

const DynamicHandTracker = dynamic(
  () => import('./hand-tracker').then(mod => mod.HandTracker),
  { ssr: false }
);

export function HandTrackerWrapper() {
  return <DynamicHandTracker />;
} 
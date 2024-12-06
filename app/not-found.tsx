import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Metadata } from 'next';

export const generateMetadata = (): Metadata => {
  return {
    title: 'Not Found',
    description: 'Page not found',
  };
};

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <h1 className="text-4xl font-bold mb-4">404 - Page Not Found</h1>
      <p className="text-lg mb-8">Sorry, the page you are looking for does not exist.</p>
      <Button asChild>
        <Link href="/">
          Return Home
        </Link>
      </Button>
    </div>
  );
} 
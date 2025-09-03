import React from 'react';
import { Button } from '@/components/ui/button';

export default function Header() {
  return (
    <header className="border-b bg-background">
      <div className="flex h-16 items-center px-4">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-semibold">App</h1>
        </div>
        <div className="ml-auto flex items-center space-x-4">
          <Button variant="outline" size="sm">
            Menu
          </Button>
        </div>
      </div>
    </header>
  );
}
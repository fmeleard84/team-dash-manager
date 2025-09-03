import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Project() {
  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Project</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Project management page</p>
        </CardContent>
      </Card>
    </div>
  );
}
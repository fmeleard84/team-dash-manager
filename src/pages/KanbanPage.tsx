import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function KanbanPage() {
  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Kanban</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Kanban board page</p>
        </CardContent>
      </Card>
    </div>
  );
}
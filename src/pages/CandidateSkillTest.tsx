import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function CandidateSkillTest() {
  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Skill Test</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Skill test page</p>
        </CardContent>
      </Card>
    </div>
  );
}
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Package,
  Plus,
  Edit,
  Trash2,
  Eye,
  Download,
  Settings
} from 'lucide-react';

// Design System Components
import { AppShell, PageSection, Container } from '@/ui/layout';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent,
  CardFooter 
} from '@/ui/components/Card';
import { KPI } from '@/ui/components/KPI';
import { Button } from '@/ui/components/Button';
import { EmptyState } from '@/ui/components/EmptyState';
import { Skeleton, SkeletonCard, SkeletonKPI } from '@/ui/components/Skeleton';
import { DataTable, ColumnDef } from '@/ui/components/DataTable';
import {
  ChartCard,
  SimpleBarChart,
  SimpleLineChart,
  SimpleAreaChart,
  SimplePieChart
} from '@/ui/components/ChartCard';
import { FormField, FormGroup, FormSection } from '@/ui/components/forms/FormField';
import { ThemeToggle } from '@/ui/components/ThemeToggle';

// Sample data for charts
const barChartData = [
  { month: 'Jan', value: 4200 },
  { month: 'Fév', value: 5100 },
  { month: 'Mar', value: 6300 },
  { month: 'Avr', value: 7200 },
  { month: 'Mai', value: 8900 },
  { month: 'Juin', value: 10500 },
];

const lineChartData = [
  { month: 'Jan', clients: 28, projets: 12 },
  { month: 'Fév', clients: 32, projets: 18 },
  { month: 'Mar', clients: 41, projets: 22 },
  { month: 'Avr', clients: 45, projets: 28 },
  { month: 'Mai', clients: 52, projets: 35 },
  { month: 'Juin', clients: 61, projets: 42 },
];

const pieChartData = [
  { name: 'Développement', value: 35 },
  { name: 'Design', value: 25 },
  { name: 'Marketing', value: 20 },
  { name: 'Data', value: 20 },
];

// Sample data for table
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive';
}

const sampleUsers: User[] = [
  { id: '1', name: 'Jean Dupont', email: 'jean@example.com', role: 'Admin', status: 'active' },
  { id: '2', name: 'Marie Martin', email: 'marie@example.com', role: 'User', status: 'active' },
  { id: '3', name: 'Pierre Bernard', email: 'pierre@example.com', role: 'User', status: 'inactive' },
  { id: '4', name: 'Sophie Leroy', email: 'sophie@example.com', role: 'Manager', status: 'active' },
];

// Form schema
const formSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  email: z.string().email('Email invalide'),
  role: z.string().min(1, 'Veuillez sélectionner un rôle'),
  bio: z.string().optional(),
  notifications: z.boolean().default(true),
  theme: z.enum(['light', 'dark', 'system']),
});

type FormData = z.infer<typeof formSchema>;

export default function DesignSystem() {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      role: '',
      bio: '',
      notifications: true,
      theme: 'system',
    },
  });

  const tableColumns: ColumnDef<User>[] = [
    {
      accessorKey: 'name',
      header: 'Nom',
    },
    {
      accessorKey: 'email',
      header: 'Email',
    },
    {
      accessorKey: 'role',
      header: 'Rôle',
    },
    {
      accessorKey: 'status',
      header: 'Statut',
      cell: ({ row }) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          row.original.status === 'active' 
            ? 'bg-success/10 text-success' 
            : 'bg-muted text-fg/50'
        }`}>
          {row.original.status === 'active' ? 'Actif' : 'Inactif'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={<Eye className="w-4 h-4" />} />
          <Button variant="ghost" size="sm" icon={<Edit className="w-4 h-4" />} />
          <Button variant="ghost" size="sm" icon={<Trash2 className="w-4 h-4" />} />
        </div>
      ),
    },
  ];

  const onSubmit = (data: FormData) => {
    console.log('Form submitted:', data);
  };

  return (
    <AppShell
      header={
        <div className="h-16 px-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Design System</h1>
          <ThemeToggle />
        </div>
      }
    >
      <Container size="xl">
        <div className="space-y-12 py-8">
          {/* Colors & Tokens */}
          <PageSection 
            title="Couleurs & Tokens" 
            description="Palette de couleurs et tokens de design"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <div className="h-20 bg-brand rounded-xl" />
                <p className="text-sm font-medium">Brand</p>
              </div>
              <div className="space-y-2">
                <div className="h-20 bg-success rounded-xl" />
                <p className="text-sm font-medium">Success</p>
              </div>
              <div className="space-y-2">
                <div className="h-20 bg-warning rounded-xl" />
                <p className="text-sm font-medium">Warning</p>
              </div>
              <div className="space-y-2">
                <div className="h-20 bg-error rounded-xl" />
                <p className="text-sm font-medium">Error</p>
              </div>
            </div>
          </PageSection>

          {/* Buttons */}
          <PageSection 
            title="Buttons" 
            description="Variantes et tailles de boutons"
          >
            <Card>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-4">
                  <Button variant="primary">Primary</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="destructive">Destructive</Button>
                </div>
                
                <div className="flex flex-wrap gap-4">
                  <Button size="sm">Small</Button>
                  <Button size="md">Medium</Button>
                  <Button size="lg">Large</Button>
                </div>
                
                <div className="flex flex-wrap gap-4">
                  <Button icon={<Plus className="w-4 h-4" />}>With Icon</Button>
                  <Button loading>Loading</Button>
                  <Button disabled>Disabled</Button>
                </div>
              </CardContent>
            </Card>
          </PageSection>

          {/* Cards & KPIs */}
          <PageSection 
            title="Cards & KPIs" 
            description="Composants de carte et indicateurs clés"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <KPI 
                label="Chiffre d'affaires" 
                value="38 420 €" 
                delta={{ value: "+12%", trend: "up" }}
                icon={<DollarSign className="w-5 h-5" />}
              />
              <KPI 
                label="Nouveaux clients" 
                value="128" 
                delta={{ value: "-5%", trend: "down" }}
                icon={<Users className="w-5 h-5" />}
              />
              <KPI 
                label="Projets actifs" 
                value="24" 
                delta={{ value: "0%", trend: "neutral" }}
                icon={<Package className="w-5 h-5" />}
              />
            </div>

            <Card hover>
              <CardHeader>
                <CardTitle>Card avec hover</CardTitle>
                <CardDescription>Cette carte a un effet au survol</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-fg/70">
                  Contenu de la carte. Les cards utilisent rounded-2xl et shadow-md par défaut.
                </p>
              </CardContent>
              <CardFooter>
                <Button variant="primary" size="sm">Action</Button>
              </CardFooter>
            </Card>
          </PageSection>

          {/* DataTable */}
          <PageSection 
            title="DataTable" 
            description="Tableau de données avec tri, recherche et pagination"
          >
            <DataTable
              columns={tableColumns}
              data={sampleUsers}
              searchPlaceholder="Rechercher un utilisateur..."
              onRowAction={(row, action) => console.log('Row action:', row, action)}
            />
          </PageSection>

          {/* Charts */}
          <PageSection 
            title="Charts" 
            description="Graphiques et visualisations"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ChartCard 
                title="Chiffre d'affaires mensuel" 
                description="Évolution sur 6 mois"
              >
                <SimpleBarChart
                  data={barChartData}
                  dataKey="value"
                  xAxisKey="month"
                />
              </ChartCard>

              <ChartCard 
                title="Croissance" 
                description="Clients vs Projets"
              >
                <SimpleLineChart
                  data={lineChartData}
                  lines={[
                    { dataKey: 'clients', name: 'Clients' },
                    { dataKey: 'projets', name: 'Projets' },
                  ]}
                  xAxisKey="month"
                />
              </ChartCard>

              <ChartCard 
                title="Tendance" 
                description="Vue d'ensemble"
              >
                <SimpleAreaChart
                  data={barChartData}
                  dataKey="value"
                  xAxisKey="month"
                />
              </ChartCard>

              <ChartCard 
                title="Répartition" 
                description="Par catégorie"
              >
                <SimplePieChart data={pieChartData} />
              </ChartCard>
            </div>
          </PageSection>

          {/* Forms */}
          <PageSection 
            title="Formulaires" 
            description="Champs de formulaire avec validation"
          >
            <Card>
              <CardHeader>
                <CardTitle>Formulaire d'exemple</CardTitle>
                <CardDescription>Démonstration des différents types de champs</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormSection title="Informations personnelles">
                    <FormGroup>
                      <FormField
                        control={form.control}
                        name="name"
                        type="text"
                        label="Nom complet"
                        placeholder="Jean Dupont"
                        required
                      />
                      
                      <FormField
                        control={form.control}
                        name="email"
                        type="email"
                        label="Email"
                        placeholder="jean@example.com"
                        required
                      />
                      
                      <FormField
                        control={form.control}
                        name="role"
                        type="select"
                        label="Rôle"
                        placeholder="Sélectionner un rôle"
                        options={[
                          { value: 'admin', label: 'Administrateur' },
                          { value: 'manager', label: 'Manager' },
                          { value: 'user', label: 'Utilisateur' },
                        ]}
                        required
                      />
                      
                      <FormField
                        control={form.control}
                        name="bio"
                        type="textarea"
                        label="Bio"
                        placeholder="Parlez-nous de vous..."
                        rows={3}
                      />
                    </FormGroup>
                  </FormSection>

                  <FormSection title="Préférences">
                    <FormGroup>
                      <FormField
                        control={form.control}
                        name="notifications"
                        type="switch"
                        label="Recevoir les notifications"
                      />
                      
                      <FormField
                        control={form.control}
                        name="theme"
                        type="radio"
                        label="Thème"
                        options={[
                          { value: 'light', label: 'Clair' },
                          { value: 'dark', label: 'Sombre' },
                          { value: 'system', label: 'Système' },
                        ]}
                      />
                    </FormGroup>
                  </FormSection>

                  <div className="flex gap-4">
                    <Button type="submit" variant="primary">
                      Enregistrer
                    </Button>
                    <Button type="button" variant="outline" onClick={() => form.reset()}>
                      Annuler
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </PageSection>

          {/* Empty States */}
          <PageSection 
            title="Empty States" 
            description="États vides et messages"
          >
            <Card>
              <EmptyState
                icon={<Package className="w-8 h-8" />}
                title="Aucun projet trouvé"
                description="Créez votre premier projet pour commencer"
                action={{
                  label: "Créer un projet",
                  onClick: () => console.log('Create project'),
                }}
              />
            </Card>
          </PageSection>

          {/* Skeletons */}
          <PageSection 
            title="Skeletons" 
            description="États de chargement"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <SkeletonKPI />
              <SkeletonKPI />
              <SkeletonKPI />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SkeletonCard lines={3} />
              <SkeletonCard lines={3} showImage />
            </div>
          </PageSection>
        </div>
      </Container>
    </AppShell>
  );
}
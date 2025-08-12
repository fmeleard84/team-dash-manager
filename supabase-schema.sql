-- Create tables for Kanban application

-- Enable RLS (Row Level Security)
alter database postgres set row_security = on;

-- Create kanban_boards table
create table public.kanban_boards (
    id uuid default gen_random_uuid() primary key,
    title text not null,
    description text,
    created_by text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    members text[] default '{}',
    team_members jsonb default '[]'::jsonb
);

-- Create kanban_columns table
create table public.kanban_columns (
    id uuid default gen_random_uuid() primary key,
    board_id uuid references public.kanban_boards(id) on delete cascade not null,
    title text not null,
    position integer not null,
    color text,
    "limit" integer,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create kanban_cards table
create table public.kanban_cards (
    id uuid default gen_random_uuid() primary key,
    board_id uuid references public.kanban_boards(id) on delete cascade not null,
    column_id uuid references public.kanban_columns(id) on delete cascade not null,
    title text not null,
    description text,
    assigned_to text,
    assigned_to_name text,
    assigned_to_email text,
    assigned_to_avatar text,
    due_date timestamp with time zone,
    priority text check (priority in ('low', 'medium', 'high')) default 'medium',
    status text check (status in ('todo', 'in_progress', 'review', 'done')) default 'todo',
    labels text[] default '{}',
    progress integer default 0 check (progress >= 0 and progress <= 100),
    position integer not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    created_by text not null
);

-- Create indexes for better performance
create index kanban_columns_board_id_idx on public.kanban_columns(board_id);
create index kanban_columns_position_idx on public.kanban_columns(position);
create index kanban_cards_board_id_idx on public.kanban_cards(board_id);
create index kanban_cards_column_id_idx on public.kanban_cards(column_id);
create index kanban_cards_position_idx on public.kanban_cards(position);

-- Create function to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$ language plpgsql;

-- Create triggers to auto-update updated_at
create trigger update_kanban_boards_updated_at before update on public.kanban_boards
    for each row execute procedure update_updated_at_column();

create trigger update_kanban_columns_updated_at before update on public.kanban_columns
    for each row execute procedure update_updated_at_column();

create trigger update_kanban_cards_updated_at before update on public.kanban_cards
    for each row execute procedure update_updated_at_column();

-- Enable Row Level Security (RLS)
alter table public.kanban_boards enable row level security;
alter table public.kanban_columns enable row level security;
alter table public.kanban_cards enable row level security;

-- Create RLS policies (for now, allow all operations - you can restrict this later)
create policy "Allow all operations on kanban_boards" on public.kanban_boards for all using (true);
create policy "Allow all operations on kanban_columns" on public.kanban_columns for all using (true);
create policy "Allow all operations on kanban_cards" on public.kanban_cards for all using (true);

-- Insert some demo data (optional)
insert into public.kanban_boards (id, title, description, created_by, members, team_members)
values (
    gen_random_uuid(),
    'Projet de développement web',
    'Tableau de suivi pour le développement de notre application web',
    '1',
    array['1'],
    '[
        {"id": "1", "name": "François Meleard", "email": "fmeleard+client@gmail.com", "role": "Chef de projet"},
        {"id": "2", "name": "Marie Dupont", "email": "marie.dupont@example.com", "role": "Développeuse Frontend"},
        {"id": "3", "name": "Jean Martin", "email": "jean.martin@example.com", "role": "Développeur Backend"},
        {"id": "4", "name": "Sophie Chen", "email": "sophie.chen@example.com", "role": "Designer UX/UI"},
        {"id": "5", "name": "Alex Rodriguez", "email": "alex.rodriguez@example.com", "role": "QA Tester"}
    ]'::jsonb
);
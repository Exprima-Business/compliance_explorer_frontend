-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Create assets table
create table if not exists public.assets (
    id uuid default uuid_generate_v4() primary key,
    name text not null,
    type text not null,
    owner text not null,
    description text,
    classification text not null,
    risk_score integer check (risk_score between 1 and 10),
    fci_operation text default 'none',
    cui_operation text default 'none',
    compliance_mappings text[] default array[]::text[],
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.assets enable row level security;

-- Create policies
create policy "Enable read access for all users" on public.assets
    for select using (true);

create policy "Enable insert for authenticated users only" on public.assets
    for insert with check (auth.role() = 'authenticated');

create policy "Enable update for authenticated users only" on public.assets
    for update using (auth.role() = 'authenticated');

create policy "Enable delete for authenticated users only" on public.assets
    for delete using (auth.role() = 'authenticated');

-- Create function to automatically update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$ language plpgsql;

-- Create trigger for updated_at
create trigger set_updated_at
    before update on public.assets
    for each row
    execute function public.handle_updated_at(); 
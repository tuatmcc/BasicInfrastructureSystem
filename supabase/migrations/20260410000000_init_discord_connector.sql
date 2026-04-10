create table if not exists public.users (
    discord_user_id text primary key,
    display_name text not null,
    member_id text
);

create table if not exists public.roles (
    role_id text primary key,
    role_name text not null,
    permissions bigint not null default 0
);

create table if not exists public.categories (
    category_id text primary key,
    category_name text not null
);

create table if not exists public.channels (
    channel_id text primary key,
    channel_name text not null,
    category_id text not null references public.categories(category_id) on delete cascade
);

create table if not exists public.user_roles (
    discord_user_id text not null references public.users(discord_user_id) on delete cascade,
    role_id text not null references public.roles(role_id) on delete cascade,
    primary key (discord_user_id, role_id)
);

create table if not exists public.category_role_access (
    category_id text not null references public.categories(category_id) on delete cascade,
    role_id text not null references public.roles(role_id) on delete cascade,
    primary key (category_id, role_id)
);

create table if not exists public.channel_role_access (
    channel_id text not null references public.channels(channel_id) on delete cascade,
    role_id text not null references public.roles(role_id) on delete cascade,
    primary key (channel_id, role_id)
);

create index if not exists idx_users_member_id on public.users(member_id);
create index if not exists idx_channels_category_id on public.channels(category_id);

-- Il salvataggio online di Come sto, cioè quello che segue la persona su ogni telefono.
-- Il repository è pubblico e questo file può esserlo. La sicurezza non dipende dal segreto del codice,
-- ma dalle regole qui sotto, che il database applica a ogni richiesta.
--
-- Quello che sta qui. L'avventura, i giorni per la bici e poche impostazioni su bici e borse.
-- Quello che qui non entra mai. Numeri di salute, semaforo, sintomi, risposte, sforzo, palestra e la
-- chiave di intervals.icu. Restano in intervals.icu e sul telefono della persona.
--
-- Tre muri, uno dentro l'altro.
-- 1. Ogni persona vede e cambia solo le sue righe (row level security), chi non è entrato nessuna.
-- 2. Le chiavi ammesse sono tre, scritte qui. Tutto il resto il database lo rifiuta.
-- 3. Il profilo può contenere solo i campi di privato.campi_ammessi, e nessuna riga può contenere i
--    nomi dei campi sulla salute. Così un errore nel codice della pagina non porta dati qui dentro.

create schema if not exists privato;
revoke all on schema privato from public;
grant usage on schema privato to authenticated;

create or replace function privato.campi_ammessi(c text, v jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case
    when c = 'comesto.profilo.v1' then not exists (
      select 1 from jsonb_object_keys(v) as campo
      where campo not in ('bici', 'borseKg', 'borseTipo', 'ebike', 'oreEbike', 'palestra', 'altriSport', 'esperienza')
    )
    else true
  end;
$$;
revoke all on function privato.campi_ammessi(text, jsonb) from public;
grant execute on function privato.campi_ammessi(text, jsonb) to authenticated;

create table public.dati (
  utente uuid not null references auth.users (id) on delete cascade,
  chiave text not null,
  valore jsonb not null,
  agg timestamptz not null default now(),
  primary key (utente, chiave),
  constraint chiave_ammessa check (chiave in ('comesto.obiettivo.v1', 'comesto.disponibilita.v1', 'comesto.profilo.v1')),
  constraint valore_oggetto check (jsonb_typeof(valore) = 'object'),
  constraint valore_piccolo check (pg_column_size(valore) <= 8192),
  constraint campi_ammessi check (privato.campi_ammessi(chiave, valore)),
  constraint niente_salute check (not (valore ?| array[
    'aritmia', 'ciclo', 'pesoFascia', 'fasciaEta', 'eta', 'palestraSicurezza', 'primaDiCominciare',
    'stoMale', 'cause', 'sintomi', 'medico', 'hrv', 'battito', 'sonno', 'sforzo', 'stomaco',
    'chiave', 'accesso', 'token', 'api_key'
  ]))
);

alter table public.dati enable row level security;
alter table public.dati force row level security;

-- Chi non è entrato non ha nessun permesso, nemmeno di provare a leggere.
revoke all on table public.dati from public, anon, authenticated;
grant select, insert, update, delete on table public.dati to authenticated;

create policy "leggo le mie righe" on public.dati
  for select to authenticated using ((select auth.uid()) = utente);
create policy "aggiungo le mie righe" on public.dati
  for insert to authenticated with check ((select auth.uid()) = utente);
create policy "cambio le mie righe" on public.dati
  for update to authenticated using ((select auth.uid()) = utente) with check ((select auth.uid()) = utente);
create policy "tolgo le mie righe" on public.dati
  for delete to authenticated using ((select auth.uid()) = utente);

-- L'ora dell'ultimo cambiamento la mette il database, così non si può falsare.
create or replace function privato.timbra_dati()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.agg := now();
  return new;
end;
$$;
revoke all on function privato.timbra_dati() from public;
create trigger timbra before insert or update on public.dati
  for each row execute function privato.timbra_dati();

-- «Cancella il mio account». Toglie l'utente che la chiama e nessun altro, e con lui le sue righe.
create or replace function public.cancella_account()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.users where id = (select auth.uid());
$$;
revoke all on function public.cancella_account() from public, anon, authenticated;
grant execute on function public.cancella_account() to authenticated;
